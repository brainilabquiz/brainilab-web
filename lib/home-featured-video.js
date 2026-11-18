import {HOME_CHANNELS,channelCacheKey,latestChannelVideo,validChannelCache} from './youtube-channel.js';
import {isLongVideo,videoDescription,videoRecord} from './youtube-playlist.js';

const channel=HOME_CHANNELS.brainilab;
const storageKey='latest-video';
const internalUrl='https://home-video.internal/latest';
const minute=60_000;

function verifiedVideo(data){
 if(data?.channelId!==channel.id||!isLongVideo(data))return null;
 const video=videoRecord(data.id,data.title,data.published,null);
 return video?{...video,channelId:channel.id,channelUrl:channel.url,source:'youtube-api',
  description:videoDescription(data.description),durationSeconds:data.durationSeconds,checkedAt:data.checkedAt}:null;
}

function homeVideoStub(env,hostname){
 // Previews share the configured namespace but keep their own record.
 const namespace=env.LEARN_PAGES;
 return namespace?.get(namespace.idFromName('home-video-v1:'+hostname));
}

export class HomeFeaturedVideo {
 constructor(state,apiKey,fetcher){
  this.state=state;
  this.apiKey=apiKey;
  this.fetcher=fetcher;
 }
 async read(){
  const saved=await this.state.storage.get(storageKey);
  if(this.apiKey&&!(saved?.retryAt>Date.now()))this.state.waitUntil(this.refresh());
  return saved?.video||null;
 }
 refresh(){
  this.pending??=this.check().finally(()=>{this.pending=null;});
  return this.pending;
 }
 async check(){
  if(!this.apiKey)return;
  const storage=this.state.storage,saved=await storage.get(storageKey);
  if(saved?.retryAt>Date.now())return;
  // Write the next retry time before contacting YouTube, so a reset or
  // concurrent reader cannot fan out requests or erase the retained video.
  await storage.put(storageKey,{video:saved?.video??null,retryAt:Date.now()+5*minute});
  let candidate;
  try{candidate=await latestChannelVideo(this.apiKey,this.fetcher,'brainilab');}
  catch{return;}
  const checkedAt=Date.now(),video=verifiedVideo({...candidate,channelId:channel.id,checkedAt});
  if(!video||saved?.video&&Date.parse(video.published)<Date.parse(saved.video.published))return;
  await storage.put(storageKey,{video,retryAt:checkedAt+15*minute});
 }
}

export async function refreshHomeFeaturedVideo(env,hostname){
 await homeVideoStub(env,hostname)?.fetch(new Request(internalUrl,{method:'POST'}));
}

export async function readHomeFeaturedVideo(request,env,ctx,cache){
 const origin=new URL(request.url),key=new Request(new URL('/api/latest-video?channel=brainilab&stored=v1',origin));
 try{
  const cached=await cache.match(key);
  const video=cached&&verifiedVideo(await cached.json());
  if(video)return video;
 }catch{}
 try{
  const response=await homeVideoStub(env,origin.hostname)?.fetch(new Request(internalUrl,{signal:AbortSignal.timeout(500)}));
  const video=response?.ok&&verifiedVideo(await response.json());
  if(video){
   ctx.waitUntil(cache.put(key,Response.json(video,{headers:{'Cache-Control':'public, max-age=60'}})).catch(()=>{}));
   return video;
  }
 }catch{}
 // Reuse the pre-existing edge record during the first refresh, or if
 // the shared store itself is temporarily unreachable.
 try{
  const cached=await cache.match(channelCacheKey(request,'brainilab',env.YOUTUBE_API_KEY||''));
  const video=cached&&validChannelCache(await cached.json(),'brainilab');
  return video&&!video.unavailable?verifiedVideo(video):null;
 }catch{return null;}
}
