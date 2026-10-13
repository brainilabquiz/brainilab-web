"""Register verified local draft artifacts, preserving decisions and hashes."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
from youtube_studio import atomic, digest


def register(private, directory, expected_sha):
    manifest=json.loads((directory/'manifest.json').read_text(encoding='utf-8'))
    if manifest.get('status')!='preproduction_drafts': raise ValueError('Only draft packs may be registered')
    for name,sha in manifest['files'].items():
        target=(directory/name).resolve()
        target.relative_to(directory.resolve())
        if digest(target)!=sha: raise ValueError('Draft artifact changed; verify before registering')
    ranking=json.loads((directory/'ranking.json').read_text(encoding='utf-8'))
    path=private/'video-drafts.json'; actual=digest(path)
    if actual!=expected_sha: raise ValueError('Draft registry changed; reread')
    value=json.loads(path.read_text(encoding='utf-8')) if path.exists() else {'schemaVersion':1,'drafts':[]}
    if value.get('schemaVersion')!=1: raise ValueError('Invalid draft registry')
    by_id={r['id']:r for r in value['drafts']}; changes=0
    for item in ranking['items']:
        if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*',item['id']): raise ValueError('Invalid draft identity')
        pack=json.loads((directory/item['id']/'upload-pack.json').read_text(encoding='utf-8'))
        if pack['status']!='preproduction_draft' or pack['publishingAuthorized'] is not False or pack['publishedAt'] is not None or pack['scheduledAt'] is not None:
            raise ValueError('Publication is not authorized by the draft cycle')
        ident=item['id']
        entry={'id':ident,'topic':pack['titles'][0],'format':'long','destination':pack['destination'],'status':'prepared',
            'createdAt':datetime.now(timezone.utc).isoformat(),'packDirectory':str((directory/ident).resolve()),
            'manifestSha256':digest(directory/'manifest.json'),'publishingAuthorized':False,'actor':None}
        if ident in by_id:
            old=by_id[ident]
            if old['destination']!=entry['destination'] or old['manifestSha256']!=entry['manifestSha256']:
                raise ValueError('Existing draft identity differs; preserve it and review a new explicit version')
            continue  # Includes deferred/dismissed human states.
        automatic=bool(manifest.get('youtubeStudioSHA256'))
        if automatic and any(r.get('automaticCycle') and r.get('preparationDay')==manifest['asOf'] for r in value['drafts']):
            raise ValueError('A new automatic pack already exists for this local day; resume it')
        entry.update(automaticCycle=automatic,preparationDay=manifest['asOf'])
        if any(r['destination']==entry['destination'] and r['format']==entry['format'] for r in value['drafts']):
            raise ValueError('Existing destination/format draft: review it instead of duplicating')
        value['drafts'].append(entry);by_id[ident]=entry;changes+=1
    if changes:
        if actual:
            backup=private/'video-history'/('registry-'+actual+'.json')
            if not backup.exists(): atomic(backup,json.loads(path.read_text(encoding='utf-8')))
        if digest(path)!=actual: raise ValueError('Concurrent draft update')
        atomic(path,value)
    return {'added':changes,'reused':len(ranking['items'])-changes,'sha256':digest(path)}


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--private',type=Path,required=True)
    p.add_argument('--pack-directory',type=Path,required=True);p.add_argument('--expected-sha256',required=True)
    a=p.parse_args();print(json.dumps(register(a.private,a.pack_directory,None if a.expected_sha256=='missing' else a.expected_sha256)))
