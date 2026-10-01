"""Validated OpenSEO results and research handoff. Never stores OAuth credentials.

Codex uses the installed OpenSEO tools; this adapter does not impersonate an MCP
client or claim that installing a plugin ran an audit. Snapshots are operator
evidence, not independently authenticated provider responses.
"""
import argparse
from copy import deepcopy
from datetime import datetime, timezone, timedelta
import hashlib
import json
import math
import re
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent
DOMAIN = 'brainilabgames.com'
WORKFLOWS = {
    'seo-project-setup': ('Project context', None),
    'seo-audit': ('Site audit', 7),
    'keyword-research': ('Keyword opportunities', 30),
}
STATES = {'queued', 'running', 'blocked', 'failed', 'completed'}


def timestamp(value):
    result = datetime.fromisoformat(value.replace('Z', '+00:00'))
    if result.tzinfo is None:
        raise ValueError('Evidence timestamps need a timezone')
    return result


def text(value, limit=3000):
    if not isinstance(value, str) or not value.strip() or len(value) > limit:
        raise ValueError('Missing or oversized text')
    return value.strip()


def url(value, own=False):
    value = text(value, 1000)
    parsed = urlsplit(value)
    if parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password or parsed.query:
        raise ValueError('Use a public HTTPS evidence URL without credentials or query parameters')
    if own and (parsed.netloc != DOMAIN or not re.fullmatch(r'/[a-z0-9/_-]*/', parsed.path)):
        raise ValueError('Opportunity must belong to BrainiLab')
    return value


def metric(value, maximum=None):
    if value is None:
        return None
    if type(value) not in (int, float) or not math.isfinite(value) or value < 0 or (maximum is not None and value > maximum):
        raise ValueError('Invalid provider metric')
    return value


def normalize(raw):
    """Allowlist fields, distinguish unknown metrics, and require result evidence."""
    if raw.get('schemaVersion') != 1 or raw.get('domain') != DOMAIN:
        raise ValueError('Expected a BrainiLab OpenSEO v1 snapshot')
    checked = text(raw.get('checkedAt'), 80)
    timestamp(checked)
    connection = raw.get('connection', {})
    state = connection.get('status', 'unverified')
    if state not in {'unverified', 'tools_unavailable', 'verified', 'error'}:
        raise ValueError('Invalid connection status')
    checks = connection.get('checks', {})
    clean_checks = {}
    for name in ('whoami', 'list_projects'):
        item = checks.get(name)
        if item:
            at = text(item.get('at'), 80)
            timestamp(at)
            clean_checks[name] = {'at': at, 'reference': text(item.get('reference'), 200)}
    if state == 'verified' and set(clean_checks) != {'whoami', 'list_projects'}:
        raise ValueError('Both free reads must succeed before claiming verification')
    result = {'schemaVersion': 1, 'domain': DOMAIN, 'checkedAt': checked,
              'connection': {'status': state, 'checks': clean_checks,
                             'message': text(connection.get('message', 'Connection not verified.'))},
              'project': None, 'workflows': [], 'opportunities': []}
    project = raw.get('project')
    if project:
        if project.get('domain') != DOMAIN:
            raise ValueError('Project domain must match BrainiLab')
        result['project'] = {'id': text(project.get('id'), 200), 'domain': DOMAIN}
    seen = set()
    for item in raw.get('workflows', []):
        key = item.get('id')
        if key not in WORKFLOWS or key in seen or item.get('state') not in STATES:
            raise ValueError('Invalid or duplicate workflow')
        seen.add(key)
        row = {'id': key, 'state': item['state'], 'note': text(item.get('note'))}
        success = item.get('lastSuccess')
        if success:
            at = text(success.get('at'), 80)
            timestamp(at)
            row['lastSuccess'] = {'at': at, 'reference': text(success.get('reference'), 200),
                                  'summary': text(success.get('summary'))}
            if success.get('reportUrl'):
                row['lastSuccess']['reportUrl'] = url(success['reportUrl'])
        if item['state'] == 'completed' and (not success or not project):
            raise ValueError('Completed workflows require a project and dated result')
        result['workflows'].append(row)
    if len(raw.get('opportunities', [])) > 50:
        raise ValueError('Keep a reviewed shortlist of at most 50 opportunities')
    seen = set()
    for item in raw.get('opportunities', []):
        page = url(item.get('url'), own=True)
        keyword = text(item.get('keyword'), 200)
        identity = (page, keyword.casefold())
        if identity in seen:
            continue
        seen.add(identity)
        workflow = item.get('workflow')
        if workflow not in ('seo-audit', 'keyword-research'):
            raise ValueError('Opportunities require an audit or keyword research source')
        if not any(w['id'] == workflow and w.get('lastSuccess') for w in result['workflows']):
            raise ValueError('Missing source workflow result')
        observed = text(item.get('observedAt'), 80)
        timestamp(observed)
        sources = [url(s) for s in item.get('sources', [])]
        if not sources:
            raise ValueError('Evidence source URLs are required')
        row = {'id': hashlib.sha256(('openseo:' + page + ':' + keyword.casefold()).encode()).hexdigest()[:20],
               'url': page, 'keyword': keyword, 'workflow': workflow, 'observedAt': observed,
               'country': text(item.get('country'), 80), 'language': text(item.get('language'), 80),
               'finding': text(item.get('finding')), 'action': text(item.get('action')),
               'intent': text(item.get('intent'), 200), 'sources': sources,
               'estimatedMonthlySearches': metric(item.get('estimatedMonthlySearches')),
               'difficulty': metric(item.get('difficulty'), 100), 'cpc': metric(item.get('cpc')),
               'limitations': text(item.get('limitations'))}
        result['opportunities'].append(row)
    return result


def load_snapshot(private):
    path = Path(private) / 'openseo.json'
    if not path.exists():
        return None
    # Fail closed rather than silently drop previous evidence on malformed input.
    return normalize(json.loads(path.read_text(encoding='utf-8')))


def attach(report, private):
    enriched = deepcopy(report)
    enriched['opportunities'] = [o for o in enriched.get('opportunities', []) if o.get('provider') != 'openseo']
    snapshot = load_snapshot(private)
    if snapshot is not None:
        enriched['openseo'] = snapshot
        existing = {o['url'] for o in enriched['opportunities']}
        digest = hashlib.sha256(json.dumps(snapshot, sort_keys=True).encode()).hexdigest()
        for item in snapshot['opportunities']:
            # One decision per URL is the existing Growth database contract.
            # Keep Google's proposal when it already covers the same page;
            # additional OpenSEO evidence remains in the separate source panel.
            if item['url'] in existing:
                continue
            existing.add(item['url'])
            enriched['opportunities'].append({
                'provider': 'openseo', 'url': item['url'], 'name': item['keyword'][:150],
                'priority': 'OpenSEO research', 'hypothesis': item['finding'],
                'nextAction': item['action'], 'pageEvidence': None, 'queryEvidence': [],
                'pageSourceSnapshot': digest, 'providerEvidence': item,
                'confidence': item['limitations'], 'status': 'ready_for_research',
                'brief': {'finding': item['finding'], 'proposedCopy': item['action'],
                          'checks': ['Recheck the live page and source dates.',
                                     'Verify intent and factual claims before editing.',
                                     'Reuse an existing article or page before creating a duplicate.',
                                     'Check deployment and public URL before marking published.']}})
    else:
        enriched.pop('openseo', None)
    return enriched


def research_tasks(snapshot, now=None):
    now = now or datetime.now(timezone.utc)
    known = {w['id']: w for w in (snapshot or {}).get('workflows', [])}
    verified = (snapshot or {}).get('connection', {}).get('status') == 'verified'
    tasks = []
    for key, (name, days) in WORKFLOWS.items():
        row = known.get(key, {})
        success = row.get('lastSuccess')
        fresh = bool(success and (days is None or timedelta(0) <= now - timestamp(success['at']) < timedelta(days=days)))
        if row.get('state') == 'running':
            action = 'resume'
        elif fresh and row.get('state') == 'completed':
            continue
        else:
            action = 'review_blocker' if row.get('state') == 'blocked' else 'run'
        tasks.append({'id': 'openseo:' + key, 'name': name, 'action': action,
                      'requires': ['whoami', 'list_projects'] + ([] if key == 'seo-project-setup' else ['seo-project-setup']),
                      'connectionVerifiedInSnapshot': verified,
                      'reuseDays': days, 'state': row.get('state', 'queued'),
                      'note': row.get('note', 'Awaiting verified OpenSEO tools and project context.')})
    return tasks


def _save_snapshot(raw, private, expected_sha):
    clean = normalize(raw)
    private = Path(private)
    path = private / 'openseo.json'
    previous = path.read_bytes() if path.exists() else None
    actual = hashlib.sha256(previous).hexdigest() if previous is not None else 'missing'
    if expected_sha != actual:
        raise ValueError('Snapshot changed: reread before saving')
    # A failed refresh cannot erase a previously successful result.
    if previous:
        before = normalize(json.loads(previous))
        if timestamp(clean['checkedAt']) < timestamp(before['checkedAt']):
            raise ValueError('Reject stale snapshots')
        if clean['project'] and before['project'] and clean['project'] != before['project']:
            raise ValueError('Project identity changed: review the existing mapping first')
        previous_rows = {w['id']: w for w in before['workflows']}
        for row in clean['workflows']:
            prior = previous_rows.get(row['id'], {}).get('lastSuccess')
            if prior and 'lastSuccess' not in row:
                row['lastSuccess'] = prior
        present = {w['id'] for w in clean['workflows']}
        clean['workflows'].extend(w for w in before['workflows'] if w['id'] not in present)
        if not clean['project']:
            clean['project'] = before['project']
        # An unavailable connection or partial/running update is not evidence
        # that old findings disappeared. Replace findings only for workflows
        # with an explicitly completed refresh in this input.
        refreshed = {w['id'] for w in raw.get('workflows', []) if w['state'] == 'completed'}
        identities = {o['id'] for o in clean['opportunities']}
        clean['opportunities'].extend(o for o in before['opportunities'] if o['workflow'] not in refreshed and o['id'] not in identities)
    clean = normalize(clean)
    encoded = (json.dumps(clean, ensure_ascii=False, indent=2) + '\n').encode()
    if encoded == previous:
        return {'changed': False, 'sha256': actual}
    private.mkdir(parents=True, exist_ok=True)
    if previous:
        archive = private / 'openseo-history'
        archive.mkdir(exist_ok=True)
        (archive / (actual + '.json')).write_bytes(previous)
    temporary = private / 'openseo.pending.json'
    temporary.write_bytes(encoded)
    temporary.replace(path)
    return {'changed': True, 'sha256': hashlib.sha256(encoded).hexdigest()}


def save_snapshot(raw, private, expected_sha):
    private = Path(private)
    private.mkdir(parents=True, exist_ok=True)
    lock = private / 'openseo.write-lock'
    # Exclusive create prevents two record processes passing the same CAS check.
    handle = lock.open('x')
    try:
        return _save_snapshot(raw, private, expected_sha)
    finally:
        handle.close()
        lock.unlink()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--private', default=str(ROOT / 'data'))
    sub = parser.add_subparsers(dest='command', required=True)
    sub.add_parser('plan')
    record = sub.add_parser('record')
    record.add_argument('input')
    record.add_argument('--expected-sha', required=True, help='Existing SHA256 or missing for first write')
    args = parser.parse_args()
    if args.command == 'plan':
        print(json.dumps(research_tasks(load_snapshot(args.private)), indent=2))
    else:
        print(json.dumps(save_snapshot(json.loads(Path(args.input).read_text(encoding='utf-8')), args.private, args.expected_sha)))
