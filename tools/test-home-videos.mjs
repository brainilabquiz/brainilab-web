import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const channel='UCcqUq1aWcDoKyGT9QYCPqIA';
const require=createRequire(import.meta.url),{JSDOM}=require(process.env.JSDOM_MODULE||'jsdom');
const template=readFileSync('index.html','utf8'),script=readFileSync('assets/js/latest-video.js','utf8');
async function client({knowledge={},brainilab={},failKnowledge=false}={}){
 const dom=new JSDOM(template,{url:'https://brainilabgames.com',runScripts:'outside-only'});const {window}=dom;
 window.AbortSignal.timeout=()=>undefined;let requestCount=0;
 window.fetch=async url=>{requestCount++;if(url.includes('channel=knowledge')&&failKnowledge)throw Error('offline');return {ok:true,json:async()=>url.includes('channel=knowledge')?knowledge:brainilab};};
 window.eval(script);await new Promise(resolve=>setImmediate(resolve));
 const cards=[...window.document.querySelectorAll('[data-latest-video]')];assert.equal(requestCount,2);return {dom,cards};
}
const playlist='PLUJ2DxFEKsFSGP_Ry6gY5jDwQNnDgFKh4';
let view=await client({failKnowledge:true,brainilab:{playlistId:playlist,id:'newerVid002',title:'Newest quiz',published:'2026-10-23T00:00:00Z'}});
assert.ok(view.cards[0].href.includes('e5bIWAFXhCc'));assert.ok(view.cards[1].href.includes('newerVid002'));view.dom.window.close();
view=await client({knowledge:{channelId:channel,id:'newerVid002',title:'<img src=x onerror=bad()>',published:'2026-10-23T00:00:00Z'}});
assert.equal(view.cards[0].querySelector('[data-video-title]').textContent,'<img src=x onerror=bad()>');assert.equal(view.cards[0].querySelector('[data-video-title] img'),null);assert.ok(!view.cards[0].href.includes('list='));view.dom.window.close();
for(const bad of [{channelId:'wrong',published:'2026-10-23T00:00:00Z'},{channelId:channel,published:'2999-01-01T00:00:00Z'},{channelId:channel,published:'2026-01-01T00:00:00Z'}]){
 view=await client({knowledge:{id:'newerVid002',title:'Rejected',...bad}});assert.ok(view.cards[0].href.includes('e5bIWAFXhCc'));view.dom.window.close();
}
console.log('PASS homepage videos: two independent cards, safe text, fixed identities, actual publication and resilient fallbacks.');
