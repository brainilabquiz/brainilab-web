// Fixed public playlist only. No visitor data, credentials or user-supplied upstream URLs.
const CHANNEL='UCy35EdjSpdYufOLJBybevsA';
const PLAYLIST='PLUJ2DxFEKsFSGP_Ry6gY5jDwQNnDgFKh4';
const PLAYLIST_URL='https://www.youtube.com/playlist?list='+PLAYLIST;
const FRESH_MS=15*60*1000;
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
    if(channel!==CHANNEL||!/^[-\w]{11}$/.test(id||'')||!title||!Number.isFinite(Date.parse(published)))return null;
    return {id,title:title.slice(0,250),published,url:'https://www.youtube.com/watch?v='+id+'&list='+PLAYLIST,thumbnail:'/api/youtube-thumbnail/'+id};
  }).filter(Boolean).sort((a,b)=>Date.parse(b.published)-Date.parse(a.published));
  if(!entries.length)throw new Error('No public channel videos');
  return entries[0];
}
function json(body,status=200,maxAge=60){return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':`public, max-age=${maxAge}`,'X-Content-Type-Options':'nosniff'}});}
export async function latestVideo(request,ctx,cache,fetcher=fetch){
  const key=new Request(new URL('/api/latest-video?playlist='+PLAYLIST,request.url));
  const cached=await cache.match(key);
  const saved=cached?await cached.json().catch(()=>null):null;
  if(saved&&Date.now()-saved.checkedAt<FRESH_MS)return json(saved,200,60);
  try{
    const response=await fetcher('https://www.youtube.com/feeds/videos.xml?playlist_id='+PLAYLIST,{signal:AbortSignal.timeout(7000),headers:{Accept:'application/atom+xml'}});
    if(!response.ok)throw new Error('Feed unavailable');
    const xml=await response.text();
    if(xml.length>500000)throw new Error('Oversized feed');
    const data={...parseFeed(xml),playlistId:PLAYLIST,playlistUrl:PLAYLIST_URL,checkedAt:Date.now(),stale:false};
    ctx.waitUntil(cache.put(key,json(data,200,7*86400)));
    return json(data,200,60);
  }catch{
    if(saved)return json({...saved,stale:true},200,60);
    return json({playlistUrl:PLAYLIST_URL,unavailable:true},503,60);
  }
}
export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname.startsWith('/api/')){
      if(request.method!=='GET')return new Response('Method not allowed',{status:405,headers:{Allow:'GET'}});
      if(url.pathname==='/api/latest-video')return latestVideo(request,ctx,caches.default);
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
