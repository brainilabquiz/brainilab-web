"""Explainable organic-growth leads from observed query/page pairs; no forecasts."""
from urllib.parse import urlsplit


def discover(data, public, snapshot_id):
    pairs=data['tables'].get('queryPage',[])
    leads=[]
    for page in data['tables']['page']:
        url=page['value']; known=public.get(url)
        if not known or known.get('status')!=200 or 'noindex' in ' '.join(known.get('robots',[])):
            continue
        if page['impressions']<10 or page['position'] is None:
            continue
        path=urlsplit(url).path
        if path.startswith(('/admin/','/profile/','/privacy/','/cookies/','/suggestions/')):
            continue
        evidence=sorted([r for r in pairs if r.get('page')==url],key=lambda r:-r['impressions'])[:8]
        intent='Improve the search snippet' if page['position']<=20 and (page['ctr'] or 0)<.03 else 'Strengthen the answer and next step'
        kind='Academy' if path.startswith('/learn/paths/') else 'Article' if path.startswith('/learn/') and path!='/learn/' else 'Game' if '/games/' in path or path=='/daily-quiz/' else 'Landing'
        name=(known.get('titles') or [path])[0].split(' | ')[0][:150]
        queries=[r['query'] for r in evidence]
        finding=f"{page['impressions']} observed impressions and {page['clicks']} clicks in this report. "
        finding+=('Queries shown below were observed for this exact URL.' if evidence else 'No visible query/page rows for this URL; do not invent its search intent.')
        next_step='Invite readers to a relevant game or Academy lesson, then measure completed plays and voluntary sign-ups.' if kind in ('Article','Academy') else 'Make the first play easy to understand, then measure completed games and voluntary sign-ups.'
        leads.append({'url':url,'name':name,'kind':kind,'action':intent,'priority':'Search opportunity',
            'hypothesis':finding,'status':'ready_for_research','confidence':'Exploratory: at least 10 observed impressions. The 3% CTR and position 20 cutoffs are triage rules, not benchmarks or predicted gains.',
            'pageEvidence':page,'pageSourceSnapshot':snapshot_id,'querySourceSnapshot':snapshot_id,
            'queryEvidence':[{**r,'value':r['query']} for r in evidence],
            'currentTitle':known.get('titles',[]),'existingLearnLinks':[u for u in known.get('internalLinks',[]) if '/learn/' in u][:8],
            'brief':{'finding':finding,'proposedCopy':'Editorial brief — review before writing. '+intent+'.',
                'checks':['Reopen the live URL: the title and links in this inventory are an audit snapshot.',
                    'Check which queries match the actual page before choosing an intent: '+(', '.join(queries) if queries else 'research the topic before selecting a keyword')+'. Never target unrelated terms merely because they appeared.',
                    'Use a natural title, a direct opening answer, short sections and reliable linked sources.',
                    'Use a short concrete example; add interactive resources only when specifically requested.',
                    'For new articles: Biel Sardà, photorealistic generated cover, related articles and a planned ten-article HUB.',
                    next_step,'Offer BrainiLab+ only where an existing benefit is relevant; do not invent benefits or conversion numbers.',
                    'Verify mobile rendering, facts and links; record publication before comparing equal periods.']},
            'nextAction':intent,'conversionGoal':next_step,'approvalRequiredForContentProposal':True})
    leads.sort(key=lambda p:(p['action']!='Improve the search snippet',-p['pageEvidence']['impressions'],p['url']))
    return leads[:12]


def health_audit(public):
    issues=[]
    for url,p in public.items():
        reasons=[]
        if p.get('status')!=200:reasons.append('Check HTTP response')
        if len(p.get('titles',[]))!=1:reasons.append('Review the page title')
        if len(p.get('h1',[]))!=1:reasons.append('Review the main heading')
        if not p.get('descriptions'):reasons.append('Add a useful search description')
        if p.get('canonicals')!=[url]:reasons.append('Review the canonical URL')
        if p.get('invalidSchema'):reasons.append('Fix invalid structured data JSON')
        if 'noindex' in ' '.join(p.get('robots',[])):reasons.append('Review sitemap inclusion for a noindex page')
        if reasons:issues.append({'url':url,'checks':reasons})
    return {'checkedPages':len(public),'issues':issues,'scope':'HTTP status, title, main heading, description, canonical and structured-data syntax from the saved public audit. Not a full technical audit or a measure of AI visibility.'}
