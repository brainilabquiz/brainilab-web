import unittest
from unittest.mock import patch
import gsc_sync as api

def row(key):return {'keys':[key],'clicks':0,'impressions':2,'ctr':0,'position':4}

class SyncTests(unittest.TestCase):
    def test_exact_page_filter_final_data_and_pagination(self):
        calls=[]
        def request(url,payload,token):
            calls.append(payload)
            return {'rows':[row('one'),row('two')] if payload['startRow']==0 else [row('three')]}
        with patch.object(api,'PAGE_SIZE',2):
            result=api.query('test','2026-09-01','2026-09-02','query',api.PAGES[0],request)
        self.assertEqual(len(result),3)
        self.assertEqual(calls[1]['startRow'],2)
        self.assertEqual(calls[0]['dataState'],'final')
        self.assertEqual(calls[0]['dimensionFilterGroups'][0]['filters'][0]['operator'],'equals')

    def test_cap_raises_instead_of_silent_partial_import(self):
        def request(url,payload,token):return {'rows':[row(str(payload['startRow'])),row(str(payload['startRow']+1))]}
        with patch.object(api,'PAGE_SIZE',2),self.assertRaises(RuntimeError):
            api.query('test','2026-09-01','2026-09-02','query',transport=request)

    def test_duplicates_and_nonfinite_rejected(self):
        for response in [{'rows':[row('x'),row('x')]},{'rows':[{**row('x'),'position':float('nan')}] }]:
            with self.assertRaises(ValueError):
                api.query('test','2026-09-01','2026-09-02','query',transport=lambda *a:response)

    def test_network_failure_never_starts_import(self):
        with patch.object(api,'access_token',return_value='test'),patch.object(api,'collect',side_effect=RuntimeError('offline')),patch.object(api,'import_snapshot') as write:
            with self.assertRaises(RuntimeError):api.sync('2026-09-01','2026-09-02','unused')
            write.assert_not_called()

    def test_explicit_zero_dates_and_unknown_queries(self):
        def request(url,payload,token):return {'rows':[row('2026-09-01')]} if payload['dimensions']==['date'] else {'rows':[]}
        data=api.collect('test','2026-09-01','2026-09-02',request)
        self.assertEqual(len(data),3)
        self.assertEqual(data[0]['tables']['date'][1]['impressions'],0)
        self.assertIsNone(data[0]['tables']['date'][1]['position'])
        self.assertEqual(data[0]['tables']['query'],[])

    def test_private_path_restriction(self):
        with self.assertRaises(ValueError):api.private_write(api.ROOT/'public-token.json',{'refresh_token':'fixture'})

if __name__=='__main__':unittest.main()
