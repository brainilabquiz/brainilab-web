"""Read GA4 session acquisition with the existing Analytics-only authorization."""
import argparse
from datetime import date, datetime, timedelta, timezone
import json
from pathlib import Path
import re
import gsc_sync as google
from ga4_content import SCOPE, ENDPOINT
from acquisition import validate, PROPERTY


def collect(token,start,end,transport=google.request_json):
    first,last=date.fromisoformat(start),date.fromisoformat(end)
    if first>last or (last-first).days>185 or last>datetime.now(timezone.utc).date()-timedelta(days=2):
        raise ValueError('Use 1–186 days ending at least two UTC days ago')
    quality={k:False for k in ('thresholded','sampled','otherRow','labelsWithheld')}
    result={}; zones=set()
    specs=[('totals',[],['sessions','engagedSessions','eventCount']),('channels',['sessionDefaultChannelGroup'],['sessions','engagedSessions']),('sources',['sessionSourceMedium'],['sessions','engagedSessions'])]
    for key,dims,metrics in specs:
        collected=[];seen=set();offset=0;total=None
        while True:
            payload={'dateRanges':[{'startDate':start,'endDate':end}], 'dimensions':[{'name':d} for d in dims], 'metrics':[{'name':m} for m in metrics], 'dimensionFilter':{'filter':{'fieldName':'hostName','stringFilter':{'matchType':'EXACT','value':'brainilabgames.com'}}}, 'limit':'1000','offset':str(offset)}
            if dims: payload['orderBys']=[{'dimension':{'dimensionName':dims[0]}}]
            response=transport(ENDPOINT,payload,token)
            n=response.get('rowCount',0)
            if type(n) is not int or n<0 or n>10000 or (total is not None and n!=total):
                raise ValueError('Unstable or capped acquisition response')
            total=n
            if [h['name'] for h in response.get('dimensionHeaders',[])]!=dims or [h['name'] for h in response.get('metricHeaders',[])]!=metrics:
                raise ValueError('Unexpected acquisition columns')
            meta=response.get('metadata',{});zones.add(meta.get('timeZone'))
            quality['thresholded'] |= meta.get('subjectToThresholding') is True
            quality['sampled'] |= bool(meta.get('samplingMetadatas'))
            quality['otherRow'] |= meta.get('dataLossFromOtherRow') is True
            batch=response.get('rows',[])
            if not batch and offset<total: raise ValueError('Incomplete acquisition response')
            for row in batch:
                raw=row.get('dimensionValues',[])
                if len(raw)!=len(dims) or len(row['metricValues'])!=len(metrics):raise ValueError('Unexpected acquisition row')
                label=raw[0]['value'] if dims else 'total'
                if label in seen:raise ValueError('Duplicate acquisition row')
                seen.add(label)
                values=[v['value'] for v in row['metricValues']]
                if any(not re.fullmatch(r'\d+',v) for v in values):raise ValueError('Invalid GA4 count')
                item=dict(zip(metrics,map(int,values)))
                if dims:
                    # Source parameters are uncontrolled inputs. Keep only plain labels;
                    # never persist email addresses, query strings or arbitrary URLs.
                    if not re.fullmatch(r'[A-Za-z0-9._ ()/\-]{1,180}',label):
                        label='Withheld source';quality['labelsWithheld']=True
                    item['label']=label
                collected.append(item)
            offset+=len(batch)
            if offset==total:break
            if offset>total:raise ValueError('Invalid acquisition pagination')
        if key=='totals':
            if len(collected)>1:raise ValueError('Invalid acquisition totals')
            result.update(collected[0] if collected else {'sessions':None,'engagedSessions':None,'eventCount':None})
        else:
            grouped={}
            for row in collected:
                item=grouped.setdefault(row['label'],{'label':row['label'],'sessions':0,'engagedSessions':0})
                for metric in ('sessions','engagedSessions'):item[metric]+=row[metric]
            result[key]=list(grouped.values())
    if len(zones)!=1 or None in zones:raise ValueError('Missing or inconsistent GA4 timezone')
    result['events']=result.pop('eventCount')
    return validate({**result,'schemaVersion':2,'property':PROPERTY,'mode':'api_snapshot','source':'GA4 Data API','observedAt':datetime.now(timezone.utc).isoformat(),'timezone':zones.pop(),'period':{'start':start,'end':end},'quality':quality})


def sync(start,end,now=None):
    now=now or datetime.now(timezone.utc)
    target=google.PRIVATE/'measurement-latest.json'
    original=target.read_bytes() if target.exists() else None
    previous=json.loads(original) if original else None
    if previous and previous.get('schemaVersion')==2:
        previous=validate(previous)
        if previous['period']=={'start':start,'end':end} and datetime.fromisoformat(previous['observedAt']).date()==now.date():
            return {'reused':True,'period':previous['period'],'observedAt':previous['observedAt']}
        if datetime.fromisoformat(previous['observedAt'])>now:raise ValueError('Refuse older observation')
    result=collect(google.access_token(scope=SCOPE,token_file='google-analytics-token.json'),start,end)
    if (target.read_bytes() if target.exists() else None)!=original:raise ValueError('Acquisition snapshot changed during collection')
    if previous:google.private_write(google.PRIVATE/'measurement-history'/f"{now.strftime('%Y%m%dT%H%M%S%f')}.json",previous)
    google.private_write(target,result)
    return {'reused':False,'period':result['period'],'observedAt':result['observedAt'],'sessions':result['sessions'],'channels':len(result['channels']),'sources':len(result['sources']),'quality':result['quality']}


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--private',type=Path,default=google.PRIVATE)
    p.add_argument('--start');p.add_argument('--end')
    args=p.parse_args();google.PRIVATE=args.private.resolve()
    last=datetime.now(timezone.utc).date()-timedelta(days=2)
    try:print(json.dumps(sync(args.start or (last-timedelta(days=27)).isoformat(),args.end or last.isoformat())))
    except (RuntimeError,ValueError,OSError,KeyError,TypeError):
        print('Acquisition sync failed; previous observation retained. Check the authorized Analytics connection and report compatibility.');raise SystemExit(1)
