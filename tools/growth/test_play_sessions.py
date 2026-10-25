import copy,json,tempfile,unittest
from pathlib import Path
from datetime import datetime,timezone
from unittest.mock import patch
import play_sessions as s
from evidence_snapshot import commit,sha

NOW=datetime(2026,10,25,20,tzinfo=timezone.utc)

def fake(url,payload,token):
    filters=payload['dimensionFilter']['andGroup']['expressions'];dims=[d['name'] for d in payload['dimensions']];metrics=[m['name'] for m in payload['metrics']]
    assert s.exact('hostName','brainilabgames.com') in filters
    organic=s.exact('sessionSource','google') in filters
    if organic:assert s.exact('sessionMedium','organic') in filters
    starts=any(f['filter']['fieldName']=='eventName' for f in filters)
    if starts:
        assert next(f['filter']['inListFilter']['values'] for f in filters if f['filter']['fieldName']=='eventName')==['game_start','practice_start']
    if organic and starts:return {'metadata':{'timeZone':'Europe/Madrid'}}
    if dims:
        data=[(['/games/sample/'],[3,5])] if starts else [(['/games/sample'],[5]),(['/learn/sample/'],[3]),(['/auth/reset-password/'],[2])]
    else:data=[([],[3,5] if starts else [2,8] if organic else [10,30])]
    return {'rowCount':len(data),'dimensionHeaders':[{'name':d} for d in dims],'metricHeaders':[{'name':m} for m in metrics],'metadata':{'timeZone':'Europe/Madrid'},'rows':[{'dimensionValues':[{'value':k} for k in keys],'metricValues':[{'value':str(v)} for v in values]} for keys,values in data]}

def snapshot():
    with tempfile.TemporaryDirectory() as d,patch.object(s.api,'PRIVATE',Path(d)),patch.object(s.api,'access_token',return_value='fixture'):
        return s.collect(Path(d),NOW,fake)

class PlaySessionsTests(unittest.TestCase):
    def test_union_sessions_not_event_sum_and_missing_is_unknown(self):
        value=snapshot();a=value['cohorts']['all'];g=value['cohorts']['googleOrganic']
        self.assertEqual((a['sessions'],a['sessionsWithStart'],a['startEventCount']),(10,3,5))
        self.assertEqual(g['sessions'],2);self.assertIsNone(g['sessionsWithStart']);self.assertIsNone(g['startEventCount'])
        self.assertEqual(a['rowsWithheld'],1);self.assertNotIn('/auth/',json.dumps(value))
        self.assertEqual(a['landingPages'][1]['sessionsWithStart'],None)
        self.assertEqual(value['period'],{'start':'2026-09-26','end':'2026-10-23'})
        self.assertEqual(a['landingBaselineObservedAt'],NOW.isoformat())

    def test_cached_acquisition_and_request_reuse(self):
        with tempfile.TemporaryDirectory() as d,patch.object(s.api,'PRIVATE',Path(d)),patch.object(s.api,'access_token',return_value='fixture'):
            p=Path(d);base={'schemaVersion':2,'property':'555562532','source':'GA4 Data API','mode':'api_snapshot','observedAt':'2026-10-25T18:00:00Z','period':{'start':'2026-09-26','end':'2026-10-23'},'timezone':'Europe/Madrid','sessions':10,'engagedSessions':7,'events':30,'quality':{k:False for k in s.FLAGS},'channels':[],'sources':[]}
            (p/'measurement-latest.json').write_text(json.dumps(base));calls=[]
            def transport(url,payload,token):calls.append(payload);return fake(url,payload,token)
            one=s.collect(p,NOW,transport);count=len(calls)
            self.assertEqual(one['cohorts']['all']['baselineObservedAt'],base['observedAt'])
            self.assertFalse(any(not x['dimensions'] and len(x['dimensionFilter']['andGroup']['expressions'])==1 for x in calls))
            two=s.collect(p,NOW,lambda *_:self.fail('Repeated an identical saved query'));self.assertEqual(one,two)
            self.assertGreater(count,0)
            for file in p.rglob('play-session-query-cache/**/*.json'):self.assertNotIn('/auth/',file.read_text())

    def test_explicit_zero_is_retained_but_bad_headers_and_duplicates_fail(self):
        request=s.payload({'start':'2026-09-26','end':'2026-10-23'},'all','starts_totals')
        value=fake('',request,'');value['rows'][0]['metricValues']=[{'value':'0'},{'value':'0'}]
        self.assertEqual(s.decode(value,request)['rows'][0]['sessions'],0)
        value['metricHeaders']=[]
        with self.assertRaises(ValueError):s.decode(value,request)
        request=s.payload({'start':'2026-09-26','end':'2026-10-23'},'all','baseline_landing')
        value=fake('',request,'');value['rows']=[value['rows'][0],value['rows'][0]];value['rowCount']=2
        with tempfile.TemporaryDirectory() as d,patch.object(s.api,'PRIVATE',Path(d)):
            with self.assertRaises(ValueError):s.query(Path(d),{'start':'2026-09-26','end':'2026-10-23'},'all','baseline_landing','fixture',NOW,lambda *_:value)

    def test_cas_history_stale_restore_and_no_same_day_recollection(self):
        value=snapshot()
        with tempfile.TemporaryDirectory() as d,patch.object(s.api,'PRIVATE',Path(d)):
            p=Path(d);commit(p,'play-sessions',value,s.validate,'missing');target=p/'play-sessions-latest.json';before=target.read_bytes()
            self.assertTrue(s.refresh(p,NOW,lambda *_a,**_k:self.fail('Unneeded collection'))['reused'])
            with self.assertRaises(ValueError):commit(p,'play-sessions',value,s.validate,'missing')
            changed=copy.deepcopy(value);changed['observedAt']='2026-10-25T21:00:00Z';commit(p,'play-sessions',changed,s.validate,sha(before))
            self.assertEqual((p/'play-sessions-history'/(sha(before)+'.json')).read_bytes(),before)
            (p/'play-sessions-latest.json').write_bytes(before)
            self.assertEqual(s.attach({'playSessions':changed},p)['playSessions'],changed)
            (p/'play-sessions.collection-lock').touch()
            with self.assertRaises(FileExistsError):s.refresh(p,NOW,lambda *_:self.fail('Concurrent collection'))

    def test_invalid_counts_periods_and_private_paths(self):
        good=snapshot()
        for mutate in [lambda v:v['cohorts']['all'].update(sessions=True),lambda v:v.update(property='other'),lambda v:v['period'].update(end='2026-10-24'),lambda v:v['cohorts']['all']['landingPages'][0].update(path='/auth/reset-password/')]:
            bad=copy.deepcopy(good);mutate(bad)
            with self.assertRaises(ValueError):s.validate(bad)

if __name__=='__main__':unittest.main()
