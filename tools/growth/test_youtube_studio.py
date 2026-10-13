from datetime import datetime, timezone
import copy
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
import youtube_studio as yt
import video_packs as packs
import video_drafts as drafts

TESTS=Path(__file__).resolve().parent/'data/test-video-temp'


def observation():
    return {'schemaVersion':1,'channelId':yt.CHANNEL,'mode':'browser_snapshot','source':'YouTube Studio',
        'observedAt':'2026-10-13T17:00:00Z','sourceUrl':'https://studio.youtube.com/channel/'+yt.CHANNEL+'/analytics/tab-overview/period-default',
        'period':{'start':'2026-09-15','end':'2026-10-12'},'timezone':None,'evidenceHashes':['a'*64],
        'overview':{'views':100,'watchHours':10,'netSubscribers':-1,'currentSubscribers':500},
        'videos':[{'id':'aaaaaaaaaaa','title':'Fixture long','format':'long','views':50,'publishedDate':'2026-10-01'},
                  {'id':'bbbbbbbbbbb','title':'Fixture Short','format':'short','views':50,'averagePercentageViewed':125}],
        'insights':[{'kind':'audience_interest','term':'calendar quiz','interestDisplay':'Low','interestLevel':'low',
                     'sourceUrl':'https://studio.youtube.com/channel/'+yt.CHANNEL+'/analytics/tab-research/period-default'},
                    {'kind':'entered_topic','term':'typed but unmeasured','sourceUrl':'https://studio.youtube.com/channel/'+yt.CHANNEL+'/analytics/tab-research/period-default'}],
        'quality':{'inventoryChecked':False,'calendarChecked':False},'limitations':['Synthetic fixture, not actual channel data.']}


def plan():
    url='https://brainilabgames.com/learn/example/'
    return {'id':'example','destination':url,'verifiedAt':'2026-10-13T17:00:00Z','destinationStatus':200,
        'primarySources':[{'url':'https://example.org/fact','name':'Fixture'}],
        'questions':[{'prompt':'Two plus two?','options':['3','4','5'],'answer':1,'explanation':'Four.','source':'https://example.org/fact'}],
        'titles':['Example quiz','A question to try','One question'], 'tags':['example'],'thumbnails':[{'variant':a,'headline':'Example','concept':'Fixture','hypothesis':'Unknown','prompt':'Fixture'} for a in 'ABC'],
        'duplicateStatus':'no_duplicate_in_reviewed_local_packs','duplicateReview':'Synthetic reviewed fixture','intentQueries':[],
        'audienceFit':'Fixture','description':'Fixture','hashtags':['#Example'],'feedback':'Which step?','script':[],
        'shortDraft':'Draft','communityDraft':'Draft','format':'Fixture long','resources':'No media generated',
        'currentUploadReview':True,'currentCalendarReview':True,'experimentalJustification':'Synthetic gate test only.'}


def growth():
    return {'property':'sc-domain:brainilabgames.com','generatedAt':'2026-10-13T17:00:00Z',
        'availablePeriod':{'start':'2026-09-10','end':'2026-10-10'},'discovery':[],
        'contentMeasurement':{'property':'555562532','mode':'api_snapshot','observedAt':'2026-10-13T17:00:00Z','period':{'start':'2026-09-14','end':'2026-10-11'},'rows':[]},
        'measurement':{'observedAt':'2026-10-13T17:00:00Z','period':{'start':'2026-09-14','end':'2026-10-11'},'timezone':'Europe/Madrid','sources':[]},
        'distribution':{'resources':[{'path':'/learn/example/'}]}}


class StudioTests(unittest.TestCase):
    def setUp(self):
        TESTS.mkdir(parents=True,exist_ok=True)
        self.tmp=tempfile.TemporaryDirectory(dir=TESTS)
        self.private=Path(self.tmp.name);self.private.resolve().relative_to(TESTS.resolve())
    def tearDown(self):self.tmp.cleanup()
    def enable(self): yt.atomic(self.private/'video-policy.json',{'enabled':True,'publishingAuthorized':False})

    def test_wrong_channel_bad_counts_and_timezone_rejected(self):
        for key,value in [('channelId','wrong'),('mode','api_snapshot'),('observedAt','2026-10-13T17:00:00')]:
            raw=observation();raw[key]=value
            with self.assertRaises(ValueError):yt.validate(raw)
        raw=observation();raw['overview']['views']=float('nan')
        with self.assertRaises(ValueError):yt.validate(raw)
        clean=yt.validate(observation())
        self.assertIsNone(clean['timezone']);self.assertEqual(clean['overview']['netSubscribers'],-1)
        self.assertEqual(clean['videos'][1]['averagePercentageViewed'],125)

    def test_compare_and_swap_history_idempotence_and_failure_preservation(self):
        first=yt.record(self.private,observation(),None)
        self.assertTrue(yt.record(self.private,observation(),first['sha256'])['reused'])
        newer=observation();newer['observedAt']='2026-10-13T18:00:00Z'
        with self.assertRaises(ValueError):yt.record(self.private,newer,None)
        self.enable();base=growth()
        yt.failed(self.private,'session_unavailable',datetime(2026,10,13,18,tzinfo=timezone.utc))
        result=yt.attach(base,self.private,datetime(2026,10,13,19,tzinfo=timezone.utc))
        self.assertEqual(yt.digest(self.private/'youtube-studio-latest.json'),first['sha256'])
        self.assertEqual(result['measurement'],base['measurement'])
        self.assertEqual(result['videoPlanning']['status'],'session_unavailable')
        self.assertEqual(yt.handoff(result)['tasks'],[])

    def test_stale_data_no_tasks_and_typed_queries_not_demand(self):
        yt.record(self.private,observation(),None);self.enable()
        current=yt.attach(growth(),self.private,datetime(2026,10,13,18,tzinfo=timezone.utc))
        queue=yt.handoff(current);self.assertEqual(len(queue['tasks']),1)
        self.assertEqual(queue['tasks'][0]['interestLevel'],'low')
        self.assertFalse(queue['publishingAuthorized'])
        stale=yt.attach(growth(),self.private,datetime(2026,10,22,18,tzinfo=timezone.utc))
        self.assertEqual(yt.handoff(stale)['tasks'],[])

    def test_fresh_observation_updates_handoff_identity_not_human_draft(self):
        first=yt.record(self.private,observation(),None);self.enable()
        yt.atomic(self.private/'video-drafts.json',{'schemaVersion':1,'drafts':[{'id':'human','status':'user_deferred','destination':'https://brainilabgames.com/learn/example/','format':'long'}]})
        a=yt.handoff(yt.attach(growth(),self.private,datetime(2026,10,13,18,tzinfo=timezone.utc)))
        updated=observation();updated['observedAt']='2026-10-13T19:00:00Z'
        yt.record(self.private,updated,first['sha256'])
        b=yt.handoff(yt.attach(growth(),self.private,datetime(2026,10,13,20,tzinfo=timezone.utc)))
        self.assertEqual(a['tasks'][0]['taskId'],b['tasks'][0]['taskId'])
        self.assertEqual(b['existingDrafts'][0]['status'],'user_deferred')

    def test_automatic_pack_gates_idempotence_human_edits_and_registry(self):
        raw=observation();s=self.private/'studio.json';yt.atomic(s,raw)
        p=plan();p['youtubeEvidence']={'snapshotSha256':yt.digest(s),'references':['calendar quiz'],'fitExplanation':'Checked fixture'}
        r=self.private/'report.json';ps=self.private/'plans.json';yt.atomic(r,growth());yt.atomic(ps,[p]);out=self.private/'packs'
        one=packs.generate(r,ps,out,'2026-10-13',s)
        self.assertEqual(one,packs.generate(r,ps,out,'2026-10-13',s))
        reg=drafts.register(self.private,out,None)
        self.assertEqual(reg['added'],1)
        self.assertEqual(drafts.register(self.private,out,reg['sha256'])['added'],0)
        second=copy.deepcopy(p);second['id']='second';second['destination']='https://brainilabgames.com/learn/other/'
        next_report=growth();next_report['distribution']['resources'].append({'path':'/learn/other/'})
        yt.atomic(r,next_report);yt.atomic(ps,[second]);packs.generate(r,ps,self.private/'second','2026-10-13',s)
        with self.assertRaises(ValueError):drafts.register(self.private,self.private/'second',reg['sha256'])
        yt.atomic(r,growth());yt.atomic(ps,[p])
        generated=json.loads((out/'example/upload-pack.json').read_text(encoding='utf-8'))
        self.assertFalse(generated['publishingAuthorized']);self.assertIsNone(generated['video']['path'])
        human=out/'example/UPLOAD-PACK.md';human.write_text('Human edit',encoding='utf-8')
        with self.assertRaises(ValueError):packs.generate(r,ps,out,'2026-10-13',s)
        self.assertEqual(human.read_text(encoding='utf-8'),'Human edit')
        p['currentCalendarReview']=False;yt.atomic(ps,[p])
        with self.assertRaises(ValueError):packs.generate(r,ps,self.private/'new','2026-10-13',s)
        p['currentCalendarReview']=True;p['experimentalJustification']='';yt.atomic(ps,[p])
        with self.assertRaises(ValueError):packs.generate(r,ps,self.private/'new','2026-10-13',s)

    def test_same_day_daily_export_attaches_studio_without_gsc_refresh(self):
        from unittest.mock import patch
        import daily_gsc as daily
        report=growth();self.enable();yt.record(self.private,observation(),None)
        now=datetime(2026,10,13,18,tzinfo=timezone.utc)
        with patch.object(daily.api,'PRIVATE',self.private),patch.object(daily.api,'sync') as sync,patch.object(daily,'build_report',return_value=report):
            first=daily.run('fixture',now);second=daily.run('fixture',now)
            self.assertTrue(second['reused']);self.assertEqual(sync.call_count,1)
            queue=json.loads((self.private/'codex-handoff.json').read_text(encoding='utf-8'))
            self.assertFalse(queue['videoResearch']['publishingAuthorized'])
            self.assertEqual(len(queue['videoResearch']['tasks']),1)
            self.assertEqual(first['sha256'],second['sha256'])

    def test_seven_day_reuse_and_missing_data_are_honest(self):
        self.enable();base=growth()
        missing=yt.attach(base,self.private,datetime(2026,10,13,18,tzinfo=timezone.utc))
        self.assertNotIn('youtubeStudio',missing)
        self.assertEqual(missing['videoPlanning']['status'],'needs_studio_observation')
        self.assertIsNone(packs.rank_topics(base,[plan()],'2026-10-13')['items'][0]['youtubeTopicDemand'])


if __name__=='__main__':unittest.main()
