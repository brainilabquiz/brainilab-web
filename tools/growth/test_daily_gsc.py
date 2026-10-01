from datetime import datetime, timezone
from pathlib import Path
import json
import tempfile
import unittest
from unittest.mock import patch
import daily_gsc as daily

class DailyTests(unittest.TestCase):
    def test_same_day_reuses_report_but_corruption_requires_new_export(self):
        tests=Path(__file__).resolve().parent/'data/test-temp';tests.mkdir(exist_ok=True)
        with tempfile.TemporaryDirectory(dir=tests) as folder, patch.object(daily.api,'PRIVATE',Path(folder)), patch.object(daily.api,'sync') as sync, patch.object(daily,'build_report',return_value={'fixture':True}):
            now=datetime(2026,10,1,8,tzinfo=timezone.utc)
            first=daily.run('fixture',now);second=daily.run('fixture',now)
            self.assertEqual(first['end'],'2026-09-28');self.assertEqual(first['start'],'2026-08-29')
            self.assertTrue(second['reused']);self.assertEqual(sync.call_count,1)
            Path(first['report']).write_text('{}')
            self.assertFalse(daily.run('fixture',now)['reused']);self.assertEqual(sync.call_count,2)

    def test_failed_export_keeps_last_good_report_and_marker(self):
        tests=Path(__file__).resolve().parent/'data/test-temp';tests.mkdir(exist_ok=True)
        with tempfile.TemporaryDirectory(dir=tests) as folder, patch.object(daily.api,'PRIVATE',Path(folder)), patch.object(daily.api,'sync',side_effect=RuntimeError('offline')):
            report=Path(folder)/'growth-report.json';report.write_text('{"last":"good"}')
            with self.assertRaises(RuntimeError):daily.run('fixture',datetime(2026,10,1,8,tzinfo=timezone.utc))
            self.assertEqual(json.loads(report.read_text()),{'last':'good'})
            self.assertFalse((Path(folder)/'daily-state.json').exists())
