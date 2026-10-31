import {HOME_CHANNELS,channelCacheKey,validChannelCache,channelVideo} from './youtube-channel.js';
import {videoRecord,isLongVideo} from './youtube-playlist.js';
import {isKnowledgeShort,knowledgeShortsCacheKey,validKnowledgeShortsCache,knowledgeShortsVideo} from './youtube-shorts.js';
import {homeVideoCard} from './home-video-presentation.js';
// First paint reads only the edge cache. YouTube refreshes run in the background,
// so a slow upstream cannot hold up the Daily or the rest of the homepage.
export async function cachedHomeVideos(request,ctx,cache,fetcher=fetch,apiKey='',keys=Object.keys(HOME_CHANNELS),formats={}){
 const entries=await Promise.all([...new Set(keys)].filter(key=>Object.hasOwn(HOME_CHANNELS,key)).map(async key=>{
  const short=key==='knowledge'&&formats[key]==='short';let saved=null;
  try{const response=await cache.match(short?knowledgeShortsCacheKey(request):channelCacheKey(request,key,apiKey));const value=response?await response.json().catch(()=>null):null;saved=short?validKnowledgeShortsCache(value):validChannelCache(value,key);}catch{}
  ctx.waitUntil((short?knowledgeShortsVideo(request,ctx,cache,fetcher):channelVideo(request,ctx,cache,fetcher,apiKey,key)).catch(()=>null));
  return [key,saved&&!saved.unavailable?saved:null];
 }));return Object.fromEntries(entries);
}
export function renderHomeVideoCards(html,videos={}){
 return html.replace(/<(a|article)\b[^>]*\bdata-latest-video\b[^>]*>[\s\S]*?<\/\1>/g,original=>{
  const key=original.match(/\bdata-video-source=["'](knowledge|brainilab)["']/)?.[1],channel=HOME_CHANNELS[key],data=videos[key],short=/\bdata-video-format=["']short["']/.test(original);
  if(!channel||data?.channelId!==channel.id||(short?key!=='knowledge'||!isKnowledgeShort(data):data?.format==='short'||!isLongVideo(data)))return original;
  const video=videoRecord(data.id,data.title,data.published,null);if(!video)return original;if(short)video.url=data.url;
  if(Number.isFinite(data.durationSeconds)&&data.durationSeconds>0)video.durationSeconds=data.durationSeconds;
  const previous=Date.parse(original.match(/\bdata-video-published=["']([^"']+)["']/)?.[1]);
  if(Number.isFinite(previous)&&Date.parse(video.published)<previous)return original;
  return homeVideoCard(video,key,short);
 });
}
