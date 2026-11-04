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
            self.assertEqual(dom.attach({'renderedEvidence': snapshot(newer)}, private)['renderedEvidence'], snapshot(newer))
            base = seo.crawl([URL], [SOURCE], now=AT, fetcher=fake); before = copy.deepcopy(base)
            report = seo.attach_seo({'seoExplorer': base}, private)
            self.assertEqual(report['seoExplorer']['renderedEvidence'], snapshot(ROW))
            self.assertEqual({k: v for k,v in report['seoExplorer'].items() if k!='renderedEvidence'}, before)
            self.assertEqual(seo.validate(report['seoExplorer']), report['seoExplorer'])
            self.assertEqual(dom.attach(base, private)['backlinks'], before['backlinks'])
            (private/dom.FILE).write_text('{}')
            self.assertEqual(seo.attach_seo({'seoExplorer': base}, private)['seoExplorer'], before)

if __name__ == '__main__': unittest.main()
