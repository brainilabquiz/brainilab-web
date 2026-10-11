import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker.js';
const edition={generatedAt:new Date().toISOString(),stories:[{title:'Test headline',summary:'Test summary.',sourceName:'UN',sourceUrl:'https://news.un.org/test',reportedAt:new Date(Date.now()-3600000).toISOString()}]};
const cache={match:async()=>null,put:async()=>{}};
globalThis.caches={default:cache};
globalThis.fetch=async()=>Response.json([]);
function environment(failure=false){let reads=0;return {env:{ASSETS:{fetch:async()=>new Response('<html><body><!-- breaking-news --><p>Keep games</p></body></html>',{headers:{'Content-Type':'text/html','ETag':'old','Content-Length':'100'}})},BREAKING_NEWS:{idFromName:()=>1,get:()=>({fetch:async()=>{reads++;if(failure)throw new Error('unavailable');return Response.json(edition);}})}},reads:()=>reads};}
const ctx={waitUntil:()=>{}};
test('homepage keeps games without the news block',async()=>{const e=environment();const r=await worker.fetch(new Request('https://brainilabgames.com/'),e.env,ctx);const body=await r.text();assert.doesNotMatch(body,/Breaking News/);assert.equal(e.reads(),0);assert.match(body,/Keep games/);assert.equal(r.headers.get('ETag'),null);assert.equal(r.headers.get('X-Frame-Options'),'DENY');});
test('HEAD and preview reads never bootstrap paid research',async()=>{const e=environment();const head=await worker.fetch(new Request('https://brainilabgames.com/',{method:'HEAD'}),e.env,ctx);assert.equal(await head.text(),'');const preview=await worker.fetch(new Request('https://preview.example.org/'),e.env,ctx);assert.doesNotMatch(await preview.text(),/Breaking News/);assert.equal(e.reads(),0);});
test('news outage preserves the functioning homepage',async()=>{const e=environment(true);const r=await worker.fetch(new Request('https://brainilabgames.com/'),e.env,ctx);assert.equal(r.status,200);assert.match(await r.text(),/Keep games/);});
test('public news API rejects mutations and previews cannot trigger research',async()=>{const e=environment();assert.equal((await worker.fetch(new Request('https://brainilabgames.com/api/breaking-news',{method:'POST'}),e.env,ctx)).status,405);assert.equal((await worker.fetch(new Request('https://preview.example.org/api/breaking-news'),e.env,ctx)).status,503);assert.equal(e.reads(),0);});

test('dedicated news page renders current stories',async()=>{const e=environment();const r=await worker.fetch(new Request('https://brainilabgames.com/breaking-news/'),e.env,ctx);assert.equal(r.status,200);assert.match(await r.text(),/Breaking News/);assert.equal(e.reads(),1);});

test('empty news page offers a reading route without stale dates or caching the outage',async()=>{
  const e=environment(true);
  // Preview never reads production news or triggers a paid bootstrap.
  const r=await worker.fetch(new Request('https://preview.example.org/breaking-news/'),e.env,ctx);
  const html=await r.text();
  assert.match(html,/No fresh stories/);assert.match(html,/href="\/learn\/"/);
  assert.doesNotMatch(html,/<time|Updated|API|Codex/);assert.equal(e.reads(),0);
  assert.equal(r.headers.get('Cache-Control'),'no-store');
});

test('news footer image candidates resolve at the site root',async()=>{
  const {readFile}=await import('node:fs/promises');
  const html=await readFile(new URL('../breaking-news/index.html',import.meta.url),'utf8');
  assert.doesNotMatch(html,/\uFFFD/);
  const footer=html.split('<footer')[1];
  for(const match of footer.matchAll(/srcset="([^"]+)"/g)) {
    for(const candidate of match[1].split(',')) assert.match(candidate.trim(),/^\/assets\//);
  }
  assert.match(html,/content="https:\/\/brainilabgames.com\/breaking-news\/" property="og:url"/);
});
