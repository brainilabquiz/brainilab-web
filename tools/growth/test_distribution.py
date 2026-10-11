import copy
from datetime import datetime, timezone
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

    def test_no_private_paths_or_consumer_contacts(self):
        self.catalog['rows'].append({'path': '/admin/', 'title': 'Admin', 'kind': 'library'})
        self.registry['emails'].append({'recipient': 'private@gmail.com'})
        s = self.snapshot()
        self.assertEqual(len(s['resources']), 1)
        self.assertNotIn('gmail.com', s['contactedDomains'])

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


if __name__ == '__main__': unittest.main()
