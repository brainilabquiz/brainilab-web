import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const html=readFileSync('index.html','utf8'),script=readFileSync('assets/js/latest-video.js','utf8');
const brainilab='UCy35EdjSpdYufOLJBybevsA',channel='UCcqUq1aWcDoKyGT9QYCPqIA';
const published=new Date(Date.now()-60000).toISOString();
const video={id:'newerVid002',channelId:channel,title:'<img src=x onerror=alert(1)>',published,durationSeconds:600,stale:false};
const knowledge={id:'knwVideo001',channelId:channel,title:'A knowledge video',published,durationSeconds:600};
const cases=[video,{...video,stale:true},{unavailable:true},{...video,channelId:'wrong'},
 {...video,published:'invalid'},{...video,published:new Date(Date.now()+86400000).toISOString()},
 {...video,published:'2020-01-01T00:00:00Z'},{...video,id:'bad-id'},{...video,durationSeconds:180},{...video,durationSeconds:179},{...video,durationSeconds:undefined},{...video,durationSeconds:'600'}];
for(const data of cases){
 const d=new JSDOM(html,{url:'https://brainilabgames.com/',runScripts:'outside-only'}),w=d.window;
 const card=w.document.querySelector('[data-video-source="knowledge"]');
 assert(card);assert.equal(w.document.querySelectorAll('[data-latest-video]').length,1);card.dataset.videoPublished='2021-01-01T00:00:00Z';
 const originalHref=card.href,originalTitle=card.querySelector('[data-video-title]').textContent;
 w.fetch=async url=>{assert.equal(url,'/api/latest-video?channel=knowledge');return Response.json(data);};w.AbortSignal=AbortSignal;w.eval(script);
 await new Promise(resolve=>setTimeout(resolve,20));
 if(data===video||data.stale){
  assert(card.href.includes('watch?v=newerVid002'));assert.equal(card.querySelector('[data-video-title]').textContent,video.title);
  assert.equal(card.querySelector('[data-video-title] img'),null);assert(card.classList.contains('has-video'));
  assert.equal(card.querySelector('[data-video-label]').textContent,'BrainiLab Knowledge');
 }else{
  assert.equal(card.href,originalHref,'Keep the existing working video on invalid, unavailable or older data');
  assert.equal(card.querySelector('[data-video-title]').textContent,originalTitle);
 }
 w.close();
}
console.log('Video cards: Knowledge-only homepage, truthful stale labels, escaped titles, real dates, no downgrade, safe IDs and working fallbacks passed.');
