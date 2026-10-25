"""GA4-reported sessions with an existing game/practice start, never event/session ratios."""
from datetime import datetime,timedelta,timezone,date
import hashlib,json,re
from pathlib import Path
import gsc_sync as api
from ga4_content import SCOPE,ENDPOINT,PROPERTY
from acquisition import validate as acquisition
from search_performance import exact,public_path as normal_path
from evidence_snapshot import stamp,sha,commit,collection_lock,attach as attach_snapshot

EVENTS=['game_start','practice_start']
FLAGS=('thresholded','sampled','otherRow')

def public_path(value):
    path=normal_path(value)
    return None if path and path.startswith('/auth/') else path

def count(value):
    if value is not None and (type(value) is not int or not 0<=value<=9007199254740991): raise ValueError('Invalid session count')
    return value

def quality(value):
    if not isinstance(value,dict) or any(type(value.get(k)) is not bool for k in FLAGS): raise ValueError('Missing GA4 quality flags')
    return {k:value[k] for k in FLAGS}

def validate(value):
    if value.get('schemaVersion')!=1 or value.get('property')!=PROPERTY or value.get('source')!='GA4 Data API' or value.get('startEvents')!=EVENTS: raise ValueError('Unexpected play-session source')
    observed=stamp(value['observedAt']);first,last=(date.fromisoformat(value['period'][k]) for k in ('start','end'))
    if (last-first).days!=27 or last>observed.date()-timedelta(days=2): raise ValueError('Expected a complete 28-day Analytics window')
    if not re.fullmatch(r'[A-Za-z0-9_+/:-]{1,80}',value['timezone']): raise ValueError('Invalid Analytics timezone')
    if value.get('collectorVersion',1) not in (1,2):raise ValueError('Unexpected play-session collector version')
    clean={k:value[k] for k in ('schemaVersion','property','source','observedAt','timezone','startEvents')};clean['collectorVersion']=value.get('collectorVersion',1)
    clean['period']={'start':str(first),'end':str(last)};clean['cohorts']={}
    for name in ('all','googleOrganic'):
        item=value['cohorts'][name];rows=[];seen=set()
        base={k:count(item.get(k)) for k in ('sessions','sessionsWithStart','startEventCount')}
        for key in ('baselineObservedAt','startsObservedAt'):stamp(item[key]);base[key]=item[key]
        for key in ('landingBaselineObservedAt','landingStartsObservedAt'):
            captured=item.get(key)
            if captured is not None:stamp(captured)
            base[key]=captured
        base['quality']=quality(item['quality'])
        for row in item['landingPages']:
            path=row['path']
            if public_path(path)!=path or path in seen: raise ValueError('Invalid or duplicate public landing path')
            seen.add(path);rows.append({'path':path,**{k:count(row.get(k)) for k in ('sessions','sessionsWithStart','startEventCount')}})
        if len(rows)>5000:raise ValueError('Too many landing paths')
        if type(item['rowsWithheld']) is not int:raise ValueError('Invalid withheld count')
        base['landingPages']=sorted(rows,key=lambda r:r['path']);base['rowsWithheld']=count(item['rowsWithheld'])
        clean['cohorts'][name]=base
    return clean

def payload(period,cohort,kind,offset=0):
    starts=kind.startswith('starts');landing=kind.endswith('landing')
    filters=[exact('hostName','brainilabgames.com')]
    if cohort=='googleOrganic': filters += [exact('sessionSource','google'),exact('sessionMedium','organic')]
    if starts:filters.append({'filter':{'fieldName':'eventName','inListFilter':{'values':EVENTS,'caseSensitive':True}}})
    dims=['landingPage'] if landing else []
    result={'dateRanges':[{'startDate':period['start'],'endDate':period['end']}],'dimensions':[{'name':d} for d in dims],
            'metrics':[{'name':m} for m in (['sessions','eventCount'] if starts or not landing else ['sessions'])],
            'dimensionFilter':{'andGroup':{'expressions':filters}},'limit':'1000','offset':str(offset)}
    if dims: result['orderBys']=[{'dimension':{'dimensionName':'landingPage'}}]
    return result

def decode(response,request):
    dims=[d['name'] for d in request['dimensions']];metrics=[m['name'] for m in request['metrics']]
    metadata=response.get('metadata',{});zone=metadata.get('timeZone')
    if not isinstance(zone,str) or not zone:raise ValueError('Missing GA4 timezone')
    flags={'thresholded':metadata.get('subjectToThresholding') is True,'sampled':bool(metadata.get('samplingMetadatas')),'otherRow':metadata.get('dataLossFromOtherRow') is True}
    rows=response.get('rows',[]);total=response.get('rowCount',0)
    if type(total) is not int or not 0<=total<=5000 or not dims and total>1:raise ValueError('Invalid/capped GA4 row count')
    # Google omits headers and rows for some empty samples. This is unknown,
    # never an inferred zero (even when keepEmptyRows is requested).
    if not rows and total==0:return {'rows':[],'rowCount':0,'timezone':zone,'quality':flags,'rowsWithheld':0}
    if [h['name'] for h in response.get('dimensionHeaders',[])]!=dims or [h['name'] for h in response.get('metricHeaders',[])]!=metrics:raise ValueError('Unexpected GA4 columns')
    clean=[];withheld=0
    for row in rows:
        keys=[d['value'] for d in row.get('dimensionValues',[])];vals=[m['value'] for m in row.get('metricValues',[])]
        if len(keys)!=len(dims) or len(vals)!=len(metrics) or any(not re.fullmatch(r'\d+',v) for v in vals):raise ValueError('Invalid GA4 row')
        item={k:count(int(v)) for k,v in zip(metrics,vals)}
        if dims:
            path=public_path(keys[0])
            if path is None or '?' in keys[0] or '#' in keys[0]:withheld+=1;continue
            item['path']=path;item['rawPath']=keys[0]
        clean.append(item)
    return {'rows':clean,'rowCount':total,'returnedRows':len(rows),'timezone':zone,'quality':flags,'rowsWithheld':withheld}

def query(private,period,cohort,kind,token,now,transport):
    rows=[];seen=set();offset=0;expected=None;flags={k:False for k in FLAGS};withheld=0;zone=None;collected=[]
    while True:
        request=payload(period,cohort,kind,offset);identity=hashlib.sha256(json.dumps(request,sort_keys=True).encode()).hexdigest()
        path=Path(private)/'play-session-query-cache'/str(now.date())/(identity+'.json')
        if path.exists(): record=json.loads(path.read_bytes())
        else:
            record={'observedAt':now.isoformat(),'requestSHA256':identity,'data':decode(transport(ENDPOINT,request,token),request)}
            api.private_write(path,record)
        if record.get('requestSHA256')!=identity or stamp(record['observedAt']).date()!=now.date():raise ValueError('Invalid query cache')
        data=record['data'];total=data['rowCount']
        if expected is not None and total!=expected or zone and zone!=data['timezone']:raise ValueError('Unstable GA4 pagination')
        expected=total;zone=data['timezone'];collected.append(record['observedAt']);withheld+=data['rowsWithheld'];quality(data['quality'])
        for row in data['rows']:
            identity=row.get('rawPath','total')
            if identity in seen or 'path' in row and public_path(row['path'])!=row['path']:raise ValueError('Invalid/duplicate Analytics dimension')
            seen.add(identity)
            for metric in ('sessions','eventCount'):
                if metric in row:count(row[metric])
            rows.append(row)
        for key in FLAGS:flags[key] |= data['quality'][key]
        offset += data.get('returnedRows',0)
        if offset==total:break
        if offset>total or data.get('returnedRows',0)==0:raise ValueError('Incomplete GA4 response')
    # landingPage is session scoped; normalised variants are disjoint dimension
    # rows. Never sum game and practice session counts; the event union is queried.
    merged={}
    for row in rows:
        key=row.get('path','total');entry=merged.setdefault(key,{k:0 for k in ('sessions','eventCount')})
        for k in ('sessions','eventCount'):
            if k in row:entry[k]+=row[k]
        if 'path' in row:entry['path']=row['path']
    return {'rows':list(merged.values()),'timezone':zone,'quality':flags,'rowsWithheld':withheld,'observedAt':min(collected)}

def collect(private,now=None,transport=api.request_json):
    now=now or datetime.now(timezone.utc);end=now.date()-timedelta(days=2);period={'start':str(end-timedelta(days=27)),'end':str(end)}
    token=api.access_token(scope=SCOPE,token_file='google-analytics-token.json');cohorts={};zones=set()
    cache=Path(private)/'measurement-latest.json';base=acquisition(json.loads(cache.read_bytes())) if cache.exists() else None
    for name in ('all','googleOrganic'):
        if name=='all' and base and base['period']==period:
            total={'rows':[{'sessions':base['sessions']}],'timezone':base['timezone'],'observedAt':base['observedAt'],'quality':{k:base['quality'][k] for k in FLAGS},'rowsWithheld':0}
        else:total=query(private,period,name,'baseline_totals',token,now,transport)
        started=query(private,period,name,'starts_totals',token,now,transport)
        landing=query(private,period,name,'baseline_landing',token,now,transport)
        playing=query(private,period,name,'starts_landing',token,now,transport)
        zones.update(x['timezone'] for x in (total,started,landing,playing))
        before={r['path']:r for r in landing['rows']};after={r['path']:r for r in playing['rows']}
        rows=[{'path':p,'sessions':before.get(p,{}).get('sessions'),'sessionsWithStart':after.get(p,{}).get('sessions'),'startEventCount':after.get(p,{}).get('eventCount')} for p in sorted(set(before)|set(after))]
        cohorts[name]={'sessions':total['rows'][0]['sessions'] if total['rows'] else None,'sessionsWithStart':started['rows'][0]['sessions'] if started['rows'] else None,
                       'startEventCount':started['rows'][0]['eventCount'] if started['rows'] else None,'baselineObservedAt':total['observedAt'],'startsObservedAt':started['observedAt'],
                       'landingBaselineObservedAt':landing['observedAt'],'landingStartsObservedAt':playing['observedAt'],
                       'quality':{k:any(x['quality'][k] for x in (total,started,landing,playing)) for k in FLAGS},'landingPages':rows,'rowsWithheld':landing['rowsWithheld']+playing['rowsWithheld']}
    if len(zones)!=1:raise ValueError('Mixed Analytics timezones')
    return validate({'schemaVersion':1,'collectorVersion':2,'property':PROPERTY,'source':'GA4 Data API','observedAt':now.isoformat(),'period':period,'timezone':zones.pop(),'startEvents':EVENTS,'cohorts':cohorts})

def _refresh(private,now=None,collector=collect):
    private=Path(private);now=now or datetime.now(timezone.utc);path=private/'play-sessions-latest.json';before=path.read_bytes() if path.exists() else None
    old=validate(json.loads(before)) if before else None
    if old and stamp(old['observedAt'])>now:raise ValueError('Refusing older collection time')
    if old and old['collectorVersion']==2 and stamp(old['observedAt']).date()==now.date() and old['period']['end']==str(now.date()-timedelta(days=2)):return {'reused':True,'observedAt':old['observedAt']}
    clean=collector(private,now=now);commit(private,'play-sessions',clean,validate,sha(before))
    return {'reused':False,'observedAt':clean['observedAt'],'cohorts':{k:{m:v.get(m) for m in ('sessions','sessionsWithStart','startEventCount')} for k,v in clean['cohorts'].items()}}

def refresh(private,now=None,collector=collect):return collection_lock(private,'play-sessions',lambda:_refresh(private,now,collector))

def attach(report,private):return attach_snapshot(report,private,'play-sessions','playSessions',validate)
