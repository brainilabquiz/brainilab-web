import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {KNOWLEDGE_SHORTS_PLAYLIST} from '../lib/youtube-shorts.js';
const html=readFileSync('index.html','utf8'),script=readFileSync('assets/js/latest-video.js','utf8'),published=new Date(Date.now()-60000).toISOString();
const video={id:'newerVid002',channelId:'UCy35EdjSpdYufOLJBybevsA',title:'<img src=x onerror=alert(1)>',published,durationSeconds:600,stale:false};
const short={id:'newShort001',channelId:'UCcqUq1aWcDoKyGT9QYCPqIA',title:'A Knowledge Short',published,format:'short',shortsPlaylistId:KNOWLEDGE_SHORTS_PLAYLIST,source:'youtube-shorts-feed',url:'https://www.youtube.com/shorts/newShort001'};
for(const data of [video,{...video,stale:true},{unavailable:true},{...video,channelId:'wrong'},{...video,format:'short'},{...video,published:'invalid'},{...video,published:'2999-01-01T00:00:00Z'},{...video,published:'2020-01-01T00:00:00Z'},{...video,id:'bad-id'},{...video,durationSeconds:180},{...video,durationSeconds:undefined},{...video,durationSeconds:'600'}]){
 const dom=new JSDOM(html,{url:'https://brainilabgames.com/',runScripts:'outside-only'}),w=dom.window,card=w.document.querySelector('[data-video-source="brainilab"]'),other=w.document.querySelector('[data-video-source="knowledge"]');assert(card&&other);assert.equal(w.document.querySelectorAll('[data-latest-video]').length,2);card.dataset.videoPublished='2021-01-01T00:00:00Z';const previous=card.href;
 w.fetch=async url=>Response.json(url.includes('channel=knowledge')?short:data);w.AbortSignal=AbortSignal;w.eval(script);await new Promise(resolve=>setImmediate(resolve));
 if(data===video||data.stale){assert.equal(card.href,'https://www.youtube.com/watch?v=newerVid002');assert.equal(card.querySelector('[data-video-title]').textContent,video.title);assert.equal(card.querySelector('[data-video-title] img'),null);assert.equal(card.querySelector('[data-video-label]').textContent,'BrainiLab');}else assert.equal(card.href,previous);
 assert.equal(other.href,short.url);assert.equal(other.querySelector('[data-video-label]').textContent,'BrainiLab Knowledge · Short');dom.window.close();
}
console.log('PASS media cards: long BrainiLab video validation, independent Knowledge Short, exact source order, publication dates, safe IDs/text and resilient fallbacks.');
