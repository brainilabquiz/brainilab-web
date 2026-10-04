"""Validated aggregate acquisition snapshots; no visitor-level data."""
from datetime import date, datetime
import re

PROPERTY = '555562532'
METRICS = ('sessions', 'engagedSessions', 'events')


def count(value):
    if value is not None and (type(value) is not int or not 0 <= value <= 9007199254740991):
        raise ValueError('Invalid acquisition count')
    return value


def validate(value):
    if value.get('schemaVersion') != 2 or value.get('property') != PROPERTY or value.get('mode') != 'api_snapshot' or value.get('source') != 'GA4 Data API':
        raise ValueError('Unsupported acquisition snapshot')
    period = value['period']
    if date.fromisoformat(period['start']) > date.fromisoformat(period['end']):
        raise ValueError('Invalid acquisition period')
    if datetime.fromisoformat(value['observedAt']).tzinfo is None:
        raise ValueError('Observation timezone required')
    zone = value.get('timezone')
    if not isinstance(zone, str) or not re.fullmatch(r'[A-Za-z0-9_+/:-]{1,80}', zone):
        raise ValueError('GA4 property timezone required')
    result = {k: value[k] for k in ('schemaVersion','property','mode','source','observedAt','timezone')}
    result['period'] = {k: period[k] for k in ('start','end')}
    result.update({k: count(value.get(k)) for k in METRICS})
    for key in ('channels','sources'):
        rows = value.get(key)
        if not isinstance(rows,list) or len(rows)>10000:
            raise ValueError('Invalid acquisition rows')
        clean=[]; seen=set()
        for row in rows:
            label=row['label']
            if not isinstance(label,str) or not re.fullmatch(r'[A-Za-z0-9._ ()/\-]{1,180}',label) or label in seen:
                raise ValueError('Invalid or duplicate acquisition label')
            seen.add(label)
            item={'label':label, **{k:count(row.get(k)) for k in ('sessions','engagedSessions')}}
            if item['sessions'] is None or item['engagedSessions'] is None or item['engagedSessions']>item['sessions']:
                raise ValueError('Invalid acquisition session subset')
            clean.append(item)
        result[key]=sorted(clean,key=lambda r:(-r['sessions'],r['label']))
    if result['sessions'] is not None and result['engagedSessions'] is not None and result['engagedSessions']>result['sessions']:
        raise ValueError('Invalid total session subset')
    result['directSessions']=next((r['sessions'] for r in result['channels'] if r['label']=='Direct'),None)
    result['quality']={k:value.get('quality',{}).get(k) is True for k in ('thresholded','sampled','otherRow','labelsWithheld')}
    return result
