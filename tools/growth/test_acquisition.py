import copy, json, tempfile, unittest
from pathlib import Path
from unittest.mock import patch
from datetime import datetime,timezone
import ga4_acquisition as ga
from acquisition import validate
from measurement import attach_measurement


def response(payload,empty=False):
    dims=[d['name'] for d in payload['dimensions']]
    metrics=[m['name'] for m in payload['metrics']]
    labels=['Organic Search','Direct'] if dims==['sessionDefaultChannelGroup'] else ['google / organic','(direct) / (none)']
    counts=[['8','4'],['2','1']] if dims else [['10','5','40']]
    rows=[{'dimensionValues':[{'value':labels[i]}] if dims else [],'metricValues':[{'value':x} for x in nums]} for i,nums in enumerate(counts)]
    return {'rowCount':0 if empty else len(rows),'dimensionHeaders':[{'name':d} for d in dims],'metricHeaders':[{'name':m} for m in metrics],'metadata':{'timeZone':'Europe/Madrid'},'rows':[] if empty else rows}


class AcquisitionTest(unittest.TestCase):
    def collect(self,modify=None):
        def transport(url,payload,token):
            self.assertEqual(token,'fixture');self.assertEqual(payload['dimensionFilter']['filter']['fieldName'],'hostName')
            r=response(payload)
            return modify(r,payload) if modify else r
        return ga.collect('fixture','2026-09-01','2026-09-02',transport)

    def test_real_columns_and_private_allowlist(self):
        value=self.collect();self.assertEqual(value['sessions'],10);self.assertEqual(value['directSessions'],2)
        value['secret']='never export';value['channels'][0]['email']='private'
        clean=validate(value);self.assertNotIn('secret',clean);self.assertNotIn('email',clean['channels'][0])
        self.assertEqual(clean['channels'][0]['label'],'Organic Search')

    def test_missing_channels_are_not_zero_and_quality_is_visible(self):
        def mutate(r,p):
            r['metadata']['subjectToThresholding']=True
            if p['dimensions']:r['rows']=[];r['rowCount']=0
            return r
        value=self.collect(mutate);self.assertIsNone(value['directSessions']);self.assertEqual(value['channels'],[])
        self.assertTrue(value['quality']['thresholded'])

    def test_invalid_or_incomplete_results_fail(self):
        for field,value in [('rowCount',10001),('rowCount',5),('metricHeaders',[])]:
            with self.subTest(field=field),self.assertRaises(ValueError):
                self.collect(lambda r,p:{**r,field:value})
        with self.assertRaises(ValueError):self.collect(lambda r,p:{**r,'metadata':{}})

    def test_redacts_untrusted_source_parameters(self):
        def mutate(r,p):
            if p['dimensions']==[{'name':'sessionSourceMedium'}]:r['rows'][0]['dimensionValues'][0]['value']='person@example.com / referral'
            return r
        result=self.collect(mutate);self.assertTrue(result['quality']['labelsWithheld']);self.assertNotIn('@',json.dumps(result))

    def test_stale_observation_cannot_replace_newer(self):
        value=self.collect();value['observedAt']='2026-09-03T10:00:00Z'
        with tempfile.TemporaryDirectory() as d:
            path=Path(d);(path/'measurement-latest.json').write_text(json.dumps(value))
            newer=copy.deepcopy(value);newer['observedAt']='2026-09-04T10:00:00Z'
            report={'measurement':newer}
            self.assertEqual(attach_measurement(report,path),report)

    def test_reuse_and_failure_preserve_snapshot(self):
        value=self.collect();value['observedAt']='2026-09-04T10:00:00+00:00'
        with tempfile.TemporaryDirectory() as d,patch.object(ga.google,'PRIVATE',Path(d)):
            target=Path(d)/'measurement-latest.json';target.write_text(json.dumps(value));original=target.read_bytes()
            with patch.object(ga.google,'access_token',side_effect=RuntimeError('no call expected')):
                self.assertTrue(ga.sync('2026-09-01','2026-09-02',datetime(2026,9,4,11,tzinfo=timezone.utc))['reused'])
                with self.assertRaises(RuntimeError):ga.sync('2026-09-02','2026-09-03',datetime(2026,9,5,tzinfo=timezone.utc))
            self.assertEqual(target.read_bytes(),original)

if __name__=='__main__':unittest.main()
