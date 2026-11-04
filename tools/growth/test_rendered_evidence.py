import copy
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import gsc_sync as api
import rendered_evidence as dom
import seo_explorer as seo
from test_seo_explorer import AT, URL, SOURCE, fake

ROW = {'sourceUrl': SOURCE, 'targetUrl': URL, 'anchor': 'BrainiLab Daily', 'rel': ['noopener'],
       'canonical': SOURCE, 'observedAt': AT.isoformat(), 'evidenceSha256': 'a'*64,
       'method': 'saved_browser_dom', 'discovery': 'owner_submitted_listing',
       'structuredData': {'jsonldBlocks': 0, 'microdataElements': 0, 'rdfaElements': None}}
def snapshot(*rows): return {'schemaVersion': 1, 'domain': dom.DOMAIN, 'observations': list(rows)}

class RenderedEvidenceTest(unittest.TestCase):
    def test_minimization_and_deduplication(self):
        raw = {**ROW, 'privateText': 'never export', 'localPath': 'private/file.json'}
        self.assertEqual(dom.validate(snapshot(raw, raw))['observations'], [ROW])
        for field, value in [('sourceUrl', SOURCE+'?token=private'), ('sourceUrl', 'https://mail.google.com/mail/'),
                             ('sourceUrl', 'https://127.0.0.1/'), ('sourceUrl', 'https://directory.example/account/'),
                             ('targetUrl', 'https://brainilabgames.com/profile/'), ('anchor', 'private@example.org'),
                             ('observedAt', '2099-01-01T00:00:00Z'), ('observedAt', '2026-10-20'),
                             ('evidenceSha256', 'bad'), ('rel', ['unknown']), ('method', 'api')]:
            with self.subTest(field=field, value=value), self.assertRaises(ValueError): dom.validate(snapshot({**ROW, field: value}))
        for schema in [{}, {**ROW['structuredData'], 'jsonldBlocks': False}, {**ROW['structuredData'], 'microdataElements': -1}]:
            with self.assertRaises(ValueError): dom.validate(snapshot({**ROW, 'structuredData': schema}))

    def test_latest_per_combination_and_conflicting_capture(self):
        newer = {**ROW, 'observedAt': '2026-10-21T18:00:00Z', 'anchor': 'New observation'}
        other = {**ROW, 'sourceUrl': 'https://other.example/list/'}
        combined = dom.merge([snapshot(newer, other), snapshot(ROW)])
        self.assertEqual(len(combined['observations']), 2); self.assertIn(newer, combined['observations'])
        with self.assertRaises(ValueError): dom.merge([snapshot(ROW), snapshot({**ROW, 'anchor': 'Conflicting evidence'})])

    def test_cas_history_idempotence_and_independent_attachment(self):
        with tempfile.TemporaryDirectory() as folder, patch.object(api, 'PRIVATE', Path(folder)):
            private = Path(folder); one = dom.record(private, snapshot(ROW), 'missing')
            raw = (private/dom.FILE).read_bytes()
            self.assertEqual(one['sha256'], hashlib.sha256(raw).hexdigest())
            self.assertTrue(dom.record(private, snapshot(ROW), one['sha256'])['reused'])
            self.assertEqual(raw, (private/dom.FILE).read_bytes())
            with self.assertRaises(RuntimeError): dom.record(private, snapshot(ROW), 'missing')
            newer = {**ROW, 'observedAt': '2026-10-21T18:00:00Z'}
            dom.record(private, snapshot(newer), one['sha256'])
            self.assertEqual(len(list((private/'rendered-evidence-history').glob('*.json'))), 1)
            (private/dom.FILE).write_bytes(raw)
            self.assertEqual(dom.validate(dom.attach({'renderedEvidence': snapshot(newer)}, private)['renderedEvidence']), snapshot(newer))
            base = seo.crawl([URL], [SOURCE], now=AT, fetcher=fake); before = copy.deepcopy(base)
            report = seo.attach_seo({'seoExplorer': base}, private)
            self.assertEqual(dom.validate(report['seoExplorer']['renderedEvidence']), snapshot(ROW))
            self.assertEqual({k: v for k,v in report['seoExplorer'].items() if k!='renderedEvidence'}, before)
            self.assertEqual(seo.validate(report['seoExplorer']), report['seoExplorer'])
            self.assertEqual(dom.attach(base, private)['backlinks'], before['backlinks'])
            (private/dom.FILE).write_text('{}')
            self.assertEqual(seo.attach_seo({'seoExplorer': base}, private)['seoExplorer'], before)

    def test_compact_round_trip_keeps_every_capture_and_unknown(self):
        rows = [{**ROW, 'sourceUrl': f'https://directory.example/games/example-{i}',
                 'targetUrl': f'https://brainilabgames.com/games/example-{i}/',
                 'observedAt': f'2026-10-20T18:00:{i:02d}.123Z', 'evidenceSha256': f'{i:064x}'} for i in range(21)]
        rows[0] = {**rows[0], 'canonical': None, 'rel': [], 'discovery': 'reviewed_public_candidate'}
        rows[1] = {**rows[1], 'observedAt': '2026-10-21T10:00:00.123456+00:00', 'anchor': 'Quoted "title" & more'}
        original = dom.validate(snapshot(*rows)); packed = dom.compact(original)
        self.assertEqual(packed['schemaVersion'], 2)
        self.assertEqual(dom.validate(packed), original)
        self.assertEqual(dom.compact(packed), packed)
        self.assertIsNone(dom.validate(packed)['observations'][0]['canonical'])
        self.assertLess(len(json.dumps(packed)), len(json.dumps(original)))
        for mutate in [lambda p: p['rows'][0][0].__setitem__(0, 9999),
                       lambda p: p['rows'][0].__setitem__(5, 'bad'),
                       lambda p: p['prefixes'].__setitem__(0, 'https://mail.google.com/mail/'),
                       lambda p: p.__setitem__('rows', [p['rows'][0]]*1001),
                       lambda p: p['rows'][0].__setitem__(6, False)]:
            invalid = copy.deepcopy(packed); mutate(invalid)
            with self.assertRaises((ValueError, TypeError)): dom.validate(invalid)

    def test_latest_positive_capture_replaces_unknown_without_losing_variants(self):
        partial = {**ROW, 'rel': []}
        newer = {**ROW, 'observedAt': '2026-10-21T18:00:00Z', 'evidenceSha256': 'b'*64}
        nofollow = {**newer, 'rel': ['nofollow', 'noopener'], 'anchor': 'Second link'}
        other_target = {**partial, 'targetUrl': 'https://brainilabgames.com/games/other/'}
        old, new = snapshot(partial, other_target), snapshot(newer, nofollow, nofollow)
        expected = dom.validate(snapshot(newer, nofollow, other_target))
        self.assertEqual(dom.merge([old, new]), expected)
        self.assertEqual(dom.merge([new, old]), expected)
        self.assertEqual(dom.validate(dom.compact(expected)), expected)
        self.assertEqual(dom.merge([expected, snapshot()]), expected)
        with tempfile.TemporaryDirectory() as folder, patch.object(api, 'PRIVATE', Path(folder)):
            private = Path(folder); first = dom.record(private, old, 'missing')
            before = (private/dom.FILE).read_bytes()
            updated = dom.record(private, new, first['sha256'])
            self.assertEqual(json.loads((private/dom.FILE).read_bytes()), expected)
            self.assertEqual((private/'rendered-evidence-history'/(first['sha256']+'.json')).read_bytes(), before)
            self.assertTrue(dom.record(private, old, updated['sha256'])['reused'])

    def test_valid_legacy_data_can_decline_optional_encoding(self):
        rows = [{**ROW, 'sourceUrl': f'https://directory.example/game-{i}/',
                 'structuredData': {'jsonldBlocks': i, 'microdataElements': 0, 'rdfaElements': None}} for i in range(65)]
        original = dom.validate(snapshot(*rows))
        self.assertEqual(dom.compact(original), original)

if __name__ == '__main__': unittest.main()
