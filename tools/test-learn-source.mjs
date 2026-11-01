import assert from 'node:assert/strict';
import {mock} from 'node:test';
import {readFileSync} from 'node:fs';
import {learnSourceJSON} from '../lib/learn-source.js';
import {serveLearn} from '../lib/learn-worker.js';
import {checkPublicPages} from '../lib/site-health.js';

const url='https://example.invalid/public-read',json=value=>Response.json(value);
for(const failure of [()=>{throw new TypeError('private transport details');},()=>{throw Error('Network connection lost.');},()=>{throw Error('daemonDown');},()=>{throw new DOMException('private timeout details','TimeoutError');},...([408,500,502,503,504,520,522,524].map(status=>()=>new Response('private upstream body',{status}))),()=>new Response(new ReadableStream({start(controller){controller.error(new TypeError('body connection lost'));}}))]){
 let calls=0;
 const result=await learnSourceJSON(url,{headers:{apikey:'public-fixture'},fetcher:async(input,options)=>{assert.equal(input,url);assert.equal(options.method,'GET');assert.equal(options.redirect,'manual');assert.equal(options.headers.apikey,'public-fixture');return ++calls===1?failure():json([]);}});
 assert.deepEqual(result,[]);assert.equal(calls,2,'One transient failure recovers with exactly one new read');
}
for(const [response,code] of [[()=>new Response('denied',{status:401}),'source-http-401'],[()=>new Response('limited',{status:429,headers:{'Retry-After':'30'}}),'source-http-429'],[()=>new Response('no'),'source-invalid'],[()=>new Response('[]',{headers:{'Content-Length':'99'}}),'source-too-large'],[()=>new Response('12345'),'source-too-large']]){
 let calls=0;
 await assert.rejects(learnSourceJSON(url,{limit:4,fetcher:async()=>{calls++;return response();}}),error=>error.code===code&&!error.message.includes('denied'));
 assert.equal(calls,1,'Permanent, invalid and oversized responses must not be retried');
}
// Fake elapsed network time; no six-second sleeps and no production faults.
let clock=0;const budgets=[];
mock.method(Date,'now',()=>clock);
mock.method(AbortSignal,'timeout',ms=>{budgets.push(ms);return new AbortController().signal;});
try{
 let calls=0;
 await assert.rejects(learnSourceJSON(url,{fetcher:async()=>{clock+=++calls===1?6000:2000;throw new DOMException('timeout','TimeoutError');}}),error=>error.code==='source-timeout');
 assert.equal(calls,2);assert.deepEqual(budgets,[6000,2000]);assert.equal(clock,8000);
}finally{mock.restoreAll();}

const read=path=>JSON.parse(readFileSync(path,'utf8'));
const a=read('content/articles/counting-and-zero.json'),authors=read('content/authors.json'),path=read('content/paths/maths-from-zero.json');
const template='<html><head><title>Learn</title><meta name="description" content="Learn"/><link rel="canonical" href="https://brainilabgames.com/learn/"/><script type="application/ld+json">{}</script></head><body><main id="main-content"></main></body></html>';
const env={ASSETS:{fetch:async()=>new Response(template)}};
function fixture(){const entries=new Map(),pending=[];return{entries,ctx:{waitUntil(p){pending.push(p);}},cache:{async match(r){const body=entries.get(r.url);return body?new Response(body):undefined;},async put(r,response){entries.set(r.url,await response.text());}},async flush(){await Promise.all(pending.splice(0));}};}
// The catalogue, paths and authors each recover, without a seed/stale fallback.
for(const table of ['learn_publications','learn_paths','learn_authors']){
 const f=fixture(),calls=new Map();
 const fetcher=async input=>{const key=/rest\/v1\/([^?]+)/.exec(input)[1];calls.set(key,(calls.get(key)||0)+1);if(key===table&&calls.get(key)===1)throw new TypeError('temporary outage');return json((key==='learn_publications'?[a]:key==='learn_authors'?authors:[path]).map(document=>({document})));};
 const response=await serveLearn(new Request('https://brainilabgames.com/learn/'+a.slug+'/'),env,f.ctx,f.cache,fetcher);
 assert.equal(response.status,200);assert.ok((await response.text()).includes(a.title));assert.equal(calls.get(table),2);await f.flush();
 // A subsequent source withdrawal must remove the reading after cache expiry.
 f.entries.clear();
 const removed=await serveLearn(new Request('https://brainilabgames.com/learn/'+a.slug+'/'),env,f.ctx,f.cache,async input=>json((input.includes('learn_authors?')?authors:[]).map(document=>({document}))));
 assert.equal(removed.status,404);assert.ok(!(await removed.text()).includes(a.title));await f.flush();
}
const f=fixture();let calls=0;
const unavailable=await serveLearn(new Request('https://brainilabgames.com/learn/'),env,f.ctx,f.cache,async()=>{calls++;throw new DOMException('private hostname and credentials','TimeoutError');});
assert.equal(unavailable.status,503);assert.equal(unavailable.headers.get('retry-after'),'30');assert.equal(unavailable.headers.get('cache-control'),'no-store');assert.equal(unavailable.headers.get('x-brainilab-learn-error'),'source-timeout');assert.ok(!(await unavailable.text()).includes('credentials'));assert.equal(calls,6,'Three parallel source reads have at most two attempts each');assert.equal(f.entries.size,0);
const health=await checkPublicPages('https://brainilabgames.com',{fetcher:async()=>new Response('<main><h1>Unavailable</h1></main>',{status:503,headers:{'X-BrainiLab-Learn-Error':'source-timeout'}})});
assert.ok(health.checks.filter(c=>c.status===503).every(c=>c.code==='source-timeout'));
const unsafe=await checkPublicPages('https://brainilabgames.com',{fetcher:async()=>new Response('failure',{status:503,headers:{'X-BrainiLab-Learn-Error':'private-token'}})});
assert.ok(unsafe.checks.filter(c=>c.status===503).every(c=>c.code==='http'));
console.log('PASS Learn source: one bounded GET retry, timeout/network/body-stream/HTTP recovery, permanent errors and size limits, eight-second deadline, catalogue/directory recovery, withdrawal, persistent 503 and coarse private-safe monitor codes.');
