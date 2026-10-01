"""Generate evidence-linked pilot opportunities without inventing SEO scores."""
import argparse
from contextlib import closing
from datetime import datetime, timezone
import json
from pathlib import Path
import sqlite3
from gsc_import import summarize


ROOT = Path(__file__).resolve().parent
PILOTS = {
    'https://brainilabgames.com/games/number-route/': {
        'name': 'Number Route', 'priority': 'First pilot',
        'hypothesis': 'Check whether people searching for this named game recognize its left-to-right, reach-the-target mechanic.',
        'nextAction': 'Review the current snippet and an immediately visible worked example, preserving the existing game and how-to URLs. Existing support links are already present: validate their usefulness rather than propose duplicate links.',
    },
    'https://brainilabgames.com/games/math-rush/': {
        'name': 'Math Rush', 'priority': 'Second pilot',
        'hypothesis': 'The existing 60-second arithmetic game can be explained through the addition/subtraction intent observed in one visible query.',
        'nextAction': 'Review whether visitors can immediately understand the four operations, time limit and first action. Check existing beginner guides and actual game behaviour before drafting any new content. One impression is only a research lead.',
    },
}


def build_report(database, inventory):
    with closing(sqlite3.connect(f'file:{Path(database).resolve().as_posix()}?mode=ro', uri=True)) as db:
        rows = db.execute('select s.id,c.captured_at,s.raw_sha256,s.document from current_snapshots c join snapshots s on s.id=c.snapshot_id').fetchall()
    snapshots = [{'id': i, 'capturedAt': t, 'rawSha256': h, 'data': json.loads(d)} for i,t,h,d in rows]
    # Report only the newest unfiltered property export and matching filtered exports.
    candidates = [s for s in snapshots if s['data']['property']=='sc-domain:brainilabgames.com' and set(s['data']['filters'])=={'searchType','requestedRange'}]
    if not candidates:
        raise ValueError('No unfiltered BrainiLab property snapshot')
    base = max(candidates, key=lambda s:s['capturedAt'])
    data = base['data']
    public = {p['url']:p for p in json.loads(Path(inventory).read_text(encoding='utf-8'))['pages']}
    opportunities = []
    for url, plan in PILOTS.items():
        page = next((r for r in data['tables']['page'] if r['value']==url), None)
        matching = [s for s in snapshots if s['data']['property']==data['property'] and s['data']['availablePeriod']==data['availablePeriod'] and s['data']['filters']=={**data['filters'], 'page':url}]
        filtered = max(matching, key=lambda s:s['capturedAt']) if matching else None
        known = public.get(url)
        opportunities.append({**plan, 'url':url, 'status':'ready_for_research' if page and filtered and known else 'insufficient_data', 'confidence':'Low: small historical sample; no causal conclusion.', 'pageEvidence':page, 'pageSourceSnapshot':base['id'], 'querySourceSnapshot':filtered['id'] if filtered else None, 'queryEvidence':filtered['data']['tables']['query'] if filtered else None, 'queryCoverage':summarize(filtered['data']) if filtered else None, 'currentTitle':known.get('titles') if known else None, 'existingLearnLinks':[link for link in known['internalLinks'] if '/learn/' in link] if known else [], 'monthlySearchVolume':None, 'keywordDifficulty':None, 'estimatedTrafficGain':None, 'approvalRequiredForContentProposal':True})
    api = data.get('sourceType') == 'google_search_console_api'
    return {'generatedAt':datetime.now(timezone.utc).isoformat(), 'property':data['property'], 'source':'Google Search Console API, read-only, final data' if api else 'Official Google Search Console CSV ZIP exports, imported locally', 'availablePeriod':data['availablePeriod'], 'filters':data['filters'], 'propertySnapshot':base['id'], 'propertySummary':summarize(data), 'rowCounts':{k:len(v) for k,v in data['tables'].items()}, 'sources':[{'snapshotId':s['id'],'capturedAt':s['capturedAt'],'rawSha256':s['rawSha256'],'filters':s['data']['filters']} for s in snapshots], 'opportunities':opportunities, 'limitations':data['limitations']+['Compare the report dates with the verified publication date before evaluating a change.', 'Filtered query rows are not a full query-by-page matrix and do not establish cannibalization.', 'No paid keyword estimates are included.']}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--database', default=str(ROOT/'data/growth.sqlite'))
    parser.add_argument('--inventory', required=True, help='Path to the private public-audit snapshot JSON')
    parser.add_argument('--output', default=str(ROOT/'data/growth-report.json'))
    args = parser.parse_args()
    result = build_report(args.database, args.inventory)
    Path(args.output).write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(json.dumps({'summary':result['propertySummary'], 'pilots':[{k:o[k] for k in ('name','status','pageEvidence','queryEvidence')} for o in result['opportunities']]}, ensure_ascii=False, indent=2))
