import copy
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from distribution import build, validate, refresh, attach_distribution
import gsc_sync as api

STAMP = '2026-10-11T16:00:00+00:00'


class DistributionTest(unittest.TestCase):
    def setUp(self):
        self.catalog = {'collectedAt': STAMP, 'rows': [{'path': '/learn/example/', 'title': 'An explanation', 'kind': 'article', 'authorEmail': 'private@example.org'}]}
        self.registry = {'forms': [{'domain': 'example.org', 'organization': 'Example', 'resource': 'https://brainilabgames.com/daily-quiz/', 'status': 'submitted_verified', 'submittedAt': STAMP, 'body': 'private mail', 'email': 'private@example.org', 'listingUrl': 'https://example.org/review/'}], 'emails': [{'recipient': 'someone@already.org', 'body': 'private'}], 'suppression': [{'recipient': 'stop@excluded.org'}]}

    def snapshot(self):
        return build(self.registry, self.catalog, [], datetime.fromisoformat(STAMP))

    def test_redacts_contacts_and_unverified_listing(self):
        s = validate(self.snapshot())
        self.assertIsNone(s['directories'][0]['listingUrl'])
        self.assertEqual(s['directories'][0]['state'], 'pending')
        self.assertEqual(s['contactedDomains'], ['already.org', 'example.org', 'excluded.org'])
        text = json.dumps(s)
        for secret in ['someone@', 'private@example', 'private mail', 'authorEmail', 'body']:
            self.assertNotIn(secret, text)

    def test_listing_requires_dated_verification_and_duplicates_collapse(self):
        f = self.registry['forms'][0]
        published = {**f, 'status': 'published_verified', 'placementVerified': True, 'placementVerifiedAt': STAMP}
        self.registry['forms'].extend([published, {**f, 'status': 'send_uncertain'}])
        s = self.snapshot()
        self.assertEqual(len(s['directories']), 1)
        self.assertEqual(s['directories'][0]['state'], 'published')
        broken = copy.deepcopy(s);broken['directories'][0]['listingVerifiedAt'] = None
        with self.assertRaises(ValueError): validate(broken)
        published['placementVerifiedAt'] = None
        self.assertNotEqual(build({'forms': [published]}, self.catalog, [])['directories'][0]['state'], 'published')

    def test_unknown_receipt_never_becomes_publication(self):
        self.registry['forms'][0]['status'] = 'send_uncertain'
        self.assertEqual(self.snapshot()['directories'][0]['state'], 'uncertain')

    def test_submitted_resource_records_keep_receipt_uncertainty_and_unknown_dates(self):
        self.registry['forms'] = [
            {'domain': 'puzzlelinks.com', 'submittedResource': 'https://brainilabgames.com/daily-quiz/?utm_source=puzzlelinks.com', 'status': 'send_uncertain', 'verification': {'observedAt': STAMP}, 'body': 'private message'},
            {'domain': 'roomescapeartist.com', 'submittedResource': 'https://brainilabgames.com/daily-quiz/', 'status': 'submitted_verified', 'submittedAt': STAMP, 'commentId': 34017},
            {'domain': 'goldles.com', 'submittedResource': 'https://brainilabgames.com/daily-quiz/', 'status': 'form_sent_confirmed', 'verification': {'receiptConfirmedByUser': True, 'receiptVerified': False, 'reportedAt': STAMP}},
            {'domain': 'general-contact.org', 'status': 'submitted_verified', 'body': 'private contact'},
        ]
        s = validate(self.snapshot())
        rows = {r['domain']: r for r in s['directories']}
        self.assertEqual(set(rows), {'puzzlelinks.com', 'roomescapeartist.com', 'goldles.com'})
        self.assertEqual(rows['puzzlelinks.com']['state'], 'uncertain')
        self.assertEqual(rows['goldles.com']['state'], 'pending')
        self.assertIsNone(rows['puzzlelinks.com']['submittedAt'])
        self.assertIsNone(rows['goldles.com']['submittedAt'])
        self.assertEqual(rows['roomescapeartist.com']['submittedAt'], STAMP)
        self.assertTrue(all(r['listingUrl'] is None for r in rows.values()))
        self.assertTrue(set(rows).issubset(s['contactedDomains']))
        text = json.dumps(s)
        for private in ('private message', 'private contact', 'utm_source', 'commentId', 'receiptConfirmedByUser'):
            self.assertNotIn(private, text)

    def test_no_private_paths_or_consumer_contacts(self):
        self.catalog['rows'].append({'path': '/admin/', 'title': 'Admin', 'kind': 'library'})
        self.registry['emails'].append({'recipient': 'private@gmail.com'})
        s = self.snapshot()
        self.assertEqual(len(s['resources']), 1)
        self.assertNotIn('gmail.com', s['contactedDomains'])

    def test_outreach_summary_survives_export_without_contact_data(self):
        self.registry['emails'] = [{'id': 'private-id', 'recipient': 'secret@example.org',
            'sentLocalDate': '2026-10-11', 'status': 'sent_verified', 'body': 'private body'}]
        self.registry['dailyBatches'] = {'2026-10-11': {'sentVerified': 0}}
        s = validate(self.snapshot())
        self.assertEqual(s['outreach']['days'][0]['verifiedSends'], 1)
        for secret in ('secret@', 'private-id', 'private body', 'dailyBatches'):
            self.assertNotIn(secret, json.dumps(s))

    def test_authorized_uncapped_outreach_survives_distribution_without_quote(self):
        self.registry.update(dailyTarget=None, totalLimit=None, policyAuthorization={
            'effectiveLocalDate': '2026-10-11', 'dailyLimit': None,
            'humanAuthorization': 'PRIVATE AUTHORIZATION', 'providerLimitsApply': True})
        self.registry['emails'] = [{'id': f'email-{n}', 'status': 'sent_verified', 'sentLocalDate': '2026-10-11'} for n in range(23)]
        s = validate(self.snapshot())
        self.assertIsNone(s['outreach']['dailyLimit'])
        self.assertEqual(s['outreach']['days'][0]['verifiedSends'], 23)
        self.assertNotIn('humanAuthorization', json.dumps(s))
        self.assertNotIn('PRIVATE', json.dumps(s))
        self.registry['policyAuthorization']['providerLimitsApply'] = False
        self.assertNotIn('outreach', validate(self.snapshot()))

    def test_failed_refresh_preserves_previous_snapshot_and_history(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(api, 'PRIVATE', Path(tmp)):
            folder = Path(tmp)
            p = folder / 'distribution-latest.json';p.write_text(json.dumps(self.snapshot()))
            before = p.read_bytes()
            registry = folder / 'registry.json';registry.write_text(json.dumps(self.registry))
            catalog = folder / 'catalog.json';catalog.write_text(json.dumps(self.catalog))
            games = folder / 'games.html';games.write_text('invalid')
            with self.assertRaises((ValueError, AttributeError)): refresh(registry, catalog, games)
            self.assertEqual(p.read_bytes(), before)
            games.write_text('<script type="application/ld+json">{"@graph":[{"@type":"ItemList","itemListElement":[]}]}</script>')
            refresh(registry, catalog, games)
            self.assertEqual(len(list((folder / 'distribution-history').glob('*.json'))), 1)
            current = p.read_bytes()
            self.assertTrue(refresh(registry, catalog, games)['reused'])
            self.assertEqual(p.read_bytes(), current)
            self.registry['forms'][0]['status'] = 'send_uncertain'
            registry.write_text(json.dumps(self.registry))
            self.assertFalse(refresh(registry, catalog, games)['reused'])
            p.write_text('{"schemaVersion":999}')
            report = {'distribution': self.snapshot()}
            self.assertEqual(attach_distribution(report, folder), report)

    def test_stale_observation_does_not_replace_newer_one(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp);old = self.snapshot();new = {**old, 'observedAt': '2026-10-12T16:00:00+00:00'}
            (p / 'distribution-latest.json').write_text(json.dumps(old))
            self.assertEqual(attach_distribution({'distribution': new}, p)['distribution'], new)

    def test_upgrade_rebuilds_same_day_cache_without_changing_registry(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(api, 'PRIVATE', Path(tmp)):
            folder = Path(tmp)
            self.registry['forms'][0]['submittedResource'] = self.registry['forms'][0].pop('resource')
            paths = [folder / 'registry.json', folder / 'catalog.json', folder / 'games.html']
            paths[0].write_text(json.dumps(self.registry))
            paths[1].write_text(json.dumps(self.catalog))
            paths[2].write_text('<script type="application/ld+json">{"@graph":[{"@type":"ItemList","itemListElement":[]}]}</script>')
            inputs = [p.read_bytes() for p in paths]
            old = {**self.snapshot(), 'directories': []}
            p = folder / 'distribution-latest.json'; p.write_text(json.dumps(old))
            old_bytes = p.read_bytes()
            old_digest = hashlib.sha256(json.dumps([hashlib.sha256(b).hexdigest() for b in inputs]).encode()).hexdigest()
            (folder / 'distribution-state.json').write_text(json.dumps({'day': datetime.now(timezone.utc).date().isoformat(), 'inputsHash': old_digest, 'snapshotHash': hashlib.sha256(old_bytes).hexdigest()}))
            result = refresh(*paths)
            self.assertFalse(result['reused'])
            self.assertEqual(result['directories'], 1)
            self.assertEqual([p.read_bytes() for p in paths], inputs)
            saved = json.loads((folder / 'distribution-history' / (hashlib.sha256(old_bytes).hexdigest() + '.json')).read_text())
            self.assertEqual(saved, old)
            self.assertTrue(refresh(*paths)['reused'])

    def test_uncapped_policy_upgrade_replaces_old_same_input_cap_and_keeps_history(self):
        self.registry.update(dailyTarget=None, policyAuthorization={
            'effectiveLocalDate': '2026-10-11', 'dailyLimit': None,
            'humanAuthorization': 'PRIVATE AUTHORIZATION', 'providerLimitsApply': True})
        self.registry['emails'] = [{'id': f'email-{n}', 'status': 'sent_verified', 'sentLocalDate': '2026-10-11'} for n in range(23)]
        with tempfile.TemporaryDirectory() as tmp, patch.object(api, 'PRIVATE', Path(tmp)), patch('distribution.datetime', wraps=datetime) as clock:
            clock.now.return_value = datetime.fromisoformat(STAMP)
            folder = Path(tmp)
            paths = [folder / 'registry.json', folder / 'catalog.json', folder / 'games.html']
            paths[0].write_text(json.dumps(self.registry), encoding='utf-8')
            paths[1].write_text(json.dumps(self.catalog), encoding='utf-8')
            paths[2].write_text('<script type="application/ld+json">{"@graph":[{"@type":"ItemList","itemListElement":[]}]}</script>', encoding='utf-8')
            inputs = [p.read_bytes() for p in paths]
            old = self.snapshot()
            old['outreach']['dailyLimit'] = 20
            del old['outreach']['policyAuthorization']
            p = folder / 'distribution-latest.json'
            p.write_text(json.dumps(old), encoding='utf-8')
            old_bytes = p.read_bytes()
            old_digest = hashlib.sha256(json.dumps([3, *[hashlib.sha256(b).hexdigest() for b in inputs]]).encode()).hexdigest()
            (folder / 'distribution-state.json').write_text(json.dumps({'day': datetime.fromisoformat(STAMP).date().isoformat(), 'inputsHash': old_digest, 'snapshotHash': hashlib.sha256(old_bytes).hexdigest()}), encoding='utf-8')
            self.assertFalse(refresh(*paths)['reused'])
            saved = json.loads(p.read_text(encoding='utf-8'))
            self.assertIsNone(saved['outreach']['dailyLimit'])
            self.assertEqual(sum(row['verifiedSends'] for row in saved['outreach']['days']), 23)
            self.assertEqual([p.read_bytes() for p in paths], inputs)
            self.assertEqual(json.loads((folder / 'distribution-history' / (hashlib.sha256(old_bytes).hexdigest() + '.json')).read_text(encoding='utf-8')), old)
            self.assertTrue(refresh(*paths)['reused'])


if __name__ == '__main__': unittest.main()
