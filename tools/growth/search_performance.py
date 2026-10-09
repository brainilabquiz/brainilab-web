"""Private search intelligence: observed queries and landing-page outcomes.

No session-to-keyword reconstruction. Google queries and Analytics outcomes stay
separate. Existing read-only authorizations are reused; no third-party service.
"""
import argparse
from datetime import date, datetime, timedelta, timezone
import json
import math
import re
from urllib.parse import urlsplit
import gsc_sync as google
from ga4_content import SCOPE, ENDPOINT

SCHEMA = 1
EVENTS = ('game_start', 'game_complete', 'practice_start', 'practice_complete', 'article_read', 'registration_request')
AI_HOSTS = ('chatgpt.com', 'chat.openai.com', 'perplexity.ai', 'claude.ai', 'gemini.google.com', 'copilot.microsoft.com')


def public_path(value):
    parsed = urlsplit(value)
    if parsed.netloc and (parsed.netloc != 'brainilabgames.com' or parsed.scheme != 'https'):
        return None
    path = parsed.path
    if path and not path.endswith('/'):
        path += '/'
    if not re.fullmatch(r'/(?:[a-z0-9-]+/)*', path) or path.startswith(('/admin/', '/account/', '/profile/')):
        return None
    return path  # Strip query strings, fragments and user-controlled identifiers.


def query_kind(query):
    text = ' '.join(query.lower().split())
    brand = bool(re.search(r'\bbraini\s*lab\b|brainilabgames', text))
    if brand:
        intent = 'brand'
    elif re.search(r'\b(quiz|quizzes|puzzle|puzzles|game|games|play)\b', text):
        intent = 'play'
    elif re.search(r'^(why|how|what|when|where|which|is|are|does|do)\b|\b(learn|meaning|explained)\b', text):
        intent = 'learn'
    else:
        intent = 'unreviewed'
    return {'brand': 'brand' if brand else 'non-brand', 'intent': intent}


def analytics_rows(token, start, end, dims, metrics, filters, transport):
    rows, seen, offset, expected, zone = [], set(), 0, None, None
    quality = {'thresholded': False, 'sampled': False, 'otherRow': False}
    while True:
        payload = {'dateRanges':[{'startDate':start,'endDate':end}],
                   'dimensions':[{'name':d} for d in dims], 'metrics':[{'name':m} for m in metrics],
                   'dimensionFilter':{'andGroup':{'expressions':filters}}, 'limit':'1000', 'offset':str(offset)}
        if dims:
            payload['orderBys'] = [{'dimension':{'dimensionName':d}} for d in dims]
        response = transport(ENDPOINT, payload, token)
        total = response.get('rowCount', 0)
        if type(total) is not int or total < 0 or total > 5000 or (expected is not None and total != expected):
            raise ValueError('Incomplete or unstable Analytics report')
        expected = total
        if [h['name'] for h in response.get('dimensionHeaders',[])] != dims or [h['name'] for h in response.get('metricHeaders',[])] != metrics:
            raise ValueError('Unexpected Analytics columns')
        meta = response.get('metadata', {})
        if not meta.get('timeZone') or (zone and zone != meta['timeZone']):
            raise ValueError('Missing or inconsistent Analytics timezone')
        zone = meta['timeZone']
        quality['thresholded'] |= meta.get('subjectToThresholding') is True
        quality['sampled'] |= bool(meta.get('samplingMetadatas'))
        quality['otherRow'] |= meta.get('dataLossFromOtherRow') is True
        batch = response.get('rows', [])
        if not batch and offset < total:
            raise ValueError('Truncated Analytics rows')
        for r in batch:
            keys = tuple(d['value'] for d in r.get('dimensionValues', []))
            vals = [m['value'] for m in r.get('metricValues', [])]
            if len(keys) != len(dims) or len(vals) != len(metrics) or keys in seen:
                raise ValueError('Invalid or duplicate Analytics row')
            seen.add(keys)
            numbers = [float(v) for v in vals]
            if any(not math.isfinite(v) or v < 0 for v in numbers):
                raise ValueError('Invalid Analytics metric')
            rows.append({**dict(zip(dims,keys)), **dict(zip(metrics,numbers))})
        offset += len(batch)
        if offset == total:
            return {'rows':rows,'timezone':zone,'quality':quality}
        if offset > total:
            raise ValueError('Invalid Analytics pagination')


def exact(field, value):
    return {'filter':{'fieldName':field,'stringFilter':{'matchType':'EXACT','value':value}}}


def collect_period(gsc_token, ga_token, start, end, transport=google.request_json):
    pairs = google.query(gsc_token,start,end,['query','page'],transport=transport)
    days = google.query(gsc_token,start,end,'date',transport=transport)
    segments = {d:google.query(gsc_token,start,end,d,transport=transport) for d in ('country','device')}
    queries = []; grouped = {}; withheld = 0
    for row in pairs:
        path = public_path(row['page'])
        q = row['query']
        # Minimize accidental sensitive search terms; they are not needed for triage.
        if not path or len(q)>200 or re.search(r'@|https?://|\b\d{7,}\b|[\x00-\x1f]', q):
            withheld += 1
            continue
        entry = grouped.setdefault((q,path),{'query':q,'path':path,**query_kind(q),'clicks':0,'impressions':0,'weightedPosition':0})
        entry['clicks'] += row['clicks']; entry['impressions'] += row['impressions']
        entry['weightedPosition'] += (row['position'] or 0)*row['impressions']
    for entry in grouped.values():
        weighted = entry.pop('weightedPosition'); impressions = entry['impressions']
        queries.append({**entry,'ctr':entry['clicks']/impressions if impressions else None,'position':weighted/impressions if impressions else None})
    filters = [exact('hostName','brainilabgames.com'),exact('sessionSource','google'),exact('sessionMedium','organic')]
    land = analytics_rows(ga_token,start,end,['landingPage'],['sessions','engagedSessions','keyEvents'],filters,transport)
    events = analytics_rows(ga_token,start,end,['landingPage','eventName'],['eventCount'],
                            filters+[{'filter':{'fieldName':'eventName','inListFilter':{'values':list(EVENTS)}}}],transport)
    sources = analytics_rows(ga_token,start,end,['sessionSourceMedium'],['sessions','engagedSessions'],[exact('hostName','brainilabgames.com')],transport)
    if len({x['timezone'] for x in (land,events,sources)}) != 1:
        raise ValueError('Mixed Analytics timezones')
    page_map = {}
    for row in land['rows']:
        path = public_path(row['landingPage'])
        if not path:
            continue
        found = {r['eventName']:r['eventCount'] for r in events['rows'] if r['landingPage']==row['landingPage']}
        entry=page_map.setdefault(path,{'path':path,'sessions':0,'engagedSessions':0,'keyEvents':0,'events':{event:None for event in EVENTS}})
        for k in ('sessions','engagedSessions','keyEvents'):
            entry[k] += row[k]
        for event in EVENTS:
            if event in found:
                entry['events'][event] = (entry['events'][event] or 0)+found[event]
    pages=list(page_map.values())
    ai = []
    for row in sources['rows']:
        label = row['sessionSourceMedium']
        host = label.split(' / ')[0].lower()
        if any(host == h or host.endswith('.'+h) for h in AI_HOSTS):
            ai.append({'source':label,'sessions':row['sessions'],'engagedSessions':row['engagedSessions']})
    return {'period':{'start':start,'end':end},'gscTimezone':'America/Los_Angeles','analyticsTimezone':land['timezone'],
            'queries':queries,'queryRowsWithheld':withheld,
            'searchTotals':{k:sum(r[k] for r in days) for k in ('clicks','impressions')},
            'segments':segments,'landingPages':pages,'aiReferrals':ai,
            'analyticsQuality':{k:any(x['quality'][k] for x in (land,events,sources)) for k in land['quality']},
            'pairCoverage':'Visible query/page rows only; not exhaustive. Pair impressions can count multiple URLs per search.',
            'outcomesScope':'GA4 google / organic sessions, by session landing page. Events may occur later in that session; no keyword attribution.'}


def validate(value):
    if value.get('schemaVersion') != SCHEMA or value.get('property') != google.PROPERTY or value.get('analyticsProperty') != '555562532':
        raise ValueError('Unexpected search performance source')
    if datetime.fromisoformat(value['observedAt']).tzinfo is None:
        raise ValueError('Timestamp requires timezone')
    current, previous = value['current'],value['previous']
    for part in (current,previous):
        period=part['period']
        if (date.fromisoformat(period['end'])-date.fromisoformat(period['start'])).days != 27:
            raise ValueError('Expected a complete 28-day window')
        if not part.get('analyticsTimezone') or part['gscTimezone'] != 'America/Los_Angeles':
            raise ValueError('Missing source timezone')
        if len(part['queries'])>5000 or len(part['landingPages'])>5000:
            raise ValueError('Too many rows for private report')
        for row in part['queries']:
            if public_path(row['path']) != row['path'] or not isinstance(row['query'],str):
                raise ValueError('Invalid query row')
            if any(type(row[k]) is not int or row[k]<0 for k in ('clicks','impressions')) or row['clicks']>row['impressions']:
                raise ValueError('Invalid query counts')
        for row in part['landingPages']:
            if public_path(row['path']) != row['path']:
                raise ValueError('Invalid landing page')
            if any(type(row[k]) not in (int,float) or not math.isfinite(row[k]) or row[k]<0 for k in ('sessions','engagedSessions','keyEvents')):
                raise ValueError('Invalid landing metrics')
    if date.fromisoformat(previous['period']['end'])+timedelta(days=1) != date.fromisoformat(current['period']['start']):
        raise ValueError('Comparison periods must be adjacent and non-overlapping')
    return value


def sync(now=None):
    now = now or datetime.now(timezone.utc)
    end=now.date()-timedelta(days=3); start=end-timedelta(days=27)
    target=google.PRIVATE/'search-performance-latest.json'
    original=target.read_bytes() if target.exists() else None
    old=validate(json.loads(original)) if original else None
    if old and datetime.fromisoformat(old['observedAt'])>now:
        raise ValueError('Refusing to replace a newer observation')
    if old and old.get('collectorVersion')==1 and old['current']['period']=={'start':str(start),'end':str(end)} and datetime.fromisoformat(old['observedAt']).date()==now.date():
        return {'reused':True,'observedAt':old['observedAt']}
    gsc=google.access_token(); ga=google.access_token(scope=SCOPE,token_file='google-analytics-token.json')
    current=collect_period(gsc,ga,str(start),str(end))
    previous=collect_period(gsc,ga,str(start-timedelta(days=28)),str(start-timedelta(days=1)))
    result=validate({'schemaVersion':SCHEMA,'collectorVersion':1,'property':google.PROPERTY,'analyticsProperty':'555562532',
                     'observedAt':now.isoformat(),'current':current,'previous':previous,
                     'method':'Observed Google data. Intent/brand labels use visible rules; no reconstructed keywords or keyword conversions.'})
    if (target.read_bytes() if target.exists() else None) != original:
        raise ValueError('Search performance changed during collection')
    if old:
        google.private_write(google.PRIVATE/'search-performance-history'/f'{now.strftime("%Y%m%dT%H%M%S%f")}.json',old)
    google.private_write(target,result)
    return {'reused':False,'queries':len(current['queries']),'landingPages':len(current['landingPages']),'observedAt':result['observedAt']}


def attach_search(report, private):
    path=private/'search-performance-latest.json'
    if not path.exists():
        return report
    result=validate(json.loads(path.read_text(encoding='utf-8')))
    old=report.get('searchPerformance')
    if old and datetime.fromisoformat(old['observedAt'])>datetime.fromisoformat(result['observedAt']):
        return report
    return {**report,'searchPerformance':result}


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--private',required=True)
    args=parser.parse_args()
    from pathlib import Path
    google.PRIVATE=Path(args.private).resolve()
    try:
        print(json.dumps(sync()))
    except (RuntimeError, ValueError, OSError, KeyError, TypeError):
        print('Search performance sync failed; last successful observation retained. No new authorization attempted.')
        raise SystemExit(1)
