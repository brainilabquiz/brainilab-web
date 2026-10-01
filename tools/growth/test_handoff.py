import unittest
from handoff import build_handoff

class HandoffTests(unittest.TestCase):
    def test_deduplicate_require_query_evidence_and_preserve_snapshot(self):
        lead={'url':'https://brainilabgames.com/games/example/','name':'Example','action':'Review','pageSourceSnapshot':'evidence','pageEvidence':{'impressions':20},'queryEvidence':[{'value':'example'}]}
        report={'availablePeriod':{'start':'2026-09-01','end':'2026-09-30'},'discovery':[lead,lead,{**lead,'url':lead['url']+'empty/','queryEvidence':[]}]}
        queue=build_handoff(report)
        self.assertEqual(len(queue['tasks']),1)
        self.assertEqual(queue['tasks'][0]['evidenceSnapshot'],'evidence')
        self.assertEqual(queue['tasks'][0]['taskId'],build_handoff(report)['tasks'][0]['taskId'])
        self.assertTrue(queue['liveStateRequired'])
        self.assertEqual(queue['maxChangesPerRun'],1)
        self.assertNotIn('publishedAt',queue['tasks'][0])
