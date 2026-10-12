"""Private, allowlisted distribution snapshot. Never sends a message or checks a listing."""
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit
import hashlib
import ipaddress
import json
import re
import gsc_sync as api

PRODUCER_VERSION = 2


def domain(value):
    if not isinstance(value, str):
        return None
    value = value.strip().lower().removeprefix('www.')
    if not re.fullmatch(r'[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?', value):
        return None
    if '.' not in value or any(not re.fullmatch(r'[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?', p) for p in value.split('.')):
        return None
    try:
        ipaddress.ip_address(value)
        return None
    except ValueError:
        return value


def public_url(value):
    if not isinstance(value, str) or len(value) > 500:
        return None
    try:
        u = urlsplit(value)
        if u.scheme != 'https' or u.username or u.password or u.port or not domain(u.hostname):
            return None
        # Drop arbitrary query strings and fragments, which can contain personal data.
        if not re.fullmatch(r'/[a-zA-Z0-9/_-]*', u.path or '/'):
            return None
        return f'https://{u.hostname}{u.path or "/"}'
    except ValueError:
        return None


def dated(value):
    try:
        stamp = datetime.fromisoformat(value.replace('Z', '+00:00'))
        return stamp.isoformat() if stamp.tzinfo else None
    except (ValueError, TypeError, AttributeError):
        return None


def resource(row):
    p, title, kind = row.get('path'), row.get('title'), row.get('kind')
    if not isinstance(p, str) or not re.fullmatch(r'/(?:[a-z0-9-]+/)*', p) or p.startswith(('/admin/', '/account/', '/profile/')):
        return None
    if kind not in ('game', 'quiz', 'article', 'lesson', 'course', 'library') or not isinstance(title, str) or not title.strip() or len(title) > 200:
        return None
    return {'path': p, 'title': title.strip(), 'kind': kind}


def build(registry, catalog, game_rows, now=None):
    if not isinstance(registry.get('forms'), list) or not isinstance(catalog.get('rows'), list) or not dated(catalog.get('collectedAt')):
        raise ValueError('A dated published catalogue and outreach registry are required')
    directories, blocked = {}, set()
    for f in registry['forms']:
        source = public_url(f.get('contactSource') or f.get('source') or f.get('submissionUrl') or f.get('url'))
        host = domain(f.get('domain')) or (domain(urlsplit(source).hostname) if source else None)
        if not host:
            continue
        blocked.add(host)
        # Only resource submissions; do not expose general contact messages.
        if not (f.get('resource') or f.get('resourceUrls') or f.get('destination') or f.get('submittedResource')):
            continue
        raw_status = f.get('status')
        listing = public_url(f.get('listingUrl'))
        placement_at = dated(f.get('placementVerifiedAt'))
        published = raw_status == 'published_verified' and f.get('placementVerified') is True and listing and placement_at
        state = 'published' if published else 'pending' if raw_status in ('submitted_verified', 'form_sent_confirmed', 'published_verified') else 'uncertain' if raw_status in ('send_uncertain', 'sending') else 'review'
        title = f.get('organization', host)
        if not isinstance(title, str) or len(title) > 120 or '@' in title:
            title = host
        item = {'domain': host, 'name': title, 'state': state,
                'submittedAt': dated(f.get('submittedAt') or f.get('verifiedAt')),
                'listingUrl': listing if published else None,
                'listingVerifiedAt': placement_at if published else None}
        # Prefer a verified listing, then the latest submission, for a domain.
        previous = directories.get(host)
        rank = lambda r: (r['state'] == 'published', r['submittedAt'] or '')
        if not previous or rank(item) > rank(previous):
            directories[host] = item
    # Domain-only duplicate guard. Consumer mail providers cannot identify an organisation.
    consumer = {'gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com', 'proton.me'}
    for row in registry.get('emails', []) + registry.get('suppression', []):
        for key in ('domain', 'recipient', 'email', 'contactSource', 'source'):
            v = row.get(key)
            if not isinstance(v, str):
                continue
            host = domain(v.rsplit('@', 1)[-1]) if '@' in v else domain(v)
            link = public_url(v)
            host = host or (domain(urlsplit(link).hostname) if link else None)
            if host and host not in consumer:
                blocked.add(host)
    resources = {}
    for row in [*game_rows, *catalog['rows']]:
        clean = resource(row)
        if clean:
            resources[clean['path']] = clean
    if not resources:
        raise ValueError('No published resources')
    stamp = (now or datetime.now(timezone.utc)).isoformat()
    return {'schemaVersion': 1, 'source': 'Private outreach registry and published catalogue',
            'observedAt': stamp, 'catalogCollectedAt': catalog['collectedAt'],
            'resources': sorted(resources.values(), key=lambda r: (r['kind'], r['title'])),
            'directories': sorted(directories.values(), key=lambda r: r['name'].lower()),
            'contactedDomains': sorted(blocked)}


def validate(value):
    if value.get('schemaVersion') != 1 or not dated(value.get('observedAt')) or not dated(value.get('catalogCollectedAt')):
        raise ValueError('Unsupported distribution snapshot')
    clean = {k: value[k] for k in ('schemaVersion', 'observedAt', 'catalogCollectedAt')}
    clean['source'] = 'Private outreach registry and published catalogue'
    clean['resources'] = [resource(r) for r in value['resources']]
    if not clean['resources'] or None in clean['resources'] or len(clean['resources']) > 1000:
        raise ValueError('Invalid resources')
    clean['contactedDomains'] = [domain(d) for d in value['contactedDomains']]
    if None in clean['contactedDomains'] or len(clean['contactedDomains']) > 5000:
        raise ValueError('Invalid contact domains')
    clean['directories'] = []
    for row in value['directories']:
        host, name, state = domain(row.get('domain')), row.get('name'), row.get('state')
        if not host or not isinstance(name, str) or len(name) > 120 or '@' in name or state not in ('published', 'pending', 'uncertain', 'review'):
            raise ValueError('Invalid directory')
        listing, verified = public_url(row.get('listingUrl')), dated(row.get('listingVerifiedAt'))
        if state == 'published' and (not listing or not verified):
            raise ValueError('Publication needs a dated verified listing')
        clean['directories'].append({'domain': host, 'name': name, 'state': state,
                                     'submittedAt': dated(row.get('submittedAt')),
                                     'listingUrl': listing if state == 'published' else None,
                                     'listingVerifiedAt': verified if state == 'published' else None})
    if len(clean['directories']) > 1000:
        raise ValueError('Too many directories')
    return clean


def refresh(registry_path, catalog_path, games_path):
    path = api.PRIVATE / 'distribution-latest.json'
    prior = path.read_bytes() if path.exists() else None
    paths = [Path(registry_path), Path(catalog_path), Path(games_path)]
    inputs = [p.read_bytes() for p in paths]
    digest = hashlib.sha256(json.dumps([PRODUCER_VERSION, *[hashlib.sha256(b).hexdigest() for b in inputs]]).encode()).hexdigest()
    state_path = api.PRIVATE / 'distribution-state.json'
    state = json.loads(state_path.read_text(encoding='utf-8')) if state_path.exists() else {}
    day = datetime.now(timezone.utc).date().isoformat()
    if prior and state.get('day') == day and state.get('inputsHash') == digest and state.get('snapshotHash') == hashlib.sha256(prior).hexdigest():
        clean = validate(json.loads(prior))
        return {'directories': len(clean['directories']), 'resources': len(clean['resources']), 'observedAt': clean['observedAt'], 'reused': True}
    registry = json.loads(inputs[0].decode('utf-8-sig'))
    catalog = json.loads(inputs[1].decode('utf-8-sig'))
    html = inputs[2].decode('utf-8')
    data = json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>', html, re.S).group(1))
    game_list = next(g for g in data['@graph'] if g.get('@type') == 'ItemList')
    games = [{'path': urlsplit(g['url']).path, 'title': g['name'], 'kind': 'game' if urlsplit(g['url']).path.startswith('/games/') else 'quiz'} for g in game_list['itemListElement']]
    games.insert(0, {'path': '/daily-quiz/', 'title': 'BrainiLab Daily', 'kind': 'game'})
    clean = validate(build(registry, catalog, games))
    if (path.read_bytes() if path.exists() else None) != prior or any(p.read_bytes() != b for p, b in zip(paths, inputs)):
        raise RuntimeError('Distribution changed concurrently; retry from the current registry')
    if prior:
        api.private_write(api.PRIVATE / 'distribution-history' / (hashlib.sha256(prior).hexdigest() + '.json'), json.loads(prior))
    api.private_write(path, clean)
    api.private_write(state_path, {'day': day, 'inputsHash': digest, 'snapshotHash': hashlib.sha256(path.read_bytes()).hexdigest()})
    return {'directories': len(clean['directories']), 'resources': len(clean['resources']), 'observedAt': clean['observedAt'], 'reused': False}


def attach_distribution(report, private):
    path = private / 'distribution-latest.json'
    if not path.exists():
        return report
    try:
        clean = validate(json.loads(path.read_text(encoding='utf-8')))
    except (ValueError, KeyError, TypeError):
        return report  # Keep the previous dated observation on invalid input.
    previous = report.get('distribution')
    if previous and datetime.fromisoformat(previous['observedAt']) > datetime.fromisoformat(clean['observedAt']):
        return report
    return {**report, 'distribution': clean}


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--registry', required=True)
    parser.add_argument('--catalog', required=True)
    parser.add_argument('--games', required=True, help='Published repository games/index.html')
    parser.add_argument('--private', type=Path, default=api.PRIVATE)
    args = parser.parse_args()
    api.PRIVATE = args.private.resolve()
    try:
        print(json.dumps(refresh(args.registry, args.catalog, args.games)))
    except (ValueError, RuntimeError, OSError, KeyError, TypeError, AttributeError, StopIteration):
        print('Distribution refresh failed. Retain the last dated snapshot and review the private registry/catalogue.')
        raise SystemExit(1)
