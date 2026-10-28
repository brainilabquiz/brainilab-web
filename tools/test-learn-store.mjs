import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {LearnPageStore,servePublicLearn,learnRelatedVideo} from '../lib/learn-store.js';
const read=p=>JSON.parse(readFileSync(p,'utf8')),authors=read('content/authors.json'),paths=readdirSync('content/paths').filter(p=>p.endsWith('.json')).map(p=>read('content/paths/'+p));
let documents=readdirSync('content/articles').filter(p=>p.endsWith('.json')).map(p=>read('content/articles/'+p)),offline=false;
const template=readFileSync('learn/index.html','utf8'),calls=[],forwards=[],objects=new Map(),pending=[];
const state={waitUntil(p){assert.equal(this,state);pending.push(p);}};
const fetcher=async url=>{calls.push(url);if(offline)throw Error('offline');return new Response(JSON.stringify((url.includes('learn_paths?')?paths:url.includes('learn_authors?')?authors:documents).map(document=>({document}))));};
const assets={fetch:async request=>new Response(new URL(request.url).pathname==='/sitemap.xml'?readFileSync('sitemap.xml','utf8'):template)};
const env={ASSETS:assets,UNRELATED_SECRET:'not-for-public-rendering',LEARN_PAGES:{idFromName:name=>name,get(id){if(!objects.has(id))objects.set(id,new LearnPageStore(state,env,fetcher));return{fetch:request=>{forwards.push(request);return objects.get(id).fetch(request);}};}}};
const unused={waitUntil(){throw Error('The entry Worker must not own rendering work');}},noCache={match(){throw Error('Entry Worker cache must not load the catalogue');}};
const flush=async()=>{await Promise.all(pending.splice(0));};
for(const pathname of ['/learn/','/learn/'+documents[0].slug+'/','/learn/paths/','/learn/paths/'+paths[0].slug+'/','/sitemap.xml']){
 const response=await servePublicLearn(new Request('https://brainilabgames.com'+pathname+'?utm_source=private',{headers:{Cookie:'player=private',Authorization:'Bearer private','X-Private':'do-not-forward'}}),env,unused,noCache);
 assert.equal(response.status,200,pathname);assert.ok((await response.text()).length>100);await flush();
}
assert.equal(calls.filter(u=>u.includes('learn_publications?')).length,1,'One public snapshot is shared across reading and course pages');
for(const request of forwards){assert.equal([...request.headers].length,0);assert.equal(new URL(request.url).search,'');assert.equal(request.method,'GET');}
assert.ok([...objects.keys()].every(k=>k==='public-learn-v1:brainilabgames.com'));
for(const object of objects.values()){assert.deepEqual(Object.keys(object.env),['ASSETS']);for(const entry of object.cache.entries.values()){assert.equal(typeof entry.body,'string');assert.ok(entry.expires-Date.now()<=60000);assert.ok(entry.expires>Date.now());}}
const head=await servePublicLearn(new Request('https://brainilabgames.com/learn/',{method:'HEAD'}),env,unused,noCache);assert.equal(head.status,200);assert.equal(await head.text(),'');
const video=await learnRelatedVideo(new Request('https://brainilabgames.com/api/related-video?token=private',{headers:{Authorization:'Bearer private'}}),env,unused,noCache,'generalknowledge');assert.ok(video===null||typeof video.id==='string');await flush();assert.equal(forwards.at(-1).headers.has('Authorization'),false);
const object=[...objects.values()][0],before=calls.length;
for(const path of ['/admin/','/_learn-catalogue-v2','/_learn-video/unknown','/api/private'])assert.equal((await object.fetch(new Request('https://brainilabgames.com'+path))).status,404);
assert.equal((await object.fetch(new Request('https://brainilabgames.com/learn/',{method:'POST',body:'private'}))).status,405);assert.equal(calls.length,before);
// Fresh Responses must be constructed for separate requests; do not retain a
// request-owned stream in memory and hand it to another invocation.
const first=await object.fetch(new Request('https://brainilabgames.com/learn/')),second=await object.fetch(new Request('https://brainilabgames.com/learn/'));assert.equal(await first.text(),await second.text());await flush();
for(const entry of object.cache.entries.values())entry.expires=0;
const withdrawn=documents[0].slug;documents=[];
assert.equal((await object.fetch(new Request('https://brainilabgames.com/learn/'+withdrawn+'/'))).status,404);await flush();
const sitemap=await object.fetch(new Request('https://brainilabgames.com/sitemap.xml'));assert.ok(!(await sitemap.text()).includes('/learn/'+withdrawn+'/'));
for(const entry of object.cache.entries.values())entry.expires=0;offline=true;
assert.equal((await object.fetch(new Request('https://brainilabgames.com/learn/'))).status,503);
offline=false;
const evicted=new LearnPageStore(state,env,fetcher);assert.equal((await evicted.fetch(new Request('https://brainilabgames.com/learn/'))).status,200);await flush();
const config=read('wrangler.jsonc');assert.ok(config.durable_objects.bindings.some(b=>b.name==='LEARN_PAGES'&&b.class_name==='LearnPageStore'));assert.ok(config.durable_objects.bindings.some(b=>b.name==='BREAKING_NEWS'&&b.class_name==='BreakingNewsStore'));
assert.deepEqual(config.migrations[0],{tag:'breaking-news-v1',new_sqlite_classes:['BreakingNewsStore']});assert.ok(config.migrations.some(m=>m.tag==='learn-pages-v1'&&m.new_sqlite_classes.includes('LearnPageStore')));
assert.match(readFileSync('worker.js','utf8'),/export \{LearnPageStore\} from '\.\/lib\/learn-store\.js'/);
console.log('PASS Learn store: bound rendering, anonymous requests, shared fresh public cache, independent streams, routing scope, expiry/withdrawal, outage/eviction and additive namespace migration.');
