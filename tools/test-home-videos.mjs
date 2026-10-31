import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {KNOWLEDGE_SHORTS_PLAYLIST} from '../lib/youtube-shorts.js';
const template=readFileSync('index.html','utf8'),script=readFileSync('assets/js/latest-video.js','utf8'),published=new Date(Date.now()-1000).toISOString();
const main={id:'mainVideo01',title:'Newest BrainiLab video',published,durationSeconds:600,channelId:'UCy35EdjSpdYufOLJBybevsA'};
const short={id:'newShort001',title:'Newest Knowledge Short',published,channelId:'UCcqUq1aWcDoKyGT9QYCPqIA',format:'short',source:'youtube-shorts-feed',shortsPlaylistId:KNOWLEDGE_SHORTS_PLAYLIST,url:'https://www.youtube.com/shorts/newShort001'};
async function client({brainilab=main,knowledge=short,fail=''}={}){
 const dom=new JSDOM(template,{url:'https://brainilabgames.com/',runScripts:'outside-only'}),w=dom.window,requests=[];w.AbortSignal.timeout=()=>undefined;
 w.fetch=async url=>{requests.push(url);if(url.includes('channel='+fail)&&fail)throw Error('offline');return {ok:true,json:async()=>url.includes('channel=knowledge')?knowledge:brainilab};};w.eval(script);await new Promise(resolve=>setImmediate(resolve));
 const cards=[...w.document.querySelectorAll('[data-latest-video]')];assert.deepEqual(requests,['/api/latest-video?channel=brainilab','/api/latest-video?channel=knowledge&format=short']);assert.deepEqual(cards.map(n=>n.dataset.videoSource),['brainilab','knowledge']);assert.deepEqual(cards.map(n=>n.dataset.videoFormat),['long','short']);return{dom,cards};
}
const initial=new JSDOM(template),fallback=[...initial.window.document.querySelectorAll('[data-latest-video]')].map(n=>n.href);initial.window.close();
let view=await client();assert.equal(view.cards[0].href,'https://www.youtube.com/watch?v=mainVideo01');assert.equal(view.cards[1].href,short.url);assert.equal(view.cards[1].querySelector('[data-video-label]').textContent,'BrainiLab Knowledge · Short');view.dom.window.close();
for(const [fail,index]of [['brainilab',0],['knowledge',1]]){view=await client({fail});assert.equal(view.cards[index].href,fallback[index]);assert.notEqual(view.cards[1-index].href,fallback[1-index],'The other source still refreshes');view.dom.window.close();}
view=await client({knowledge:{...short,title:'<img src=x onerror=bad()>'}});assert.equal(view.cards[1].querySelector('[data-video-title]').textContent,'<img src=x onerror=bad()>');assert.equal(view.cards[1].querySelector('[data-video-title] img'),null);view.dom.window.close();
for(const bad of [{...short,channelId:'wrong'},{...short,format:'long',durationSeconds:600},{...short,shortsPlaylistId:'foreign'},{...short,url:'https://www.youtube.com/watch?v=newShort001'},{...short,published:'2999-01-01T00:00:00Z'},{...short,published:'2020-01-01T00:00:00Z'}]){view=await client({knowledge:bad});assert.equal(view.cards[1].href,fallback[1],'Never substitute a long, foreign, future or older video for the Short');view.dom.window.close();}
console.log('PASS homepage media: BrainiLab video first, latest verified Knowledge Short second, two independent requests/fallbacks, correct links/labels, safe text and no long-video substitution.');
