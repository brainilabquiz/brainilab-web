"""Collect aggregate Learn views with a separately authorized Analytics token."""
import argparse
from datetime import date, datetime, timedelta, timezone
import json
from pathlib import Path
import gsc_sync as google
from content_measurement import validate

SCOPE='https://www.googleapis.com/auth/analytics.readonly'
PROPERTY='555562532'
ENDPOINT=f'https://analyticsdata.googleapis.com/v1beta/properties/{PROPERTY}:runReport'


def collect(token,start,end,inventory,transport=google.request_json):
    first,last=date.fromisoformat(start),date.fromisoformat(end)
    if first>last or (last-first).days>185 or last>datetime.now(timezone.utc).date()-timedelta(days=2):
        raise ValueError('Use 1–186 days ending at least two UTC days ago')
    indexed={r['path']:r for r in validate(inventory)['rows']}
    quality={'thresholded':False,'sampled':False,'otherRow':False}
    pages={};reads={}
    for reading in (False,True):
        metrics=['eventCount'] if reading else ['screenPageViews','activeUsers']
        filters=[{'filter':{'fieldName':'hostName','stringFilter':{'matchType':'EXACT','value':'brainilabgames.com'}}},
                 {'filter':{'fieldName':'pagePath','stringFilter':{'matchType':'BEGINS_WITH','value':'/learn/'}}}]
        if reading:filters.append({'filter':{'fieldName':'eventName','stringFilter':{'matchType':'EXACT','value':'article_read'}}})
        seen=set();offset=0;total=None
        while True:
            payload={'dateRanges':[{'startDate':start,'endDate':end}],'dimensions':[{'name':'pagePath'}],
                     'metrics':[{'name':m} for m in metrics],'dimensionFilter':{'andGroup':{'expressions':filters}},
                     'orderBys':[{'dimension':{'dimensionName':'pagePath'}}],'limit':'1000','offset':str(offset)}
            response=transport(ENDPOINT,payload,token)
            n=response.get('rowCount',0)
            if type(n) is not int or n>10000 or (total is not None and total!=n):raise ValueError('Unstable or capped GA4 result')
            total=n
            if [h['name'] for h in response.get('dimensionHeaders',[])]!=['pagePath'] or [h['name'] for h in response.get('metricHeaders',[])]!=metrics:
                raise ValueError('Unexpected GA4 columns')
            metadata=response.get('metadata',{})
            quality['thresholded'] |= metadata.get('subjectToThresholding') is True
            quality['sampled'] |= bool(metadata.get('samplingMetadatas'))
            quality['otherRow'] |= metadata.get('dataLossFromOtherRow') is True
            batch=response.get('rows',[])
            if not batch and offset<total:raise ValueError('Incomplete GA4 response')
            for row in batch:
                path=row['dimensionValues'][0]['value']
                if path in seen:raise ValueError('Duplicate GA4 path')
                seen.add(path)
                values=[int(v['value']) for v in row['metricValues']]
                if len(values)!=len(metrics) or any(v<0 for v in values):raise ValueError('Invalid GA4 count')
                if path not in indexed:continue
                if reading:reads[path]=values[0]
                else:pages[path]=dict(views=values[0],activeUsers=values[1])
            offset+=len(batch)
            if offset==total:break
            if offset>total:raise ValueError('Invalid GA4 pagination')
    rows=[{**r,**pages.get(p,{'views':None,'activeUsers':None}),'readSignals':reads.get(p)} for p,r in indexed.items()]
    return validate(dict(schemaVersion=1,property=PROPERTY,mode='api_snapshot',source='GA4 Data API',observedAt=datetime.now(timezone.utc).isoformat(),period={'start':start,'end':end},quality=quality,rows=rows))


def sync(start,end):
    path=google.PRIVATE/'content-measurement-latest.json'
    inventory=json.loads(path.read_text(encoding='utf-8'))
    result=collect(google.access_token(scope=SCOPE,token_file='google-analytics-token.json'),start,end,inventory)
    # Both API queries must succeed before replacing the last successful report.
    previous=json.loads(path.read_text(encoding='utf-8'))
    google.private_write(google.PRIVATE/'content-history'/f"{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%f')}.json",previous)
    google.private_write(path,result)
    return {'rows':len(result['rows']),'period':result['period'],'observedAt':result['observedAt']}


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action',choices=['status','authorize','sync'])
    parser.add_argument('--private',type=Path,default=google.PRIVATE)
    parser.add_argument('--start');parser.add_argument('--end')
    args=parser.parse_args();google.PRIVATE=args.private.resolve()
    try:
        if args.action=='authorize':
            google.authorize(scope=SCOPE,token_file='google-analytics-token.json',label='Analytics')
        elif args.action=='sync':
            if not args.start or not args.end:raise ValueError('Dates required')
            print(json.dumps(sync(args.start,args.end)))
        else:print(json.dumps({'authorizationStored':(google.PRIVATE/'google-analytics-token.json').exists(),'property':PROPERTY,'scope':SCOPE,'verified':False,'note':'Only a successful sync verifies report access.'}))
    except (ValueError,RuntimeError,OSError,KeyError,TypeError):
        print('Analytics collection/setup did not finish. The last successful content report is retained. Check authorization, inventory and dates.');raise SystemExit(1)
