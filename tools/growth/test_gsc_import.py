import csv
from contextlib import closing
import io
import json
from pathlib import Path
import sqlite3
import tempfile
import unittest
from zipfile import ZipFile, ZIP_DEFLATED
from gsc_import import import_export, numeric, parse_export, summarize


def fixture(path, clicks=1, bad=False, page=None):
    filters = 'Filtra,Valor\nTipus de cerca,Web\nData,6 darrers mesos\n'
    if page:
        filters += 'Pàgina,'+page+'\n'
    files = {'Filtres.csv': filters, 'Gràfic.csv': f'Data,Clics,Impressions,CTR,Posició\n2026-09-01,{clicks},10,10%,2\n2026-09-02,0,0,,\n', 'Consultes.csv': 'Consultes principals,Clics,Impressions,CTR,Posició\nexample,0,3,0%,3\n', 'Pàgines.csv': f'Pàgines més visitades,Clics,Impressions,CTR,Posició\nhttps://example.com/,{clicks},10,10%,2\n'}
    if bad:
        files['Consultes.csv'] += 'example,0,3,0%,3\n'
    with ZipFile(path, 'w', ZIP_DEFLATED) as z:
        for name, content in files.items():
            z.writestr(name, content.encode('utf-8-sig'))


class ImportTests(unittest.TestCase):
    def setUp(self):
        tests_dir = Path(__file__).resolve().parent/'data/test-temp'
        tests_dir.mkdir(parents=True, exist_ok=True)
        self.temp = tempfile.TemporaryDirectory(dir=tests_dir)
        assert Path(self.temp.name).resolve().parent == tests_dir.resolve()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.db = self.root/'growth.sqlite'
        self.zip = self.root/'export.zip'
        fixture(self.zip)

    def run_import(self, captured='2026-10-01T15:00:00Z'):
        return import_export(self.zip, 'sc-domain:example.com', captured, self.db)

    def test_same_export_is_idempotent_even_repacked(self):
        first = self.run_import()
        with ZipFile(self.zip, 'a') as z:
            z.comment = b'changed container metadata'
        second = self.run_import('2026-10-01T16:00:00Z')
        self.assertTrue(first['inserted'])
        self.assertFalse(second['inserted'])
        self.assertEqual(first['snapshotId'], second['snapshotId'])
        self.assertNotEqual(first['rawSha256'], second['rawSha256'])

    def test_failed_import_preserves_last_good(self):
        first = self.run_import()
        fixture(self.zip, bad=True)
        with self.assertRaises(ValueError):
            self.run_import()
        with closing(sqlite3.connect(self.db)) as db:
            self.assertEqual(db.execute('select snapshot_id from current_snapshots').fetchone()[0], first['snapshotId'])
            self.assertEqual(db.execute('select count(*) from snapshots').fetchone()[0], 1)

    def test_older_snapshot_does_not_replace_newer(self):
        self.run_import()
        fixture(self.zip, clicks=2)
        newer = self.run_import('2026-10-02T15:00:00Z')
        fixture(self.zip, clicks=3)
        self.run_import('2026-09-30T15:00:00Z')
        with closing(sqlite3.connect(self.db)) as db:
            self.assertEqual(db.execute('select snapshot_id from current_snapshots').fetchone()[0], newer['snapshotId'])

    def test_page_filters_do_not_mix_with_property(self):
        self.run_import()
        fixture(self.zip, page='https://example.com/game/')
        self.run_import()
        with closing(sqlite3.connect(self.db)) as db:
            self.assertEqual(db.execute('select count(*) from current_snapshots').fetchone()[0], 2)

    def test_daily_total_does_not_add_page_or_query_rows(self):
        doc = parse_export(self.zip, 'sc-domain:example.com')
        summary = summarize(doc)
        self.assertEqual(summary['impressions'], 10)
        self.assertEqual(summary['visibleQueryImpressions'], 3)
        self.assertEqual(summary['positionApproximateFromRoundedDailyRows'], 2)
        self.assertIsNone(doc['tables']['date'][1]['position'])
        self.assertIsNone(doc['tables']['date'][1]['ctr'])

    def test_locale_missing_and_invalid_metrics(self):
        self.assertEqual(numeric('2,5%', 'ctr'), .025)
        self.assertEqual(numeric('12,38', 'position'), 12.38)
        self.assertIsNone(numeric('-', 'position'))
        for value, metric in [('NaN', 'position'), ('-1', 'clicks'), ('2.5', 'clicks'), ('1,000.5', 'position'), ('0.5', 'ctr')]:
            with self.assertRaises(ValueError):
                numeric(value, metric)

    def test_empty_export_is_rejected(self):
        with ZipFile(self.zip, 'w') as z:
            z.writestr('Filtres.csv', 'Filter,Value\nDate,Last 6 months\n')
        with self.assertRaises(ValueError):
            self.run_import()
        self.assertFalse(self.db.exists())

    def test_capture_time_must_be_unambiguous(self):
        with self.assertRaises(ValueError):
            self.run_import('2026-10-01T15:00:00')


if __name__ == '__main__':
    unittest.main()
