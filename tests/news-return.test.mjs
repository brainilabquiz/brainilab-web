import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {BreakingNewsStore,newsEdition} from '../lib/news-refresh.js';
import {renderNews,renderEmptyNews,newsEditionRevision,NEWS_WINDOW_MS} from '../lib/breaking-news.js';
import worker from '../worker.js';
const {JSDOM}=createRequire(import.meta.url)(process.env.JSDOM_MODULE||'jsdom');
const now=Date.parse('2026-10-23T11:00:00Z');
const item={title:'An attributed headline',summary:'A short sourced summary.',sourceName:'NASA',sourceUrl:'https://www.nasa.gov/news/one',reportedAt:'2026-10-23T08:00:00Z'};
const edition={generatedAt:'2026-10-23T10:00:00Z',stories:[item]};
const source=readFileSync(new URL('../assets/js/news-reader.js',import.meta.url),'utf8');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function harness(html=renderNews(edition,now),answer){
 const dom=new JSDOM('<main>'+html+'</main>',{url:'https://brainilabgames.com/breaking-news/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,calls=[];let clock=now;
 w.Date.now=()=>clock;w.AbortSignal=globalThis.AbortSignal;
 w.fetch=async(...args)=>{calls.push(args);return typeof answer==='function'?answer():Response.json(answer||{revision:newsEditionRevision(edition,now),generatedAt:edition.generatedAt});};
 w.eval(source);
 return {w,calls,dom,advance:ms=>{clock+=ms;},event:name=>w.dispatchEvent(new w.Event(name)),label:()=>w.document.querySelector('[data-news-refresh-label]').textContent,status:()=>w.document.querySelector('[role=status]').textContent};
}
test('revision matches the rendered edition and changes for content, sources and expiry',()=>{
 const revision=newsEditionRevision(edition,now);assert.match(revision,/^[a-f0-9]{16}$/);
 const d=new JSDOM(renderNews(edition,now)).window.document;
 assert.equal(d.querySelector('section').dataset.newsRevision,revision);
 for(const key of ['title','summary','sourceName','sourceUrl'])assert.notEqual(newsEditionRevision({...edition,stories:[{...item,[key]:item[key]+'x'}]},now),revision);
 assert.equal(newsEditionRevision(edition,now+NEWS_WINDOW_MS),'');assert.equal(newsEditionRevision(null,now),'');
});
test('passive store reads never bootstrap, write diagnostics, set alarms or resume failures',async()=>{
 for(const code of [null,'missing-key','invalid-key','api-error','api-quota','no-verified-stories']){
  const data=new Map(code?[['status',{code}],['edition',edition]]:[]),before=structuredClone([...data]);let writes=0,alarms=0;
  const state={storage:{get:async key=>data.get(key),put:async()=>{writes++;},transaction:async()=>{writes++;},setAlarm:async()=>{alarms++;},sql:{exec:()=>{writes++;}}}};
  const store=new BreakingNewsStore(state,{OPENAI_API_KEY:'fixture-only'});
  const r=await store.fetch(new Request('https://news.internal/edition-status'),now);
  assert.equal(r.status,200);assert.deepEqual(await r.json(),code?edition:{generatedAt:null,stories:[]});
  assert.equal(writes,0);assert.equal(alarms,0);assert.deepEqual([...data],before);
 }
});
test('passive adapter uses a fixed readonly path; regular edition behavior remains unchanged',async()=>{
 const urls=[],env={BREAKING_NEWS:{idFromName:name=>{assert.equal(name,'world-news-v1');return 1;},get:()=>({fetch:async url=>{urls.push(url);return Response.json(edition);}})}};
 await newsEdition(env,{passive:true});await newsEdition(env);assert.deepEqual(urls,['https://news.internal/edition-status','https://news.internal/edition']);
});
test('public status exposes only edition metadata, never story text or operational fields',async()=>{
 globalThis.caches={default:{match:async()=>null,put:async()=>{}}};const urls=[];
 const env={BREAKING_NEWS:{idFromName:()=>1,get:()=>({fetch:async url=>{urls.push(url);return Response.json({...edition,serviceStatus:'fixture-private',ledger:'never expose'});}})}};
 const r=await worker.fetch(new Request('https://brainilabgames.com/api/breaking-news/status'),env,{waitUntil:()=>{}}),data=await r.json();
 assert.equal(r.status,200);assert.equal(r.headers.get('X-Robots-Tag'),'noindex');assert.deepEqual(Object.keys(data).sort(),['generatedAt','revision']);assert.match(data.revision,/^[a-f0-9]{16}$/);assert.match(urls[0],/edition-status$/);
 const n=urls.length,p=await worker.fetch(new Request('https://preview.example.org/api/breaking-news/status'),env,{});
 assert.deepEqual(await p.json(),{revision:'',generatedAt:null});assert.equal(urls.length,n);
 assert.equal((await worker.fetch(new Request('https://brainilabgames.com/api/breaking-news/status',{method:'POST'}),env,{})).status,405);
});
test('no initial request, short revisits or background polling',async()=>{
 const h=harness();await flush();assert.equal(h.calls.length,0);h.event('focus');h.advance(299999);h.event('pageshow');await flush();assert.equal(h.calls.length,0);h.dom.window.close();
});
test('returning after five minutes checks once, omits credentials and leaves all reading in place',async()=>{
 const h=harness(),before=h.w.document.querySelector('ol').outerHTML;h.advance(300000);h.event('focus');h.event('pageshow');await flush();
 assert.equal(h.calls.length,1);assert.equal(h.calls[0][0],'/api/breaking-news/status');assert.equal(h.calls[0][1].credentials,'omit');assert.equal(h.calls[0][1].cache,'no-store');
 assert.equal(h.label(),'Check latest');assert.equal(h.w.document.querySelector('ol').outerHTML,before);assert.equal(h.status(),'');h.dom.window.close();
});
test('new edition is politely announced once, without replacing stories, moving focus or navigating',async()=>{
 const h=harness(undefined,{revision:'1234567890abcdef',generatedAt:'2026-10-23T10:30:00Z'}),link=h.w.document.querySelector('.breaking-news__story-link'),body=h.w.document.querySelector('ol').outerHTML;
 link.focus();h.advance(300000);h.event('pageshow');await flush();
 assert.equal(h.label(),'Updated brief ready');assert.match(h.status(),/updated brief/);assert.equal(h.w.document.activeElement,link);assert.equal(h.w.location.href,'https://brainilabgames.com/breaking-news/');assert.equal(h.w.document.querySelector('ol').outerHTML,body);
 assert.ok(h.w.document.querySelector('[data-news-new]'));const status=h.status();h.advance(300000);h.event('focus');await flush();assert.equal(h.status(),status);h.dom.window.close();
});
test('empty page can discover a recovered edition and offers a normal link without JavaScript',async()=>{
 const h=harness(renderEmptyNews(),{revision:'1234567890abcdef',generatedAt:'2026-10-23T10:30:00Z'});h.advance(300000);h.event('focus');await flush();assert.equal(h.label(),'Updated brief ready');
 assert.equal(h.w.document.querySelector('[data-news-refresh]').getAttribute('href'),'/breaking-news/');assert.equal(h.w.document.querySelector('.breaking-news__empty a').getAttribute('href'),'/learn/');h.dom.window.close();
});
test('hidden tab never checks and failed, invalid, older or future responses cannot disturb the page',async()=>{
 for(const answer of [()=>{throw Error('offline');},()=>new Response('',{status:503}),()=>new Response('html',{headers:{'content-type':'text/html'}}),{revision:'<script>',generatedAt:edition.generatedAt},{revision:'1234567890abcdef',generatedAt:'2026-10-22T10:00:00Z'},{revision:'1234567890abcdef',generatedAt:'2036-10-23T10:00:00Z'},{revision:'',generatedAt:null}]){
  const h=harness(undefined,answer);Object.defineProperty(h.w.document,'hidden',{configurable:true,value:true});h.advance(300000);h.event('focus');await flush();assert.equal(h.calls.length,0);
  Object.defineProperty(h.w.document,'hidden',{configurable:true,value:false});h.w.document.dispatchEvent(new h.w.Event('visibilitychange'));await flush();assert.equal(h.calls.length,1);assert.equal(h.label(),'Check latest');assert.equal(h.status(),'');assert.equal(h.w.document.querySelectorAll('li article').length,1);h.dom.window.close();
 }
});
