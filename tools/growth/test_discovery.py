import unittest
from unittest.mock import patch
import gsc_sync as api
from discovery import discover, health_audit

URL='https://brainilabgames.com/games/example/'
class DiscoveryTests(unittest.TestCase):
    def test_query_pairs_preserve_actual_page(self):
        rows=[{'keys':['same query',url],'clicks':0,'impressions':12,'ctr':0,'position':3} for url in (URL,URL+'other/')]
        pairs=api.query('fixture','2026-09-01','2026-09-02',['query','page'],transport=lambda *a:{'rows':rows})
        data={'tables':{'queryPage':pairs,'page':[{'value':URL,'impressions':12,'clicks':0,'ctr':0,'position':3}]}}
        public={URL:{'status':200,'titles':['Example'],'robots':[]}}
        lead=discover(data,public,'snapshot')[0]
        self.assertEqual(len(lead['queryEvidence']),1)
        self.assertEqual(lead['queryEvidence'][0]['page'],URL)
        public[URL]['robots']=['noindex']
        self.assertEqual(discover(data,public,'snapshot'),[])

    def test_duplicate_pair_rejected(self):
        row={'keys':['q',URL],'clicks':0,'impressions':1,'ctr':0,'position':1}
        with self.assertRaises(ValueError):
            api.query('fixture','2026-09-01','2026-09-02',['query','page'],transport=lambda *a:{'rows':[row,row]})

    def test_health_is_specific_not_an_invented_score(self):
        result=health_audit({URL:{'status':404,'titles':[],'h1':[]}})
        self.assertIn('Check HTTP response',result['issues'][0]['checks'])
        self.assertNotIn('score',result)

    def test_network_error_does_not_expose_secret(self):
        with patch.object(api,'urlopen',side_effect=api.URLError('secret=fixture')):
            with self.assertRaisesRegex(RuntimeError,'could not be reached') as caught:
                api.request_json('https://example.com',{})
        self.assertNotIn('fixture',str(caught.exception))
