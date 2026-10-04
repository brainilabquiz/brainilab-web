"""Validated, private content observations. Never publish raw visitor data."""
import json
import re
from datetime import date, datetime


def validate(value):
    if value.get('schemaVersion') != 1 or value.get('property') != '555562532':
        raise ValueError('Wrong content measurement property or schema')
    if value.get('mode') not in ('manual_snapshot', 'api_snapshot'):
        raise ValueError('Unknown observation mode')
    if value.get('source') != ('GA4 Pages and screens UI' if value['mode'] == 'manual_snapshot' else 'GA4 Data API'):
        raise ValueError('Invalid content source')
    period=value['period']
    if date.fromisoformat(period['start']) > date.fromisoformat(period['end']):
        raise ValueError('Invalid period')
    if datetime.fromisoformat(value['observedAt']).tzinfo is None:
        raise ValueError('Timezone required')
    rows=value['rows']
    if not isinstance(rows,list) or len(rows)>1000:
        raise ValueError('Invalid row count')
    clean=[]; seen=set()
    for row in rows:
        path=row.get('path','')
        if not re.fullmatch(r'/learn/(?:[a-z0-9-]+/){0,2}',path) or path in seen:
            raise ValueError('Invalid or duplicate public path')
        seen.add(path)
        if row.get('kind') not in ('article','lesson','course','library'):
            raise ValueError('Invalid content type')
        for field in ('title','topic'):
            if not isinstance(row.get(field),str) or len(row[field])>300:
                raise ValueError('Invalid content label')
        courses=row.get('courses',[])
        if not isinstance(courses,list) or len(courses)>20 or any(not isinstance(c,str) or len(c)>200 for c in courses):
            raise ValueError('Invalid courses')
        item={k:row[k] for k in ('path','title','topic','kind')}; item['courses']=courses
        for field in ('views','activeUsers','readSignals'):
            val=row.get(field)
            if val is not None and (type(val) is not int or not 0<=val<=9007199254740991):
                raise ValueError('Invalid content count')
            item[field]=val
        clean.append(item)
    quality=value.get('quality',{})
    return dict(schemaVersion=1,property='555562532',mode=value['mode'],source=value['source'],observedAt=value['observedAt'],period={k:period[k] for k in ('start','end')},rows=clean,quality={k:quality.get(k) is True for k in ('thresholded','sampled','otherRow')})


def attach_content(report, private):
    path=private/'content-measurement-latest.json'
    if not path.exists():
        return report
    value=validate(json.loads(path.read_text(encoding='utf-8')))
    previous=report.get('contentMeasurement')
    if previous and datetime.fromisoformat(previous['observedAt'])>datetime.fromisoformat(value['observedAt']):
        return report
    return {**report,'contentMeasurement':value}
