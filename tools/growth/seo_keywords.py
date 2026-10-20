"""Visible query-only Search Console evidence, separate from query/page totals."""
from datetime import date, datetime, timedelta, timezone
import hashlib
import json
import math
import os
from pathlib import Path
import re
import gsc_sync as api


def safe_query(value):
    return isinstance(value, str) and 0 < len(value) <= 200 and not re.search(r'@|https?://|\b\d{7,}\b|[\x00-\x1f]', value)


def validate(value):
    if value.get('schemaVersion') != 1 or value.get('property') != api.PROPERTY:
        raise ValueError('Unexpected keyword source')
    observed = datetime.fromisoformat(value['observedAt'].replace('Z', '+00:00'))
    if not observed.tzinfo:
        raise ValueError('Missing keyword observation timezone')
    result = {'schemaVersion': 1, 'property': api.PROPERTY, 'observedAt': value['observedAt'],
              'source': 'google_search_console_api', 'dataState': 'final',
              'aggregation': 'byProperty', 'timezone': 'America/Los_Angeles'}
    for window, days in [('current', 28), ('discovery', 90)]:
        source = value[window]
        first, last = (date.fromisoformat(source['period'][k]) for k in ('start', 'end'))
        if (last - first).days != days - 1 or last > observed.date() - timedelta(days=3):
            raise ValueError('Unexpected complete keyword window')
        rows, seen = [], set()
        for row in source['queries']:
            q = row['query']
            if not safe_query(q) or q in seen:
                raise ValueError('Invalid or duplicate query')
            seen.add(q)
            clicks, impressions = row['clicks'], row['impressions']
            if any(type(v) is not int or v < 0 for v in (clicks, impressions)) or clicks > impressions:
                raise ValueError('Invalid keyword counts')
            position = row['position']
            if position is not None and (type(position) not in (int, float) or not math.isfinite(position) or position < 0):
                raise ValueError('Invalid observed average position')
            rows.append({'query': q, 'clicks': clicks, 'impressions': impressions,
                         'ctr': clicks / impressions if impressions else None,
                         'position': position if impressions else None})
        withheld = source['rowsWithheld']
        if type(withheld) is not int or withheld < 0 or len(rows) > 50000:
            raise ValueError('Invalid keyword coverage')
        result[window] = {'period': {'start': first.isoformat(), 'end': last.isoformat()},
                          'queries': rows, 'rowsWithheld': withheld}
    if result['current']['period']['end'] != result['discovery']['period']['end']:
        raise ValueError('Different keyword window endings')
    result['limitations'] = [
        'Visible query-only property aggregation, not query/page impressions or all searches.',
        'The 90-day window overlaps the 28-day window. Never add their counts or call the difference growth.',
        'Google may omit anonymised queries and returns top rows. Missing rows are not zero demand.',
        'Historical average position is not a live rank. Search volume and keyword difficulty are unmeasured.',
    ]
    return result


def collect(now=None, transport=api.request_json, token=None):
    now = now or datetime.now(timezone.utc)
    token = token or api.access_token()
    end = now.date() - timedelta(days=3)
    result = {'schemaVersion': 1, 'property': api.PROPERTY, 'observedAt': now.isoformat()}
    def property_request(url, payload, access):
        return transport(url, {**payload, 'aggregationType': 'byProperty'}, access)
    for window, days in [('current', 28), ('discovery', 90)]:
        start = end - timedelta(days=days - 1)
        rows = api.query(token, start.isoformat(), end.isoformat(), 'query', transport=property_request)
        result[window] = {'period': {'start': start.isoformat(), 'end': end.isoformat()},
                          'rowsWithheld': sum(not safe_query(r['value']) for r in rows),
                          'queries': [{'query': r['value'], **{k: r[k] for k in ('clicks', 'impressions', 'ctr', 'position')}}
                                      for r in rows if safe_query(r['value'])]}
    return validate(result)


def refresh(private, now=None, collector=collect):
    private = Path(private); now = now or datetime.now(timezone.utc)
    path = private / 'seo-keywords-latest.json'
    before = path.read_bytes() if path.exists() else None
    prior = validate(json.loads(before)) if before else None
    end = (now.date() - timedelta(days=3)).isoformat()
    if prior and prior['observedAt'][:10] == now.date().isoformat() and prior['current']['period']['end'] == end:
        return {'reused': True, 'queries': len(prior['discovery']['queries'])}
    lock = private / 'seo-keywords.write-lock'
    descriptor = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    try:
        os.close(descriptor)
        clean = validate(collector(now=now))
        if (path.read_bytes() if path.exists() else None) != before:
            raise RuntimeError('Keywords changed concurrently')
        if before:
            api.private_write(private / 'seo-keywords-history' / (hashlib.sha256(before).hexdigest() + '.json'), json.loads(before))
        api.private_write(path, clean)
        return {'reused': False, 'queries': len(clean['discovery']['queries'])}
    finally:
        lock.unlink()
