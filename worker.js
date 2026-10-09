import {serveLearn,publishedArticles} from './lib/learn-worker.js';
import {renderNews,freshNews} from './lib/breaking-news.js';
import {newsEdition} from './lib/news-refresh.js';
export {BreakingNewsStore} from './lib/news-refresh.js';
import {VIDEO_GAMES,relatedVideo,cleanVideo} from './lib/video-card.js';
import {adminVideoInfo} from './lib/video-admin.js';
import {CHANNEL,PLAYLIST,PLAYLIST_URL,latestPlaylistVideo,videoRecord} from './lib/youtube-playlist.js';
// Fixed public playlist only. No visitor data, credentials or user-supplied upstream URLs.
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
    if(!env.BREAKING_NEWS)return;
    const store=env.BREAKING_NEWS.get(env.BREAKING_NEWS.idFromName('world-news-v1'));
    ctx.waitUntil(store.fetch('https://news.internal/refresh',{method:'POST'}));
  },
  async fetch(request,env,ctx){
    const url=new URL(request.url);
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
    if(url.pathname==='/learn'||url.pathname.startsWith('/learn/')||['/','/index.html','/sitemap.xml','/about/','/about/index.html','/profile/','/profile/index.html'].includes(url.pathname)){
      let response=await serveLearn(request,env,ctx,caches.default);
      if(request.method==='GET'&&['/','/index.html'].includes(url.pathname)&&response.ok&&response.headers.get('Content-Type')?.includes('text/html')){
        const html=await response.text(),news=url.hostname==='brainilabgames.com'?renderNews(await newsEdition(env)):'';
        const headers=new Headers(response.headers);headers.delete('Content-Length');headers.delete('ETag');
        response=new Response(html.replace('<!-- breaking-news -->',()=>news),{status:response.status,headers});
      }
      const secured=new Response(response.body,response);
      secured.headers.set('X-Content-Type-Options','nosniff');
      secured.headers.set('Referrer-Policy','strict-origin-when-cross-origin');
      secured.headers.set('X-Frame-Options','DENY');
      secured.headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');
      return secured;
    }
    if(url.pathname.startsWith('/api/')){
      if(request.method!=='GET')return new Response('Method not allowed',{status:405,headers:{Allow:'GET'}});
      if(url.pathname==='/api/breaking-news'){
        const edition=url.hostname==='brainilabgames.com'?await newsEdition(env):null;
        const stories=freshNews(edition);
        return json({generatedAt:edition?.generatedAt||null,stories,serviceStatus:edition?.serviceStatus||'unavailable'},stories.length?200:503,15);
      }
      if(url.pathname==='/api/latest-video')return latestVideo(request,ctx,caches.default,fetch,env.YOUTUBE_API_KEY||'');
      if(url.pathname==='/api/admin/video-info')return adminVideoInfo(request,env.YOUTUBE_API_KEY||'');
      if(url.pathname==='/api/related-video'){
        const game=url.searchParams.get('game');
        if(!Object.hasOwn(VIDEO_GAMES,game))return json({error:'Unknown game'},400,0);
        try{
          const articles=await publishedArticles(request,ctx,caches.default);
          let video=relatedVideo(articles,game);
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
    return env.ASSETS.fetch(request);
  }
};
