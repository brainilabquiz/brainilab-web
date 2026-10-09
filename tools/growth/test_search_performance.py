import copy,json,tempfile,unittest
from pathlib import Path
from datetime import datetime,timezone
from unittest.mock import patch
import search_performance as s

def response(payload):
    dims=[d['name'] for d in payload['dimensions']]; metrics=[m['name'] for m in payload['metrics']]
    data={('landingPage',):[(['/learn/example'],[2,1,0])],
          ('landingPage','eventName'):[(['/learn/example','article_read'],[1])],
          ('sessionSourceMedium',):[(['chatgpt.com / referral'],[2,1]),(['notchatgpt.com / referral'],[3,0])]}
    return {'rowCount':len(data[tuple(dims)]),'dimensionHeaders':[{'name':d} for d in dims],
        'metricHeaders':[{'name':m} for m in metrics],'metadata':{'timeZone':'Europe/Madrid'},
        'rows':[{'dimensionValues':[{'value':v} for v in keys],'metricValues':[{'value':str(v)} for v in vals]} for keys,vals in data[tuple(dims)]]}

def part():
    def query(token,start,end,dims,transport):
        if isinstance(dims,list):
            return [{'query':q,'page':p,'clicks':c,'impressions':i,'ctr':c/i,'position':pos} for q,p,c,i,pos in [
                ('how to learn','https://brainilabgames.com/learn/example/',1,10,2),
                ('how to learn','https://brainilabgames.com/learn/example/?ref=source',0,5,5),
                ('person@example.com','https://brainilabgames.com/',0,1,1)]]
        return [{'value':'2026-10-01' if dims=='date' else 'USA','clicks':1,'impressions':20,'ctr':.05,'position':2}]
    def transport(url,payload,token):
        filters=payload['dimensionFilter']['andGroup']['expressions']
        if payload['dimensions'][0]['name']=='landingPage':
            assert s.exact('sessionSource','google') in filters
            assert s.exact('sessionMedium','organic') in filters
        return response(payload)
    with patch.object(s.google,'query',side_effect=query):
        return s.collect_period('fixture','fixture','2026-09-09','2026-10-06',transport)

def snapshot():
    current=part(); previous=copy.deepcopy(current)
    previous['period']={'start':'2026-08-12','end':'2026-09-08'}
    return {'schemaVersion':1,'collectorVersion':1,'property':s.google.PROPERTY,'analyticsProperty':'555562532',
        'observedAt':'2026-10-09T10:00:00+00:00','current':current,'previous':previous}

class SearchTest(unittest.TestCase):
    def test_sources_normalization_and_unknowns(self):
        p=part();self.assertEqual(len(p['queries']),1);q=p['queries'][0]
        self.assertEqual((q['clicks'],q['impressions'],q['position']),(1,15,3))
        self.assertEqual(p['queryRowsWithheld'],1);self.assertEqual(p['landingPages'][0]['path'],'/learn/example/')
        self.assertEqual(p['landingPages'][0]['events']['article_read'],1)
        self.assertIsNone(p['landingPages'][0]['events']['registration_request'])
        self.assertEqual(len(p['aiReferrals']),1)
        self.assertIsNone(s.public_path('https://evil.example/learn/'))
        self.assertIsNone(s.public_path('/account?secret=value'))
        self.assertEqual(s.query_kind('BrainiLab games')['brand'],'brand')
        self.assertEqual(s.query_kind('unrelated phrase')['intent'],'unreviewed')

    def test_period_guard(self):
        value=snapshot();s.validate(value)
        value['previous']['period']={'start':'2026-08-13','end':'2026-09-09'}
        with self.assertRaises(ValueError):s.validate(value)

    def test_bad_analytics_is_not_saved(self):
        for mutate in (lambda r:{**r,'rowCount':2},lambda r:{**r,'metadata':{}},lambda r:{**r,'metricHeaders':[]}):
            with self.assertRaises(ValueError):
                s.analytics_rows('fixture','2026-09-09','2026-10-06',['landingPage'],['sessions','engagedSessions','keyEvents'],[],lambda u,p,t:mutate(response(p)))

    def test_reuse_failure_and_cas(self):
        with tempfile.TemporaryDirectory() as d,patch.object(s.google,'PRIVATE',Path(d)):
            path=Path(d)/'search-performance-latest.json';path.write_text(json.dumps(snapshot()));old=path.read_bytes()
            with patch.object(s.google,'access_token',side_effect=RuntimeError('must not call')):
                self.assertTrue(s.sync(datetime(2026,10,9,11,tzinfo=timezone.utc))['reused'])
                with self.assertRaises(RuntimeError):s.sync(datetime(2026,10,10,11,tzinfo=timezone.utc))
            self.assertEqual(path.read_bytes(),old)
            saved=snapshot()
            def collect(*args):
                path.write_text(json.dumps({**saved,'observedAt':'2026-10-10T12:00:00+00:00'}))
                result=copy.deepcopy(saved['current']);result['period']={'start':args[2],'end':args[3]};return result
            with patch.object(s.google,'access_token',return_value='fixture'),patch.object(s,'collect_period',side_effect=collect):
                with self.assertRaisesRegex(ValueError,'changed during'):s.sync(datetime(2026,10,10,11,tzinfo=timezone.utc))
            self.assertIn('12:00:00',path.read_text())

    def test_handoff_adds_separate_evidence_without_changing_tasks(self):
        from handoff import build_handoff
        report={'searchPerformance':snapshot(),'availablePeriod':{},'discovery':[{'url':'https://brainilabgames.com/learn/example/',
            'name':'Example','action':'review','pageSourceSnapshot':'fixture','pageEvidence':{},'queryEvidence':[{'value':'example','impressions':15}]}]}
        queue=build_handoff(report)
        self.assertEqual(len(queue['tasks']),1);self.assertTrue(queue['liveStateRequired']);self.assertEqual(queue['maxChangesPerRun'],1)
        self.assertEqual(queue['tasks'][0]['landingPageObservation']['data']['sessions'],2)

if __name__=='__main__':unittest.main()
