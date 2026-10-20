"""Dated first-party reputation observations. No invented authority score."""
from datetime import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import gsc_sync as api

DOMAIN = 'brainilabgames.com'


def stamp(value):
    try:
        return datetime.fromisoformat(value.replace('Z', '+00:00')).tzinfo is not None
    except (ValueError, TypeError, AttributeError):
        return False


def evidence(value):
    if not stamp(value['observedAt']) or not re.fullmatch('[a-f0-9]{64}', value['evidenceSha256']):
        raise ValueError('Missing dated UI evidence')
    if value.get('sourceUpdatedAt') is not None and not stamp(value['sourceUpdatedAt']):
        raise ValueError('Invalid source update time')
    return {k: value.get(k) for k in ('observedAt', 'sourceUpdatedAt', 'evidenceSha256')}


def validate(value):
    if value.get('schemaVersion') != 1 or value.get('domain') != DOMAIN:
        raise ValueError('Unexpected reputation evidence')
    result = {'schemaVersion': 1, 'domain': DOMAIN, 'source': 'google_search_console_ui'}
    for key in ('manualActions', 'securityIssues'):
        item = value[key]
        if item['state'] not in ('no_issues_reported', 'issues_reported', 'unavailable'):
            raise ValueError('Invalid first-party report state')
        result[key] = {**evidence(item), 'state': item['state']}
    item = value['links']; domains = item['referringSites']; targets = item['targetPages']
    total = item['externalLinks']
    if type(total) is not int or total < 0 or len(domains) > 1000 or len(targets) > 1000:
        raise ValueError('Invalid Google Links summary')
    clean_sites, clean_targets = [], []
    for row in domains:
        if not re.fullmatch(r'[a-z0-9-]+(?:\.[a-z0-9-]+)+', row['host']) or type(row['links']) is not int or row['links'] < 0:
            raise ValueError('Invalid referring site')
        clean_sites.append({'host': row['host'], 'links': row['links']})
    for row in targets:
        if not re.fullmatch(r'https://brainilabgames\.com/(?:[a-z0-9-]+/)*', row['url']) or type(row['links']) is not int or row['links'] < 0:
            raise ValueError('Invalid Google linked page')
        clean_targets.append({'url': row['url'], 'links': row['links']})
    if len({r['host'] for r in clean_sites}) != len(clean_sites) or len({r['url'] for r in clean_targets}) != len(clean_targets):
        raise ValueError('Duplicate reputation observations')
    if sum(r['links'] for r in clean_sites) > total or sum(r['links'] for r in clean_targets) > total:
        raise ValueError('Displayed summary exceeds the observed Google total')
    result['links'] = {**evidence(item), 'externalLinks': total,
                        'referringSites': clean_sites, 'targetPages': clean_targets}
    result['limitations'] = [
        'Search Console UI observation, not an API sync. Source update date may be unknown.',
        'The Links report is a sample accumulated by Google; links may have changed since discovery.',
        'Google-reported links and our current HTML verifications use different scopes. Do not add them.',
        'No issues reported is not an endorsement, safety guarantee or proof of algorithmic ranking status.',
        'Authority, editorial independence, expertise and global reputation have no numeric score here.',
    ]
    return result


def record(private, value, expected):
    private = Path(private); path = private / 'seo-reputation-latest.json'
    before = path.read_bytes() if path.exists() else None
    if (hashlib.sha256(before).hexdigest() if before else 'missing') != expected:
        raise RuntimeError('Reputation evidence changed; reread before recording')
    clean = validate(value)
    if before:
        old = validate(json.loads(before))
        for key in ('manualActions', 'securityIssues', 'links'):
            if datetime.fromisoformat(old[key]['observedAt'].replace('Z', '+00:00')) > datetime.fromisoformat(clean[key]['observedAt'].replace('Z', '+00:00')):
                raise ValueError('Older evidence cannot replace a newer observation')
    lock = private / 'seo-reputation.write-lock'
    descriptor = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    try:
        os.close(descriptor)
        if (path.read_bytes() if path.exists() else None) != before:
            raise RuntimeError('Reputation evidence changed concurrently')
        if before:
            api.private_write(private / 'seo-reputation-history' / (hashlib.sha256(before).hexdigest() + '.json'), json.loads(before))
        api.private_write(path, clean)
    finally:
        lock.unlink()
    return {'recorded': True, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}
