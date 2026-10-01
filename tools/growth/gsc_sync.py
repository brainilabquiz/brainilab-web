"""Private read-only Google Search Console connector. Standard library only.

Authorize once with an operator-supplied Google desktop OAuth client. Tokens never
enter the website, database, logs, command arguments or public assets.
"""
import argparse
import base64
from datetime import date, datetime, timedelta, timezone
import hashlib
from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import math
import os
from pathlib import Path
import secrets
import time
from urllib.parse import urlencode, urlsplit, parse_qs, quote
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from gsc_import import import_snapshot, digest

SCOPE='https://www.googleapis.com/auth/webmasters.readonly'
PROPERTY='sc-domain:brainilabgames.com'
TOKEN_URL='https://oauth2.googleapis.com/token'
AUTH_URL='https://accounts.google.com/o/oauth2/v2/auth'
ROOT=Path(__file__).resolve().parent
PRIVATE=ROOT/'data'
PAGES=['https://brainilabgames.com/games/number-route/','https://brainilabgames.com/games/math-rush/']
PAGE_SIZE=25000


def request_json(url, payload, token=None, form=False):
    headers={'Content-Type':'application/x-www-form-urlencoded' if form else 'application/json'}
    if token:
        headers['Authorization']='Bearer '+token
    body=urlencode(payload).encode() if form else json.dumps(payload).encode()
    for attempt in range(3):
        try:
            with urlopen(Request(url,data=body,headers=headers),timeout=25) as response:
                return json.load(response)
        except HTTPError as error:
            if error.code in (429,500,502,503,504) and attempt<2:
                time.sleep(2**attempt)
                continue
            # Do not expose Google bodies, authorization codes or tokens.
            raise RuntimeError(f'Google returned HTTP {error.code}. Check API access/authorization; the last successful data was retained.') from None


def private_write(path, value):
    path=Path(path).resolve()
    if not path.is_relative_to(PRIVATE.resolve()):
        raise ValueError('Secrets and raw responses must stay in the private data directory')
    path.parent.mkdir(parents=True,exist_ok=True)
    temporary=path.with_suffix(path.suffix+'.tmp')
    descriptor=os.open(temporary,os.O_WRONLY|os.O_CREAT|os.O_TRUNC,0o600)
    with os.fdopen(descriptor,'w',encoding='utf-8') as f:
        json.dump(value,f,ensure_ascii=False)
    os.replace(temporary,path)


def client():
    path=PRIVATE/'google-client.json'
    if not path.exists():
        raise RuntimeError('Setup required: save a Google OAuth Desktop client JSON privately as tools/growth/data/google-client.json. Do not paste it into chat.')
    config=json.loads(path.read_text(encoding='utf-8')).get('installed',{})
    if not config.get('client_id') or not config.get('client_secret'):
        raise RuntimeError('Use a Google OAuth Desktop application client.')
    return config


def authorize():
    config=client();state=secrets.token_urlsafe(32);verifier=secrets.token_urlsafe(64)
    challenge=base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode().rstrip('=')
    result={}
    class Callback(BaseHTTPRequestHandler):
        def log_message(self,*args):
            pass
        def do_GET(self):
            parsed=urlsplit(self.path);params=parse_qs(parsed.query)
            valid=parsed.path=='/callback' and secrets.compare_digest(params.get('state',[''])[0],state)
            if not valid:
                self.send_response(400);self.end_headers();self.wfile.write(b'Invalid authorization state.');return
            result.update(code=params.get('code',[None])[0],error=params.get('error',[None])[0])
            self.send_response(200);self.send_header('Content-Type','text/plain; charset=utf-8');self.end_headers();self.wfile.write(b'Authorization received. Return to the private Growth connector.')
    with HTTPServer(('127.0.0.1',0),Callback) as server:
        server.timeout=1
        redirect=f'http://127.0.0.1:{server.server_port}/callback'
        url=AUTH_URL+'?'+urlencode({'client_id':config['client_id'],'redirect_uri':redirect,'response_type':'code','scope':SCOPE,'access_type':'offline','prompt':'consent','state':state,'code_challenge':challenge,'code_challenge_method':'S256'})
        print('Open this Google authorization URL yourself and approve read-only Search Console access:',flush=True)
        print(url,flush=True)
        deadline=time.monotonic()+300
        while not result and time.monotonic()<deadline:
            server.handle_request()
    if not result.get('code'):
        raise RuntimeError('Authorization was declined or timed out; no token was stored.')
    token=request_json(TOKEN_URL,{'client_id':config['client_id'],'client_secret':config['client_secret'],'code':result['code'],'redirect_uri':redirect,'grant_type':'authorization_code','code_verifier':verifier},form=True)
    if SCOPE not in token.get('scope','').split() or not token.get('refresh_token'):
        raise RuntimeError('Read-only scope or offline token missing. Connection not saved.')
    private_write(PRIVATE/'google-token.json',{'refresh_token':token['refresh_token'],'scope':SCOPE})
    print('Read-only authorization saved privately. Run sync to verify data access.')


def access_token():
    config=client();path=PRIVATE/'google-token.json'
    if not path.exists():
        raise RuntimeError('Google authorization is still required. Run authorize first.')
    saved=json.loads(path.read_text(encoding='utf-8'))
    if saved.get('scope')!=SCOPE:
        raise RuntimeError('Unexpected stored scope; reconnect with read-only access.')
    result=request_json(TOKEN_URL,{'client_id':config['client_id'],'client_secret':config['client_secret'],'refresh_token':saved['refresh_token'],'grant_type':'refresh_token'},form=True)
    if not result.get('access_token'):
        raise RuntimeError('No Google access token returned.')
    return result['access_token']


def query(token,start,end,dimension,page=None,transport=request_json):
    rows=[];seen=set()
    for offset in (0,PAGE_SIZE):
        payload={'startDate':start,'endDate':end,'dimensions':[dimension],'type':'web','dataState':'final','rowLimit':PAGE_SIZE,'startRow':offset,'aggregationType':'auto'}
        if page:
            payload['dimensionFilterGroups']=[{'filters':[{'dimension':'page','operator':'equals','expression':page}]}]
        data=transport('https://www.googleapis.com/webmasters/v3/sites/'+quote(PROPERTY,safe='')+'/searchAnalytics/query',payload,token)
        batch=data.get('rows',[])
        if not isinstance(batch,list):
            raise ValueError('Unexpected Google rows')
        for row in batch:
            if not isinstance(row.get('keys'),list) or len(row['keys'])!=1 or row['keys'][0] in seen:
                raise ValueError('Invalid or duplicate Google dimension row')
            key=row['keys'][0]
            if not isinstance(key,str) or not key:raise ValueError('Invalid Google dimension key')
            if dimension=='date' and not date.fromisoformat(start)<=date.fromisoformat(key)<=date.fromisoformat(end):raise ValueError('Date outside requested period')
            seen.add(key)
            metrics={m:row.get(m) for m in ('clicks','impressions','ctr','position')}
            if any(not isinstance(v,(int,float)) or not math.isfinite(v) or v<0 for v in metrics.values()):
                raise ValueError('Invalid Google metric')
            if metrics['clicks']>metrics['impressions'] or metrics['ctr']>1:
                raise ValueError('Invalid Google metric range')
            for count in ('clicks','impressions'):
                if int(metrics[count])!=metrics[count]:raise ValueError('Invalid count')
                metrics[count]=int(metrics[count])
            if metrics['impressions']==0:
                metrics['ctr']=metrics['position']=None
            rows.append({'value':key,**metrics})
        if len(batch)<PAGE_SIZE:
            return sorted(rows,key=lambda r:r['value'])
    raise RuntimeError('Row cap reached. Narrow the period before importing; no partial snapshot saved.')


def collect(token,start,end,transport=request_json):
    first,last=date.fromisoformat(start),date.fromisoformat(end)
    if first>last or (last-first).days>185 or last>datetime.now(timezone.utc).date()-timedelta(days=3):
        raise ValueError('Use 1–186 complete days ending at least three UTC days ago.')
    snapshots=[]
    for page in [None,*PAGES]:
        tables={d:query(token,start,end,d,page,transport) for d in ('date','query','page','country','device')}
        # API omits zero-traffic dates. Make that explicit, never confuse missing query rows with zero.
        by_date={r['value']:r for r in tables['date']}
        tables['date']=[by_date.get((first+timedelta(days=i)).isoformat(),{'value':(first+timedelta(days=i)).isoformat(),'clicks':0,'impressions':0,'ctr':None,'position':None}) for i in range((last-first).days+1)]
        filters={'searchType':'Web','requestedRange':start+' to '+end}
        if page:filters['page']=page
        snapshots.append({'schemaVersion':1,'property':PROPERTY,'filters':filters,'availablePeriod':{'start':start,'end':end,'timezone':'America/Los_Angeles'},'tables':tables,'csvSources':{},'sourceType':'google_search_console_api','dataState':'final','pageFilterOperator':'equals' if page else None,'limitations':['Final API data only. Zero-traffic dates omitted by Google are filled with explicit zero counts.','API returns top rows, not guaranteed exhaustive query data; never infer unknown queries or market demand.','Property, page and query aggregations must not be added together.']})
    return snapshots


def sync(start,end,database):
    snapshots=collect(access_token(),start,end)  # All network calls must succeed before any import.
    stamp=datetime.now(timezone.utc).isoformat()
    private_write(PRIVATE/'last-google-response.json',{'capturedAt':stamp,'snapshots':snapshots})
    for snapshot in snapshots:
        result=import_snapshot(snapshot,stamp,database,digest(snapshot))
        print(json.dumps({'page':snapshot['filters'].get('page'),'snapshotId':result['snapshotId'],'inserted':result['inserted']}))
    private_write(PRIVATE/'connection-status.json',{'status':'verified','lastSuccessfulSync':stamp,'scope':SCOPE,'period':{'start':start,'end':end}})


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('action',choices=['status','authorize','sync']);p.add_argument('--start');p.add_argument('--end');p.add_argument('--database',default=str(PRIVATE/'growth.sqlite'));args=p.parse_args()
    try:
        if args.action=='authorize':authorize()
        elif args.action=='sync':
            if not args.start or not args.end:raise ValueError('Sync needs --start and --end.')
            sync(args.start,args.end,args.database)
        else:print(json.dumps({'clientConfigured':(PRIVATE/'google-client.json').exists(),'authorizationStored':(PRIVATE/'google-token.json').exists(),'automaticSchedulingEnabled':False}))
    except (RuntimeError,ValueError,FileNotFoundError) as error:
        print(str(error));raise SystemExit(1)
