import test from 'node:test';
import assert from 'node:assert/strict';
import {BreakingNewsStore as ProductionNewsStore,requestBody,parseNewsResponse,canonicalNewsSource,MONTHLY_CENTS,RESERVATION_CENTS,REFRESH_MS} from '../lib/news-refresh.js';
const now=Date.parse('2026-10-09T18:00:00Z');
const story={title:'A test headline',summary:'An original short summary.',sourceName:'UN',sourceUrl:'https://news.un.org/en/story/2026/10/test',reportedAt:'2026-10-09T16:00:00Z',evidence:'Test source dated 9 October 2026; this is a test fixture.'};
const result=stories=>({status:'completed',usage:{input_tokens:1234,output_tokens:300},output:[{type:'web_search_call',status:'completed',action:{sources:[{url:story.sourceUrl}]}},{type:'message',content:[{type:'output_text',text:JSON.stringify({stories:stories.map(s=>({...s,sourceId:1}))}),annotations:[]}]}]});
class BreakingNewsStore extends ProductionNewsStore {
  refresh(at=Date.now(),fetcher=fetch,collector=async()=>[{id:1,sourceUrl:story.sourceUrl,sourceName:'UN',reportedAt:new Date(at-3600000).toISOString(),headline:story.title,description:story.summary,context:'Fixture only.'}]) {return super.refresh(at,fetcher,collector);}
}
function state(){const data=new Map();let queue=Promise.resolve();return {storage:{get:async k=>data.get(k),put:async(k,v)=>{data.set(k,v)},setAlarm:async t=>data.set('alarm',t),transaction(fn){const work=queue.then(()=>fn(this));queue=work.catch(()=>{});return work;}},data};}
test('one compatible search, bounded output, fixed model, no server retention',()=>{const body=requestBody(now);assert.equal(body.max_tool_calls,1);assert.equal(body.max_output_tokens,1800);assert.equal(body.store,false);assert.equal(body.model,'gpt-4.1-mini-2025-04-14');assert.equal(body.tools[0].type,'web_search_preview');assert.equal(body.tools[0].filters,undefined);assert.equal(body.tool_choice.type,'web_search_preview');assert.match(body.input,/Use only sources from these domains/);});
test('requires actual search and exact cited allowlisted sources',()=>{
  assert.equal(parseNewsResponse(result([story]),now).edition.stories.length,1);
  assert.throws(()=>parseNewsResponse({...result([story]),output:[]},now),/missing-search/);
  assert.throws(()=>parseNewsResponse(result([{...story,sourceUrl:'https://example.com/fake'}]),now),/no-verified-stories/);
  assert.throws(()=>parseNewsResponse(result([{...story,sourceUrl:'https://news.un.org/not-returned'}]),now),/no-verified-stories/);
});
test('simultaneous invocations reserve only once',async()=>{const s=state(),store=new BreakingNewsStore(s,{OPENAI_API_KEY:'test'});let calls=0;const api=async()=>{calls++;return Response.json(result([story]));};await Promise.all([store.refresh(now,api),store.refresh(now,api)]);assert.equal(calls,1);assert.equal(s.data.get('edition').stories.length,1);});
test('failed calls reserve budget and do not erase prior news or retry',async()=>{const s=state(),store=new BreakingNewsStore(s,{OPENAI_API_KEY:'test'}),old={generatedAt:'2026-10-09T15:00:00Z',stories:[story]};s.data.set('edition',old);let calls=0;const api=async()=>{calls++;return new Response('',{status:429});};await store.refresh(now,api);await store.refresh(now,api);assert.equal(calls,1);assert.deepEqual(s.data.get('edition'),old);assert.equal(s.data.get('status').code,'api-quota');});
test('budget exhaustion blocks calls before transmission',async()=>{const s=state(),store=new BreakingNewsStore(s,{OPENAI_API_KEY:'test'}),month=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit'}).format(new Date(now));s.data.set('budget:'+month,{cents:MONTHLY_CENTS-RESERVATION_CENTS+1,calls:64});let called=false;await store.refresh(now,async()=>{called=true;});assert.equal(called,false);});
test('new slots allowed and missing keys never charge budget',async()=>{const s=state(),store=new BreakingNewsStore(s,{});await store.refresh(now);assert.equal(s.data.has('last-slot'),false);store.env.OPENAI_API_KEY='test';await store.refresh(now,async()=>Response.json(result([story])));await store.refresh(now+REFRESH_MS,async()=>Response.json(result([story])));const ledgers=[...s.data.keys()].filter(k=>k.startsWith('budget:'));assert.equal(s.data.get(ledgers[0]).calls,2);});
test('public edition strips audit, ledger and credential data',async()=>{const s=state(),store=new BreakingNewsStore(s,{OPENAI_API_KEY:'test'});await store.refresh(now,async()=>Response.json(result([story])));const reply=await(await store.fetch(new Request('https://news.internal/edition'))).json();assert.equal(reply.stories.length,1);assert.equal(reply.stories[0].evidence,undefined);assert.equal(reply.usage,undefined);assert.equal(reply.OPENAI_API_KEY,undefined);});

test('runtime key arrival schedules exactly one recovery without changing reservations',async()=>{
  const s=state(),store=new BreakingNewsStore(s,{OPENAI_API_KEY:'test'});
  s.data.set('bootstrapped',true);s.data.set('status',{code:'missing-key'});
  s.data.set('last-slot',42);s.data.set('budget:existing',{cents:28,calls:2});
  let alarms=0;s.storage.setAlarm=async()=>{alarms++;};
  await Promise.all(Array.from({length:5},()=>store.fetch(new Request('https://news.internal/edition'))));
  assert.equal(alarms,1);assert.equal(s.data.get('last-slot'),42);
  assert.deepEqual(s.data.get('budget:existing'),{cents:28,calls:2});
});
test('edition reads do not retry missing credentials or paid failures',async()=>{
  for(const code of ['missing-key','api-quota','invalid-key','refresh-failed']) {
    const s=state(),store=new BreakingNewsStore(s,code==='missing-key'?{}:{OPENAI_API_KEY:'test'});
    s.data.set('bootstrapped',true);s.data.set('status',{code});
    let alarms=0;s.storage.setAlarm=async()=>{alarms++;};
    await store.fetch(new Request('https://news.internal/edition'));assert.equal(alarms,0);
  }
});
test('failure diagnostics exclude prose and are never exposed publicly',async()=>{
  const s=state(),store=new BreakingNewsStore(s,{OPENAI_API_KEY:'test'});
  await store.refresh(now,async()=>Response.json({error:{code:'unsupported_parameter',type:'invalid_request_error',param:'tools[0].filters',message:'private response prose'}},{status:400}));
  assert.deepEqual(s.data.get('api-diagnostic'),{checkedAt:new Date(now).toISOString(),httpStatus:400,code:'unsupported_parameter',type:'invalid_request_error',param:'tools[0].filters'});
  const reply=await(await store.fetch(new Request('https://news.internal/edition'))).json();
  assert.equal(reply['api-diagnostic'],undefined);assert.equal(reply.serviceStatus,'api-error');
});

test('a failure pauses all later paid slots until manual review, preserving ledger and edition',async()=>{
  for(const code of ['invalid-key','api-quota','api-error','incomplete-response','missing-search','invalid-stories','no-verified-stories','oversized-response','refresh-failed']) {
    const s=state(),store=new BreakingNewsStore(s,{OPENAI_API_KEY:'test'});
    s.data.set('status',{code});s.data.set('last-slot',1);
    s.data.set('budget:existing',{cents:42,calls:3});s.data.set('edition',{generatedAt:'original',stories:[]});
    const before=structuredClone([...s.data]);let calls=0;
    await Promise.all([store.refresh(now,async()=>{calls++;}),store.refresh(now+REFRESH_MS*20,async()=>{calls++;})]);
    assert.equal(calls,0);assert.deepEqual([...s.data],before);
  }
});

test('a newly failed refresh also stops the next scheduled slot',async()=>{
  const s=state(),store=new BreakingNewsStore(s,{OPENAI_API_KEY:'test'});let calls=0;
  const api=async()=>{calls++;return new Response('',{status:500});};
  await store.refresh(now,api);const after=[...s.data];
  await store.refresh(now+REFRESH_MS,api);
  assert.equal(calls,1);assert.deepEqual([...s.data],after);
});

test('Data Studio diagnostics backfill only bounded private fields without resuming refresh',async()=>{
  const s=state(),store=new BreakingNewsStore(s,{OPENAI_API_KEY:'test'}),queries=[];
  s.data.set('bootstrapped',true);s.data.set('status',{code:'api-error'});
  s.data.set('api-diagnostic',{checkedAt:new Date(now).toISOString(),httpStatus:400,code:'unsupported_parameter',type:'invalid_request_error',param:'tools[0].filters',message:'private prose',credential:'never copy'});
  s.storage.sql={exec:(...args)=>queries.push(args)};
  const before=structuredClone([...s.data]);
  const reply=await(await store.fetch(new Request('https://news.internal/edition'))).json();
  await store.fetch(new Request('https://news.internal/edition'));
  let calls=0;await store.refresh(now,async()=>{calls++;});
  assert.equal(calls,0);assert.equal(queries.length,2);assert.deepEqual([...s.data],before);
  assert.deepEqual(queries[1].slice(1),[new Date(now).toISOString(),400,'unsupported_parameter','invalid_request_error','tools[0].filters']);
  assert.equal(JSON.stringify(queries).includes('private prose'),false);assert.equal(reply['api-diagnostic'],undefined);
});

test('diagnostic mirror failure does not prevent reading the existing edition',async()=>{
  const s=state(),store=new BreakingNewsStore(s,{OPENAI_API_KEY:'test'});
  s.data.set('bootstrapped',true);s.data.set('api-diagnostic',{checkedAt:new Date(now).toISOString(),httpStatus:500});
  s.storage.sql={exec:()=>{throw Error('SQL temporarily unavailable');}};
  assert.equal((await store.fetch(new Request('https://news.internal/edition'))).status,200);
});

const reviewedAt=Date.parse('2026-10-11T10:15:00Z');
const reviewedDiagnostic={checkedAt:'2026-10-11T00:00:32.272Z',httpStatus:400,type:'invalid_request_error',param:'tools'};
const previousStartedAt='2026-10-11T10:04:38.040Z';
function reviewedStore(){const s=state();s.data.set('bootstrapped',true);s.data.set('status',{code:'no-verified-stories',checkedAt:previousStartedAt});s.data.set('review-attempt:news-validation-2026-10-11',{startedAt:previousStartedAt,originalFailureAt:'2026-10-11T09:48:00Z'});s.data.set('api-diagnostic',reviewedDiagnostic);s.data.set('validation-diagnostic',{checkedAt:previousStartedAt,outcome:'no-verified-stories',candidateCount:4,sourceCount:12,acceptedCount:0,rejections:{'source-not-in-search':3,'expired-source-date':1},candidates:[]});s.data.set('last-slot',Math.floor(reviewedAt/REFRESH_MS));return {s,store:new BreakingNewsStore(s,{OPENAI_API_KEY:'test'})};}

test('the reviewed recovery schedules one alarm and reserves an additional attempt without resetting the ledger',async()=>{
  const {s,store}=reviewedStore(),month='2026-10';s.data.set('budget:'+month,{cents:42,calls:3});
  let alarms=0;s.storage.setAlarm=async()=>{alarms++;};
  await Promise.all(Array.from({length:5},()=>store.fetch(new Request('https://news.internal/edition'),reviewedAt)));
  assert.equal(alarms,1);
  let calls=0;await Promise.all(Array.from({length:5},()=>store.refresh(reviewedAt,async()=>{calls++;return Response.json(result([story]));})));
  assert.equal(calls,1);assert.deepEqual(s.data.get('budget:'+month),{cents:42+RESERVATION_CENTS,calls:4});
  assert.equal(s.data.get('status').code,'updated');
  assert.equal(s.data.has('audit:review:publisher-sources-2026-10-11'),true);
  await store.refresh(reviewedAt+REFRESH_MS,async()=>{calls++;return Response.json(result([{...story,reportedAt:'2026-10-11T09:00:00Z'}]));});
  assert.equal(calls,2);assert.equal(s.data.get('status').code,'updated');
});

test('a failed reviewed recovery stays paused across later slots, reads and deployments',async()=>{
  const {s,store}=reviewedStore();let calls=0;
  const api=async()=>{calls++;return Response.json({error:{type:'invalid_request_error',param:'tools'}},{status:400});};
  await store.refresh(reviewedAt,api);
  const after=structuredClone([...s.data]);
  await store.refresh(reviewedAt+REFRESH_MS,api);
  await new BreakingNewsStore(s,{OPENAI_API_KEY:'test'}).refresh(reviewedAt+REFRESH_MS*100,api);
  await store.fetch(new Request('https://news.internal/edition'),reviewedAt+1000);
  assert.equal(calls,1);assert.deepEqual([...s.data],after);assert.equal(s.data.get('status').code,'api-error');
});

test('review authorization cannot retry a different failure, expired review or exhausted budget',async()=>{
  for(const scenario of ['different-failure','different-validation-failure','no-previous-review','expired','exhausted']){
    const {s,store}=reviewedStore();let at=reviewedAt;
    if(scenario==='different-failure')s.data.set('validation-diagnostic',{...s.data.get('validation-diagnostic'),sourceCount:13});
    if(scenario==='different-validation-failure')s.data.set('status',{code:'no-verified-stories',checkedAt:'2026-10-11T09:49:00Z'});
    if(scenario==='no-previous-review')s.data.delete('review-attempt:news-validation-2026-10-11');
    if(scenario==='expired')at=Date.parse('2026-10-12T00:00:00Z');
    if(scenario==='exhausted')s.data.set('budget:2026-10',{cents:MONTHLY_CENTS,calls:64});
    const before=structuredClone([...s.data]);let calls=0;await store.refresh(at,async()=>{calls++;});
    assert.equal(calls,0);assert.deepEqual([...s.data],before);
  }
});

test('cited source attribution parameters and fragments do not change article identity',()=>{
  const cited='https://www.bbc.co.uk/news/articles/test?at_medium=RSS&at_campaign=rss#section';
  const clean='https://www.bbc.co.uk/news/articles/test';
  const response=result([{...story,sourceUrl:clean,summary:'A short\noriginal summary.'}]);
  response.output[0].action.sources=[{url:cited}];
  const parsed=parseNewsResponse(response,now);
  assert.equal(parsed.edition.stories[0].sourceUrl,clean);
  assert.equal(parsed.edition.stories[0].summary,'A short original summary.');
  assert.equal(parsed.validationDiagnostic.acceptedCount,1);
  assert.equal(canonicalNewsSource('https://www.bbc.co.uk/news/articles/test?edition=one&utm_source=link'),'https://www.bbc.co.uk/news/articles/test?edition=one');
  assert.equal(canonicalNewsSource('https://evilbbc.co.uk/news/articles/test'),null);
});

test('different article identifiers, paths and hosts remain distinct',()=>{
  for(const sourceUrl of ['https://www.bbc.co.uk/news/articles/other','https://www.bbc.com/news/articles/test','https://www.bbc.co.uk/news/articles/test?edition=two']){
    const response=result([{...story,sourceUrl}]);response.output[0].action.sources=[{url:'https://www.bbc.co.uk/news/articles/test?edition=one'}];
    assert.throws(()=>parseNewsResponse(response,now),error=>error.validationDiagnostic.rejections['source-not-in-search']===1);
  }
});

test('all rejected stories explain their private reason without retaining prose',()=>{
  const cases=[
    [{...story,summary:'x'.repeat(351)},'long-summary'],
    [{...story,summary:'<script>fake</script>'},'unsafe-summary'],
    [{...story,reportedAt:'2026-10-07T18:00:00Z'},'expired-source-date'],
    [{...story,reportedAt:'2026-10-09T18:00:01Z'},'future-source-date'],
    [{...story,reportedAt:'not a date'},'invalid-source-date'],
    [{...story,evidence:''},'invalid-evidence']
  ];
  for(const [candidate,reason] of cases){
    assert.throws(()=>parseNewsResponse(result([candidate]),now),error=>{
      assert.equal(error.message,'no-verified-stories');assert.equal(error.validationDiagnostic.rejections[reason],1);
      assert.equal(error.validationDiagnostic.candidateCount,1);
      assert.equal(error.validationDiagnostic.sourceCount,1);
      assert.equal(JSON.stringify(error.validationDiagnostic).includes('original short summary'),false);
      return true;
    });
  }
  assert.throws(()=>parseNewsResponse(result([]),now),error=>error.validationDiagnostic.candidateCount===0&&error.validationDiagnostic.acceptedCount===0);
});

test('validation diagnostics are persisted privately, mirrored once and failure keeps all later slots paused',async()=>{
  const {s,store}=reviewedStore(),queries=[];s.storage.sql={exec:(...args)=>queries.push(args)};let calls=0;
  await store.refresh(reviewedAt,async()=>{calls++;return Response.json(result([story]));},async()=>[{...story,id:1,headline:story.title,description:story.summary,reportedAt:'2026-10-01T00:00:00Z'}]);
  const diagnostic=s.data.get('validation-diagnostic');
  assert.equal(diagnostic.outcome,'no-verified-stories');assert.equal(diagnostic.rejections['expired-source-date'],1);
  const reply=await(await store.fetch(new Request('https://news.internal/edition'),reviewedAt+1000)).json();
  assert.equal(reply['validation-diagnostic'],undefined);assert.equal(reply.candidates,undefined);
  assert.equal(queries.filter(q=>q[0].startsWith('INSERT INTO news_validation_diagnostic')).length,1);
  const after=structuredClone([...s.data]);await store.refresh(reviewedAt+REFRESH_MS,async()=>{calls++;});
  assert.equal(calls,1);assert.deepEqual([...s.data],after);
});
