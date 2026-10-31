import {HOME_CHANNELS} from './youtube-channel.js';
import {videoRecord} from './youtube-playlist.js';
import {boundedText} from './public-json.js';

// Verified against YouTube's public Shorts tab and its own Shorts-only playlist.
// Duration alone cannot distinguish a Short from an ordinary short video.
export const KNOWLEDGE_SHORTS_PLAYLIST='UUSHcqUq1aWcDoKyGT9QYCPqIA';
const channel=HOME_CHANNELS.knowledge,FRESH_MS=15*60000,MAX_STALE_MS=7*86400000;
const identity={channelId:channel.id,channelUrl:channel.url,format:'short',shortsPlaylistId:KNOWLEDGE_SHORTS_PLAYLIST,source:'youtube-shorts-feed'};
const json=(value,status=200,maxAge=60)=>Response.json(value,{status,headers:{'Cache-Control':'public, max-age='+maxAge,'X-Content-Type-Options':'nosniff'}});
const decode=value=>value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi,(_,entity)=>{
 if(entity[0]==='#'){const n=entity[1].toLowerCase()==='x'?parseInt(entity.slice(2),16):parseInt(entity.slice(1),10);return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';}
 return {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"}[entity.toLowerCase()];
});
export function isKnowledgeShort(video){
 return video?.channelId===channel.id&&video?.format==='short'&&video?.shortsPlaylistId===KNOWLEDGE_SHORTS_PLAYLIST&&video?.source==='youtube-shorts-feed'&&videoRecord(video.id,video.title,video.published,null)&&video.url==='https://www.youtube.com/shorts/'+video.id;
}
export function parseKnowledgeShortsFeed(xml){
 if(typeof xml!=='string'||xml.length>500000||/<!DOCTYPE|<!ENTITY/i.test(xml))throw Error('Invalid Shorts feed');
 const root=xml.split(/<entry\b/)[0],tag=(text,name)=>text.match(new RegExp('<'+name+'[^>]*>([\\s\\S]*?)<\\/'+name+'>'))?.[1]?.trim();
 if(tag(root,'yt:playlistId')!==KNOWLEDGE_SHORTS_PLAYLIST||tag(root,'yt:channelId')!==channel.id)throw Error('Unexpected Shorts source');
 const entries=[...xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/g)];if(entries.length>50)throw Error('Oversized Shorts feed');
 const videos=entries.flatMap(([,entry])=>{
  const id=tag(entry,'yt:videoId'),video=videoRecord(id,decode(tag(entry,'title')||''),tag(entry,'published'),null);
  const link=[...entry.matchAll(/<link\b[^>]*>/g)].find(m=>/\brel=["']alternate["']/.test(m[0]))?.[0],href=link?.match(/\bhref=["']([^"']+)["']/)?.[1];
  return video&&tag(entry,'yt:channelId')===channel.id&&href==='https://www.youtube.com/shorts/'+id?[{...video,...identity,url:href}]:[];
 }).sort((a,b)=>Date.parse(b.published)-Date.parse(a.published)||a.id.localeCompare(b.id));
 if(!videos.length)throw Error('No verified public Shorts');return videos[0];
}
export function knowledgeShortsCacheKey(request){return new Request(new URL('/api/latest-video?channel=knowledge&format=short&source=youtube-shorts-feed&v=1',request.url));}
export function validKnowledgeShortsCache(saved){
 const age=Date.now()-saved?.checkedAt;
 return saved?.channelId===channel.id&&saved?.format==='short'&&saved?.shortsPlaylistId===KNOWLEDGE_SHORTS_PLAYLIST&&saved?.source==='youtube-shorts-feed'&&Number.isFinite(age)&&age>=0&&age<=MAX_STALE_MS&&(saved.unavailable||isKnowledgeShort(saved))?saved:null;
}
export async function knowledgeShortsVideo(request,ctx,cache,fetcher=fetch){
 const key=knowledgeShortsCacheKey(request);let saved=null;
 try{const response=await cache.match(key);saved=validKnowledgeShortsCache(response?await response.json().catch(()=>null):null);}catch{}
 if(saved&&(saved.retryAt>Date.now()||!saved.stale&&Date.now()-saved.checkedAt<FRESH_MS))return json(saved,saved.unavailable&&saved.stale?503:200);
 try{
  const response=await fetcher('https://www.youtube.com/feeds/videos.xml?playlist_id='+KNOWLEDGE_SHORTS_PLAYLIST,{signal:AbortSignal.timeout(7000),redirect:'manual',headers:{Accept:'application/atom+xml'}});
  if(!response.ok)throw Error('Shorts feed unavailable');
  const video=parseKnowledgeShortsFeed(await boundedText(response,500000)),data={...video,checkedAt:Date.now(),stale:false};
  ctx.waitUntil(cache.put(key,json(data,200,7*86400)).catch(()=>null));return json(data);
 }catch{
  const data={...(saved||{...identity,checkedAt:Date.now(),unavailable:true}),stale:true,retryAt:Date.now()+60000};
  ctx.waitUntil(cache.put(key,json(data,200,7*86400)).catch(()=>null));return json(data,data.unavailable?503:200);
 }
}
