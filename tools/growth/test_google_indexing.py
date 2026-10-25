import copy,json,tempfile,unittest
from pathlib import Path
from datetime import datetime,timezone
from unittest.mock import patch
import google_indexing as s
from evidence_snapshot import commit,sha

NOW=datetime(2026,10,25,20,tzinfo=timezone.utc)
class Clock:
    @staticmethod
    def now(*_):return NOW

def sitemap(n=3):return ('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">'+''.join(f'<url><loc>https://brainilabgames.com/learn/sample-{i}/</loc><image:image><image:loc>https://brainilabgames.com/assets/images/image.webp</image:loc></image:image></url>' for i in range(n))+'</urlset>').encode()
def row(url):return {'url':url,'observedAt':'2026-10-21T10:00:00Z','verdict':'PASS','coverageState':'Submitted and indexed','lastCrawlTime':'2026-10-20T12:00:00Z','googleCanonical':url,'userCanonical':url}
def snapshot(n=3):
    import hashlib
    urls=s.inventory(sitemap(n));return s.validate({'schemaVersion':1,'property':s.api.PROPERTY,'source':'Google URL Inspection API','mode':'indexed_version','observedAt':'2026-10-21T10:00:00Z','inventory':urls,'inventorySHA256':hashlib.sha256(sitemap(n)).hexdigest(),'results':[row(u) for u in urls],'failures':[]})

class IndexTests(unittest.TestCase):
    def test_sitemap_scope_and_private_google_fields_never_exported(self):
        self.assertEqual(len(s.inventory(sitemap())),3)
        r=row('https://brainilabgames.com/learn/sample-0/');r.update(inspectionResultLink='https://search.google.com/private',referringUrls=['private'],googleCanonical='https://brainilabgames.com/account/?secret=x')
        clean=s.clean_row(r);self.assertIsNone(clean['googleCanonical']);self.assertTrue(clean['googleCanonicalWithheld']);self.assertNotIn('secret',json.dumps(clean));self.assertNotIn('inspectionResultLink',clean)
        self.assertFalse(s.public_url('https://brainilabgames.com/auth/'));self.assertFalse(s.public_url('https://evil.example/'))
        for missing in (None,''):
            r=row('https://brainilabgames.com/learn/sample-0/');r['verdict']=missing
            self.assertEqual(s.clean_row(r)['verdict'],'VERDICT_UNSPECIFIED')
        r.pop('verdict');self.assertEqual(s.clean_row(r)['verdict'],'VERDICT_UNSPECIFIED')

    def test_current_rows_reused_and_failed_attempt_keeps_old_verdict(self):
        with tempfile.TemporaryDirectory() as d,patch.object(s.api,'PRIVATE',Path(d)),patch.object(s.api,'access_token',return_value='fixture'),patch.object(s,'datetime',Clock):
            p=Path(d);old=snapshot();commit(p,'google-indexing',old,s.validate,'missing')
            def fail(*_):raise s.InspectionFailure('unavailable')
            result=s.refresh(p,NOW,sitemap(),fail,max_requests=1)
            saved=json.loads((p/'google-indexing-latest.json').read_bytes())
            self.assertEqual(result['failures'],1);self.assertEqual(saved['results'],old['results']);self.assertEqual(saved['failures'][0]['reason'],'unavailable')
            self.assertEqual(saved['results'][0]['observedAt'],'2026-10-21T10:00:00Z')

    def test_quota_stops_after_inflight_batch_and_prevents_repeat(self):
        with tempfile.TemporaryDirectory() as d,patch.object(s.api,'PRIVATE',Path(d)),patch.object(s.api,'access_token',return_value='fixture'),patch.object(s,'datetime',Clock):
            p=Path(d);calls=[]
            def quota(url,*_):calls.append(url);raise s.InspectionFailure('quota')
            s.refresh(p,NOW,sitemap(7),quota)
            self.assertLessEqual(len(calls),3)
            result=s.refresh(p,NOW,sitemap(7),lambda *_:self.fail('Repeated quota request'))
            self.assertIn('stopped',result)

    def test_success_reuse_history_and_newer_report_precedence(self):
        with tempfile.TemporaryDirectory() as d,patch.object(s.api,'PRIVATE',Path(d)),patch.object(s.api,'access_token',return_value='fixture'),patch.object(s,'datetime',Clock):
            p=Path(d);old=snapshot();commit(p,'google-indexing',old,s.validate,'missing');before=(p/'google-indexing-latest.json').read_bytes()
            def inspect(url,*_):return {'inspectionResult':{'indexStatusResult':{k:v for k,v in row(url).items() if k not in ('url','observedAt')}}}
            s.refresh(p,NOW,sitemap(),inspect)
            self.assertEqual((p/'google-indexing-history'/(sha(before)+'.json')).read_bytes(),before)
            self.assertTrue(s.refresh(p,NOW,sitemap(),lambda *_:self.fail('Repeated current inspection'))['reused'])
            newer=json.loads((p/'google-indexing-latest.json').read_bytes());(p/'google-indexing-latest.json').write_bytes(before)
            self.assertEqual(s.attach({'googleIndexing':newer},p)['googleIndexing'],newer)

    def test_invalid_identity_and_duplicate_inventory(self):
        value=snapshot();value['inventory'].append(value['inventory'][0])
        with self.assertRaises(ValueError):s.validate(value)
        value=snapshot();value['results'][0]['url']='https://brainilabgames.com/profile/'
        with self.assertRaises(ValueError):s.validate(value)

if __name__=='__main__':unittest.main()
