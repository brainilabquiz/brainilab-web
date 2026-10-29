import {channelVideo} from './lib/youtube-channel.js';
import {cachedHomeVideos,renderHomeVideoCards} from './lib/home-video-cards.js';
import {servePublicLearn,learnRelatedVideo} from './lib/learn-store.js';
import {HEALTH_CRON,scheduledHealth,healthStatus} from './lib/site-health.js';
import {productionRequest} from './lib/production-origin.js';
import {crypticAPI} from './lib/cryptic-api.js';
import {HALLOWEEN,halloweenState,halloweenPublicConfig,isHalloweenPath,hiddenHalloweenArticle} from './lib/halloween-event.js';
import {decorateHalloween,renderHalloweenPage} from './lib/halloween-render.js';
import {renderNews,renderEmptyNews,freshNews,newsEditionRevision,newsHead} from './lib/breaking-news.js';
import {newsEdition} from './lib/news-refresh.js';
import {selectNewsEdition} from './lib/news-first-edition.js';
export {BreakingNewsStore} from './lib/public-page-store.js';
import {VIDEO_GAMES,cleanVideo} from './lib/video-card.js';
import {adminVideoInfo} from './lib/video-admin.js';
import {CHANNEL,PLAYLIST,PLAYLIST_URL,latestPlaylistVideo,videoRecord} from './lib/youtube-playlist.js';
// Fixed public playlist only. No visitor data, credentials or user-supplied upstream URLs.
// Retired public pages and their replacements. The static stubs stay as a fallback.
export const LEGACY_PAGES=Object.freeze({'/games/flag-dash/':'/geography/world-flags-quiz/','/games/map-hunt/':'/games/topic-rush/','/categories/':'/games/','/leaderboards/':'/rankings/','/profile/plus/':'/plus/'});
const FRESH_MS=15*60*1000;
const MAX_STALE_MS=7*86400000;
const decodeXML=value=>value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi,(_,entity)=>{
  if(entity[0]==='#'){
    const n=entity[1].toLowerCase()==='x'?parseInt(entity.slice(2),16):parseInt(entity.slice(1),10);
    return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';
  }
  return {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"}[entity.toLowerCase()];
});
export function parseFeed(xml){
  if(!xml.includes('<yt:playlistId>'+PLAYLIST+'</yt:playlistId>'))throw new Error('Unexpected playlist');
  const entries=[...xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/g)].map(([,entry])=>{
    const tag=name=>entry.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`))?.[1];
    const id=tag('yt:videoId'),channel=tag('yt:channelId'),title=decodeXML(tag('title')||'').trim(),published=tag('published');
    return channel===CHANNEL?videoRecord(id,title,published):null;
  }).filter(Boolean).sort((a,b)=>Date.parse(b.published)-Date.parse(a.published));
  if(!entries.length)throw new Error('No public channel videos');
  return entries[0];
}
function json(body,status=200,maxAge=60){return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':`public, max-age=${maxAge}`,'X-Content-Type-Options':'nosniff'}});}
export async function latestVideo(request,ctx,cache,fetcher=fetch,apiKey=''){
  const url=new URL(request.url),channel=url.pathname==='/api/latest-video'?url.searchParams.get('channel'):null;
  if(channel!==null)return ['knowledge','brainilab'].includes(channel)?channelVideo(request,ctx,cache,fetcher,apiKey,channel):json({error:'Unknown channel'},400,0);
  const source=apiKey?'youtube-api':'youtube-feed';
  const key=new Request(new URL('/api/latest-video?playlist='+PLAYLIST+'&source='+source+'&v=2',request.url));
  const cached=await cache.match(key);
  let saved=cached?await cached.json().catch(()=>null):null;
  const age=Date.now()-saved?.checkedAt;
  if(!saved||saved.playlistId!==PLAYLIST||!Number.isFinite(age)||age<0||age>MAX_STALE_MS)saved=null;
  if(saved&&(saved.retryAt>Date.now()||!saved.stale&&age<FRESH_MS))return json(saved,saved.unavailable&&saved.stale?503:200,60);
  try{
    let video;
    if(apiKey)video=await latestPlaylistVideo(apiKey,fetcher);
    else{
      const response=await fetcher('https://www.youtube.com/feeds/videos.xml?playlist_id='+PLAYLIST,{signal:AbortSignal.timeout(7000),headers:{Accept:'application/atom+xml'}});
      if(!response.ok)throw new Error('Feed unavailable');
      const xml=await response.text();
      if(xml.length>500000)throw new Error('Oversized feed');
      video=parseFeed(xml);
    }
    const data={...(video||{unavailable:true}),playlistId:PLAYLIST,playlistUrl:PLAYLIST_URL,source,checkedAt:Date.now(),stale:false};
    ctx.waitUntil(cache.put(key,json(data,200,7*86400)));
    return json(data,200,60);
  }catch(error){
    // Only allowlisted operational codes, never upstream bodies, URLs or credentials.
    const known=new Map([['Unexpected playlist','playlist-mismatch'],['Video response too large','oversized-response'],['Invalid video response','invalid-response'],['Invalid video pagination','invalid-pagination'],['Video playlist exceeds scan limit','scan-limit']]);
    const reason=error?.videoReason||known.get(error?.message)||(error?.name==='TimeoutError'?'timeout':error?.name==='SyntaxError'?'invalid-json':error?.name==='TypeError'?'runtime-type-error':'unavailable');
    const data={...(saved||{playlistId:PLAYLIST,playlistUrl:PLAYLIST_URL,source,checkedAt:Date.now(),unavailable:true}),stale:true,retryAt:Date.now()+60000,serviceStatus:Number(error?.videoStatus)||null,serviceReason:reason};
    // Back off on failures too; keep the original checkedAt so stale data expires.
    ctx.waitUntil(cache.put(key,json(data,200,7*86400)));
    return json(data,data.unavailable?503:200,60);
  }
}
export default {
  async scheduled(event,env,ctx){
    if(event.cron===HEALTH_CRON){ctx.waitUntil(scheduledHealth(env));return;}
    if(event.cron!=='0 */12 * * *')return;
    if(!env.BREAKING_NEWS)return;
    const store=env.BREAKING_NEWS.get(env.BREAKING_NEWS.idFromName('world-news-v1'));
    ctx.waitUntil(store.fetch('https://news.internal/refresh',{method:'POST'}));
  },
  async fetch(request,env,ctx){
    request=productionRequest(request);
    const url=new URL(request.url);
    if(url.pathname==='/api/cryptic')return crypticAPI(request);
    if(url.pathname==='/api/site-health'){
      if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{Allow:'GET, HEAD'}});
      const result=await healthStatus(env);return request.method==='HEAD'?new Response(null,{status:result.status,headers:result.headers}):result;
    }
    // Retired pages move permanently, so search engines pass their signals on
    // instead of indexing a JavaScript redirect that answers 200.
    const legacy=LEGACY_PAGES[url.pathname.replace(/\/index\.html$/,'/').replace(/\/?$/,'/')];
    if(legacy&&['GET','HEAD'].includes(request.method)){const target=new URL(legacy,url);target.search=url.search;return Response.redirect(target.href,301);}
    const holiday=halloweenState();
    // The seasonal HTML differs from the underlying asset. An old document's
    // conditional validator must not turn its new navigation into a 304.
    if(holiday.active&&['GET','HEAD'].includes(request.method)
       &&!url.pathname.startsWith('/assets/')&&!url.pathname.startsWith('/api/')
       &&(!/\.[^/]+$/.test(url.pathname)||url.pathname.endsWith('.html'))){
      const headers=new Headers(request.headers);
      headers.delete('If-None-Match');headers.delete('If-Modified-Since');
      request=new Request(request,{headers});
    }
    if(url.pathname==='/api/halloween/config'){
      if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{Allow:'GET, HEAD'}});
      return new Response(request.method==='HEAD'?null:JSON.stringify(halloweenPublicConfig(holiday)),{headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
    }
    if(hiddenHalloweenArticle(url.pathname)&&(!HALLOWEEN.enabled||Date.now()<Date.parse(HALLOWEEN.start))||isHalloweenPath(url.pathname)&&(!HALLOWEEN.enabled||Date.now()<Date.parse(HALLOWEEN.start))){
      return new Response('Not found',{status:404,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex','Content-Type':'text/plain; charset=utf-8'}});
    }
    if(isHalloweenPath(url.pathname)){
      if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{Allow:'GET, HEAD'}});
      const normal=url.pathname.replace(/\/index\.html$/,'/').replace(/\/?$/,'/');
      const match=normal.match(/^\/halloween\/(?:(trick-or-think|spooky-connections)\/)?$/);
      if(!match)return new Response('Not found',{status:404,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex'}});
      if(normal!==url.pathname){const canonical=new URL(url);canonical.pathname=normal;return Response.redirect(canonical,308);}
      const template=await (await env.ASSETS.fetch(new Request(new URL('/learn/index.html',url)))).text();
      return new Response(request.method==='HEAD'?null:renderHalloweenPage(template,holiday,holiday.status==='closed'?null:match[1]),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'strict-origin-when-cross-origin'}});
    }
    if(['/breaking-news/','/breaking-news/index.html','/breaking-news'].includes(url.pathname)){
      if(request.method!=='GET'&&request.method!=='HEAD')return new Response('Method not allowed',{status:405});
      const response=await env.ASSETS.fetch(new Request(new URL('/breaking-news/',url),request));
      if(request.method==='HEAD')return response;
      const edition=url.hostname==='brainilabgames.com'?selectNewsEdition(await newsEdition(env)):null;
      const html=await response.text(),headers=new Headers(response.headers);headers.delete('Content-Length');headers.delete('ETag');headers.delete('Last-Modified');
      const news=renderNews(edition);
      headers.set('Cache-Control',news?'public,max-age=60':'no-store');
      // Indexable only while current stories exist; an empty page stays out of search.
      if(!news)headers.set('X-Robots-Tag','noindex, follow');
      return new Response(decorateHalloween(newsHead(html,edition).replace('<!-- breaking-news -->',()=>news||renderEmptyNews()),holiday,url.pathname),{status:response.status,headers});
    }
    // Consolidate production entry points before rendering or caching HTML.
    // Keep previews and local development on their own origin.
    if(['brainilabgames.com','www.brainilabgames.com'].includes(url.hostname)){
      const canonical=new URL(url);
      canonical.protocol='https:';
      canonical.hostname='brainilabgames.com';
      canonical.port='';
      canonical.pathname=canonical.pathname.replace(/\/index\.html$/,'/');
      if(canonical.href!==url.href)return Response.redirect(canonical.href,308);
    }
    if(url.pathname==='/learn'||url.pathname.startsWith('/learn/')||['/','/index.html','/sitemap.xml','/llms.txt','/about/','/about/index.html','/profile/','/profile/index.html'].includes(url.pathname)){
      let response=await servePublicLearn(request,env,ctx,caches.default);
      if(request.method==='GET'&&['/','/index.html'].includes(url.pathname)&&response.ok&&response.headers.get('Content-Type')?.includes('text/html')){
        const html=await response.text(),news='';
        const headers=new Headers(response.headers);headers.delete('Content-Length');headers.delete('ETag');
        const videos=await cachedHomeVideos(request,ctx,caches.default,fetch,env.YOUTUBE_API_KEY||'');
        response=new Response(renderHomeVideoCards(html,videos).replace('<!-- breaking-news -->',()=>news),{status:response.status,headers});
      }
      const secured=new Response(response.body,response);
      secured.headers.set('X-Content-Type-Options','nosniff');
      secured.headers.set('Referrer-Policy','strict-origin-when-cross-origin');
      secured.headers.set('X-Frame-Options','DENY');
      secured.headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');
      if(holiday.active&&['GET','HEAD'].includes(request.method)&&secured.headers.get('Content-Type')?.includes('text/html')){
        const headers=new Headers(secured.headers);headers.delete('Content-Length');headers.delete('ETag');headers.delete('Last-Modified');headers.set('Cache-Control','no-store');
        return new Response(request.method==='HEAD'?null:decorateHalloween(await secured.text(),holiday,url.pathname),{status:secured.status,headers});
      }
      return secured;
    }
    if(url.pathname.startsWith('/api/')){
      if(request.method!=='GET')return new Response('Method not allowed',{status:405,headers:{Allow:'GET'}});
      if(url.pathname==='/api/breaking-news/status'){
        const edition=url.hostname==='brainilabgames.com'?selectNewsEdition(await newsEdition(env,{passive:true})):null;
        const revision=newsEditionRevision(edition);
        const response=json({revision,generatedAt:revision?new Date(edition.generatedAt).toISOString():null},200,15);
        response.headers.set('X-Robots-Tag','noindex');
        return response;
      }
      if(url.pathname==='/api/breaking-news'){
        const edition=url.hostname==='brainilabgames.com'?selectNewsEdition(await newsEdition(env)):null;
        const stories=freshNews(edition);
        return json({generatedAt:edition?.generatedAt||null,stories,serviceStatus:edition?.serviceStatus||'unavailable',...(edition?.automationStatus?{automationStatus:edition.automationStatus}:{})},stories.length?200:503,15);
      }
      if(url.pathname==='/api/latest-video')return latestVideo(request,ctx,caches.default,fetch,env.YOUTUBE_API_KEY||'');
      if(url.pathname==='/api/admin/video-info')return adminVideoInfo(request,env.YOUTUBE_API_KEY||'');
      if(url.pathname==='/api/related-video'){
        const game=url.searchParams.get('game');
        if(!Object.hasOwn(VIDEO_GAMES,game))return json({error:'Unknown game'},400,0);
        try{
          let video=await learnRelatedVideo(request,env,ctx,caches.default,game);
          if(!video&&game==='generalknowledge'){
            const latest=await (await latestVideo(request,ctx,caches.default,fetch,env.YOUTUBE_API_KEY||'')).json();
            if(!latest.stale&&!latest.unavailable)video=cleanVideo(latest);
          }
          return json({video},200,60);
        }catch{return json({video:null},503,0);}
      }
      const match=url.pathname.match(/^\/api\/youtube-thumbnail\/([-\w]{11})$/);
      if(match){
        const key=new Request(new URL(url.pathname+'?thumbnail=320-webp-v2',url.origin));
        const cached=await caches.default.match(key);
        if(cached)return cached;
        try{
          let response=await fetch('https://i.ytimg.com/vi_webp/'+match[1]+'/mqdefault.webp',{signal:AbortSignal.timeout(4000)});
          if(!response.ok||!response.headers.get('content-type')?.startsWith('image/'))response=await fetch('https://i.ytimg.com/vi/'+match[1]+'/mqdefault.jpg',{signal:AbortSignal.timeout(4000)});
          if(!response.ok||!response.headers.get('content-type')?.startsWith('image/'))throw new Error('No thumbnail');
          const image=new Response(response.body,{headers:{'Content-Type':response.headers.get('content-type'),'Cache-Control':'public, max-age=3600','X-Content-Type-Options':'nosniff'}});
          ctx.waitUntil(caches.default.put(key,image.clone()));
          return image;
        }catch{return new Response(null,{status:404});}
      }
      return json({error:'Not found'},404);
    }
    const response=await env.ASSETS.fetch(request);
    if(holiday.active&&['GET','HEAD'].includes(request.method)&&response.headers.get('Content-Type')?.includes('text/html')){
      const headers=new Headers(response.headers);headers.delete('Content-Length');headers.delete('ETag');headers.delete('Last-Modified');headers.set('Cache-Control','no-store');
      return new Response(request.method==='HEAD'?null:decorateHalloween(await response.text(),holiday,url.pathname),{status:response.status,headers});
    }
    return response;
  }
};
