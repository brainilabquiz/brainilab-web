import {latestPlaylistVideo,videoRecord,CHANNEL} from './youtube-playlist.js';

export const HOME_CHANNELS=Object.freeze({
 knowledge:Object.freeze({id:'UCcqUq1aWcDoKyGT9QYCPqIA',name:'BrainiLab Knowledge',url:'https://www.youtube.com/@BrainiLabKnowledge'}),
 brainilab:Object.freeze({id:CHANNEL,name:'BrainiLab',url:'https://www.youtube.com/@BrainiLab'})
});
const FRESH_MS=15*60*1000,MAX_STALE_MS=7*86400000;
const selected=key=>Object.hasOwn(HOME_CHANNELS,key)?HOME_CHANNELS[key]:null;
const json=(body,status=200,maxAge=60)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age='+maxAge,'X-Content-Type-Options':'nosniff'}});
const decode=value=>value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi,(_,entity)=>{
 if(entity[0]==='#'){const n=entity[1].toLowerCase()==='x'?parseInt(entity.slice(2),16):parseInt(entity.slice(1),10);return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';}
 return {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"}[entity.toLowerCase()];
});
export function parseChannelFeed(xml,key){
 const channel=selected(key);if(!channel||typeof xml!=='string'||xml.length>500000)throw Error('Unexpected channel');
 const rootId=xml.split(/<entry\b/)[0].match(/<yt:channelId>([^<]+)<\/yt:channelId>/)?.[1]?.trim();
 if(rootId!==channel.id&&rootId!==channel.id.slice(2))throw Error('Unexpected channel');
 const videos=[...xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/g)].map(([,entry])=>{
  const tag=name=>entry.match(new RegExp('<'+name+'[^>]*>([\\s\\S]*?)<\\/'+name+'>'))?.[1];
  return tag('yt:channelId')===channel.id?videoRecord(tag('yt:videoId'),decode(tag('title')||''),tag('published'),null):null;
 }).filter(Boolean).sort((a,b)=>Date.parse(b.published)-Date.parse(a.published)||a.id.localeCompare(b.id));
 if(!videos.length)throw Error('No public channel videos');return videos[0];
}
export async function latestChannelVideo(apiKey,fetcher=fetch,key='knowledge'){
 const channel=selected(key);if(!channel)throw Error('Unexpected channel');
 const signal=AbortSignal.timeout(7000),url=new URL('https://www.googleapis.com/youtube/v3/channels');
 url.search=new URLSearchParams({part:'contentDetails',id:channel.id,key:apiKey});
 const response=await fetcher(url.toString(),{signal,redirect:'manual',headers:{Accept:'application/json'}});
 if(!response.ok){const error=Error('Video service unavailable');error.videoStatus=response.status;throw error;}
 const body=await response.text();if(body.length>500000)throw Error('Video response too large');
 const items=JSON.parse(body)?.items;
 if(!Array.isArray(items)||items.length!==1||items[0]?.id!==channel.id)throw Error('Unexpected channel');
 const playlistId=items[0]?.contentDetails?.relatedPlaylists?.uploads;
 if(typeof playlistId!=='string'||!/^UU[-\w]{22}$/.test(playlistId))throw Error('Invalid uploads playlist');
 return latestPlaylistVideo(apiKey,fetcher,{playlistId,channelId:channel.id,standalone:true,signal});
}
export function channelCacheKey(request,key,apiKey=''){
 if(!selected(key))throw Error('Unexpected channel');
 return new Request(new URL('/api/latest-video?channel='+key+'&source='+(apiKey?'youtube-api':'youtube-feed')+'&v=1',request.url));
}
export function validChannelCache(saved,key){
 const channel=selected(key),age=Date.now()-saved?.checkedAt;
 return channel&&saved?.channelId===channel.id&&Number.isFinite(age)&&age>=0&&age<=MAX_STALE_MS&&(saved.unavailable||videoRecord(saved.id,saved.title,saved.published,null))?saved:null;
}
export async function channelVideo(request,ctx,cache,fetcher=fetch,apiKey='',key='knowledge'){
 const channel=selected(key);if(!channel)return json({error:'Unknown channel'},400,0);
 const source=apiKey?'youtube-api':'youtube-feed',identity={channelId:channel.id,channelUrl:channel.url},cacheKey=channelCacheKey(request,key,apiKey);
 const cached=await cache.match(cacheKey);let saved=validChannelCache(cached?await cached.json().catch(()=>null):null,key);
 const age=Date.now()-saved?.checkedAt;
 if(saved&&(saved.retryAt>Date.now()||!saved.stale&&age<FRESH_MS))return json(saved,saved.unavailable&&saved.stale?503:200);
 try{
  let video;
  if(apiKey)video=await latestChannelVideo(apiKey,fetcher,key);
  else{
   const response=await fetcher('https://www.youtube.com/feeds/videos.xml?channel_id='+channel.id,{signal:AbortSignal.timeout(7000),redirect:'manual',headers:{Accept:'application/atom+xml'}});
   if(!response.ok)throw Error('Feed unavailable');video=parseChannelFeed(await response.text(),key);
  }
  const data={...(video||{unavailable:true}),...identity,source,checkedAt:Date.now(),stale:false};
  ctx.waitUntil(cache.put(cacheKey,json(data,200,7*86400)));return json(data);
 }catch(error){
  const known={'Unexpected channel':'channel-mismatch','Invalid uploads playlist':'uploads-missing','Unexpected playlist':'playlist-mismatch','Video response too large':'oversized-response','Invalid video response':'invalid-response','Invalid video pagination':'invalid-pagination','Video playlist exceeds scan limit':'scan-limit'};
  const reasons=new Set(['accessNotConfigured','quotaExceeded','dailyLimitExceeded','keyInvalid','forbidden','playlistNotFound','ipRefererBlocked','API_KEY_INVALID','API_KEY_SERVICE_BLOCKED','upstream']);
  const reason=reasons.has(error?.videoReason)?error.videoReason:known[error?.message]||(error?.name==='TimeoutError'?'timeout':error?.name==='SyntaxError'?'invalid-json':'unavailable');
  const data={...(saved||{...identity,source,checkedAt:Date.now(),unavailable:true}),stale:true,retryAt:Date.now()+60000,serviceStatus:Number(error?.videoStatus)||null,serviceReason:reason};
  ctx.waitUntil(cache.put(cacheKey,json(data,200,7*86400)));return json(data,data.unavailable?503:200);
 }
}
