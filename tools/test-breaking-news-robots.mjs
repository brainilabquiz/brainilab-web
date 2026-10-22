import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import worker from '../worker.js';
// Breaking News summarises other publishers' reporting: visitors can read it,
// search engines follow its links but do not index it.
const page=readFileSync('breaking-news/index.html','utf8');
const env={ASSETS:{fetch:async()=>new Response(page,{headers:{'Content-Type':'text/html; charset=utf-8'}})}};
for(const method of ['GET','HEAD']){
 const r=await worker.fetch(new Request('https://preview.workers.dev/breaking-news/',{method}),env,{waitUntil(){}});
 assert.equal(r.status,200,method);assert.equal(r.headers.get('X-Robots-Tag'),'noindex, follow',method);
}
const html=await (await worker.fetch(new Request('https://preview.workers.dev/breaking-news/'),env,{waitUntil(){}})).text();
assert.match(html,/<meta content="noindex,follow" name="robots"\/>/);
assert.equal((html.match(/name="robots"/g)||[]).length,1);
assert.ok(!readFileSync('sitemap.xml','utf8').includes('/breaking-news/'),'not in the sitemap');
console.log('PASS Breaking News: readable page, noindex+follow in meta and X-Robots-Tag for GET and HEAD, not in the sitemap.');
