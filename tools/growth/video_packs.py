"""Local video planning from dated Growth evidence. No network or publishing."""
import argparse
import csv
import hashlib
import io
import json
import math
import re
from datetime import date, datetime
from pathlib import Path
from urllib.parse import urlencode, urlsplit
from youtube_studio import validate as validate_studio, timestamp as studio_timestamp, CHANNEL

HOST = 'brainilabgames.com'


def public_url(value):
    parsed = urlsplit(value)
    if parsed.scheme != 'https' or parsed.netloc != HOST or parsed.query or parsed.fragment:
        raise ValueError('Use an exact public BrainiLab destination without tracking')
    if not re.fullmatch(r'/(?:[a-z0-9-]+/)+', parsed.path):
        raise ValueError('Invalid destination path')
    return value


def normalize(value):
    return ' '.join(value.casefold().split())


def number(value):
    if value is not None and (type(value) not in (int, float) or not math.isfinite(value) or value < 0):
        raise ValueError('Invalid observed count')
    return value


def dated_period(value):
    if date.fromisoformat(value['start']) > date.fromisoformat(value['end']):
        raise ValueError('Reversed observation period')
    return {key: value[key] for key in ('start', 'end', 'timezone') if key in value}


def checked_plan(plan, as_of):
    ident = plan['id']
    if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', ident):
        raise ValueError('Invalid topic id')
    public_url(plan['destination'])
    checked = datetime.fromisoformat(plan['verifiedAt'])
    if checked.tzinfo is None or checked.date() > as_of:
        raise ValueError('Destination verification needs an actual past UTC date')
    if (as_of - checked.date()).days > 7:
        raise ValueError('Recheck the public destination before regenerating a pack')
    if plan.get('destinationStatus') != 200 or not plan.get('primarySources'):
        raise ValueError('Verified destination and factual sources required')
    questions = plan['questions']
    if not questions:
        raise ValueError('A researched script is required; queries alone cannot create a quiz')
    seen = set()
    for q in questions:
        if not isinstance(q['prompt'], str) or len(q['prompt']) > 60 or '\n' in q['prompt'] or '\r' in q['prompt']:
            raise ValueError('Visible question must fit one line and 60 characters; rewrite it without truncating')
        prompt = normalize(q['prompt'])
        if prompt in seen or not prompt:
            raise ValueError('Duplicate or empty question')
        seen.add(prompt)
        if len(q['options']) != 3 or len(set(q['options'])) != 3:
            raise ValueError('The pilot uses three distinct ABC choices')
        if any(not isinstance(o, str) or not 1 <= len(o.split()) <= 3 or '\n' in o or '\r' in o for o in q['options']):
            raise ValueError('Each visible ABC choice must fit one line and three words; rewrite it without truncating')
        if type(q['answer']) is not int or not 0 <= q['answer'] < 3:
            raise ValueError('Invalid answer index')
        if not q.get('explanation') or not q.get('source'):
            raise ValueError('Every answer needs an explanation and a source')
    if len(plan['titles']) != 3 or any(not t or len(t) > 100 for t in plan['titles']):
        raise ValueError('Three accurate titles under 100 characters required')
    if len(', '.join(plan['tags'])) > 500 or len(plan['thumbnails']) != 3:
        raise ValueError('Tags over limit or missing thumbnail concepts')
    return plan


def rank_topics(report, plans, as_of, studio=None, studio_sha=None):
    """Order eligible pilots by evidence strength, not predicted video views.

    Only editor-approved exact query strings establish intent. All queries are
    reported for their exact destination; provider estimates and GA4 views stay
    separate. Unreturned observations stay None. No automatic data acquisition.
    """
    as_of = date.fromisoformat(as_of)
    if studio is not None:
        studio=validate_studio(studio)
        if not 0 <= (as_of-studio_timestamp(studio['observedAt']).date()).days <= 7:
            raise ValueError('Fresh Studio evidence required for automatic pack preparation')
    dated_period(report['availablePeriod'])
    if report.get('property') != 'sc-domain:brainilabgames.com':
        raise ValueError('Wrong Search Console property')
    if report['contentMeasurement'].get('property') != '555562532':
        raise ValueError('Wrong Analytics property')
    for timestamp in (report['generatedAt'], report['contentMeasurement']['observedAt']):
        if datetime.fromisoformat(timestamp).tzinfo is None:
            raise ValueError('Evidence timestamps require timezone')
    if report['contentMeasurement'].get('mode') != 'api_snapshot':
        raise ValueError('This pilot requires the verified Analytics API snapshot')
    known = {public_url(HOST_URL + r['path']) for r in report['distribution']['resources']}
    content = {r['path']: r for r in report['contentMeasurement']['rows']}
    discovered = {r['url']: r for r in report.get('discovery', [])}
    ids = set()
    items = []
    for item in plans:
        p = checked_plan(item, as_of)
        if p['id'] in ids:
            raise ValueError('Duplicate plan id')
        ids.add(p['id'])
        if p['destination'] not in known:
            raise ValueError('Destination not in the published Growth inventory')
        if p.get('duplicateStatus') != 'no_duplicate_in_reviewed_local_packs':
            raise ValueError('Review existing packs before proposing a pilot')
        lead = discovered.get(p['destination'])
        allowed = {normalize(q) for q in p['intentQueries']}
        matching = []
        if lead:
            for q in lead.get('queryEvidence', []):
                if q.get('page') == p['destination'] and normalize(q['query']) in allowed:
                    matching.append({k: q[k] for k in ('query', 'clicks', 'impressions', 'position')})
        row = content.get(urlsplit(p['destination']).path)
        gsc = None if lead is None else {
            'pageImpressions': number(lead['pageEvidence']['impressions']),
            'pageClicks': number(lead['pageEvidence']['clicks']),
            'matchingQueries': matching,
            'period': dated_period(report['availablePeriod']),
            'snapshot': lead['pageSourceSnapshot'],
            'limit': 'Google Web Search exposure; not YouTube demand or expected views.'}
        ga4 = None if row is None else {
            'views': number(row['views']), 'readSignals': number(row['readSignals']),
            'observedAt': report['contentMeasurement']['observedAt'],
            'period': dated_period(report['contentMeasurement']['period']),
            'limit': 'All-source page views and article_read signals; not unique readers or completed reading.'}
        secondary = p.get('secondaryDemand')
        if secondary:
            if secondary.get('source') != 'Google Trends' or secondary.get('searchType') != 'Web Search':
                raise ValueError('Unsupported secondary evidence; verify its source and search type')
            checked = date.fromisoformat(secondary['checkedAt'])
            if not 0 <= (as_of - checked).days <= 30:
                raise ValueError('Secondary research outside the 30-day reuse window')
            if not secondary.get('limitation') or not secondary.get('market'):
                raise ValueError('Secondary evidence needs market and limits')
        tier = 'observed_google_query' if matching else ('secondary_web_demand' if secondary else 'editorial_hypothesis')
        youtube=None
        if studio is not None:
            evidence=p.get('youtubeEvidence',{})
            if evidence.get('snapshotSha256') != studio_sha:
                raise ValueError('Plan must reference the actual Studio snapshot hash')
            refs=evidence.get('references',[])
            matches=[r for r in studio['insights'] if r['term'] in refs and r['kind']!='entered_topic']
            if not matches: raise ValueError('No matching observed Studio evidence for this plan')
            positive=any(r.get('interestLevel') in ('medium','high','very_high') or (r['kind']=='own_search_term' and (r.get('sharePercent') or 0)>0) for r in matches)
            if not positive and not p.get('experimentalJustification'):
                raise ValueError('Weak or unknown audience demand needs an explicit evidence-based experimental justification')
            if not evidence.get('fitExplanation') or p.get('currentUploadReview') is not True or p.get('currentCalendarReview') is not True:
                raise ValueError('Topic fit, live upload and calendar reviews required')
            youtube={'snapshotSha256':studio_sha,'observedAt':studio['observedAt'],'references':matches,
                'fitExplanation':evidence['fitExplanation'],'limit':'Studio interest labels and recommendations are not search volumes or performance forecasts.'}
        items.append({'id': p['id'], 'topic': p['titles'][0], 'destination': p['destination'],
            'status': 'preproduction_draft', 'evidenceTier': tier, 'gsc': gsc, 'ga4': ga4,
            'secondaryDemand': secondary, 'youtubeTopicDemand': youtube,
            'audienceFit': p['audienceFit'], 'duplicateReview': p['duplicateReview'],
            'limitation': 'Editorial pilot, not a predicted winner. Source/format/age comparisons must be reviewed before production.' if studio else 'Experimental website-acquisition pilot. Current Studio evidence is unavailable.'})
    tiers = {'observed_google_query': 0, 'secondary_web_demand': 1, 'editorial_hypothesis': 2}
    # Within one first-party GSC period, compare visible relevant-query exposure.
    # Do not sort unrelated Google Trends scores as if they were comparable volume.
    items.sort(key=lambda r: (tiers[r['evidenceTier']],
        -sum(q['impressions'] for q in (r['gsc'] or {}).get('matchingQueries', [])), r['id']))
    for index, r in enumerate(items, 1):
        r['editorialPriority'] = index
    return {'schemaVersion': 1, 'asOf': as_of.isoformat(), 'mode': 'local_draft',
        'policy': 'Priority is a transparent planning rule, never a performance forecast. Recheck Studio demand and publication inventory before production.',
        'websiteYouTubeObservation': {k: report['measurement'][k] for k in ('observedAt', 'period', 'timezone')},
        'youtubeSocialSessions': next((r['sessions'] for r in report['measurement']['sources'] if r['label'] == 'youtube / social'), None),
        'topicAttribution': 'YouTube social sessions are aggregate; they are not assigned to any proposed video.',
        'publishingAuthorized': False, 'items': items}


HOST_URL = 'https://' + HOST


def campaign(plan, as_of, content='description'):
    return plan['destination'] + '?' + urlencode({'utm_source': 'youtube', 'utm_medium': 'social',
        'utm_campaign': f"growth_video_{plan['id'].replace('-', '_')}_{as_of.replace('-', '')}",
        'utm_content': content})


def pack(plan, ranking, as_of):
    """Prepare content/metadata; never fabricate an existing render or subtitles."""
    destination = campaign(plan, as_of)
    description = plan['description'] + '\n\nRead the story and try the optional quiz:\n' + destination
    description += '\n\nSources:\n' + '\n'.join(s['url'] for s in plan['primarySources'])
    description += '\n\nSubscribe for more quizzes and everyday discoveries:\nhttps://www.youtube.com/@BrainiLab'
    description += '\n\n' + ' '.join(plan['hashtags'])
    return {'schemaVersion': 1, 'id': plan['id'], 'status': 'preproduction_draft',
        'asOf': as_of, 'language': 'en-US', 'publishingAuthorized': False,
        'titles': plan['titles'], 'description': description, 'tags': plan['tags'],
        'pinnedComment': plan['feedback'] + '\n\nTry the article: ' + campaign(plan, as_of, 'pinned_comment'),
        'thumbnails': plan['thumbnails'], 'script': plan['script'], 'questions': plan['questions'],
        'shortDraft': plan['shortDraft'], 'communityDraft': plan['communityDraft'],
        'campaignUrl': destination, 'destination': plan['destination'],
        'format': plan['format'], 'resources': plan['resources'], 'evidence': ranking,
        'video': {'exists': False, 'path': None, 'durationSeconds': None},
        'chapters': None, 'subtitles': None, 'scheduledAt': None, 'publishedAt': None,
        'settingsReview': 'Category Education is a proposal. Review the actual intended audience and assets before choosing Made for Kids or synthetic-content disclosure.',
        'releaseGates': ['Review current channel uploads and calendar: local pack search is incomplete.',
            'Confirm production choice and template; preserve all existing calendar slots and sheets.',
            'Creator generates/reviews image and audio assets; thumbnail concepts are not final images.',
            'Compare metadata, question count, answer order and visuals with the final render.',
            'Add chapters only from verified final timings; subtitles only from the actual audio.',
            'Check destination and campaign link again; publication needs its own explicit instruction.'],
        'measurementPlan': ['After an authorized publication, record the real video ID, URL and timestamp.',
            'At age 2 and 7 days compare CTR by source, initial retention, average view duration, watch hours and attributed subscribers with similar-age/format channel videos.',
            'Measure GA4 sessions and engagement for this exact UTM campaign and voluntary feedback; missing attribution is unknown.',
            'A completed YouTube view is not a website visit. A page view or article_read is not a finished Academy lesson.',
            'Do not change existing experiment winners or claim a thumbnail winner without Studio results.']}


def markdown(value):
    lines = [f"# {value['titles'][0]}", '', 'Esborrany de producció. No hi ha vídeo, imatges ni àudio generats; no està pujat ni programat.', '',
        '## Títols', ''] + [f"{i}. {t}" for i,t in enumerate(value['titles'],1)]
    lines += ['', '## Descripció per copiar', '', value['description'], '', '## Tags', '', ', '.join(value['tags']),
        '', '## Comentari fixat', '', value['pinnedComment'], '', '## Guió', '']
    lines += [f"**{s['part']}**\n\n{s['voiceover']}\n\nVisual: {s['visual']}\n" for s in value['script']]
    lines += ['', '## Preguntes ABC', '']
    for i,q in enumerate(value['questions'],1):
        lines += [f"### {i}. {q['prompt']}", ''] + [f"{letter}. {option}" for letter,option in zip('ABC',q['options'])]
        lines += ['', f"Resposta: {'ABC'[q['answer']]} — {q['options'][q['answer']]}", q['explanation'], f"Font: {q['source']}", '']
    lines += ['## Miniatures A/B/C', '', 'Conceptes i prompts per a les eines del creador; no imatges finals.', '']
    for thumb in value['thumbnails']:
        lines += [f"### {thumb['variant']}. {thumb['headline']}", '', thumb['concept'],
            'Hipòtesi: ' + thumb['hypothesis'], '', 'Prompt: ' + thumb['prompt'], '']
    lines += ['## Short relacionat', '', value['shortDraft'], '', '## Post de Comunitat — esborrany', '', value['communityDraft'],
        '', '## Recursos i format', '', value['format'], value['resources'], '', '## Abans de publicar', '']
    lines += ['- ' + g for g in value['releaseGates']]
    lines += ['', '## Mesura després de publicar', ''] + ['- '+m for m in value['measurementPlan']]
    lines += ['', '## Evidència interna', '', '```json', json.dumps(value['evidence'],ensure_ascii=False,indent=2), '```', '']
    return '\n'.join(lines)


def generate(report_path, plans_path, output, as_of, studio_path=None):
    report_bytes, plans_bytes = report_path.read_bytes(), plans_path.read_bytes()
    report, plans = json.loads(report_bytes.decode('utf-8-sig')), json.loads(plans_bytes.decode('utf-8-sig'))
    studio_bytes=studio_path.read_bytes() if studio_path else None
    studio=json.loads(studio_bytes.decode('utf-8-sig')) if studio_bytes else None
    studio_sha=hashlib.sha256(studio_bytes).hexdigest() if studio_bytes else None
    if studio is not None and len(plans)>1: raise ValueError('Automatic cycle prepares at most one new reviewed pack')
    ranking = rank_topics(report, plans, as_of,studio,studio_sha)
    files = {'ranking.json': json.dumps(ranking,ensure_ascii=False,indent=2)+'\n'}
    by_id = {p['id']: p for p in plans}
    for r in ranking['items']:
        p = pack(by_id[r['id']], r, as_of)
        files[f"{r['id']}/upload-pack.json"] = json.dumps(p,ensure_ascii=False,indent=2)+'\n'
        files[f"{r['id']}/UPLOAD-PACK.md"] = markdown(p)
        csv_output = io.StringIO(newline='')
        writer = csv.writer(csv_output)
        writer.writerow(['number','question','option_a','option_b','option_c','correct_letter','explanation','source'])
        for index,q in enumerate(p['questions'],1):
            writer.writerow([index,q['prompt'],*q['options'],'ABC'[q['answer']],q['explanation'],q['source']])
        files[f"{r['id']}/questions.csv"] = csv_output.getvalue()
    manifest = {'schemaVersion':1,'asOf':as_of,'status':'preproduction_drafts',
        'youtubeStudioSHA256':studio_sha,
        'growthReportSHA256':hashlib.sha256(report_bytes).hexdigest(),
        'plansSHA256':hashlib.sha256(plans_bytes).hexdigest(),
        'files':{n:hashlib.sha256(t.encode('utf-8')).hexdigest() for n,t in files.items()}}
    files['manifest.json'] = json.dumps(manifest,indent=2)+'\n'
    # Preflight every destination before the first write; never overwrite edits.
    for name,contents in files.items():
        path = output/name
        if path.exists() and path.read_bytes() != contents.encode('utf-8'):
            raise ValueError('Output differs. Use a new output folder; preserve earlier/human work.')
    for name,contents in files.items():
        path = output/name
        path.parent.mkdir(parents=True,exist_ok=True)
        if not path.exists():
            path.write_bytes(contents.encode('utf-8'))
    return manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--report',type=Path,required=True)
    parser.add_argument('--plans',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--as-of',required=True)
    parser.add_argument('--studio',type=Path,help='Actual normalized Studio snapshot; required by the native automatic cycle')
    args = parser.parse_args()
    print(json.dumps(generate(args.report,args.plans,args.output,args.as_of,args.studio),indent=2))
