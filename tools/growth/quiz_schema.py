"""Dated prompt-only quiz evidence. No gameplay RPC, credentials or player reads."""
import argparse
from datetime import datetime, timezone
import hashlib
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import re
import gsc_sync as api

ROOT = Path(__file__).resolve().parents[2]
SCOPE = json.loads((ROOT/'lib/quiz-schema-scope.json').read_text(encoding='utf-8'))
TOPICS = {t['slug']: t for t in SCOPE['topics']}
ORIGIN = 'https://brainilabgames.com'
URLS = {ORIGIN+t['path']: t['slug'] for t in TOPICS.values()}
PROVIDERS = ('anytime', 'fixed', 'local')


def timestamp(value):
    if not isinstance(value, str) or not re.fullmatch(r'\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,9})?(?:Z|[+-]\d\d:\d\d)', value):
        raise ValueError('A dated UTC-offset observation is required')
    date = datetime.fromisoformat(value.replace('Z', '+00:00'))
    return date.astimezone(timezone.utc).isoformat()


def prompt(value):
    if not isinstance(value, str) or not 1 <= len(value) <= 480 or any(ord(c)<32 and c not in '\n\r\t' for c in value):
        raise ValueError('Invalid public question name')
    clean = re.sub(r'\s+', ' ', value).strip()
    if not clean: raise ValueError('Empty public question name')
    return clean


def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def page(value):
    if not isinstance(value,dict) or value.get('url') not in URLS or value.get('state') not in ('ready', 'unknown', 'not_declared'):
        raise ValueError('Unsupported quiz declaration')
    names = value.get('questions', [])
    if not isinstance(names, list) or len(names)>100: raise ValueError('Question declarations exceed bounds')
    names = [prompt(q) for q in names]
    if value['state'] != 'ready' and names: raise ValueError('Ambiguous declarations cannot supply questions')
    sha = value.get('sha256')
    if not isinstance(sha, str) or not re.fullmatch('[a-f0-9]{64}', sha): raise ValueError('Response hash required')
    return {'url':value['url'], 'checkedAt':timestamp(value['checkedAt']), 'sha256':sha,
            'state':value['state'], 'questions':names, 'declarationsSha256':digest(names)}


class Declarations(HTMLParser):
    def __init__(self):
        super().__init__(); self.inert=0; self.active=False; self.text=''; self.documents=[]; self.bad=False; self.base=False

    def handle_starttag(self, tag, attrs):
        if tag=='base' and 'href' in dict(attrs): self.base=True
        if tag in ('template', 'noscript'): self.inert+=1
        if tag=='script' and not self.inert and dict(attrs).get('type', '').lower()=='application/ld+json':
            self.active=True; self.text=''

    def handle_endtag(self, tag):
        if tag=='script' and self.active:
            try: self.documents.append(json.loads(self.text))
            except (ValueError, TypeError): self.bad=True
            self.active=False
        if tag in ('template', 'noscript'): self.inert=max(0,self.inert-1)

    def handle_data(self, data):
        if self.active: self.text+=data


def observe(url, response, checked_at):
    if url not in URLS: return None
    result={'url':url,'checkedAt':checked_at,'sha256':hashlib.sha256(response['body']).hexdigest(),'state':'unknown','questions':[]}
    if response['url']!=url or response['status']!=200: return page(result)
    parser=Declarations(); parser.feed(response['body'].decode('utf-8',errors='strict'))
    nodes=[]
    def walk(v, depth=0):
        if depth>8 or len(nodes)>1000: raise ValueError('Graph exceeds bounds')
        if isinstance(v,list):
            for n in v: walk(n,depth+1)
        elif isinstance(v,dict):
            nodes.append(v)
            if '@graph' in v: walk(v['@graph'],depth+1)
    try:
        walk(parser.documents)
        quizzes=[n for n in nodes if 'Quiz' in ([n.get('@type')] if not isinstance(n.get('@type'),list) else n['@type'])]
        if parser.bad or parser.base or len(quizzes)!=1: return page(result)
        quiz=quizzes[0]
        if quiz.get('url',url)!=url or quiz.get('@id',url+'#quiz')!=url+'#quiz': return page(result)
        if 'hasPart' not in quiz: result['state']='not_declared'; return page(result)
        parts=quiz['hasPart'] if isinstance(quiz['hasPart'],list) else [quiz['hasPart']]
        if len(parts)>100: raise ValueError('Too many parts')
        names=[]
        for part in parts:
            if not isinstance(part,dict): raise ValueError('Unresolved part')
            if '@id' in part:
                matches=[n for n in nodes if n.get('@id')==part['@id']]
                if len(matches)>1: raise ValueError('Ambiguous reference')
                if matches and matches[0] is not part:
                    if part.get('name') and part['name']!=matches[0].get('name'): raise ValueError('Conflicting reference')
                    part=matches[0]
            types=part.get('@type'); types=types if isinstance(types,list) else [types]
            if 'Question' not in types: raise ValueError('Unsupported part')
            names.append(prompt(part.get('name')))
        result.update(state='ready',questions=names)
    except (ValueError,TypeError,KeyError): pass
    return page(result)


def bank(value):
    if not isinstance(value,dict) or value.get('topic') not in TOPICS or value.get('source')!='published-question-tables': raise ValueError('Unsupported published bank')
    if not isinstance(value.get('providers'),list): raise ValueError('Providers must be an array')
    providers=[]
    for p in value['providers']:
        if not isinstance(p,dict) or p.get('name') not in PROVIDERS or type(p.get('complete')) is not bool: raise ValueError('Invalid provider')
        names=p.get('prompts')
        if not isinstance(names,list) or len(names)>2000: raise ValueError('Bank exceeds bounds')
        providers.append({'name':p['name'],'complete':p['complete'],'observedAt':timestamp(p['observedAt']),
                          'prompts':sorted(set(prompt(q) for q in names))})
    if len(providers)>3 or len({p['name'] for p in providers})!=len(providers): raise ValueError('Duplicate provider')
    providers.sort(key=lambda p:p['name'])
    # Dates are separate: a repeated read does not create a new content identity.
    content=[{k:p[k] for k in ('name','complete','prompts')} for p in providers]
    return {'topic':value['topic'],'source':'published-question-tables','providers':providers,'sha256':digest(content)}


def validate(value):
    if not isinstance(value,dict) or value.get('schemaVersion')!=1 or value.get('domain')!='brainilabgames.com': raise ValueError('Unsupported quiz evidence')
    banks=[bank(v) for v in value.get('banks',[])]; pages=[page(v) for v in value.get('pages',[])]
    if len(banks)>6 or len(pages)>6 or len({b['topic'] for b in banks})!=len(banks) or len({p['url'] for p in pages})!=len(pages):
        raise ValueError('Duplicate or excessive quiz evidence')
    return {'schemaVersion':1,'domain':'brainilabgames.com','banks':sorted(banks,key=lambda b:b['topic']),'pages':sorted(pages,key=lambda p:p['url'])}


def merge(values):
    banks={};pages={}
    for value in values:
        if not value: continue
        v=validate(value)
        for b in v['banks']:
            old=banks.setdefault(b['topic'],b); providers={p['name']:p for p in old['providers']}
            for p in b['providers']:
                prior=providers.get(p['name'])
                if not prior or p['observedAt']>prior['observedAt']: providers[p['name']]=p
                elif p['observedAt']==prior['observedAt'] and p!=prior: raise ValueError('Conflicting same-time bank observations')
            banks[b['topic']]=bank({**b,'providers':list(providers.values())})
        for p in v['pages']:
            prior=pages.get(p['url'])
            if not prior or p['checkedAt']>prior['checkedAt']: pages[p['url']]=p
            elif p['checkedAt']==prior['checkedAt'] and p!=prior: raise ValueError('Conflicting same-time declarations')
    return validate({'schemaVersion':1,'domain':'brainilabgames.com','banks':list(banks.values()),'pages':list(pages.values())})


def record(private, value, expected):
    private=Path(private); path=private/'quiz-schema-latest.json'; before=path.read_bytes() if path.exists() else None
    if (hashlib.sha256(before).hexdigest() if before else 'missing')!=expected: raise RuntimeError('Quiz evidence changed; reread before recording')
    old=validate(json.loads(before)) if before else None
    clean=merge([old,value])
    if old==clean: return {'reused':True,'sha256':expected}
    private.mkdir(parents=True,exist_ok=True); lock=private/'quiz-schema.write-lock'
    fd=os.open(lock,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
    try:
        os.close(fd)
        if (path.read_bytes() if path.exists() else None)!=before: raise RuntimeError('Concurrent quiz evidence edit')
        if before: api.private_write(private/'quiz-schema-history'/(hashlib.sha256(before).hexdigest()+'.json'),json.loads(before))
        api.private_write(path,clean)
    finally: lock.unlink()
    return {'reused':False,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}


def attach(snapshot, private, candidates=()):
    sources=[snapshot,*candidates]
    values=[c.get('quizSchema') for c in sources if isinstance(c,dict)]
    path=Path(private)/'quiz-schema-latest.json'
    if path.exists():
        try: values.append(json.loads(path.read_text(encoding='utf-8')))
        except (OSError,ValueError): pass
    # Crawl age does not determine the age of every URL. Older crawl candidates
    # can hold the newest exact-response observation for an individual quiz.
    for source in sources:
        if not isinstance(source,dict): continue
        bound=[]
        for p in source.get('pages',[]) if isinstance(source.get('pages',[]),list) else []:
            if not isinstance(p,dict): continue
            try:
                evidence=page(p['quizQuestions'])
                if evidence['url']==p['url'] and evidence['sha256']==p['sha256'] and evidence['checkedAt']==timestamp(p['checkedAt']): bound.append(evidence)
            except (ValueError,TypeError,KeyError): pass
        values.append({'schemaVersion':1,'domain':'brainilabgames.com','pages':bound})
    valid=[]
    for v in values:
        try: valid.append(validate(v))
        except (ValueError,KeyError,TypeError): pass
    combined=validate({'schemaVersion':1,'domain':'brainilabgames.com'})
    for v in valid:
        try: combined=merge([combined,v])
        except ValueError: continue  # Preserve good sources on a conflicting restored file.
    return {**snapshot,'quizSchema':combined} if combined['banks'] or combined['pages'] else snapshot


def local_providers(observed_at):
    text=(ROOT/'assets/js/quiz-packs.js').read_text(encoding='utf-8')
    packs=json.loads(re.search(r'const PACKS=(.*);\r?\n',text)[1])
    return {slug:{'name':'local','complete':True,'observedAt':timestamp(observed_at),
                  'prompts':[q['q'] for sets in packs[t['local']].values() for questions in sets.values() for q in questions]}
            for slug,t in TOPICS.items()}


def with_local(value, private, now=None):
    at=(now or datetime.now(timezone.utc)).isoformat(); local=local_providers(at)
    path=Path(private)/'quiz-schema-latest.json'
    old=validate(json.loads(path.read_text(encoding='utf-8'))) if path.exists() else {'banks':[]}
    for b in value.get('banks',[]):
        previous=next((p for bank in old['banks'] if bank['topic']==b['topic'] for p in bank['providers'] if p['name']=='local'),None)
        current=local[b['topic']]
        # A repeated same-day content check reuses the honest previous date.
        if previous and previous['complete'] and previous['observedAt'][:10]==at[:10] and previous['prompts']==sorted(set(current['prompts'])):
            current=previous
        b['providers']=[p for p in b['providers'] if p.get('name')!='local']+[current]
    return value


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--private',type=Path,default=api.PRIVATE)
    p.add_argument('--input',type=Path);p.add_argument('--expected-sha256');p.add_argument('--sql',action='store_true')
    p.add_argument('--include-local',action='store_true',help='Read only the prompt fields from this checkout’s local fallback')
    args=p.parse_args()
    if args.sql: print((Path(__file__).with_name('quiz_schema.sql')).read_text(encoding='utf-8'))
    else:
        if not args.input or not args.expected_sha256: p.error('Provide input and exact previous hash (or missing)')
        api.PRIVATE=args.private.resolve(); value=json.loads(args.input.read_text(encoding='utf-8'))
        if args.include_local: value=with_local(value,api.PRIVATE)
        print(json.dumps(record(api.PRIVATE,value,args.expected_sha256)))
