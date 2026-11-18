"""Additional first-party search sources, kept separate from Web query totals."""
from datetime import date, datetime, timedelta, timezone
import hashlib
import json
import math
import os
from pathlib import Path
import re
from urllib.parse import quote, urlsplit
import gsc_sync as api
from seo_keywords import safe_query

SOURCES = {'images': ('image', ['query'], 'byProperty'),
           'webPages': ('web', ['query', 'page'], 'byPage')}


def collect_breakdown(now=None, transport=api.request_json, token=None):
    """Read final property counts using the November 2026 Search Console options."""
    now = now or datetime.now(timezone.utc)
    end = now.date() - timedelta(days=3)
    start = end - timedelta(days=27)
    countries = ('ESP', 'GBR', 'USA')
    devices = ('DESKTOP', 'MOBILE')
    brands = {('BRANDED',), ('NON_BRANDED',)}
    market_devices = {(country.lower(), device) for country in countries for device in devices}
    common = {'startDate': str(start), 'endDate': str(end), 'dataState': 'final',
              'aggregationType': 'byProperty', 'rowLimit': 20}
    requests = {
        'webText': ({'type': 'web'}, {()}),
        'webMultimodal': ({'type': 'webMultimodal'}, {()}),
        'brandedClassification': ({'type': 'web', 'dimensions': ['brandedClassification']}, brands),
        'marketsAndDevices': ({
            'type': 'web', 'dimensions': ['country', 'device'],
            'dimensionFilterGroups': [{'groupType': 'and', 'filterLists': [
                {'dimension': 'country', 'expressions': list(countries)},
                {'dimension': 'device', 'expressions': list(devices)},
            ]}],
        }, market_devices),
    }
    token = token or api.access_token()
    endpoint = 'https://www.googleapis.com/webmasters/v3/sites/' + quote(api.PROPERTY, safe='') + '/searchAnalytics/query'
    sources = {}
    for name, (spec, allowed_keys) in requests.items():
        source = {'searchType': spec['type'], 'aggregation': 'byProperty', 'rows': []}
        try:
            response = transport(endpoint, {**common, **spec}, token)
            source['rows'] = breakdown_rows(response, allowed_keys)
            source['status'] = 'observed' if source['rows'] else 'no_rows'
        except (KeyError, TypeError, ValueError, RuntimeError):
            source['status'] = 'unavailable'
        sources[name] = source
    return {
        'schemaVersion': 1, 'property': api.PROPERTY, 'observedAt': now.isoformat(),
        'source': 'google_search_console_api', 'dataState': 'final', 'timezone': 'America/Los_Angeles',
        'period': {'start': str(start), 'end': str(end)},
        'marketFilter': {'countries': list(countries), 'devices': list(devices)},
        'sources': sources,
    }


def breakdown_rows(response, allowed_keys):
    if not isinstance(response, dict) or response.get('responseAggregationType') != 'byProperty':
        raise ValueError('Unexpected Google aggregation')
    rows = response.get('rows', [])
    if not isinstance(rows, list) or len(rows) > len(allowed_keys):
        raise ValueError('Unexpected Google rows')
    clean = []
    seen = set()
    for row in rows:
        if not isinstance(row, dict):
            raise ValueError('Unexpected Google row')
        keys = row.get('keys', [])
        if not isinstance(keys, list) or any(not isinstance(value, str) for value in keys):
            raise ValueError('Unexpected Google dimension keys')
        key = tuple(keys)
        clicks, impressions = row['clicks'], row['impressions']
        if key not in allowed_keys or key in seen:
            raise ValueError('Unexpected Google dimension keys')
        if any(type(count) not in (int, float) or not math.isfinite(count) or count != int(count)
               for count in (clicks, impressions)) or not 0 <= clicks <= impressions:
            raise ValueError('Invalid Google metric range')
        seen.add(key)
        clean.append({'group': list(key), 'clicks': int(clicks), 'impressions': int(impressions)})
    return sorted(clean, key=lambda row: row['group'])


def page_path(value):
    if not isinstance(value, str): return None
    p = urlsplit(value)
    if p.scheme != 'https' or p.netloc != 'brainilabgames.com' or p.query or p.fragment: return None
    if not re.fullmatch(r'/(?:[a-z0-9-]+/)*', p.path) or re.match(r'^/(admin|auth|account|profile)(/|$)', p.path): return None
    return p.path


def validate(value):
    if value.get('schemaVersion') != 1 or value.get('property') != api.PROPERTY: raise ValueError('Unexpected discovery property')
    observed = datetime.fromisoformat(value['observedAt'].replace('Z', '+00:00'))
    if not observed.tzinfo: raise ValueError('Missing discovery timezone')
    first, last = (date.fromisoformat(value['period'][k]) for k in ('start', 'end'))
    if (last-first).days != 89 or last > observed.date()-timedelta(days=3): raise ValueError('Expected complete 90-day discovery window')
    clean = {'schemaVersion':1, 'property':api.PROPERTY, 'observedAt':value['observedAt'],
             'source':'google_search_console_api', 'dataState':'final', 'timezone':'America/Los_Angeles',
             'period':{'start':str(first),'end':str(last)}}
    for key, (kind, dims, aggregation) in SOURCES.items():
        item=value[key]
        if item['searchType'] != kind or item['aggregation'] != aggregation: raise ValueError('Mixed search source')
        rows, seen = [], set()
        if type(item['rowsWithheld']) is not int or item['rowsWithheld'] < 0: raise ValueError('Invalid withheld count')
        for r in item['rows']:
            q=r['query']; path=r.get('path') if key=='webPages' else None
            if not safe_query(q) or key=='webPages' and page_path('https://brainilabgames.com'+str(path)) != path: raise ValueError('Invalid public query/page')
            identity=(q,path)
            if identity in seen: raise ValueError('Duplicate discovery row')
            seen.add(identity)
            c,i,p=r['clicks'],r['impressions'],r['position']
            if any(type(n) is not int or n<0 for n in (c,i)) or c>i: raise ValueError('Invalid discovery counts')
            if p is not None and (type(p) not in (int,float) or not math.isfinite(p) or p<0): raise ValueError('Invalid average position')
            row={'query':q,'clicks':c,'impressions':i,'ctr':c/i if i else None,'position':p if i else None}
            if key=='webPages': row['path']=path
            rows.append(row)
        if len(rows)>50000: raise ValueError('Discovery row cap exceeded')
        clean[key]={'searchType':kind,'aggregation':aggregation,'rows':rows,'rowsWithheld':item['rowsWithheld']}
    clean['limitations']=[
        'Google Images and Web text Search are separate result types. Never add their counts.',
        'Query/page impressions are not query-only property impressions. The 90-day window overlaps the current 28-day window.',
        'Visible top rows only, all markets and no language filter. Google may hide queries; missing evidence is not zero demand.',
        'Historical average position is not a live rank, search volume, keyword difficulty or a forecast.',
    ]
    return clean


def collect(now=None, transport=api.request_json, token=None):
    now=now or datetime.now(timezone.utc); token=token or api.access_token()
    end=now.date()-timedelta(days=3); start=end-timedelta(days=89)
    result={'schemaVersion':1,'property':api.PROPERTY,'observedAt':now.isoformat(),'period':{'start':str(start),'end':str(end)}}
    for key,(kind,dims,aggregation) in SOURCES.items():
        def request(url,payload,access):
            return transport(url,{**payload,'type':kind,'aggregationType':aggregation},access)
        raw=api.query(token,str(start),str(end),dims,transport=request)
        rows=[]
        for r in raw:
            q=r['query'] if key=='webPages' else r['value']
            path=page_path(r['page']) if key=='webPages' else None
            if not safe_query(q) or key=='webPages' and path is None: continue
            row={'query':q,**{k:r[k] for k in ('clicks','impressions','position')}}
            if path is not None: row['path']=path
            rows.append(row)
        result[key]={'searchType':kind,'aggregation':aggregation,'rows':rows,'rowsWithheld':len(raw)-len(rows)}
    return validate(result)


def refresh(private, now=None, collector=collect):
    private=Path(private); now=now or datetime.now(timezone.utc)
    path=private/'seo-search-sources-latest.json'; before=path.read_bytes() if path.exists() else None
    prior=validate(json.loads(before)) if before else None
    if prior and prior['observedAt'][:10]==str(now.date()) and prior['period']['end']==str(now.date()-timedelta(days=3)):
        return {'reused':True,'images':len(prior['images']['rows']),'queryPages':len(prior['webPages']['rows'])}
    lock=private/'seo-search-sources.write-lock'; fd=os.open(lock,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
    try:
        os.close(fd); clean=validate(collector(now=now))
        if (path.read_bytes() if path.exists() else None)!=before: raise RuntimeError('Discovery changed concurrently')
        if before: api.private_write(private/'seo-search-sources-history'/(hashlib.sha256(before).hexdigest()+'.json'),json.loads(before))
        api.private_write(path,clean)
        return {'reused':False,'images':len(clean['images']['rows']),'queryPages':len(clean['webPages']['rows'])}
    finally: lock.unlink()
