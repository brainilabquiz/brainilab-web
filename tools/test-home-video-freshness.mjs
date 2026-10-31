import assert from 'node:assert/strict';
import {HOME_CHANNELS,parseChannelFeed,channelCacheKey,channelVideo} from '../lib/youtube-channel.js';
import {cachedHomeVideos,renderHomeVideoCards} from '../lib/home-video-cards.js';
import {latestVideo} from '../worker.js';
const request=new Request('https://brainilabgames.com/'),published=new Date(Date.now()-60000).toISOString();
const source='<header>Keep the Daily first</header>'+Object.keys(HOME_CHANNELS).map(key=>`<a data-latest-video data-video-source="${key}" data-video-published="2000-01-01T00:00:00Z"><b>Existing video</b></a>`).join('')+'<aside>Latest article</aside>';
const records=Object.fromEntries(Object.entries(HOME_CHANNELS).map(([key,c],i)=>[key,{id:i?'brainVid001':'knowVid0001',title:'A <tag> & "title"',published,channelId:c.id,checkedAt:Date.now(),source:'youtube-api',durationSeconds:600}]));
const saved=new Map(),pending=[],ctx={waitUntil:p=>pending.push(p)};
for(const key of Object.keys(records))saved.set(channelCacheKey(request,key).url,Response.json(records[key]));
const cache={match:async key=>saved.get(key.url)?.clone(),put:async(key,response)=>saved.set(key.url,response.clone())};
const data=await cachedHomeVideos(request,ctx,cache,()=>{throw Error('fresh cache must avoid upstream')});await Promise.all(pending);
const rendered=renderHomeVideoCards(source,data);
assert.match(rendered,/watch\?v=brainVid001/);assert.match(rendered,/watch\?v=knowVid0001/);assert(!rendered.includes('&list='));
assert.match(rendered,/A &lt;tag&gt; &amp; &quot;title&quot;/);assert(!rendered.includes('<tag>'));assert(rendered.startsWith('<header>'));assert(rendered.endsWith('<aside>Latest article</aside>'));
assert.equal(renderHomeVideoCards(source,{brainilab:{...records.brainilab,channelId:'foreign'}}).includes('brainVid001'),false);
assert.equal(renderHomeVideoCards(source,{brainilab:{...records.brainilab,published:'1999-01-01T00:00:00Z'}}),source);
assert.equal(renderHomeVideoCards(source,{brainilab:{...records.brainilab,published:'2999-01-01T00:00:00Z'}}),source);
// A cache miss refreshes after first paint; the homepage does not await YouTube.
const releases=[],background=[],emptyCache={match:async()=>null,put:async()=>{}};
const immediate=await cachedHomeVideos(request,{waitUntil:p=>background.push(p)},emptyCache,()=>new Promise(resolve=>releases.push(resolve)));
assert.deepEqual(immediate,{knowledge:null,brainilab:null});assert.equal(releases.length,0,'Without duration verification no feed request can promote a Short');
for(const resolve of releases)resolve(new Response('unavailable',{status:503}));await Promise.all(background);
const failed=await cachedHomeVideos(request,{waitUntil:p=>background.push(p)},{match:async()=>{throw Error('cache unavailable')}},()=>{throw Error('upstream unavailable')});
assert.deepEqual(failed,{knowledge:null,brainilab:null});await Promise.all(background);
for(const key of Object.keys(HOME_CHANNELS)){
 const owner=HOME_CHANNELS[key].id;
 const feed=`<feed><yt:channelId>${owner}</yt:channelId><entry><yt:channelId>${owner}</yt:channelId><yt:videoId>newerVid002</yt:videoId><title>Newest</title><published>${published}</published></entry></feed>`;
 assert.equal(parseChannelFeed(feed,key).id,'newerVid002');assert.throws(()=>parseChannelFeed(feed,key==='knowledge'?'brainilab':'knowledge'));
}
const channel=HOME_CHANNELS.brainilab.id,uploads='UU'+channel.slice(2),calls=[];
const fetcher=async address=>{
 const url=new URL(address);calls.push(url.pathname);
 if(url.pathname.endsWith('/channels')){assert.equal(url.searchParams.get('id'),channel);return Response.json({items:[{id:channel,contentDetails:{relatedPlaylists:{uploads}}}]});}
 if(url.pathname.endsWith('/videos'))return Response.json({items:[{id:'brainVid001',snippet:{channelId:channel,title:'Latest channel upload',publishedAt:published,liveBroadcastContent:'none'},contentDetails:{duration:'PT10M'},status:{privacyStatus:'public'}}]});
 assert.equal(url.searchParams.get('playlistId'),uploads);
 return Response.json({items:[{snippet:{playlistId:uploads,videoOwnerChannelId:channel,title:'Latest channel upload',resourceId:{kind:'youtube#video',videoId:'brainVid001'}},contentDetails:{videoId:'brainVid001',videoPublishedAt:published},status:{privacyStatus:'public'}}]});
};
const response=await latestVideo(new Request('https://brainilabgames.com/api/latest-video?channel=brainilab&channel_id=foreign'),ctx,emptyCache,fetcher,'fixture-only');
const body=await response.json();assert.equal(body.channelId,channel);assert.equal(body.id,'brainVid001');assert.equal(body.url,'https://www.youtube.com/watch?v=brainVid001');assert.equal(calls.length,3);
assert.equal((await latestVideo(new Request('https://brainilabgames.com/api/latest-video?channel=foreign'),ctx,emptyCache,()=>{throw Error('must not fetch')})).status,400);
console.log('PASS home videos: both official uploads channels, current cached first paint, background-only refresh, safe text/dates/owners, cache failure fallback and independent direct links.');

const selectedReads=[],selectedPending=[];
const selectedData=await cachedHomeVideos(request,{waitUntil:p=>selectedPending.push(p)},{match:async key=>{selectedReads.push(key.url);return saved.get(key.url)?.clone();},put:cache.put},()=>{throw Error('fresh cache')},'',['knowledge']);
await Promise.all(selectedPending);assert.deepEqual(Object.keys(selectedData),['knowledge']);assert.equal(selectedPending.length,1);assert.ok(selectedReads.every(url=>url.includes('channel=knowledge')),'The single-card homepage never refreshes the other channel');
