import assert from 'node:assert/strict';
import worker from '../worker.js';
const realFetch=globalThis.fetch,realCaches=globalThis.caches;
let requests=[],cacheKeys=[],put=[];
globalThis.caches={default:{match:async r=>{cacheKeys.push(r.url);return null;},put:async(_r,response)=>{put.push(response);}}};
const ctx={waitUntil:p=>p};
try{
 globalThis.fetch=async url=>{requests.push(url);return new Response('webp',{headers:{'Content-Type':'image/webp'}});};
 let r=await worker.fetch(new Request('https://brainilabgames.com/api/youtube-thumbnail/lL1VbyzusHQ?v=2'),{},ctx);
 assert.equal(r.status,200);assert.equal(r.headers.get('Content-Type'),'image/webp');
 assert.deepEqual(requests,['https://i.ytimg.com/vi_webp/lL1VbyzusHQ/mqdefault.webp']);
 assert.ok(cacheKeys[0].includes('320-webp-v2'));assert.equal(put.length,1);
 requests=[];
 globalThis.fetch=async url=>{requests.push(url);return url.includes('vi_webp')?new Response('missing',{status:404}):new Response('jpeg',{headers:{'Content-Type':'image/jpeg'}});};
 r=await worker.fetch(new Request('https://brainilabgames.com/api/youtube-thumbnail/lL1VbyzusHQ?v=2'),{},ctx);
 assert.equal(r.headers.get('Content-Type'),'image/jpeg');assert.ok(requests[1].endsWith('/mqdefault.jpg'));
 globalThis.fetch=async()=>new Response('<html>error</html>',{headers:{'Content-Type':'text/html'}});
 r=await worker.fetch(new Request('https://brainilabgames.com/api/youtube-thumbnail/lL1VbyzusHQ?v=2'),{},ctx);assert.equal(r.status,404);
 console.log('PASS: compact YouTube WebP, JPEG fallback, separate cache and invalid-image rejection.');
}finally{globalThis.fetch=realFetch;globalThis.caches=realCaches;}
