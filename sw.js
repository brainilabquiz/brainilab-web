// Always use the network for pages, accounts and game results.
// Only the public recovery screen and its explicit assets are cached.
const CACHE='brainilab-pwa-__BRAINI_PWA_VERSION__';
const PRECACHE=/* pwa-precache */ [];
const FALLBACK='/offline/index.html';

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(PRECACHE)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>
    (key.startsWith('brainilab-static-')||key.startsWith('brainilab-pwa-'))&&key!==CACHE
  ).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin)return;
  if(request.mode==='navigate'){
    event.respondWith(fetch(request).then(response=>response.status>=500?fallback():response).catch(()=>fallback()));
  }else if(PRECACHE.includes(url.pathname+url.search)){
    event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(request))||fetch(request)));
  }
});
async function fallback(){
  const response=await (await caches.open(CACHE)).match(FALLBACK);
  if(response)return new Response(response.body,{status:503,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY'}});
  return new Response('BrainiLab cannot connect right now. Please try again when your connection returns.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});
}
