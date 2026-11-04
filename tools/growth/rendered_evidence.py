"""Dated public DOM observations, never added to returned-HTML backlinks."""
import argparse
from datetime import datetime, timezone
import hashlib
import ipaddress
import json
import os
from pathlib import Path
import re
from urllib.parse import urlsplit
import gsc_sync as api

DOMAIN = 'brainilabgames.com'
FIELD = 'renderedEvidence'
FILE = 'rendered-evidence-latest.json'
REL = {'nofollow', 'ugc', 'sponsored', 'noopener', 'noreferrer'}
ORIGINS = {'published_listing', 'owner_submitted_listing', 'reviewed_public_candidate', 'google_links_report'}


def timestamp(value):
    if not isinstance(value, str): raise ValueError('A dated DOM capture is required')
    try: at = datetime.fromisoformat(value.replace('Z', '+00:00'))
    except ValueError: raise ValueError('Invalid DOM capture date') from None
    if at.tzinfo is None or at > datetime.now(timezone.utc): raise ValueError('Invalid DOM capture date')
    return at


def public_url(value, own=False):
    if not isinstance(value, str) or len(value) > 1000: return False
    try:
        u = urlsplit(value); host = u.hostname or ''
        if u.scheme != 'https' or u.username or u.password or u.port or u.query or u.fragment: return False
        if not re.fullmatch(r'[a-z0-9-]+(?:\.[a-z0-9-]+)+', host): return False
        if host.endswith(('.local', '.localhost', '.internal', '.test')): return False
        try: ipaddress.ip_address(host); return False
        except ValueError: pass
        if host in {'mail.google.com', 'accounts.google.com', 'drive.google.com', 'docs.google.com', 'outlook.live.com', 'login.live.com'}: return False
        if own != (host == DOMAIN): return False
        if not re.fullmatch(r'/[a-zA-Z0-9/_.~-]*', u.path): return False
        if re.search(r'/(admin|auth|account|profile|dashboard|settings|login|sign-in|edit)(/|$)', u.path, re.I): return False
        return value == 'https://' + host + u.path
    except ValueError: return False


def validate(value):
    if not isinstance(value, dict) or value.get('schemaVersion') != 1 or value.get('domain') != DOMAIN:
        raise ValueError('Unexpected public DOM evidence')
    rows = value.get('observations')
    if not isinstance(rows, list) or len(rows) > 1000: raise ValueError('Invalid DOM evidence scope')
    clean = {}
    for row in rows:
        if not isinstance(row, dict) or not public_url(row.get('sourceUrl')) or not public_url(row.get('targetUrl'), own=True):
            raise ValueError('Only public external sources and BrainiLab destinations are accepted')
        timestamp(row.get('observedAt'))
        if not re.fullmatch('[a-f0-9]{64}', row.get('evidenceSha256', '')): raise ValueError('Missing exact DOM capture hash')
        if row.get('method') != 'saved_browser_dom' or row.get('discovery') not in ORIGINS: raise ValueError('Missing DOM provenance')
        anchor = row.get('anchor')
        if not isinstance(anchor, str) or len(anchor) > 180 or '@' in anchor or any(ord(c) < 32 for c in anchor): raise ValueError('Invalid public anchor')
        rel = row.get('rel')
        if not isinstance(rel, list) or any(not isinstance(r, str) or r not in REL for r in rel): raise ValueError('Invalid DOM link attributes')
        if row.get('canonical') is not None and not public_url(row['canonical']): raise ValueError('Invalid public canonical declaration')
        schema = row.get('structuredData')
        if not isinstance(schema, dict) or any(k not in schema or (schema[k] is not None and (type(schema[k]) is not int or not 0 <= schema[k] <= 100000)) for k in ('jsonldBlocks', 'microdataElements', 'rdfaElements')):
            raise ValueError('Schema observations must be explicit counts or unknown')
        item = {k: row[k] for k in ('sourceUrl', 'targetUrl', 'anchor', 'observedAt', 'evidenceSha256', 'method', 'discovery')}
        item.update(rel=sorted(set(rel)), canonical=row.get('canonical'), structuredData={k: schema[k] for k in ('jsonldBlocks', 'microdataElements', 'rdfaElements')})
        key = (item['sourceUrl'], item['targetUrl'], tuple(item['rel']))
        if key in clean and clean[key] != item: raise ValueError('Conflicting duplicate DOM evidence')
        clean[key] = item
    return {'schemaVersion': 1, 'domain': DOMAIN, 'observations': [clean[k] for k in sorted(clean)]}


def merge(values):
    rows = {}
    for value in values:
        if value is None: continue
        for row in validate(value)['observations']:
            key = (row['sourceUrl'], row['targetUrl'], tuple(row['rel'])); old = rows.get(key)
            if old and timestamp(old['observedAt']) == timestamp(row['observedAt']) and old != row:
                raise ValueError('Conflicting captures at the same time')
            if not old or timestamp(row['observedAt']) > timestamp(old['observedAt']): rows[key] = row
    return validate({'schemaVersion': 1, 'domain': DOMAIN, 'observations': list(rows.values())})


def record(private, value, expected):
    private = Path(private); path = private / FILE; before = path.read_bytes() if path.exists() else None
    if (hashlib.sha256(before).hexdigest() if before is not None else 'missing') != expected: raise RuntimeError('DOM evidence changed; reread before recording')
    old = validate(json.loads(before)) if before else None; clean = merge([old, value])
    if old == clean: return {'reused': True, 'sha256': expected}
    private.mkdir(parents=True, exist_ok=True); lock = private / 'rendered-evidence.write-lock'
    fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    try:
        os.close(fd)
        if (path.read_bytes() if path.exists() else None) != before: raise RuntimeError('DOM evidence changed concurrently')
        if before: api.private_write(private / 'rendered-evidence-history' / (hashlib.sha256(before).hexdigest() + '.json'), json.loads(before))
        api.private_write(path, clean)
    finally: lock.unlink()
    return {'reused': False, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}


def attach(snapshot, private, candidates=()):
    values = [s.get(FIELD) for s in (snapshot, *candidates) if isinstance(s, dict)]
    path = Path(private) / FILE
    if path.exists():
        try: values.append(json.loads(path.read_text(encoding='utf-8')))
        except (OSError, ValueError): pass
    combined = {'schemaVersion': 1, 'domain': DOMAIN, 'observations': []}
    for value in values:
        try: combined = merge([combined, value])
        except (ValueError, TypeError, KeyError): continue
    return {**snapshot, FIELD: combined} if combined['observations'] else snapshot


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__); p.add_argument('--private', type=Path, default=api.PRIVATE)
    p.add_argument('--input', type=Path, required=True); p.add_argument('--expected-sha256', required=True)
    args = p.parse_args(); api.PRIVATE = args.private.resolve()
    print(json.dumps(record(api.PRIVATE, json.loads(args.input.read_text(encoding='utf-8')), args.expected_sha256)))
