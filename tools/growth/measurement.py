"""Attach a dated, private GA4 observation without pretending it is a live API sync."""
import json
from content_measurement import attach_content
from datetime import date, datetime


def attach_measurement(report, private):
    report = attach_content(report, private)
    path = private / 'measurement-latest.json'
    if not path.exists():
        return report
    value = json.loads(path.read_text(encoding='utf-8'))
    if value.get('source') != 'GA4 traffic acquisition UI' or value.get('mode') != 'manual_snapshot':
        raise ValueError('Unsupported measurement source')
    period = value['period']
    if date.fromisoformat(period['end']) < date.fromisoformat(period['start']):
        raise ValueError('Invalid period')
    if datetime.fromisoformat(value['observedAt']).tzinfo is None:
        raise ValueError('Observation needs timezone')
    for key in ['sessions', 'directSessions', 'engagedSessions', 'events']:
        if type(value.get(key)) is not int or value[key] < 0:
            raise ValueError('Invalid count')
    if value['directSessions'] > value['sessions'] or value['engagedSessions'] > value['sessions']:
        raise ValueError('Invalid session subset')
    # Deliberately expose only verified counts, never arbitrary account data or a
    # guessed organic conversion count. A missing channel row is not a funnel.
    clean = {k: value[k] for k in ['source','mode','observedAt','sessions','directSessions','engagedSessions','events']}
    clean['period'] = {k: period[k] for k in ['start','end']}
    return {**report, 'measurement': clean}
