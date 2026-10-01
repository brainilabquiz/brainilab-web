from copy import deepcopy
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import openseo
import daily_gsc
from handoff import build_handoff


def snapshot():
    return {'schemaVersion':1,'domain':'brainilabgames.com','checkedAt':'2026-10-01T18:00:00Z',
        'connection':{'status':'verified','message':'Free reads succeeded.',
            'checks':{k:{'at':'2026-10-01T18:00:00Z','reference':'fixture-'+k} for k in ('whoami','list_projects')}},
        'project':{'id':'fixture-project','domain':'brainilabgames.com'},
        'workflows':[{'id':key,'state':'completed','note':'Test result only.',
            'lastSuccess':{'at':'2026-10-01T18:00:00Z','reference':'fixture-result','summary':'Test evidence.'}}
            for key in openseo.WORKFLOWS],
        'opportunities':[{'workflow':'keyword-research','url':'https://brainilabgames.com/games/math-rush/',
            'keyword':'mental maths game','observedAt':'2026-10-01T18:00:00Z',
            'country':'US','language':'en','finding':'Test finding','action':'Review worked example',
            'intent':'Play a maths game','sources':['https://brainilabgames.com/games/math-rush/'],
            'estimatedMonthlySearches':None,'difficulty':None,'cpc':None,'limitations':'Synthetic test only.'}]}


class OpenSEOTests(unittest.TestCase):
    def folder(self):
        base=Path(__file__).parent/'data/test-temp';base.mkdir(parents=True,exist_ok=True)
        return tempfile.TemporaryDirectory(dir=base)

    def test_verification_requires_both_reads(self):
        raw=snapshot();del raw['connection']['checks']['whoami']
        with self.assertRaises(ValueError):openseo.normalize(raw)

    def test_results_need_project_and_evidence(self):
        for field in ('project',):
            raw=snapshot();raw[field]=None
            with self.assertRaises(ValueError):openseo.normalize(raw)
        raw=snapshot();raw['opportunities'][0]['sources']=[]
        with self.assertRaises(ValueError):openseo.normalize(raw)

    def test_allowlist_unknown_metrics_and_safe_links(self):
        raw=snapshot();raw['token']='DO_NOT_COPY';raw['connection']['token']='DO_NOT_COPY'
        clean=openseo.normalize(raw)
        self.assertNotIn('DO_NOT_COPY',json.dumps(clean))
        self.assertIsNone(clean['opportunities'][0]['estimatedMonthlySearches'])
        for bad in (-1,float('nan'),True):
            raw=snapshot();raw['opportunities'][0]['estimatedMonthlySearches']=bad
            with self.assertRaises(ValueError):openseo.normalize(raw)
        for bad in ('https://evil.example/page/','https://brainilabgames.com.evil.example/page/','https://brainilabgames.com/path/?token=x'):
            raw=snapshot();raw['opportunities'][0]['url']=bad
            with self.assertRaises(ValueError):openseo.normalize(raw)

    def test_save_idempotence_conflict_and_failure_preserves_result(self):
        with self.folder() as folder:
            first=openseo.save_snapshot(snapshot(),folder,'missing')
            self.assertFalse(openseo.save_snapshot(snapshot(),folder,first['sha256'])['changed'])
            with self.assertRaises(ValueError):openseo.save_snapshot(snapshot(),folder,'missing')
            raw=snapshot();raw['checkedAt']='2026-10-02T18:00:00Z';raw['opportunities']=[]
            for w in raw['workflows']:
                w['state']='failed';w['note']='Refresh failed';del w['lastSuccess']
            openseo.save_snapshot(raw,folder,first['sha256'])
            restored=openseo.load_snapshot(folder)
            self.assertEqual(len(restored['opportunities']),1)
            self.assertEqual(restored['workflows'][0]['lastSuccess']['reference'],'fixture-result')
            self.assertTrue((Path(folder)/'openseo-history'/f"{first['sha256']}.json").exists())
            self.assertFalse((Path(folder)/'openseo.write-lock').exists())

    def test_research_cadence_and_resume(self):
        now=datetime(2026,10,2,18,tzinfo=timezone.utc)
        clean=openseo.normalize(snapshot())
        self.assertEqual(openseo.research_tasks(clean,now),[])
        due=openseo.research_tasks(clean,datetime(2026,10,10,18,tzinfo=timezone.utc))
        self.assertEqual([t['id'] for t in due],['openseo:seo-audit'])
        clean['workflows'][2]['state']='running'
        self.assertEqual(openseo.research_tasks(clean,now)[0]['action'],'resume')
        self.assertEqual(len(openseo.research_tasks(None,now)),3)

    def test_same_day_refresh_uses_new_provider_without_rebuying_google(self):
        with self.folder() as folder,patch.object(daily_gsc.api,'PRIVATE',Path(folder)),patch.object(daily_gsc.api,'sync') as sync,patch.object(daily_gsc,'build_report',return_value={'opportunities':[]}):
            now=datetime(2026,10,1,18,tzinfo=timezone.utc)
            first=daily_gsc.run('fixture',now)
            openseo.save_snapshot(snapshot(),folder,'missing')
            second=daily_gsc.run('fixture',now)
            self.assertTrue(second['reused']);self.assertEqual(sync.call_count,1)
            self.assertNotEqual(first['sha256'],second['sha256'])
            report=json.loads(Path(second['report']).read_text())
            self.assertIsNone(report['opportunities'][0]['pageEvidence'])
            self.assertEqual(report['opportunities'][0]['provider'],'openseo')
            queue=build_handoff(report)
            self.assertEqual(queue['tasks'][0]['provider'],'openseo')
            self.assertEqual(queue['maxChangesPerRun'],1)

    def test_existing_google_proposal_is_not_replaced(self):
        with self.folder() as folder:
            openseo.save_snapshot(snapshot(),folder,'missing')
            original={'url':snapshot()['opportunities'][0]['url'],'name':'Existing Google proposal'}
            report=openseo.attach({'opportunities':[original]},folder)
            self.assertEqual(report['opportunities'],[original])
            self.assertEqual(len(report['openseo']['opportunities']),1)

    def test_stale_and_project_switch_rejected(self):
        with self.folder() as folder:
            first=openseo.save_snapshot(snapshot(),folder,'missing')
            raw=snapshot();raw['project']['id']='another-project'
            with self.assertRaises(ValueError):openseo.save_snapshot(raw,folder,first['sha256'])
            raw=snapshot();raw['checkedAt']='2026-09-01T18:00:00Z'
            with self.assertRaises(ValueError):openseo.save_snapshot(raw,folder,first['sha256'])

    def test_partial_connection_update_preserves_findings_and_project_domain(self):
        with self.folder() as folder:
            first=openseo.save_snapshot(snapshot(),folder,'missing')
            raw=snapshot();raw['checkedAt']='2026-10-02T18:00:00Z'
            raw['connection']['status']='tools_unavailable'
            raw['workflows']=[];raw['opportunities']=[];raw['project']=None
            openseo.save_snapshot(raw,folder,first['sha256'])
            self.assertEqual(len(openseo.load_snapshot(folder)['opportunities']),1)
        raw=snapshot();raw['project']['domain']='another-site.example'
        with self.assertRaises(ValueError):openseo.normalize(raw)
