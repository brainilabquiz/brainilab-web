"""Saved Article/Course comparisons using the shared inert HTML comparator."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import gsc_sync as api
from quiz_schema import timestamp

FIELDS={'canonical','identity','headline','author','preview','cover','published','modified','lessons'}
ROOT=Path(__file__).resolve().parents[2]
BATCH_BYTES=16000000


def own(url):
    return isinstance(url,str) and bool(re.fullmatch(r'https://brainilabgames\.com/learn/(?:paths/)?[a-z0-9]+(?:-[a-z0-9]+)*/',url)) and url not in {'https://brainilabgames.com/learn/'+s+'/' for s in ('topics','paths','authors')}


def page(p):
    if not isinstance(p,dict) or not own(p.get('url')) or p.get('kind') not in ('Article','Course') or p.get('state') not in ('ready','unknown'):
        raise ValueError('Unsupported Learn observation')
    if (p['kind']=='Course')!=('/learn/paths/'in p['url']): raise ValueError('Wrong resource kind')
    for key in ('sha256','contentSha256'):
        if not isinstance(p.get(key),str) or not re.fullmatch('[a-f0-9]{64}',p[key]): raise ValueError('Exact source and content hashes required')
    checks=p.get('checks');details=p.get('details',[])
    if not isinstance(checks,list) or len(checks)>9 or not isinstance(details,list) or len(details)>9: raise ValueError('Comparison bounds')
    for c in checks:
        if not isinstance(c,list) or len(c)!=2 or c[0] not in FIELDS or c[1] not in ('same','equivalent','different','unknown'): raise ValueError('Unsupported field comparison')
    if len({c[0] for c in checks})!=len(checks): raise ValueError('Duplicate comparison')
    for d in details:
        if not isinstance(d,list) or len(d)!=3 or not any(c[0]==d[0] and c[1]!='same'for c in checks) or any(v is not None and(not isinstance(v,str)or len(v)>800)for v in d[1:]):
            raise ValueError('Invalid field context')
    if len({d[0] for d in details})!=len(details):raise ValueError('Duplicate field context')
    return {'url':p['url'],'checkedAt':timestamp(p['checkedAt']),'sha256':p['sha256'],'contentSha256':p['contentSha256'],
            'kind':p['kind'],'state':p['state'],'checks':checks,'details':details}


def validate(value):
    if not isinstance(value,dict) or value.get('schemaVersion')!=1 or value.get('domain')!='brainilabgames.com' or not isinstance(value.get('pages',[]),list):
        raise ValueError('Unsupported Learn schema snapshot')
    pages=[page(p)for p in value.get('pages',[])]
    if len(pages)>500 or len({p['url']for p in pages})!=len(pages): raise ValueError('Inventory bounds or duplicates')
    return {'schemaVersion':1,'domain':'brainilabgames.com','pages':sorted(pages,key=lambda p:p['url'])}


def merge(values):
    pages={}
    for value in values:
        for p in validate(value)['pages']:
            old=pages.get(p['url'])
            if not old or p['checkedAt']>old['checkedAt']: pages[p['url']]=p
            elif p['checkedAt']==old['checkedAt'] and p!=old: raise ValueError('Conflicting same-time Learn evidence')
    return validate({'schemaVersion':1,'domain':'brainilabgames.com','pages':list(pages.values())})


def record(private,value,expected):
    private=Path(private);path=private/'learn-schema-latest.json';before=path.read_bytes() if path.exists() else None
    digest=hashlib.sha256(before).hexdigest() if before else 'missing'
    if digest!=expected:raise RuntimeError('Learn schema evidence changed; reread before recording')
    old=validate(json.loads(before)) if before else {'schemaVersion':1,'domain':'brainilabgames.com','pages':[]}
    clean=merge([old,value])
    if clean==old:return {'reused':True,'sha256':digest}
    private.mkdir(parents=True,exist_ok=True);lock=private/'learn-schema.write-lock';fd=os.open(lock,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
    try:
        os.close(fd)
        if (path.read_bytes()if path.exists()else None)!=before:raise RuntimeError('Concurrent Learn evidence edit')
        if before:api.private_write(private/'learn-schema-history'/(digest+'.json'),json.loads(before))
        api.private_write(path,clean)
    finally:lock.unlink()
    return {'reused':False,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}


def attach(snapshot,private,candidates=()):
    values=[v.get('learnSchema')for v in candidates if isinstance(v,dict)]
    path=Path(private)/'learn-schema-latest.json'
    if path.exists():
        try:values.append(json.loads(path.read_text(encoding='utf-8')))
        except (OSError,ValueError):pass
    for candidate in [*candidates,snapshot]:
        if not isinstance(candidate,dict):continue
        bound=[]
        for p in candidate.get('pages',[]) if isinstance(candidate.get('pages',[]),list) else []:
            try:
                e=page(p['learnSchema'])
                if e['url']==p['url'] and e['sha256']==p['sha256'] and e['checkedAt']==timestamp(p['checkedAt']):bound.append(e)
            except (ValueError,TypeError,KeyError):pass
        values.append({'schemaVersion':1,'domain':'brainilabgames.com','pages':bound})
    result={'schemaVersion':1,'domain':'brainilabgames.com','pages':[]}
    for v in values:
        try:result=merge([result,v])
        except (ValueError,TypeError,KeyError):pass
    # Keep exact response bindings in the private crawl, but export one copy.
    # Duplicating every comparison inside pages and learnSchema can exceed the
    # existing one-megabyte Growth ingest limit as the catalogue grows.
    return {**snapshot,'pages':[{k:v for k,v in p.items()if k!='learnSchema'}for p in snapshot.get('pages',[])],'learnSchema':result} if result['pages'] else snapshot


def enrich(pages,responses):
    """No fetch: process the exact successful responses already in this crawl.

    Node/JSDOM is an optional existing local runtime. Failure leaves other SEO
    evidence usable; attachment preserves the previous dated Learn observations.
    """
    node=shutil.which('node')
    if not node:
        node=next((str(p)for p in (Path(sys.executable).parent.parent/'node/bin/node.exe',Path(sys.executable).parent.parent/'node/bin/node')if p.is_file()),None)
    if not node:return pages
    found={};batch=[];size=0
    def flush():
        nonlocal batch,size
        if not batch:return True
        current=batch
        batch=[];size=0
        result=subprocess.run([node,str(Path(__file__).with_suffix('.mjs'))],input=json.dumps(current,ensure_ascii=False),encoding='utf-8',capture_output=True,timeout=90,cwd=ROOT)
        if result.returncode!=0:return False
        output=json.loads(result.stdout)
        if not isinstance(output,list) or len(output)>len(current):return False
        expected={p['url']:p for p in current};valid={};duplicates=set()
        for raw in output:
            try:
                clean=page(raw);source=expected.get(clean['url'])
                if not source or clean['sha256']!=hashlib.sha256(source['html'].encode('utf-8')).hexdigest() or clean['checkedAt']!=timestamp(source['checkedAt']):continue
                if clean['url'] in valid:duplicates.add(clean['url'])
                else:valid[clean['url']]=clean
            except (ValueError,TypeError,KeyError):continue
        found.update({url:p for url,p in valid.items()if url not in duplicates})
        return True
    try:
        for url,response,at in responses:
            try:
                if not own(url) or response['url']!=url or response['status']!=200:continue
                item={'url':url,'checkedAt':at,'html':response['body'].decode('utf-8',errors='strict')}
                count=len(json.dumps(item,ensure_ascii=False).encode('utf-8'))
            except (ValueError,TypeError,KeyError,AttributeError):continue
            if count>4000000:continue
            if size+count>BATCH_BYTES and not flush():break
            batch.append(item);size+=count
        else:flush()
    except (OSError,ValueError,TypeError,KeyError,subprocess.SubprocessError):pass
    # A later failed batch must not discard already validated observations.
    for p in pages:
        evidence=found.get(p['url'])
        if evidence and evidence['sha256']==p['sha256'] and evidence['checkedAt']==timestamp(p['checkedAt']):p['learnSchema']=evidence
    return pages


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--private',type=Path,default=api.PRIVATE);p.add_argument('--input',type=Path,required=True);p.add_argument('--expected-sha256',required=True);args=p.parse_args();api.PRIVATE=args.private.resolve()
    print(json.dumps(record(api.PRIVATE,json.loads(args.input.read_text(encoding='utf-8')),args.expected_sha256)))
