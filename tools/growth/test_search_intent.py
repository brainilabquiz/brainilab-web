import copy
import unittest
from search_intent import acquisition_brief, enrich_tasks, ORIGIN
from handoff import build_handoff


def task(path='/games/number-route/', queries=('number route game',)):
    url = ORIGIN + path
    return {'taskId': 'stable-id', 'url': url, 'evidenceSnapshot': 'original',
            'queries': [{'query': q, 'page': url, 'impressions': 12} for q in queries]}


class SearchIntentTests(unittest.TestCase):
    def test_ambiguous_and_unrelated_queries_do_not_become_game_targets(self):
        item = task(queries=('number route', 'bus number route game', 'number route game'))
        brief = acquisition_brief(item)
        self.assertEqual(brief['matchingQueries'], ['number route game'])
        self.assertEqual(brief['queriesNeedingReview'], ['number route', 'bus number route game'])
        self.assertEqual(brief['basis'], 'observed_query_candidate')
        self.assertIn('Recheck', brief['researchGate'])

    def test_cross_page_and_foreign_host_cannot_verify_intent(self):
        item = task()
        item['queries'][0]['page'] += 'other/'
        self.assertEqual(acquisition_brief(item)['basis'], 'needs_intent_research')
        item = task(); item['url'] = item['url'].replace('brainilabgames.com', 'example.com')
        self.assertEqual(acquisition_brief(item)['intent'], 'unverified')

    def test_synonyms_reuse_destination_not_new_pages(self):
        item = task('/geography/europe-flags-quiz/', ('European flags quiz', 'flags of europe quiz'))
        brief = acquisition_brief(item)
        self.assertEqual(len(brief['matchingQueries']), 2)
        self.assertEqual(brief['destination'], item['url'])
        self.assertNotIn('newUrl', brief)

    def test_provider_estimates_never_become_observed_clicks(self):
        item = {**task(), 'provider': 'openseo', 'providerEvidence': {'keyword': 'number route game', 'estimatedMonthlySearches': 1000}}
        brief = acquisition_brief(item)
        self.assertEqual(brief['basis'], 'provider_research_candidate')
        self.assertEqual(brief['matchingQueries'], [])
        self.assertEqual(brief['measurementPlan']['status'], 'plan_not_observed_results')
        self.assertNotIn('estimatedMonthlySearches', brief)

    def test_unknown_articles_kept_without_inventing_intent_or_conversions(self):
        item = task('/learn/example/', ('why example',))
        brief = acquisition_brief(item)
        self.assertEqual(brief['basis'], 'needs_intent_research')
        self.assertIsNone(brief['routeReviewedOn'])
        self.assertIn('neither proves', brief['measurementPlan']['use'])

    def test_ranking_preserves_evidence_identity_input_and_stability(self):
        items = [task('/learn/example/'), task(), task('/games/math-rush/', ('math rush',))]
        before = copy.deepcopy(items)
        result = enrich_tasks(items)
        self.assertEqual(items, before)
        self.assertEqual([r['url'] for r in result], [items[1]['url'], items[2]['url'], items[0]['url']])
        for row in result:
            self.assertEqual(row['taskId'], 'stable-id')
            self.assertEqual(row['evidenceSnapshot'], 'original')

    def test_actual_handoff_integration_keeps_one_change_and_state_gate(self):
        item = task()
        report = {'availablePeriod': {'start': '2026-09-01', 'end': '2026-09-30'}, 'discovery': [{
            'url': item['url'], 'name': 'Number Route', 'action': 'Review',
            'pageSourceSnapshot': 'original', 'pageEvidence': {'clicks': 0}, 'queryEvidence': item['queries']}]}
        handoff = build_handoff(report)
        self.assertEqual(handoff['tasks'][0]['acquisitionBrief']['basis'], 'observed_query_candidate')
        self.assertEqual(handoff['maxChangesPerRun'], 1)
        self.assertIn('Resume approved unfinished', handoff['guard'])
        self.assertNotIn('publishedAt', handoff['tasks'][0])
