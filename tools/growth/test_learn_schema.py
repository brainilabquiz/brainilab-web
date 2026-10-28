import copy
import hashlib
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import learn_schema as s
import gsc_sync as api
import seo_explorer as seo

AT='2026-10-28T20:00:00Z';URL='https://brainilabgames.com/learn/example/'
def observation():return {'url':URL,'checkedAt':AT,'sha256':'a'*64,'contentSha256':'b'*64,'kind':'Article','state':'ready','checks':[['headline','same']],'details':[]}
def snapshot(p=None):return {'schemaVersion':1,'domain':'brainilabgames.com','pages':[p or observation()]}

class LearnSchemaTest(unittest.TestCase):
    def test_bounds_and_allowlist(self):
        for url in [URL+'index.html',URL+'?token=private','https://brainilabgames.com/learn/paths/','https://other.example/learn/example/','https://brainilabgames.com/profile/']:
            bad=observation();bad['url']=url
            with self.assertRaises(ValueError):s.page(bad)
        p=observation();p['privateDraft']='do not export';self.assertNotIn('privateDraft',s.page(p))
        bad=observation();bad['checks']*=2
        with self.assertRaises(ValueError):s.page(bad)
        bad=observation();bad['kind']='Course'
        with self.assertRaises(ValueError):s.page(bad)

    def test_record_history_cas_idempotence_and_old_restore(self):
        with tempfile.TemporaryDirectory()as tmp,patch.object(api,'PRIVATE',Path(tmp)):
            first=s.record(tmp,snapshot(),'missing');path=Path(tmp)/'learn-schema-latest.json';raw=path.read_bytes()
            self.assertTrue(s.record(tmp,snapshot(),first['sha256'])['reused']);self.assertEqual(raw,path.read_bytes())
            with self.assertRaises(RuntimeError):s.record(tmp,snapshot(),'missing')
            p=observation();p['checkedAt']='2026-10-29T20:00:00Z';p['contentSha256']='c'*64
            second=s.record(tmp,snapshot(p),first['sha256']);self.assertFalse(second['reused'])
            self.assertTrue(s.record(tmp,snapshot(),second['sha256'])['reused'])
            self.assertEqual(len(list((Path(tmp)/'learn-schema-history').glob('*.json'))),1)
            attached=s.attach({'pages':[]},tmp,[{'learnSchema':snapshot(p)}]);self.assertEqual(attached['learnSchema']['pages'][0]['contentSha256'],'c'*64)

    def test_adapter_failure_does_not_discard_other_sections(self):
        pages=[{'url':URL,'sha256':'a'*64,'checkedAt':AT}];before=copy.deepcopy(pages)
        with patch('learn_schema.subprocess.run',side_effect=OSError('unavailable')):
            self.assertEqual(s.enrich(pages,[(URL,{'url':URL,'status':200,'body':b'<h1>A page</h1>'},AT)]),before)

    def test_crawl_uses_existing_response_and_preserves_same_day_cache(self):
        calls=[]
        def fetch(u):
            calls.append(u);body=b'User-agent: *\nAllow: /' if u.endswith('/robots.txt')else b'<h1>Page</h1>'
            return {'url':u,'status':200,'body':body,'robotsHeader':''}
        with patch('learn_schema.enrich',side_effect=lambda p,r:p)as adapt:
            seo.crawl([URL],[],fetcher=fetch)
            self.assertEqual(calls.count(URL),1);self.assertEqual(len(adapt.call_args[0][1]),1)
            self.assertEqual(adapt.call_args[0][1][0][1]['body'],b'<h1>Page</h1>')
        self.assertEqual(seo.PRODUCER_VERSION,5,'Do not invalidate today’s successful crawl for schema collection')

if __name__=='__main__':unittest.main()
