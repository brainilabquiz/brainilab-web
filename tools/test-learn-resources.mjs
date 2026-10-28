import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {publicJSON,CATALOGUE_BYTES} from '../lib/public-json.js';
import {LearnPageStore} from '../lib/learn-store.js';
let cancelled=false;const stream=new ReadableStream({pull(c){c.enqueue(new Uint8Array(CATALOGUE_BYTES+1));},cancel(){cancelled=true;}});
await assert.rejects(()=>publicJSON(new Response(stream)),/exceeds budget/);assert.equal(cancelled,true);
await assert.rejects(()=>publicJSON(new Response('{}',{headers:{'Content-Length':String(CATALOGUE_BYTES+1)}})),/exceeds budget/);
assert.deepEqual(await publicJSON(new Response('{"word":"é"}')),{word:'é'});await assert.rejects(()=>publicJSON(new Response('not JSON')));
const template=readFileSync('learn/index.html','utf8'),pending=[],state={waitUntil(p){pending.push(p);}},flush=async()=>Promise.all(pending.splice(0));
const quiz={version:'resource-1',questions:[1,2].map(n=>({prompt:'Which number is '+n+'?',options:[String(n),'Other','Neither','Both'],answer:0,explanation:'The number is '+n+'.'}))};
const article={title:'A useful public question',description:'A short readable example.',topic:'Curiosity',authorId:'biel',publishedAt:'2026-10-01T08:00:00Z',updatedAt:'2026-10-01T08:00:00Z',cover:{src:'/assets/images/learn/daily-or-anytime.webp',alt:'A notebook'},game:{name:'Games',url:'/games/'},hub:{url:'/learn/'},sources:[],related:[],quiz,sections:[{id:'answer',title:'The answer',html:'<p>'+('A curious fact makes a useful question. '.repeat(60))+'</p><script>mustNeverReachReading()</script>'}]};
const documents=Array.from({length:1000},(_,i)=>({...article,slug:'resource-'+i})),encoded=JSON.stringify(documents.map(document=>({document})));assert.ok(Buffer.byteLength(encoded)<CATALOGUE_BYTES);
let reads=0;const fetcher=async url=>{if(url.includes('learn_publications')){reads++;return new Response(encoded);}return Response.json(url.includes('learn_authors')?[{document:{slug:'biel',name:'Biel',visible:true,active:true}}]:[]);};
const store=new LearnPageStore(state,{ASSETS:{fetch:async request=>new Response(new URL(request.url).pathname==='/sitemap.xml'?'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>':template)}},fetcher),start=performance.now();
for(const path of ['/learn/','/learn/resource-500/','/sitemap.xml']){const r=await store.fetch(new Request('https://brainilabgames.com'+path));assert.equal(r.status,200,path);const text=await r.text();assert.ok(text.length>100);assert.ok(!text.includes('mustNeverReachReading()'));await flush();}
assert.equal(reads,1);const record=JSON.parse(store.cache.entries.get('https://brainilabgames.com/_learn-catalogue-v2').body);assert.equal(record.articles.length,1000);assert.ok(record.articles.every(a=>a.sections.length===0));assert.ok(Object.keys(record.bodies).length===1000);
for(const entry of store.cache.entries.values())entry.expires=0;
assert.equal((await store.fetch(new Request('https://brainilabgames.com/learn/resource-999/'))).status,200);await flush();assert.equal(reads,2,'Expired catalogue refreshes within the bounded process');
console.log('PASS Learn resources: 1,000 synthetic articles ('+Buffer.byteLength(encoded)+' source bytes), cold/warm/expired reads, metadata-only summaries, sanitised selected reading and streaming size limits under a 96 MiB Node heap; '+Math.round(performance.now()-start)+' ms local wall time, not a Cloudflare CPU measurement.');
