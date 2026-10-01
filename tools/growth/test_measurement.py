import json, tempfile, unittest
from pathlib import Path
from measurement import attach_measurement

class MeasurementTest(unittest.TestCase):
    def test_snapshot_is_explicit_and_private(self):
        with tempfile.TemporaryDirectory() as directory:
            folder=Path(directory); report={'property':'sc-domain:brainilabgames.com'}
            self.assertEqual(attach_measurement(report,folder),report)
            value={'source':'GA4 traffic acquisition UI','mode':'manual_snapshot','observedAt':'2026-10-01T20:00:00+00:00','period':{'start':'2026-09-03','end':'2026-09-30'},'sessions':43,'directSessions':43,'engagedSessions':36,'events':922,'token':'must not be copied'}
            p=folder/'measurement-latest.json';p.write_text(json.dumps(value))
            out=attach_measurement(report,folder)
            self.assertNotIn('token',out['measurement']);self.assertNotIn('measurement',report)
            self.assertNotIn('organicConversions',out['measurement'])
            value['sessions']=-1;p.write_text(json.dumps(value))
            with self.assertRaises(ValueError):attach_measurement(report,folder)
