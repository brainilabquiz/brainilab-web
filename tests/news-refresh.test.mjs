import test from 'node:test';
import assert from 'node:assert/strict';
import {BreakingNewsStore,requestBody,parseNewsResponse,MONTHLY_CENTS,RESERVATION_CENTS,REFRESH_MS} from '../lib/news-refresh.js';
const now=Date.parse('2026-10-09T18:00:00Z');
const story={title:'A test headline',summary:'An original short summary.',sourceName:'UN',sourceUrl:'https://news.un.org/en/story/2026/10/test',reportedAt:'2026-10-09T16:00:00Z',evidence:'Test source dated 9 October 2026; this is a test fixture.'};
const result=stories=>({status:'completed',usage:{input_tokens:1234,output_tokens:300},output:[{type:'web_search_call',status:'completed',action:{sources:[{url:story.sourceUrl}]}},{type:'message',content:[{type:'output_text',text:JSON.stringify({stories}),annotations:[]}]}]});
function state(){const data=new Map();let queue=Promise.resolve();return {storage:{get:async k=>data.get(k),put:async(k,v)=>{data.set(k,v)},setAlarm:async t=>data.set('alarm',t),transaction(fn){const work=queue.then(()=>fn(this));queue=work.catch(()=>{});return work;}},data};}
test('one search, bounded output, fixed model, no server retention',()=>{const body=requestBody(now);assert.equal(body.max_tool_calls,1);assert.equal(body.max_output_tokens,1800);assert.equal(body.store,false);assert.equal(body.tools[0].type,'web_search');});
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
