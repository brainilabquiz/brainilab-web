import copy
import hashlib
import json
import os
from pathlib import Path
import tempfile
import unittest
from types import SimpleNamespace
import subprocess
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
            bound={'url':URL,'sha256':p['sha256'],'checkedAt':p['checkedAt'],'learnSchema':p}
            exported=s.attach({'pages':[bound]},tmp)
            self.assertNotIn('learnSchema',exported['pages'][0]);self.assertEqual(exported['learnSchema']['pages'][0]['contentSha256'],'c'*64)
            self.assertEqual(s.attach(exported,tmp),exported,'Root evidence survives removal of duplicate page payloads')

    def test_adapter_failure_does_not_discard_other_sections(self):
        pages=[{'url':URL,'sha256':'a'*64,'checkedAt':AT}];before=copy.deepcopy(pages)
        with patch('learn_schema.subprocess.run',side_effect=OSError('unavailable')):
            self.assertEqual(s.enrich(pages,[(URL,{'url':URL,'status':200,'body':b'<h1>A page</h1>'},AT)]),before)

    def test_one_bad_utf8_response_does_not_block_a_good_page(self):
        good=b'<main><h1>Good page</h1></main>';bad=URL.replace('/example/','/bad/')
        p=observation();p['sha256']=hashlib.sha256(good).hexdigest()
        pages=[{'url':URL,'checkedAt':AT,'sha256':p['sha256']}]
        responses=[(bad,{'url':bad,'status':200,'body':b'\xff'},AT),(URL,{'url':URL,'status':200,'body':good},AT)]
        with patch('learn_schema.subprocess.run',return_value=SimpleNamespace(returncode=0,stdout=json.dumps([p])))as run:
            result=s.enrich(pages,responses)
        self.assertEqual(result[0]['learnSchema']['contentSha256'],p['contentSha256']);self.assertEqual(run.call_count,1)
        sent=json.loads(run.call_args.kwargs['input']);self.assertEqual([p['url']for p in sent],[URL])

    def test_bad_adapter_row_does_not_drop_valid_row_and_unrequested_data_is_ignored(self):
        body=b'<main>Good</main>';p=observation();p['sha256']=hashlib.sha256(body).hexdigest()
        invalid=copy.deepcopy(p);invalid['url']='https://private.invalid/'
        unrequested=copy.deepcopy(p);unrequested['url']=URL.replace('/example/','/unrequested/')
        pages=[{'url':URL,'checkedAt':AT,'sha256':p['sha256']}]
        with patch('learn_schema.subprocess.run',return_value=SimpleNamespace(returncode=0,stdout=json.dumps([invalid,p,unrequested]))):
            # The result must stay within the requested response count too.
            result=s.enrich(copy.deepcopy(pages),[(URL,{'url':URL,'status':200,'body':body},AT)])
            self.assertNotIn('learnSchema',result[0])
        other=URL.replace('/example/','/other/')
        responses=[(URL,{'url':URL,'status':200,'body':body},AT),(other,{'url':other,'status':200,'body':body},AT)]
        with patch('learn_schema.subprocess.run',return_value=SimpleNamespace(returncode=0,stdout=json.dumps([invalid,p]))):
            result=s.enrich(pages,responses)
        self.assertEqual(result[0]['learnSchema']['sha256'],p['sha256'])

    def test_late_adapter_timeout_keeps_earlier_batch_and_stops_without_retry(self):
        body=b'<main>Good</main>';p=observation();p['sha256']=hashlib.sha256(body).hexdigest()
        responses=[(u,{'url':u,'status':200,'body':body},AT)for u in [URL,URL.replace('/example/','/second/'),URL.replace('/example/','/third/')]]
        pages=[{'url':URL,'checkedAt':AT,'sha256':p['sha256']}]
        success=SimpleNamespace(returncode=0,stdout=json.dumps([p]))
        with patch('learn_schema.BATCH_BYTES',1),patch('learn_schema.subprocess.run',side_effect=[success,subprocess.TimeoutExpired('node',90)])as run:
            result=s.enrich(pages,responses)
        self.assertIn('learnSchema',result[0]);self.assertEqual(run.call_count,2,'Do not repeat the failed process or request more pages')

    def test_adapter_results_must_match_requested_response_and_be_unique(self):
        body=b'<main>Good</main>';p=observation();p['sha256']=hashlib.sha256(body).hexdigest()
        other=URL.replace('/example/','/other/')
        responses=[(u,{'url':u,'status':200,'body':body},AT)for u in [URL,other]]
        for label,field,value in [('url','url',URL.replace('/example/','/unrequested/')),('hash','sha256','c'*64),('time','checkedAt','2026-10-29T20:00:00Z')]:
            wrong=copy.deepcopy(p);wrong[field]=value
            with self.subTest(label),patch('learn_schema.subprocess.run',return_value=SimpleNamespace(returncode=0,stdout=json.dumps([wrong]))):
                result=s.enrich([{'url':URL,'checkedAt':AT,'sha256':p['sha256']}],responses)
                self.assertNotIn('learnSchema',result[0])
        with patch('learn_schema.subprocess.run',return_value=SimpleNamespace(returncode=0,stdout=json.dumps([p,p]))):
            result=s.enrich([{'url':URL,'checkedAt':AT,'sha256':p['sha256']}],responses)
            self.assertNotIn('learnSchema',result[0])

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
