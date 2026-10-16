import copy
import json
import unittest
from datetime import datetime, timezone
from outreach_summary import summary, validate

NOW = datetime(2026, 10, 15, 22, 30, tzinfo=timezone.utc)  # Already Oct16 in Madrid.


class OutreachSummaryTest(unittest.TestCase):
    def setUp(self):
        self.registry = {'emails': [
            {'id': 'a', 'recipient': 'private@example.org', 'status': 'sent_verified', 'sentLocalDate': '2026-10-16', 'body': 'SECRET', 'messageUrl': 'https://mail.google.com/private', 'deliveryStatus': 'bounced_permanent'},
            {'id': 'b', 'recipient': 'second@example.org', 'status': 'send_uncertain', 'localDate': '2026-10-16'},
            {'id': 'c', 'recipient': 'third@example.org', 'status': 'sent_verified', 'sentLocalDate': '2026-10-15'}],
            'responses': [{'recipient': 'third@example.org', 'status': 'automatic_acknowledgement'},
                          {'recipient': 'third@example.org', 'status': 'feedback_received'},
                          {'recipient': 'third@example.org', 'status': 'feedback_received'}],
            'dailyBatches': {'2026-10-16': {'sentVerified': 0, 'remainingQuota': 20}}}

    def test_madrid_date_and_actual_records_override_stale_batch_counts(self):
        s = validate(summary(self.registry, NOW))
        self.assertEqual(s['asOfLocalDate'], '2026-10-16')
        self.assertEqual(s['days'][0]['verifiedSends'], 1)
        self.assertEqual(s['days'][0]['unresolvedSends'], 1)
        self.assertEqual(s['days'][0]['permanentFailures'], 1)
        self.assertEqual(len(s['days']), 14)

    def test_replies_are_cohort_counts_not_arrival_counts_or_acceptance(self):
        s = summary(self.registry, NOW)
        self.assertEqual(s['days'][0]['humanReplies'], 0)
        self.assertEqual(s['days'][1]['humanReplies'], 1)
        self.assertEqual(s['days'][1]['automaticAcknowledgements'], 1)

    def test_bounces_are_still_verified_sends(self):
        for failure in ('bounced_permanent', 'permanent_bounce', 'delivery_failed_final', 'delivery_failed_permanent'):
            self.registry['emails'][0]['deliveryStatus'] = failure
            r = summary(self.registry, NOW)['days'][0]
            self.assertEqual((r['verifiedSends'], r['permanentFailures']), (1, 1))

    def test_allowlisted_output_and_registry_unchanged(self):
        original = copy.deepcopy(self.registry)
        s = summary(self.registry, NOW)
        s['days'][0]['recipient'] = 'SECRET';s['body'] = 'SECRET'
        text = json.dumps(validate(s))
        for secret in ('SECRET', '@', 'messageUrl', 'recipient', 'dailyBatches'):
            self.assertNotIn(secret, text)
        self.assertEqual(original, self.registry)

    def test_unknown_dates_and_future_dates_warn_without_guessing(self):
        self.registry['emails'][0]['sentLocalDate'] = '2026-02-30'
        self.registry['emails'][1]['localDate'] = '2026-10-17'
        s = summary(self.registry, NOW)
        self.assertEqual(s['undatedSends'], 2)
        self.assertEqual(s['days'][0]['verifiedSends'], 0)

    def test_missing_or_duplicate_identity_never_creates_available_capacity(self):
        self.assertIsNone(summary({}, NOW))
        self.registry['emails'].append(copy.deepcopy(self.registry['emails'][0]))
        self.assertIsNone(summary(self.registry, NOW))

    def test_validation_rejects_negative_boolean_and_impossible_counts(self):
        for key, value in [('verifiedSends', -1), ('unresolvedSends', True), ('humanReplies', 5)]:
            s = summary(self.registry, NOW);s['days'][0][key] = value
            with self.assertRaises(ValueError): validate(s)
        s = summary(self.registry, NOW);s['days'][1]['localDate'] = s['days'][0]['localDate']
        with self.assertRaises(ValueError): validate(s)

    def test_fall_dst_keeps_local_day(self):
        now = datetime(2026, 10, 25, 23, 30, tzinfo=timezone.utc)
        self.assertEqual(summary(self.registry, now)['asOfLocalDate'], '2026-10-26')


if __name__ == '__main__': unittest.main()
