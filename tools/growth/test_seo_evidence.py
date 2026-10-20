import copy
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import gsc_sync as api
import seo_explorer as seo
import seo_keywords as keywords
import seo_reputation as reputation
from test_seo_explorer import fake, URL, SOURCE

AT=datetime(2026,10,20,19,tzinfo=timezone.utc)

def keyword_fixture():
    calls=[]
    def transport(url,payload,token):
        calls.append(payload)
        return {'rows':[{'keys':['number route game'],'clicks':1,'impressions':10,'ctr':0.1,'position':4},
                        {'keys':['private@example.org'],'clicks':0,'impressions':1,'ctr':0,'position':9}]}
    return keywords.collect(AT,transport=transport,token='test'),calls

def reputation_fixture():
    item={'observedAt':AT.isoformat(),'sourceUpdatedAt':None,'evidenceSha256':'a'*64}
    return {'schemaVersion':1,'domain':reputation.DOMAIN,
            'manualActions':{**item,'state':'no_issues_reported'},
            'securityIssues':{**item,'state':'no_issues_reported'},
            'links':{**item,'externalLinks':8,'referringSites':[{'host':'directory.example','links':8}],
                     'targetPages':[{'url':'https://brainilabgames.com/','links':8}]}}

class EvidenceTest(unittest.TestCase):
    def test_query_only_windows_are_final_separate_and_private_formats_are_withheld(self):
        value,calls=keyword_fixture()
        self.assertEqual(len(calls),2)
        self.assertTrue(all(p['dimensions']==['query'] and p['aggregationType']=='byProperty' and p['dataState']=='final' for p in calls))
        self.assertEqual(value['current']['period'],{'start':'2026-09-20','end':'2026-10-17'})
        self.assertEqual(value['discovery']['period'],{'start':'2026-07-20','end':'2026-10-17'})
        self.assertEqual(value['current']['rowsWithheld'],1)
        self.assertNotIn('private@example',json.dumps(value))
        self.assertEqual(value['current']['queries'][0]['ctr'],0.1)

    def test_malformed_and_duplicate_query_data_is_rejected(self):
        value,_=keyword_fixture()
        for mutation in [lambda v:v['current']['queries'].append(v['current']['queries'][0]),
                         lambda v:v['current']['queries'][0].update(clicks=100),
                         lambda v:v['current']['queries'][0].update(position=float('nan')),
                         lambda v:v['current']['period'].update(end='2026-10-20')]:
            bad=copy.deepcopy(value);mutation(bad)
            with self.assertRaises(ValueError):keywords.validate(bad)

    def test_keyword_cache_and_failure_keep_the_dated_snapshot(self):
        value,_=keyword_fixture()
        with tempfile.TemporaryDirectory(dir=Path.cwd()) as folder,patch.object(api,'PRIVATE',Path(folder)):
            path=Path(folder)/'seo-keywords-latest.json'
            keywords.refresh(folder,now=AT,collector=lambda **kw:value)
            before=path.read_bytes()
            result=keywords.refresh(folder,now=AT,collector=lambda **kw:self.fail('same day must reuse'))
            self.assertTrue(result['reused'])
            with self.assertRaises(RuntimeError):
                keywords.refresh(folder,now=datetime(2026,10,21,19,tzinfo=timezone.utc),collector=lambda **kw:(_ for _ in ()).throw(RuntimeError('offline')))
            self.assertEqual(path.read_bytes(),before)
            self.assertFalse((Path(folder)/'seo-keywords.write-lock').exists())

    def test_reputation_has_evidence_but_no_derived_authority_score(self):
        value=reputation_fixture();value['domainAuthority']=99;value['privateEmail']='owner@example.org'
        value['links']['privateNote']='private'
        clean=reputation.validate(value)
        self.assertNotIn('domainAuthority',clean);self.assertNotIn('owner@',json.dumps(clean))
        self.assertIsNone(clean['links']['sourceUpdatedAt'])
        self.assertEqual(clean['links']['externalLinks'],8)
        self.assertIn('not an endorsement',' '.join(clean['limitations']))
        value['manualActions']['state']='trusted'
        with self.assertRaises(ValueError):reputation.validate(value)

    def test_reputation_exact_hash_history_and_newer_evidence(self):
        value=reputation_fixture()
        with tempfile.TemporaryDirectory(dir=Path.cwd()) as folder,patch.object(api,'PRIVATE',Path(folder)):
            reputation.record(folder,value,'missing')
            path=Path(folder)/'seo-reputation-latest.json';before=path.read_bytes()
            with self.assertRaises(RuntimeError):reputation.record(folder,value,'missing')
            old=copy.deepcopy(value);old['manualActions']['observedAt']='2026-10-19T10:00:00Z'
            with self.assertRaises(ValueError):reputation.record(folder,old,hashlib.sha256(before).hexdigest())
            self.assertEqual(path.read_bytes(),before)

    def test_attachments_preserve_each_newest_source_when_local_data_is_old_or_missing(self):
        crawl=seo.crawl([URL],[SOURCE],now=AT,fetcher=fake)
        kw,_=keyword_fixture();rep=reputation.validate(reputation_fixture())
        report={'seoExplorer':{**crawl,'keywords':kw,'reputation':rep}}
        with tempfile.TemporaryDirectory(dir=Path.cwd()) as folder:
            private=Path(folder)
            newer=copy.deepcopy(crawl);newer['observedAt']='2026-10-21T19:00:00Z'
            (private/'seo-explorer-latest.json').write_text(json.dumps(newer))
            restored=copy.deepcopy(kw);restored['observedAt']='2026-10-20T18:00:00Z'
            (private/'seo-keywords-latest.json').write_text(json.dumps(restored))
            local=copy.deepcopy(rep);local['manualActions']['observedAt']='2026-10-19T19:00:00Z'
            local['securityIssues']['observedAt']='2026-10-21T19:00:00Z'
            (private/'seo-reputation-latest.json').write_text(json.dumps(local))
            merged=seo.attach_seo(report,private)['seoExplorer']
            self.assertEqual(merged['observedAt'],newer['observedAt'])
            self.assertEqual(merged['keywords']['observedAt'],kw['observedAt'])
            self.assertEqual(merged['reputation']['manualActions']['observedAt'],rep['manualActions']['observedAt'])
            self.assertEqual(merged['reputation']['securityIssues']['observedAt'],local['securityIssues']['observedAt'])
            (private/'seo-reputation-latest.json').write_text('{invalid')
            preserved=seo.attach_seo(report,private)['seoExplorer']
            self.assertEqual(preserved['reputation'],rep)

if __name__=='__main__':unittest.main()
