import {serveLearn} from './lib/learn-worker.js';
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
  }catch{
    const data={...(saved||{playlistId:PLAYLIST,playlistUrl:PLAYLIST_URL,source,checkedAt:Date.now(),unavailable:true}),stale:true,retryAt:Date.now()+60000};
    // Back off on failures too; keep the original checkedAt so stale data expires.
    ctx.waitUntil(cache.put(key,json(data,200,7*86400)));
    return json(data,data.unavailable?503:200,60);
  }
}
export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/learn'||url.pathname.startsWith('/learn/')||['/','/index.html','/sitemap.xml'].includes(url.pathname)){
      const response=await serveLearn(request,env,ctx,caches.default);
      const secured=new Response(response.body,response);
      secured.headers.set('X-Content-Type-Options','nosniff');
      secured.headers.set('Referrer-Policy','strict-origin-when-cross-origin');
      secured.headers.set('X-Frame-Options','DENY');
      secured.headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');
      return secured;
    }
    if(url.pathname.startsWith('/api/')){
      if(request.method!=='GET')return new Response('Method not allowed',{status:405,headers:{Allow:'GET'}});
      if(url.pathname==='/api/latest-video')return latestVideo(request,ctx,caches.default,fetch,env.YOUTUBE_API_KEY||'');
      const match=url.pathname.match(/^\/api\/youtube-thumbnail\/([-\w]{11})$/);
      if(match){
        const key=new Request(new URL(url.pathname,url.origin));
        const cached=await caches.default.match(key);
        if(cached)return cached;
        try{
          const response=await fetch('https://i.ytimg.com/vi/'+match[1]+'/hqdefault.jpg',{signal:AbortSignal.timeout(5000)});
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
