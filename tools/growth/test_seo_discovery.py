import copy
from datetime import datetime,timezone
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import gsc_sync as api
import seo_discovery as discovery
import seo_explorer as seo
from test_seo_explorer import fake, URL, SOURCE

AT=datetime(2026,10,20,20,tzinfo=timezone.utc)

def fixture():
    calls=[]
    def transport(url,payload,token):
        calls.append(payload)
        rows=[{'keys':['nepal flag shape']+(['https://brainilabgames.com/learn/nepal-flag-shape/'] if payload['type']=='web' else []),'clicks':0,'impressions':2,'ctr':0,'position':25}]
        rows.append({'keys':['private@example.org']+(['https://brainilabgames.com/profile/'] if payload['type']=='web' else []),'clicks':0,'impressions':1,'ctr':0,'position':2})
        return {'rows':rows}
    return discovery.collect(AT,transport,token='test'),calls

class DiscoveryTest(unittest.TestCase):
    def test_recent_search_types_and_filters_are_independent(self):
        calls = []
        def transport(url, payload, token):
            calls.append(payload)
            rows = []
            dims = payload.get('dimensions')
            if dims == ['brandedClassification']:
                return {'responseAggregationType': 'byProperty'}
            if dims == ['country', 'device']:
                rows = [{'keys': ['esp','MOBILE'], 'clicks': 1, 'impressions': 2}]
            elif payload['type'] == 'webMultimodal':
                rows = [{'clicks': 0, 'impressions': 1}]
            elif payload['type'] == 'web':
                rows = [{'clicks': 5, 'impressions': 7}]
            return {'responseAggregationType': 'byProperty', 'rows': rows}
        result = discovery.collect_breakdown(AT, transport, token='test')
        self.assertEqual(result['period'], {'start':'2026-09-20','end':'2026-10-17'})
        self.assertEqual([c['type'] for c in calls], ['web','webMultimodal','web','web'])
        self.assertEqual(calls[3]['dimensionFilterGroups'], [{'groupType':'and','filterLists':[
            {'dimension':'country','expressions':['ESP','GBR','USA']},
            {'dimension':'device','expressions':['DESKTOP','MOBILE']},
        ]}])
        self.assertTrue(all(c['dataState']=='final' and c['aggregationType']=='byProperty' for c in calls))
        self.assertEqual(result['sources']['brandedClassification']['status'], 'no_rows')
        self.assertEqual(result['sources']['webMultimodal']['rows'], [{'group':[], 'clicks':0, 'impressions':1}])
        self.assertEqual(result['sources']['webText']['rows'], [{'group':[], 'clicks':5, 'impressions':7}])
        self.assertNotIn('query', json.dumps(result))

    def test_bad_or_failing_sources_do_not_replace_other_results(self):
        def transport(url, payload, token):
            if payload.get('dimensions') == ['country','device']:
                return {'responseAggregationType':'byProperty','rows':[{'keys':['esp','TABLET'],'clicks':0,'impressions':1}]}
            if payload['type']=='webMultimodal':
                raise RuntimeError('offline with upstream details')
            return {'responseAggregationType':'byProperty'}
        result = discovery.collect_breakdown(AT, transport, token='test')['sources']
        self.assertEqual(result['webMultimodal']['status'], 'unavailable')
        self.assertEqual(result['marketsAndDevices']['status'], 'unavailable')
        self.assertEqual(result['webText']['status'], 'no_rows')
        self.assertNotIn('upstream details', json.dumps(result))

    def test_sources_use_different_types_and_aggregations_without_summing(self):
        value,calls=fixture()
        self.assertEqual([(r['type'],r['dimensions'],r['aggregationType'],r['dataState']) for r in calls],[('image',['query'],'byProperty','final'),('web',['query','page'],'byPage','final')])
        self.assertEqual(value['period'],{'start':'2026-07-20','end':'2026-10-17'})
        self.assertEqual(value['images']['rowsWithheld'],1)
        self.assertEqual(value['webPages']['rowsWithheld'],1)
        self.assertNotIn('private@example',json.dumps(value))
        self.assertNotIn('totalImpressions',value)

    def test_non_public_paths_and_source_mixing_rejected(self):
        value,_=fixture()
        for mutate in [lambda v:v['webPages']['rows'][0].update(path='/profile/'),lambda v:v['images'].update(searchType='web'),lambda v:v['webPages'].update(aggregation='byProperty'),lambda v:v['images']['rows'][0].update(position=float('nan')),lambda v:v['images']['rows'][0].update(clicks=True),lambda v:v['images']['rows'].append(v['images']['rows'][0]),lambda v:v['period'].update(end='2026-10-20')]:
            bad=copy.deepcopy(value);mutate(bad)
            with self.assertRaises(ValueError):discovery.validate(bad)
        for url in ['https://evil.example/learn/example/','https://brainilabgames.com/admin/','https://brainilabgames.com/learn/a/?secret=token','https://brainilabgames.com/auth/','https://brainilabgames.com/profile/#private']:
            self.assertIsNone(discovery.page_path(url))

    def test_cache_failure_and_cas_preserve_dated_data(self):
        value,_=fixture()
        with tempfile.TemporaryDirectory(dir=Path.cwd()) as folder,patch.object(api,'PRIVATE',Path(folder)):
            path=Path(folder)/'seo-search-sources-latest.json'
            discovery.refresh(folder,AT,collector=lambda **kw:value);before=path.read_bytes()
            self.assertTrue(discovery.refresh(folder,AT,collector=lambda **kw:self.fail('cache missed'))['reused'])
            later=datetime(2026,10,21,20,tzinfo=timezone.utc)
            with self.assertRaises(RuntimeError):discovery.refresh(folder,later,collector=lambda **kw:(_ for _ in ()).throw(RuntimeError('offline')))
            self.assertEqual(path.read_bytes(),before)
            self.assertFalse((Path(folder)/'seo-search-sources.write-lock').exists())
            def concurrent(**kw):
                path.write_bytes(before+b' ')
                return value
            with self.assertRaises(RuntimeError):discovery.refresh(folder,later,collector=concurrent)
            self.assertEqual(path.read_bytes(),before+b' ')

    def test_newest_discovery_survives_new_crawl_and_old_or_invalid_local_file(self):
        value,_=fixture();crawl=seo.crawl([URL],[SOURCE],now=AT,fetcher=fake)
        with tempfile.TemporaryDirectory(dir=Path.cwd()) as folder:
            private=Path(folder);file=private/'seo-search-sources-latest.json'
            prior=copy.deepcopy(value);prior['observedAt']='2026-10-20T19:00:00Z'
            file.write_text(json.dumps(prior))
            report={'seoExplorer':{**crawl,'searchSources':value}}
            self.assertEqual(seo.attach_seo(report,private)['seoExplorer']['searchSources']['observedAt'],value['observedAt'])
            file.write_text('{invalid')
            self.assertEqual(seo.attach_seo(report,private)['seoExplorer']['searchSources']['observedAt'],value['observedAt'])
            file.write_text(json.dumps(value))
            self.assertEqual(seo.attach_seo({'seoExplorer':crawl},private)['seoExplorer']['searchSources']['observedAt'],value['observedAt'])

if __name__=='__main__':unittest.main()
