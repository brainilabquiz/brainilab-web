"""Acquisition briefs for existing destinations, not a search-demand forecast.

The reviewed phrases are deliberately exact. Unknown queries require research;
neither a matching word nor a provider's volume estimate establishes intent.
"""
import re
from urllib.parse import urlsplit

ORIGIN = 'https://brainilabgames.com'
REVIEWED_AT = '2026-10-07'
ROUTES = {
    '/games/number-route/': {
        'intent': 'play', 'need': 'Use four numbers in order to reach a target.',
        'phrases': ('number route game', 'number route puzzle', 'reach the target math puzzle'),
        'nextStep': 'Start the existing Number Route round without requiring an account.',
        'metric': 'Consented game_start and game_complete for Number Route; check collection before reporting counts.'},
    '/games/math-rush/': {
        'intent': 'practice', 'need': 'Practise mental arithmetic in a short timed game.',
        'phrases': ('math rush game', 'math rush', '60 second math game', 'mental math game'),
        'nextStep': 'Play Math Rush; offer the existing beginner maths course if the player needs an explanation.',
        'metric': 'Consented game_start and game_complete for Math Rush; check collection before reporting counts.'},
    '/geography/europe-flags-quiz/': {
        'intent': 'play', 'need': 'Identify European flags and learn from each answer.',
        'phrases': ('europe flags quiz', 'european flags quiz', 'flags of europe quiz'),
        'nextStep': 'Start the existing Europe quiz; keep the world quiz a separate geographic scope.',
        'metric': 'Verify the Europe practice event coverage first; local completion is not a ranking result.'},
    '/geography/world-flags-quiz/': {
        'intent': 'play', 'need': 'Identify flags from around the world.',
        'phrases': ('world flags quiz', 'flags of the world quiz', 'world flag quiz'),
        'nextStep': 'Choose a difficulty and start the existing World Flags game.',
        'metric': 'Consented game_start and game_complete for World Flags; check collection before reporting counts.'},
    '/learn/paths/mental-maths-foundations/': {
        'intent': 'learn', 'need': 'Understand mental arithmetic from the beginning, then practise it.',
        'phrases': ('mental math for beginners', 'mental maths for beginners'),
        'nextStep': 'Open the first existing lesson; offer Math Rush only after the relevant explanation.',
        'metric': 'Course-entry views and lesson article_read separately; neither measures course completion.'},
}


def normalize_query(value):
    return re.sub(r'[^a-z0-9 ]', '', ' '.join(str(value).lower().split()))


def acquisition_brief(task):
    url = task['url']
    parsed = urlsplit(url)
    route = ROUTES.get(parsed.path) if parsed.scheme == 'https' and parsed.netloc == 'brainilabgames.com' and not parsed.query and not parsed.fragment else None
    observed = task.get('queries', []) if task.get('provider') != 'openseo' else []
    # Exact page pairing prevents unrelated or cross-page evidence being reused.
    phrases = set(route['phrases']) if route else set()
    matched = [row for row in observed if row.get('page') == url and normalize_query(row.get('query', row.get('value', ''))) in phrases]
    provider_phrase = task.get('providerEvidence', {}).get('keyword')
    provider_match = bool(route and normalize_query(provider_phrase or '') in phrases)
    if matched:
        basis = 'observed_query_candidate'
    elif provider_match:
        basis = 'provider_research_candidate'
    else:
        basis = 'needs_intent_research'
    article = parsed.path.startswith('/learn/') and not parsed.path.startswith('/learn/paths/') and parsed.path != '/learn/'
    return {
        'schemaVersion': 1, 'routeReviewedOn': REVIEWED_AT if route else None,
        'intent': route['intent'] if route else 'unverified',
        'readerNeed': route['need'] if route else 'Read the actual query and page to establish what the visitor wants.',
        'basis': basis, 'destination': url,
        'matchingQueries': [row.get('query', row.get('value')) for row in matched],
        'queriesNeedingReview': [row.get('query', row.get('value')) for row in observed if row not in matched],
        'nextStep': route['nextStep'] if route else 'Satisfy the original reading need first; offer a relevant existing article, lesson or game only where useful.',
        'measurementPlan': {
            'status': 'plan_not_observed_results',
            'discovery': 'Search Console clicks to this exact URL with the report dates and filters.',
            'use': route['metric'] if route else ('Views and article_read are different signals; neither proves a complete reading.' if article else 'Choose and verify an existing consented usage signal before reporting it.'),
            'accounts': 'Use confirmed non-team accounts only; attribute to this destination only when consented matching arrival evidence exists.',
            'comparison': 'Equal non-overlapping periods after verified publication; preserve the baseline. Do not divide metrics from different periods or sum unique users across URLs.'},
        'researchGate': 'Candidate only. Recheck live content, current decisions and search results before selecting a target or making a change.',
        'architectureRule': 'Reuse this existing destination for equivalent intent. Check the current inventory before proposing another URL. Related words alone do not prove cannibalization.',
        'distributionRule': 'Prepare one existing destination and one concrete feedback question. Reconcile prior launches; publish social or outreach messages only under the specific existing authorization.'}


def enrich_tasks(tasks):
    """Keep identities/evidence intact; rank candidates without authorizing work."""
    enriched = [{**task, 'acquisitionBrief': acquisition_brief(task)} for task in tasks]
    def rank(task):
        brief = task['acquisitionBrief']
        if brief['basis'] == 'observed_query_candidate':
            return 0
        if task.get('queries'):
            return 1
        return 2 if brief['basis'] == 'provider_research_candidate' else 3
    # Stable within each tier; current approved work always takes precedence.
    return sorted(enriched, key=rank)
