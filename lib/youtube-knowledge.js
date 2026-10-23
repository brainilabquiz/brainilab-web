import {latestPlaylistVideo,videoRecord} from './youtube-playlist.js';

export const KNOWLEDGE_CHANNEL='UCcqUq1aWcDoKyGT9QYCPqIA';
export const KNOWLEDGE_URL='https://www.youtube.com/@BrainiLabKnowledge';
const FRESH_MS=15*60*1000,MAX_STALE_MS=7*86400000;
const identity={channelId:KNOWLEDGE_CHANNEL,channelUrl:KNOWLEDGE_URL};
const json=(body,status=200,maxAge=60)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age='+maxAge,'X-Content-Type-Options':'nosniff'}});
const decode=value=>value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi,(_,entity)=>{
 if(entity[0]==='#'){const n=entity[1].toLowerCase()==='x'?parseInt(entity.slice(2),16):parseInt(entity.slice(1),10);return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';}
 return {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"}[entity.toLowerCase()];
});

export function parseKnowledgeFeed(xml){
 if(typeof xml!=='string'||xml.length>500000)throw Error('Unexpected channel');
 const rootId=xml.split(/<entry\b/)[0].match(/<yt:channelId>([^<]+)<\/yt:channelId>/)?.[1]?.trim();
 // YouTube's channel-feed root can omit "UC"; entry owners retain the full ID.
 if(rootId!==KNOWLEDGE_CHANNEL&&rootId!==KNOWLEDGE_CHANNEL.slice(2))throw Error('Unexpected channel');
 const videos=[...xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/g)].map(([,entry])=>{
  const tag=name=>entry.match(new RegExp('<'+name+'[^>]*>([\\s\\S]*?)<\\/'+name+'>'))?.[1];
  return tag('yt:channelId')===KNOWLEDGE_CHANNEL?videoRecord(tag('yt:videoId'),decode(tag('title')||''),tag('published'),null):null;
 }).filter(Boolean).sort((a,b)=>Date.parse(b.published)-Date.parse(a.published)||a.id.localeCompare(b.id));
 if(!videos.length)throw Error('No public channel videos');
 return videos[0];
}

export async function latestKnowledgeVideo(apiKey,fetcher=fetch){
 const signal=AbortSignal.timeout(7000),url=new URL('https://www.googleapis.com/youtube/v3/channels');
 url.search=new URLSearchParams({part:'contentDetails',id:KNOWLEDGE_CHANNEL,key:apiKey});
 const response=await fetcher(url.toString(),{signal,redirect:'manual',headers:{Accept:'application/json'}});
 if(!response.ok){const error=Error('Video service unavailable');error.videoStatus=response.status;throw error;}
 const body=await response.text();if(body.length>500000)throw Error('Video response too large');
 const items=JSON.parse(body)?.items;
 if(!Array.isArray(items)||items.length!==1||items[0]?.id!==KNOWLEDGE_CHANNEL)throw Error('Unexpected channel');
 const playlistId=items[0]?.contentDetails?.relatedPlaylists?.uploads;
 if(typeof playlistId!=='string'||!/^UU[-\w]{22}$/.test(playlistId))throw Error('Invalid uploads playlist');
 return latestPlaylistVideo(apiKey,fetcher,{playlistId,channelId:KNOWLEDGE_CHANNEL,standalone:true,signal});
}

export async function knowledgeVideo(request,ctx,cache,fetcher=fetch,apiKey=''){
 const source=apiKey?'youtube-api':'youtube-feed';
 const key=new Request(new URL('/api/latest-video?channel=knowledge&source='+source+'&v=1',request.url));
 const cached=await cache.match(key);let saved=cached?await cached.json().catch(()=>null):null;
 const age=Date.now()-saved?.checkedAt;
 if(!saved||saved.channelId!==KNOWLEDGE_CHANNEL||!Number.isFinite(age)||age<0||age>MAX_STALE_MS||(!saved.unavailable&&!videoRecord(saved.id,saved.title,saved.published,null)))saved=null;
 if(saved&&(saved.retryAt>Date.now()||!saved.stale&&age<FRESH_MS))return json(saved,saved.unavailable&&saved.stale?503:200);
 try{
  let video;
  if(apiKey)video=await latestKnowledgeVideo(apiKey,fetcher);
  else{
   const response=await fetcher('https://www.youtube.com/feeds/videos.xml?channel_id='+KNOWLEDGE_CHANNEL,{signal:AbortSignal.timeout(7000),redirect:'manual',headers:{Accept:'application/atom+xml'}});
   if(!response.ok)throw Error('Feed unavailable');video=parseKnowledgeFeed(await response.text());
  }
  const data={...(video||{unavailable:true}),...identity,source,checkedAt:Date.now(),stale:false};
  ctx.waitUntil(cache.put(key,json(data,200,7*86400)));return json(data);
 }catch(error){
  const known={'Unexpected channel':'channel-mismatch','Invalid uploads playlist':'uploads-missing','Unexpected playlist':'playlist-mismatch','Video response too large':'oversized-response','Invalid video response':'invalid-response','Invalid video pagination':'invalid-pagination','Video playlist exceeds scan limit':'scan-limit'};
  const reasons=new Set(['accessNotConfigured','quotaExceeded','dailyLimitExceeded','keyInvalid','forbidden','playlistNotFound','ipRefererBlocked','API_KEY_INVALID','API_KEY_SERVICE_BLOCKED','upstream']);
  const reason=reasons.has(error?.videoReason)?error.videoReason:known[error?.message]||(error?.name==='TimeoutError'?'timeout':error?.name==='SyntaxError'?'invalid-json':'unavailable');
  const data={...(saved||{...identity,source,checkedAt:Date.now(),unavailable:true}),stale:true,retryAt:Date.now()+60000,serviceStatus:Number(error?.videoStatus)||null,serviceReason:reason};
  ctx.waitUntil(cache.put(key,json(data,200,7*86400)));return json(data,data.unavailable?503:200);
 }
}
