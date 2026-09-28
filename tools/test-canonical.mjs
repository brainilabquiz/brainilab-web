import assert from 'node:assert/strict';
import worker from '../worker.js';
for(const [input,expected] of [
 ['http://brainilabgames.com/','https://brainilabgames.com/'],
 ['http://brainilabgames.com/games/number-route/index.html?daily=2026-09-28','https://brainilabgames.com/games/number-route/?daily=2026-09-28'],
 ['https://brainilabgames.com/index.html?utm_source=youtube','https://brainilabgames.com/?utm_source=youtube'],
 ['https://www.brainilabgames.com/learn/','https://brainilabgames.com/learn/']
]){
 const r=await worker.fetch(new Request(input),{},{});
 assert.equal(r.status,308);assert.equal(r.headers.get('location'),expected);
}
let served=0;const env={ASSETS:{fetch:async()=>{served++;return new Response('asset');}}};
await worker.fetch(new Request('http://localhost:8787/games/'),env,{});
await worker.fetch(new Request('https://preview.workers.dev/games/'),env,{});
await worker.fetch(new Request('https://brainilabgames.com/games/'),env,{});
assert.equal(served,3);
console.log('PASS: canonical redirects preserve queries; canonical, preview and local paths remain served.');
