import {HOME_CHANNELS,channelCacheKey,validChannelCache,channelVideo} from './youtube-channel.js';
import {videoRecord,isLongVideo} from './youtube-playlist.js';
import {isKnowledgeShort,knowledgeShortsCacheKey,validKnowledgeShortsCache,knowledgeShortsVideo} from './youtube-shorts.js';
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
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
 return html.replace(/<a\b[^>]*\bdata-latest-video\b[^>]*>[\s\S]*?<\/a>/g,original=>{
  const key=original.match(/\bdata-video-source=["'](knowledge|brainilab)["']/)?.[1],channel=HOME_CHANNELS[key],data=videos[key],short=/\bdata-video-format=["']short["']/.test(original);
  if(!channel||data?.channelId!==channel.id||(short?key!=='knowledge'||!isKnowledgeShort(data):data?.format==='short'||!isLongVideo(data)))return original;
  const video=videoRecord(data.id,data.title,data.published,null);if(!video)return original;if(short)video.url=data.url;
  const previous=Date.parse(original.match(/\bdata-video-published=["']([^"']+)["']/)?.[1]);
  if(Number.isFinite(previous)&&Date.parse(video.published)<previous)return original;
  return `<a class="home-video has-video" data-latest-video data-video-source="${key}" data-video-format="${short?'short':'long'}" data-video-id="${video.id}" data-video-published="${esc(video.published)}" href="${video.url}" target="_blank" rel="noopener noreferrer" title="${esc(video.title)}" aria-label="Watch ${esc(video.title)} on ${channel.name} (opens in a new tab)"><span class="home-video-image"><img src="/api/youtube-thumbnail/${video.id}?v=2" alt="" width="480" height="270" loading="lazy" decoding="async" fetchpriority="low"/><span aria-hidden="true" class="video-play">▶</span></span><span class="home-video-copy"><span class="video-label" data-video-label>${channel.name}${short?' · Short':''}</span><strong data-video-title>${esc(video.title)}</strong><span class="video-action">${short?'Watch Short':'Watch'} on YouTube <span aria-hidden="true">↗</span></span></span></a>`;
 });
}
