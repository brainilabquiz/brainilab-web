import copy
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import gsc_sync as google
from content_measurement import validate,attach_content
from ga4_content import collect

def example():
    return dict(schemaVersion=1,property='555562532',mode='manual_snapshot',source='GA4 Pages and screens UI',observedAt='2026-10-03T21:00:00+00:00',period={'start':'2026-09-05','end':'2026-10-02'},rows=[dict(path='/learn/moon/',title='Moon',topic='Science',kind='lesson',courses=['Moon course'],views=4,activeUsers=2,readSignals=None)])

class ContentTests(unittest.TestCase):
    def test_analytics_never_uses_search_console_token(self):
        with tempfile.TemporaryDirectory() as folder, patch.object(google,'PRIVATE',Path(folder)), patch.object(google,'client',return_value={'client_id':'fixture','client_secret':'fixture'}), patch.object(google,'request_json') as request:
            (Path(folder)/'google-token.json').write_text(json.dumps({'scope':google.SCOPE,'refresh_token':'fixture'}))
            with self.assertRaises(RuntimeError):google.access_token(scope='https://www.googleapis.com/auth/analytics.readonly',token_file='google-analytics-token.json')
            request.assert_not_called()
    def test_validation_and_privacy(self):
        value=example();value['rows'][0]['email']='must not escape';value['token']='private'
        clean=validate(value)
        self.assertNotIn('email',clean['rows'][0]);self.assertNotIn('token',clean)
        self.assertIsNone(clean['rows'][0]['readSignals'])
        for change in [{'views':-1},{'activeUsers':True},{'path':'/learn/moon/?email=x'},{'path':'https://evil.test/'},{'kind':'invented'}]:
            broken=example();broken['rows'][0].update(change)
            with self.assertRaises(ValueError):validate(broken)
        value=example();value['rows']*=2
        with self.assertRaises(ValueError):validate(value)
    def test_attach_preserves_gsc_and_newer_content(self):
        with tempfile.TemporaryDirectory() as temp:
            private=Path(temp);report={'opportunities':[{'state':'published'}],'propertySummary':{'clicks':7}}
            self.assertEqual(attach_content(report,private),report)
            (private/'content-measurement-latest.json').write_text(json.dumps(example()))
            attached=attach_content(report,private)
            self.assertEqual(attached['opportunities'],report['opportunities'])
            attached['contentMeasurement']['observedAt']='2026-10-04T10:00:00+00:00'
            self.assertEqual(attach_content(attached,private),attached)
    def test_api_scope_metrics_and_missing_rows(self):
        inventory=example();inventory['rows'].append({**inventory['rows'][0],'path':'/learn/other/'})
        calls=[]
        def transport(url,payload,token):
            calls.append(payload);metrics=[m['name'] for m in payload['metrics']]
            return {'rowCount':1,'dimensionHeaders':[{'name':'pagePath'}],'metricHeaders':[{'name':m} for m in metrics],
                    'metadata':{'subjectToThresholding':True},'rows':[{'dimensionValues':[{'value':'/learn/moon/'}],'metricValues':[{'value':str(v)} for v in ([2] if metrics==['eventCount'] else [6,3])]}]}
        result=collect('test','2026-09-05','2026-09-30',inventory,transport)
        self.assertEqual(result['rows'][0]['views'],6);self.assertEqual(result['rows'][0]['readSignals'],2)
        self.assertIsNone(result['rows'][1]['views']);self.assertTrue(result['quality']['thresholded'])
        self.assertEqual(calls[0]['dimensionFilter']['andGroup']['expressions'][0]['filter']['stringFilter']['value'],'brainilabgames.com')
        self.assertEqual(calls[1]['dimensionFilter']['andGroup']['expressions'][2]['filter']['stringFilter']['value'],'article_read')
    def test_failed_or_partial_api_never_returns_snapshot(self):
        def transport(url,payload,token):return {'rowCount':2,'dimensionHeaders':[{'name':'pagePath'}],'metricHeaders':payload['metrics'],'rows':[]}
        with self.assertRaises(ValueError):collect('test','2026-09-05','2026-09-30',example(),transport)

if __name__=='__main__':unittest.main()
