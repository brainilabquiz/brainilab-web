"""Read Google's indexed-version verdicts; never request indexing or change the site."""
from datetime import datetime,timezone
from urllib.request import Request,urlopen
from urllib.error import HTTPError,URLError
from concurrent.futures import ThreadPoolExecutor,as_completed
from pathlib import Path
import hashlib,json,re,xml.etree.ElementTree as ET
import gsc_sync as api
from evidence_snapshot import stamp,sha,commit,collection_lock,attach as attach_snapshot

ORIGIN='https://brainilabgames.com'
ENDPOINT='https://searchconsole.googleapis.com/v1/urlInspection/index:inspect'
VERDICTS={'PASS','NEUTRAL','FAIL','PARTIAL','VERDICT_UNSPECIFIED'}
FIELDS=('coverageState','robotsTxtState','indexingState','pageFetchState')

def public_url(value):
    return isinstance(value,str) and bool(re.fullmatch(r'https://brainilabgames\.com/(?:[a-z0-9-]+/)*(?:index\.html)?',value)) and not re.match(r'https://brainilabgames\.com/(admin|account|auth|profile)(/|$)',value)

def text(value):
    if value is None:return None
    if not isinstance(value,str) or len(value)>300 or re.search(r'[@<>\x00-\x1f]|https?://',value):raise ValueError('Unexpected index status text')
    return value

def clean_row(value):
    if not public_url(value['url']):raise ValueError('Non-public inspection URL')
    stamp(value['observedAt']);verdict=value.get('verdict') or 'VERDICT_UNSPECIFIED'
    if verdict not in VERDICTS:raise ValueError('Unknown index verdict')
    result={'url':value['url'],'observedAt':value['observedAt'],'verdict':verdict}
    result.update({k:text(value.get(k)) for k in FIELDS})
    crawl=value.get('lastCrawlTime')
    if crawl is not None:stamp(crawl)
    result['lastCrawlTime']=crawl
    for key in ('googleCanonical','userCanonical'):
        raw=value.get(key);result[key]=raw if public_url(raw) else None
        result[key+'Withheld']=raw is not None and not public_url(raw) or value.get(key+'Withheld') is True
    return result

def validate(value):
    if value.get('schemaVersion')!=1 or value.get('property')!=api.PROPERTY or value.get('source')!='Google URL Inspection API' or value.get('mode')!='indexed_version':raise ValueError('Unexpected index observation')
    observed=stamp(value['observedAt']);urls=value['inventory'];rows=[];seen=set()
    if not isinstance(urls,list) or len(urls)>1000 or len(set(urls))!=len(urls) or any(not public_url(u) for u in urls):raise ValueError('Invalid inspection inventory')
    if not re.fullmatch('[a-f0-9]{64}',value['inventorySHA256']):raise ValueError('Missing inventory fingerprint')
    for row in value['results']:
        clean=clean_row(row)
        if clean['url'] in seen or clean['url'] not in urls or stamp(clean['observedAt'])>observed:raise ValueError('Invalid or newer inspection row')
        seen.add(clean['url']);rows.append(clean)
    errors=[]
    for row in value.get('failures',[]):
        if not public_url(row['url']) or row['url'] not in urls or row['reason'] not in ('quota','authorization','unavailable','invalid_response'):raise ValueError('Invalid inspection failure')
        stamp(row['observedAt']);errors.append({k:row[k] for k in ('url','observedAt','reason')})
    return {'schemaVersion':1,'collectorVersion':1,'property':api.PROPERTY,'source':'Google URL Inspection API','mode':'indexed_version','observedAt':value['observedAt'],
            'inventorySource':'public_sitemap','inventorySHA256':value['inventorySHA256'],'inventory':sorted(urls),'results':sorted(rows,key=lambda r:r['url']),'failures':errors}

def inventory(raw):
    root=ET.fromstring(raw)
    if root.tag!='{http://www.sitemaps.org/schemas/sitemap/0.9}urlset':raise ValueError('Expected public URL sitemap, not image URLs or an unreviewed sitemap index')
    urls=sorted(set(el.text.strip() for el in root.findall('{*}url/{*}loc') if el.text and public_url(el.text.strip())))
    if not urls or len(urls)>1000:raise ValueError('Invalid/oversized sitemap')
    return urls

class InspectionFailure(RuntimeError):
    def __init__(self,reason):self.reason=reason;super().__init__(reason)

def inspect(url,token):
    request=Request(ENDPOINT,data=json.dumps({'inspectionUrl':url,'siteUrl':api.PROPERTY,'languageCode':'en-US'}).encode(),headers={'Content-Type':'application/json','Authorization':'Bearer '+token})
    try:
        with urlopen(request,timeout=25) as response:return json.load(response)
    except HTTPError as error:
        raise InspectionFailure('quota' if error.code==429 else 'authorization' if error.code in (401,403) else 'unavailable') from None
    except (URLError,OSError,ValueError):raise InspectionFailure('unavailable') from None

def _refresh(private,now=None,raw_sitemap=None,transport=inspect,max_requests=250,progress=None):
    private=Path(private);now=now or datetime.now(timezone.utc);path=private/'google-indexing-latest.json';before=path.read_bytes() if path.exists() else None
    old=validate(json.loads(before)) if before else None
    if old and stamp(old['observedAt'])>now:raise ValueError('Refusing older collection time')
    if old and (sum(stamp(r['observedAt']).date()==now.date() for r in old['failures'])>=3 or any(r['reason'] in ('quota','authorization') and stamp(r['observedAt']).date()==now.date() for r in old['failures'])):return {'reused':True,'stopped':'Recorded quota/authorization/repeated-error stop; no same-day retry'}
    if raw_sitemap is None:
        with urlopen(Request(ORIGIN+'/sitemap.xml',headers={'User-Agent':'BrainiLab authorised index review'}),timeout=30) as response:raw_sitemap=response.read()
    urls=inventory(raw_sitemap);fingerprint=hashlib.sha256(raw_sitemap).hexdigest();records={r['url']:r for r in (old or {}).get('results',[]) if r['url'] in urls}
    pending=[url for url in urls if url not in records or stamp(records[url]['observedAt']).date()!=now.date()]
    pending.sort(key=lambda url:(url in records,stamp(records[url]['observedAt']).timestamp() if url in records else 0,url))
    if not pending and old and old['inventorySHA256']==fingerprint:return {'reused':True,'observations':len(records),'inventory':len(urls)}
    if type(max_requests) is not int or not 1<=max_requests<=250:raise ValueError('Inspection batch budget must be 1-250')
    token=api.access_token();failures=[];consecutive=0
    # Batches of three limit both load and in-flight requests after a quota error.
    for start in range(0,min(len(pending),max_requests),3):
        stop=False
        with ThreadPoolExecutor(max_workers=3) as pool:
            jobs={pool.submit(transport,url,token):url for url in pending[start:min(start+3,max_requests)]}
            for future in as_completed(jobs):
                url=jobs[future];captured=datetime.now(timezone.utc).isoformat()
                try:
                    state=future.result().get('inspectionResult',{}).get('indexStatusResult')
                    if not isinstance(state,dict):raise ValueError('Missing index-status result')
                    row=clean_row({'url':url,'observedAt':captured,**state});records[url]=row;consecutive=0
                except InspectionFailure as error:
                    failures.append({'url':url,'observedAt':captured,'reason':error.reason});consecutive+=1
                    stop |= error.reason in ('quota','authorization') or len(failures)>=3
                except (ValueError,KeyError,AttributeError,TypeError):
                    failures.append({'url':url,'observedAt':captured,'reason':'invalid_response'});consecutive+=1;stop |= len(failures)>=3
        value={'schemaVersion':1,'property':api.PROPERTY,'source':'Google URL Inspection API','mode':'indexed_version','observedAt':datetime.now(timezone.utc).isoformat(),
               'inventorySource':'public_sitemap','inventorySHA256':fingerprint,'inventory':urls,'results':list(records.values()),'failures':failures}
        commit(private,'google-indexing',value,validate,sha(before));before=path.read_bytes()
        if progress:progress({'checkedToday':sum(stamp(r['observedAt']).date()==now.date() for r in records.values()),'inventory':len(urls),'failures':len(failures)})
        if stop:break
    return {'reused':False,'observations':len(records),'inventory':len(urls),'failures':len(failures),'remaining':len(urls)-sum(stamp(r['observedAt']).date()==now.date() for r in records.values())}

def refresh(private,now=None,raw_sitemap=None,transport=inspect,max_requests=250,progress=None):
    return collection_lock(private,'google-indexing',lambda:_refresh(private,now,raw_sitemap,transport,max_requests,progress))

def attach(report,private):return attach_snapshot(report,private,'google-indexing','googleIndexing',validate)
