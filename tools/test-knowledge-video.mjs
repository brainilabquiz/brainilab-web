import assert from 'node:assert/strict';
import {parseKnowledgeFeed,latestKnowledgeVideo,knowledgeVideo,KNOWLEDGE_CHANNEL as channel} from '../lib/youtube-knowledge.js';
import {latestVideo} from '../worker.js';
const uploads='UU'+channel.slice(2),secret='fixture-only-not-a-credential';
const entry=(id,date,owner=channel)=>`<entry><yt:videoId>${id}</yt:videoId><yt:channelId>${owner}</yt:channelId><title>A &amp; B</title><published>${date}</published></entry>`;
const feed=root=>`<feed><yt:channelId>${root}</yt:channelId>${entry('olderVid001','2026-09-01T00:00:00Z')}${entry('newerVid002','2026-09-02T00:00:00Z')}${entry('future00001','2999-01-01T00:00:00Z')}${entry('foreign0001','2026-09-03T00:00:00Z','foreign')}</feed>`;
for(const root of [channel,channel.slice(2)]){assert.equal(parseKnowledgeFeed(feed(root)).id,'newerVid002');assert.equal(parseKnowledgeFeed(feed(root)).title,'A & B');assert.ok(!parseKnowledgeFeed(feed(root)).url.includes('list='));}
assert.throws(()=>parseKnowledgeFeed(feed('another-channel')),/Unexpected channel/);
assert.throws(()=>parseKnowledgeFeed('<html>failure</html>'));
const item=(id,date,privacy='public',owner=channel)=>({snippet:{playlistId:uploads,videoOwnerChannelId:owner,title:id,resourceId:{kind:'youtube#video',videoId:id},publishedAt:'2026-10-01T00:00:00Z'},contentDetails:{videoId:id,videoPublishedAt:date},status:{privacyStatus:privacy}});
const calls=[];
const api=async(address,options)=>{
 const u=new URL(address);calls.push(u);assert.equal(u.origin,'https://www.googleapis.com');assert.equal(u.searchParams.get('key'),secret);assert.equal(options.redirect,'manual');assert.ok(options.signal);
 if(u.pathname.endsWith('/channels')){assert.equal(u.searchParams.get('id'),channel);return Response.json({items:[{id:channel,contentDetails:{relatedPlaylists:{uploads}}}]});}
 assert.equal(u.pathname,'/youtube/v3/playlistItems');assert.equal(u.searchParams.get('playlistId'),uploads);
 return Response.json(u.searchParams.has('pageToken')?{items:[item('newerVid002','2026-09-20T00:00:00Z')]}:{items:[item('olderVid001','2026-09-01T00:00:00Z'),item('private0001','2026-09-23T00:00:00Z','private'),item('unlisted001','2026-09-23T00:00:00Z','unlisted'),item('foreign0001','2026-09-23T00:00:00Z','public','other'),item('future00001','2999-01-01T00:00:00Z')],nextPageToken:'second'});
};
assert.equal((await latestKnowledgeVideo(secret,api)).id,'newerVid002');assert.equal(calls.length,3);
for(const items of [[],[{id:'wrong'}],[{id:channel,contentDetails:{relatedPlaylists:{uploads:'arbitrary'}}}]])await assert.rejects(latestKnowledgeVideo(secret,async()=>Response.json({items})));
const saved=new Map(),pending=[],ctx={waitUntil:p=>pending.push(p)},cache={match:async key=>saved.get(key.url)?.clone(),put:async(key,response)=>saved.set(key.url,response.clone())};
const req=new Request('https://brainilabgames.com/api/latest-video?channel=knowledge&playlist=not-forwarded');
let response=await latestVideo(req,ctx,cache,api,secret);await Promise.all(pending);let data=await response.json();assert.equal(data.channelId,channel);assert.equal(data.id,'newerVid002');assert.ok(!JSON.stringify(data).includes(secret));
assert.equal(saved.size,1);const key=[...saved.keys()][0];assert.ok(!key.includes(secret));assert.match(saved.get(key).headers.get('cache-control'),/max-age=604800/);
const before=calls.length;await latestVideo(req,ctx,cache,api,secret);assert.equal(calls.length,before,'fresh cache avoids upstream calls');
data.checkedAt=Date.now()-20*60000;saved.set(key,Response.json(data));let failures=0;
const fail=async()=>{failures++;throw Error('sensitive upstream '+secret)};
response=await knowledgeVideo(req,ctx,cache,fail,secret);await Promise.all(pending);let stale=await response.json();assert.equal(stale.stale,true);assert.equal(stale.id,data.id);assert.equal(stale.checkedAt,data.checkedAt);assert.ok(!JSON.stringify(stale).includes(secret));
await knowledgeVideo(req,ctx,cache,fail,secret);assert.equal(failures,1,'backoff avoids repeated failures');
saved.set(key,Response.json({...data,checkedAt:Date.now()-8*86400000}));response=await knowledgeVideo(req,ctx,cache,fail,secret);assert.equal(response.status,503);assert.equal((await response.json()).id,undefined);
saved.clear();response=await knowledgeVideo(req,ctx,cache,async address=>{assert.equal(address,'https://www.youtube.com/feeds/videos.xml?channel_id='+channel);return new Response(feed(channel.slice(2)));});assert.equal((await response.json()).id,'newerVid002');
response=await latestVideo(new Request('https://brainilabgames.com/api/latest-video?channel=untrusted'),ctx,cache,()=>{throw Error('must not fetch')},secret);assert.equal(response.status,400);
console.log('PASS Knowledge: fixed ownership, uploads pagination, public-only/actual publication, feed ID variants, separate cache, expiry/backoff and no secret leakage.');
