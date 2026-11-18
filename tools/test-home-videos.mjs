import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {KNOWLEDGE_SHORTS_PLAYLIST} from '../lib/youtube-shorts.js';
import {BreakingNewsStore} from '../lib/public-page-store.js';
import {readHomeFeaturedVideo,refreshHomeFeaturedVideo} from '../lib/home-featured-video.js';
const template=readFileSync('index.html','utf8'),script=readFileSync('assets/js/latest-video.js','utf8'),published=new Date(Date.now()-1000).toISOString();
const main={id:'mainVideo01',title:'Newest BrainiLab video',published,durationSeconds:600,channelId:'UCy35EdjSpdYufOLJBybevsA'};
const short={id:'newShort001',title:'Newest Knowledge Short',published,channelId:'UCcqUq1aWcDoKyGT9QYCPqIA',format:'short',source:'youtube-shorts-feed',shortsPlaylistId:KNOWLEDGE_SHORTS_PLAYLIST,url:'https://www.youtube.com/shorts/newShort001'};
async function client({brainilab=main,knowledge=short,fail=''}={}){
 const dom=new JSDOM(template,{url:'https://brainilabgames.com/',runScripts:'outside-only'}),w=dom.window,requests=[];w.AbortSignal.timeout=()=>undefined;
 w.fetch=async url=>{requests.push(url);if(url.includes('channel='+fail)&&fail)throw Error('offline');return {ok:true,json:async()=>url.includes('channel=knowledge')?knowledge:brainilab};};w.eval(script);await new Promise(resolve=>setImmediate(resolve));
 const cards=[...w.document.querySelectorAll('[data-latest-video]')];assert.deepEqual(requests,['/api/latest-video?channel=brainilab','/api/latest-video?channel=knowledge&format=short']);assert.deepEqual(cards.map(n=>n.dataset.videoSource),['brainilab','knowledge']);assert.deepEqual(cards.map(n=>n.dataset.videoFormat),['long','short']);return{dom,cards};
}
const initial=new JSDOM(template),fallback=[...initial.window.document.querySelectorAll('[data-latest-video]')].map(n=>n.querySelector('[data-video-play]').href);initial.window.close();
let view=await client();assert.equal(view.cards[0].querySelector('[data-video-play]').href,'https://www.youtube.com/watch?v=mainVideo01');assert.equal(view.cards[1].querySelector('[data-video-play]').href,short.url);assert.equal(view.cards[1].querySelector('[data-video-label]').textContent,'BrainiLab Knowledge · Short');view.dom.window.close();
for(const [fail,index]of [['brainilab',0],['knowledge',1]]){view=await client({fail});assert.equal(view.cards[index].querySelector('[data-video-play]').href,fallback[index]);assert.notEqual(view.cards[1-index].querySelector('[data-video-play]').href,fallback[1-index],'The other source still refreshes');view.dom.window.close();}
view=await client({knowledge:{...short,title:'<img src=x onerror=bad()>'}});assert.equal(view.cards[1].querySelector('[data-video-title]').textContent,'<img src=x onerror=bad()>');assert.equal(view.cards[1].querySelector('[data-video-title] img'),null);view.dom.window.close();
for(const bad of [{...short,channelId:'wrong'},{...short,format:'long',durationSeconds:600},{...short,shortsPlaylistId:'foreign'},{...short,url:'https://www.youtube.com/watch?v=newShort001'},{...short,published:'2999-01-01T00:00:00Z'},{...short,published:'2020-01-01T00:00:00Z'}]){view=await client({knowledge:bad});assert.equal(view.cards[1].querySelector('[data-video-play]').href,fallback[1],'Never substitute a long, foreign, future or older video for the Short');view.dom.window.close();}

const dom=new JSDOM(template,{url:'https://brainilabgames.com/',runScripts:'outside-only'});
const window=dom.window;
Object.defineProperty(window.document,'hidden',{value:false});
let nextVideo=main,tick,clientChecks=0;
window.setInterval=(callback,delay)=>{assert.equal(delay,5*60_000);tick=callback;};
window.fetch=async url=>{
 if(url.endsWith('format=short'))return {ok:true,json:async()=>short};
 clientChecks++;
 return nextVideo?{ok:true,json:async()=>nextVideo}:{ok:false,status:503};
};
window.eval(script);
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const card=window.document.querySelector('[data-video-source=brainilab]');
await flush();assert.equal(card.dataset.videoId,main.id);
nextVideo=null;tick();await flush();assert.equal(card.dataset.videoId,main.id);
nextVideo={...main,id:'autoNewer01',title:'A newly published video',published:new Date().toISOString()};
window.document.dispatchEvent(new window.Event('visibilitychange'));
await flush();assert.equal(card.dataset.videoId,nextVideo.id);
assert.equal(JSON.parse(card.querySelector('[data-video-schema]').textContent).name,nextVideo.title);
nextVideo=main;tick();await flush();assert.equal(card.dataset.videoId,'autoNewer01');
assert.equal(clientChecks,4);window.close();

const playlist='UU'+main.channelId.slice(2),rows=new Map(),names=[],operations=[];
const storage={async get(key){return rows.get(key);},async put(key,data){rows.set(key,structuredClone(data));}};
const background={waitUntil(task){operations.push(task);}};
const drain=async()=>{while(operations.length)await Promise.all(operations.splice(0));};
let upstream=main,attempts=0,release;
const youtube=async address=>{
 const path=new URL(address).pathname;
 if(path.endsWith('/channels')){
  attempts++;
  if(!upstream)return new Response(null,{status:503});
  if(release)await release.promise;
  return Response.json({items:[{id:main.channelId,contentDetails:{relatedPlaylists:{uploads:playlist}}}]});
 }
 if(path.endsWith('/playlistItems'))return Response.json({items:[{snippet:{playlistId:playlist,title:upstream.title,videoOwnerChannelId:main.channelId,resourceId:{kind:'youtube#video',videoId:upstream.id}},contentDetails:{videoId:upstream.id,videoPublishedAt:upstream.published},status:{privacyStatus:'public'}}]});
 assert.ok(path.endsWith('/videos'));
 return Response.json({items:[{id:upstream.id,snippet:{title:upstream.title,channelId:main.channelId,publishedAt:upstream.published},contentDetails:{duration:'PT10M'},status:{privacyStatus:'public'}}]});
};
const newStore=()=>new BreakingNewsStore({storage,...background},{YOUTUBE_API_KEY:'test-key'},youtube);
let store=newStore();
const env={LEARN_PAGES:{idFromName(name){names.push(name);return name;},get(){return{fetch:request=>store.fetch(request)};}}};
const request=new Request('https://brainilabgames.com/');
const coldEdge={async match(){return undefined;},async put(){}};
const read=()=>readHomeFeaturedVideo(request,env,background,coldEdge);
const refresh=()=>refreshHomeFeaturedVideo(env,'brainilabgames.com');
assert.equal(await read(),null,'A first request does not wait for YouTube');
await drain();assert.equal((await read()).id,main.id);assert.equal(attempts,1);
store=newStore();assert.equal((await read()).id,main.id,'Stored video survives object restart and cold edge');
const realNow=Date.now;
let now=Date.now()+16*60_000;
Date.now=()=>now;
try{
 let unblock;
 release={promise:new Promise(resolve=>{unblock=resolve;})};
 upstream={...main,id:'newVideo002',published:new Date(now-1000).toISOString()};
 const pending=refresh();
 assert.equal((await read()).id,main.id,'Last validated video is served during a slow response');
 assert.equal((await read()).id,main.id);assert.equal(attempts,2,'Concurrent readers share the same refresh');
 unblock();await pending;await drain();release=null;
 assert.equal((await read()).id,'newVideo002');
 now+=16*60_000;upstream=main;await refresh();
 assert.equal((await read()).id,'newVideo002','An older successful response cannot replace it');
 now+=8*86400_000;upstream=null;await refresh();store=newStore();
 assert.equal((await read()).id,'newVideo002','A prolonged upstream outage cannot erase it');
 const lastAttempts=attempts;await refresh();assert.equal(attempts,lastAttempts,'Failures are throttled');
 await readHomeFeaturedVideo(new Request('https://test-preview.example/'),env,background,coldEdge);
 assert.ok(names.includes('home-video-v1:brainilabgames.com'));
 assert.ok(names.includes('home-video-v1:test-preview.example'));
}finally{Date.now=realNow;}
await drain();
console.log('PASS homepage media: two independent cards, verified formats, background refresh, persistent last-known video during slow or failed upstream, no downgrade and retained client metadata.');
