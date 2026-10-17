"""Aggregate the private contact ledger without exporting contacts or correspondence."""
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

ZONE = ZoneInfo('Europe/Madrid')
LIMIT = 20
FAILURES = {'bounced_permanent', 'permanent_bounce', 'delivery_failed_permanent', 'delivery_failed_final'}
HUMAN_REPLIES = {'feedback_received', 'editorial_review_consideration',
                 'declined_external_game_listing', 'declined_classroom_use_nonstandard_operations'}
PENDING = {'sending_reserved', 'send_uncertain', 'sent'}


def local_day(value):
    try:
        return value if isinstance(value, str) and date.fromisoformat(value).isoformat() == value else None
    except (ValueError, TypeError):
        return None


def unlimited_policy(value, as_of, require_human=False):
    """Allowlist an explicit policy without exporting the private authorization text."""
    if not isinstance(value, dict) or 'dailyLimit' not in value or value['dailyLimit'] is not None or value.get('providerLimitsApply') is not True:
        return None
    effective = local_day(value.get('effectiveLocalDate'))
    if not effective or effective > as_of:
        return None
    if require_human and (not isinstance(value.get('humanAuthorization'), str) or not value['humanAuthorization'].strip()):
        return None
    return {'effectiveLocalDate': effective, 'dailyLimit': None, 'providerLimitsApply': True}


def registry_policy(registry, as_of):
    target = registry.get('dailyTarget', LIMIT)
    if type(target) is int and target == LIMIT:
        return {'dailyLimit': LIMIT}
    if target is None:
        authorization = unlimited_policy(registry.get('policyAuthorization'), as_of, require_human=True)
        if authorization:
            return {'dailyLimit': None, 'policyAuthorization': authorization}
    return None


def summary(registry, now):
    """Return only counts. Missing/ambiguous ledgers stay unavailable, never fabricated zero."""
    emails, responses = registry.get('emails'), registry.get('responses', [])
    if not isinstance(emails, list) or not isinstance(responses, list):
        return None
    identities = [e.get('id') for e in emails if isinstance(e, dict)]
    if len(identities) != len(emails) or any(not isinstance(i, str) or not i for i in identities) or len(set(identities)) != len(identities):
        return None
    today = now.astimezone(ZONE).date()
    policy = registry_policy(registry, str(today))
    if policy is None:
        return None
    days = {str(today-timedelta(days=n)): {'localDate': str(today-timedelta(days=n)),
            'verifiedSends': 0, 'unresolvedSends': 0, 'permanentFailures': 0,
            'humanReplies': 0, 'automaticAcknowledgements': 0} for n in range(14)}
    undated = 0
    for email in emails:
        status = email.get('status')
        if status != 'sent_verified' and status not in PENDING:
            continue
        day = local_day(email.get('sentLocalDate') or email.get('localDate'))
        if not day or day > str(today):
            undated += 1
            continue
        if day not in days:
            continue
        row = days[day]
        row['verifiedSends' if status == 'sent_verified' else 'unresolvedSends'] += 1
        if status != 'sent_verified':
            continue
        recipient = str(email.get('recipient', '')).strip().casefold()
        linked = [r for r in responses if isinstance(r, dict) and recipient and
                  str(r.get('recipient', '')).strip().casefold() == recipient]
        row['permanentFailures'] += int(email.get('deliveryStatus') in FAILURES or any(r.get('status') in FAILURES for r in linked))
        row['humanReplies'] += int(any(r.get('status') in HUMAN_REPLIES for r in linked))
        row['automaticAcknowledgements'] += int(any(r.get('status') == 'automatic_acknowledgement' for r in linked))
    return {'schemaVersion': 1, 'timezone': 'Europe/Madrid', 'asOfLocalDate': str(today),
            **policy, 'undatedSends': undated,
            'days': sorted(days.values(), key=lambda r: r['localDate'], reverse=True)}


def validate(value):
    if not isinstance(value, dict) or value.get('schemaVersion') != 1 or value.get('timezone') != 'Europe/Madrid' or not local_day(value.get('asOfLocalDate')):
        raise ValueError('Invalid outreach summary')
    limit = value.get('dailyLimit')
    if type(limit) is int and limit == LIMIT:
        policy = {'dailyLimit': LIMIT}
    elif 'dailyLimit' in value and limit is None and (authorization := unlimited_policy(value.get('policyAuthorization'), value['asOfLocalDate'])):
        policy = {'dailyLimit': None, 'policyAuthorization': authorization}
    else:
        raise ValueError('Invalid outreach policy')
    counts = ('verifiedSends', 'unresolvedSends', 'permanentFailures', 'humanReplies', 'automaticAcknowledgements')
    integer = lambda n: type(n) is int and 0 <= n <= 100000
    rows = value.get('days')
    if not integer(value.get('undatedSends')) or not isinstance(rows, list) or len(rows) != 14:
        raise ValueError('Invalid outreach counts')
    expected = {str(date.fromisoformat(value['asOfLocalDate'])-timedelta(days=n)) for n in range(14)}
    if {r.get('localDate') for r in rows if isinstance(r, dict)} != expected:
        raise ValueError('Invalid outreach dates')
    clean = []
    for row in rows:
        if any(not integer(row.get(k)) for k in counts) or any(row[k] > row['verifiedSends'] for k in counts[2:]):
            raise ValueError('Invalid outreach totals')
        clean.append({k: row[k] for k in ('localDate', *counts)})
    return {'schemaVersion': 1, 'timezone': 'Europe/Madrid', 'asOfLocalDate': value['asOfLocalDate'],
            **policy, 'undatedSends': value['undatedSends'], 'days': sorted(clean, key=lambda r: r['localDate'], reverse=True)}
