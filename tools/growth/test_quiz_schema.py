import copy
from datetime import datetime,timezone
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import quiz_schema as q
import seo_explorer as seo
import gsc_sync as api

AT='2026-10-28T19:00:00Z'
URL=next(iter(q.URLS))
SLUG=q.URLS[URL]

def response(body,url=URL,status=200):
    return {'url':url,'status':status,'body':body.encode(),'robotsHeader':''}

def html(parts=None,extra=''):
    quiz={'@type':'Quiz','@id':URL+'#quiz'}
    if parts is not None: quiz['hasPart']=parts
    return '<main><h1>Quiz</h1></main><script type="application/ld+json">'+json.dumps({'@graph':[quiz]})+'</script>'+extra

def snapshot(at=AT):
    return {'schemaVersion':1,'domain':'brainilabgames.com','banks':[{'topic':SLUG,'source':'published-question-tables','providers':[{'name':name,'complete':True,'observedAt':at,'prompts':['A real question?']}for name in q.PROVIDERS]}],'pages':[q.observe(URL,response(html([{'@type':'Question','name':'A real question?'}])),at)]}

class QuizSchemaTest(unittest.TestCase):
    def test_only_question_names_and_real_response_identity(self):
        value=q.observe(URL,response(html([{'@type':'Question','name':'A real question?','acceptedAnswer':{'text':'Secret answer'}}])),AT)
        self.assertEqual(value['questions'],['A real question?']);self.assertNotIn('answer',json.dumps(value))
        self.assertEqual(q.observe(URL,response(html(),url=URL+'other/'),AT)['state'],'unknown')
        self.assertIsNone(q.observe(URL+'index.html',response(html()),AT))
        self.assertEqual(q.observe(URL,response(html(),status=500),AT)['state'],'unknown')

    def test_inert_ambiguous_missing_and_graph_reference(self):
        question={'@type':'Question','name':'A real question?'}
        data=html([question]); inert='<template>'+data+'</template>'
        self.assertEqual(q.observe(URL,response(inert),AT)['state'],'unknown')
        self.assertEqual(q.observe(URL,response(data+data),AT)['state'],'unknown')
        self.assertEqual(q.observe(URL,response(html()),AT)['state'],'not_declared')
        ref={'@type':'Quiz','@id':URL+'#quiz','hasPart':[{'@id':URL+'#q'}]}
        graph={'@graph':[ref,{'@id':URL+'#q',**question}]}
        self.assertEqual(q.observe(URL,response('<script type="application/ld+json">'+json.dumps(graph)+'</script>'),AT)['questions'],['A real question?'])

    def test_record_cas_idempotence_newest_providers_and_history(self):
        with tempfile.TemporaryDirectory() as tmp,patch.object(api,'PRIVATE',Path(tmp)):
            first=q.record(tmp,snapshot(),'missing');path=Path(tmp)/'quiz-schema-latest.json';before=path.read_bytes()
            self.assertTrue(q.record(tmp,snapshot(),first['sha256'])['reused']);self.assertEqual(path.read_bytes(),before)
            with self.assertRaises(RuntimeError):q.record(tmp,snapshot(),'missing')
            later=snapshot('2026-10-29T19:00:00Z');later['banks'][0]['providers']=later['banks'][0]['providers'][:1]
            second=q.record(tmp,later,first['sha256']);self.assertFalse(second['reused'])
            bank=q.validate(json.loads(path.read_text()))['banks'][0];self.assertEqual(len(bank['providers']),3)
            self.assertEqual(next(p for p in bank['providers'] if p['name']=='fixed')['observedAt'],q.timestamp(AT))
            self.assertTrue(q.record(tmp,snapshot(),second['sha256'])['reused'])
            self.assertEqual(len(list((Path(tmp)/'quiz-schema-history').glob('*.json'))),1)

    def test_hashes_ignore_read_dates_but_preserve_qualifiers(self):
        a=q.validate(snapshot())['banks'][0];b=q.validate(snapshot('2026-10-29T19:00:00Z'))['banks'][0]
        self.assertEqual(a['sha256'],b['sha256'])
        changed=snapshot();changed['banks'][0]['providers'][0]['prompts']=['A real question greater than 100?']
        self.assertNotEqual(a['sha256'],q.validate(changed)['banks'][0]['sha256'])

    def test_crawl_binding_and_attachment_without_fetch_or_rescanning(self):
        row=seo.audit_page(URL,response(html([{'@type':'Question','name':'A real question?'}])),AT)
        base={'schemaVersion':1,'domain':'brainilabgames.com','observedAt':AT,'pages':[row],'sources':[],'backlinks':[]}
        self.assertEqual(seo.validate(base)['pages'][0]['quizQuestions']['questions'],['A real question?'])
        bad=copy.deepcopy(base);bad['pages'][0]['quizQuestions']['sha256']='a'*64
        with self.assertRaises(ValueError):seo.validate(bad)
        with tempfile.TemporaryDirectory() as tmp,patch.object(api,'PRIVATE',Path(tmp)),patch('seo_explorer.fetch',side_effect=AssertionError('No crawl')):
            q.record(tmp,snapshot(),'missing')
            report={'seoExplorer':base};attached=seo.attach_seo(report,Path(tmp))
            self.assertEqual(len(attached['seoExplorer']['quizSchema']['banks']),1)
            self.assertEqual(seo.attach_seo(attached,Path(tmp)),attached)

    def test_allowlist_and_sql_read_only_contract(self):
        for bad in [None,{'schemaVersion':1,'domain':'brainilabgames.com','banks':[None]}]:
            with self.assertRaises(ValueError):q.validate(bad)
        x=snapshot();x['banks'][0]['privateAnswer']='do not export';x['banks'][0]['providers'][0]['answers']=['never']
        clean=q.validate(x);self.assertNotIn('never',json.dumps(clean));self.assertNotIn('privateAnswer',json.dumps(clean))
        x['banks'][0]['providers'].append(x['banks'][0]['providers'][0])
        with self.assertRaises(ValueError):q.validate(x)
        sql=(Path(q.__file__).with_name('quiz_schema.sql')).read_text()
        self.assertIn('begin transaction read only',sql.lower());self.assertNotIn('public.verified_question_answers',sql)
        self.assertNotIn('question_options',sql);self.assertNotIn('is_correct',sql)
        self.assertEqual(sum(len(p['prompts']) for p in q.local_providers(AT).values()),360)

    def test_newer_crawl_does_not_hide_newer_quiz_read_in_another_candidate(self):
        later='2026-10-28T20:00:00Z';newest_crawl='2026-10-28T21:00:00Z'
        row=lambda at:seo.audit_page(URL,response(html([{'@type':'Question','name':'A real question?'}])),at)
        base=lambda at,p:{'schemaVersion':1,'domain':'brainilabgames.com','observedAt':at,'pages':[p],'sources':[],'backlinks':[]}
        with tempfile.TemporaryDirectory()as tmp,patch('seo_explorer.fetch',side_effect=AssertionError('No crawl')):
            private=Path(tmp)
            (private/'seo-explorer-latest.json').write_text(json.dumps(base(newest_crawl,row(AT))),encoding='utf-8')
            (private/'quiz-schema-latest.json').write_text(json.dumps(snapshot()),encoding='utf-8')
            report={'seoExplorer':{**base(later,row(later)),'quizSchema':snapshot()}}
            before=copy.deepcopy(report);files={p.name:p.read_bytes()for p in private.iterdir()}
            attached=seo.attach_seo(report,private);evidence=attached['seoExplorer']['quizSchema']
            self.assertEqual(evidence['pages'][0]['checkedAt'],q.timestamp(later))
            self.assertEqual(evidence['banks'][0]['providers'][0]['observedAt'],q.timestamp(AT))
            self.assertEqual(report,before);self.assertEqual({p.name:p.read_bytes()for p in private.iterdir()},files)
            self.assertEqual(seo.attach_seo(attached,private),attached)

    def test_current_root_and_only_bound_candidate_rows_survive_old_private_source(self):
        later='2026-10-28T20:00:00Z'
        with tempfile.TemporaryDirectory()as tmp:
            private=Path(tmp);(private/'quiz-schema-latest.json').write_text(json.dumps(snapshot()),encoding='utf-8')
            current=snapshot(later);current['banks'][0]['providers']=current['banks'][0]['providers'][:1]
            attached=q.attach({'pages':[],'quizSchema':current},private)['quizSchema']
            self.assertEqual(attached['pages'][0]['checkedAt'],q.timestamp(later))
            self.assertEqual([p['observedAt']for p in attached['banks'][0]['providers']],[q.timestamp(later),q.timestamp(AT),q.timestamp(AT)])
            valid=seo.audit_page(URL,response(html([{'@type':'Question','name':'A real question?'}])),later)
            for field,value in [('url',URL+'other/'),('sha256','a'*64),('checkedAt',AT)]:
                invalid=copy.deepcopy(valid);invalid[field]=value
                with self.subTest(field):
                    result=q.attach({'pages':[]},private,[{'pages':[invalid,None]}])
                    self.assertEqual(result['quizSchema']['pages'][0]['checkedAt'],q.timestamp(AT))
            self.assertEqual(q.attach({'pages':[]},private,[{'pages':[valid]}])['quizSchema']['pages'][0]['checkedAt'],q.timestamp(later))

    def test_include_local_reuses_same_day_observation(self):
        with tempfile.TemporaryDirectory() as tmp,patch.object(api,'PRIVATE',Path(tmp)):
            first=q.with_local(snapshot(),tmp,datetime(2026,10,28,19,tzinfo=timezone.utc))
            result=q.record(tmp,first,'missing')
            second=q.with_local(snapshot(),tmp,datetime(2026,10,28,20,tzinfo=timezone.utc))
            self.assertTrue(q.record(tmp,second,result['sha256'])['reused'])

if __name__=='__main__':unittest.main()
