"""Dated public DOM observations, never added to returned-HTML backlinks."""
import argparse
import base64
from collections import Counter
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


def expand(value):
    """Expand bounded version-2 tuples before applying the full v1 validator."""
    if not isinstance(value, dict) or value.get('schemaVersion') != 2 or value.get('domain') != DOMAIN:
        raise ValueError('Unexpected compact DOM evidence')
    tables = {}
    for key, bound in [('prefixes', 2000), ('anchors', 1000), ('rels', 32), ('schemas', 64), ('origins', 4)]:
        table = value.get(key)
        if not isinstance(table, list) or not 1 <= len(table) <= bound: raise ValueError('Invalid compact DOM table')
        tables[key] = table
    if any(not isinstance(s, str) or len(s) > 1000 for s in tables['prefixes']): raise ValueError('Invalid URL prefix')
    prefix = value.get('datePrefix')
    if not isinstance(prefix, str) or len(prefix) > 40: raise ValueError('Invalid compact date prefix')
    rows = value.get('rows')
    if not isinstance(rows, list) or len(rows) > 1000: raise ValueError('Invalid compact DOM scope')
    def at(key, index):
        if type(index) is not int or not 0 <= index < len(tables[key]): raise ValueError('Invalid compact DOM reference')
        return tables[key][index]
    def url(pair):
        if not isinstance(pair, list) or len(pair) != 2 or not isinstance(pair[1], str) or len(pair[1]) > 1000: raise ValueError('Invalid compact URL')
        return at('prefixes', pair[0]) + pair[1]
    result = []
    for row in rows:
        if not isinstance(row, list) or not 6 <= len(row) <= 9: raise ValueError('Invalid compact DOM row')
        source, target = url(row[0]), url(row[1])
        if not isinstance(row[4], str) or len(row[4]) > 40 or not isinstance(row[5], str) or not re.fullmatch(r'[A-Za-z0-9+/]{43}=', row[5]): raise ValueError('Invalid compact capture')
        digest = base64.b64decode(row[5], validate=True)
        if len(digest) != 32 or base64.b64encode(digest).decode() != row[5]: raise ValueError('Invalid compact capture hash')
        canonical = row[6] if len(row) > 6 else 0
        if type(canonical) is int and canonical == 0: canonical = source
        elif canonical is not None: canonical = url(canonical)
        schema = at('schemas', row[7] if len(row) > 7 else 0)
        if not isinstance(schema, list) or len(schema) != 3: raise ValueError('Invalid compact schema counts')
        result.append({'sourceUrl': source, 'targetUrl': target, 'anchor': at('anchors', row[2]), 'rel': at('rels', row[3]),
                       'observedAt': prefix + row[4], 'evidenceSha256': digest.hex(), 'canonical': canonical,
                       'structuredData': dict(zip(('jsonldBlocks', 'microdataElements', 'rdfaElements'), schema)),
                       'discovery': at('origins', row[8] if len(row) > 8 else 0), 'method': 'saved_browser_dom'})
    return {'schemaVersion': 1, 'domain': DOMAIN, 'observations': result}


def compact(value):
    """Lossless dictionaries keep optional DOM data inside the unchanged import cap."""
    clean = validate(value); rows = clean['observations']
    if not rows: return clean
    urls = {r[k] for r in rows for k in ('sourceUrl', 'targetUrl', 'canonical') if r.get(k)}
    options = {u: [u[:i+1] for i, c in enumerate(u) if c == '/' and i >= len('https://') and i <= u.rfind('/')] for u in urls}
    counts = Counter(p for choices in options.values() for p in choices)
    chosen = {u: max((p for p in choices if counts[p] > 1), key=len, default=u[:u.index('/', 8)+1]) for u, choices in options.items()}
    prefixes = sorted(set(chosen.values()))
    def url(u): return [prefixes.index(chosen[u]), u[len(chosen[u]):]]
    anchors = sorted({r['anchor'] for r in rows}); rels = sorted({tuple(r['rel']) for r in rows})
    schemas = Counter(tuple(r['structuredData'][k] for k in ('jsonldBlocks', 'microdataElements', 'rdfaElements')) for r in rows)
    schemas = sorted(schemas, key=lambda s: (-schemas[s], json.dumps(s)))
    origins = sorted({r['discovery'] for r in rows})
    date_prefix = os.path.commonprefix([r['observedAt'] for r in rows]); encoded = []
    for r in rows:
        schema = tuple(r['structuredData'][k] for k in ('jsonldBlocks', 'microdataElements', 'rdfaElements'))
        canonical = 0 if r['canonical'] == r['sourceUrl'] else url(r['canonical']) if r['canonical'] else None
        row = [url(r['sourceUrl']), url(r['targetUrl']), anchors.index(r['anchor']), rels.index(tuple(r['rel'])),
               r['observedAt'][len(date_prefix):], base64.b64encode(bytes.fromhex(r['evidenceSha256'])).decode(),
               canonical, schemas.index(schema), origins.index(r['discovery'])]
        while len(row) > 6 and type(row[-1]) is int and row[-1] == 0: row.pop()
        encoded.append(row)
    packed = {'schemaVersion': 2, 'domain': DOMAIN, 'prefixes': prefixes, 'datePrefix': date_prefix,
              'anchors': anchors, 'rels': [list(r) for r in rels], 'schemas': [list(s) for s in schemas], 'origins': origins, 'rows': encoded}
    try: expanded = validate(packed)
    except ValueError: return clean  # Unusual valid v1 data need not use the optional codec.
    if expanded != clean: raise ValueError('DOM encoding changed evidence')
    # Tiny observations can be smaller in v1; both formats stay supported.
    return min([clean, packed], key=lambda v: len(json.dumps(v, ensure_ascii=False)))


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
    if isinstance(value, dict) and value.get('schemaVersion') == 2: value = expand(value)
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
    return {**snapshot, FIELD: compact(combined)} if combined['observations'] else snapshot


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__); p.add_argument('--private', type=Path, default=api.PRIVATE)
    p.add_argument('--input', type=Path, required=True); p.add_argument('--expected-sha256', required=True)
    args = p.parse_args(); api.PRIVATE = args.private.resolve()
    print(json.dumps(record(api.PRIVATE, json.loads(args.input.read_text(encoding='utf-8')), args.expected_sha256)))
