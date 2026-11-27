// Our own visit counter (Nov 2026). The Worker counts public page requests in aggregate: page path and UTC day,
// nothing else. No cookies, no IP address, no user agent or device data is stored, and nothing is read from or
// written to the browser. Bots, prefetches and private areas are left out.
const HOST='brainilabgames.com';
const DATABASE='https://wvgcdlxebbybthyuajgb.supabase.co';
const KEY='sb_publishable_8spWjgOq3d5KJsynwrx71Q_h1OJ34b7';
const PRIVATE=/^\/(?:admin|auth|profile|api|assets|cdn-cgi)(?:\/|$)/;
// Crawlers, link previews, monitors and scripted clients announce themselves in the user agent. The user agent is
// only read here to decide; it is never stored.
const BOT=/bot\b|bot\/|crawl|spider|slurp|archiver|preview|facebookexternalhit|embedly|whatsapp|telegram|discord|slack|skype|headless|lighthouse|pagespeed|gtmetrix|pingdom|uptime|monitor|checker|curl\/|wget|python|httpclient|okhttp|go-http|java\/|node-fetch|undici|axios|postman|insomnia|libwww|scrapy|semrush|ahrefs|mj12|dotbot|petalbot|yandex|baidu|bytespider|gptbot|ccbot|claude|anthropic|perplexity|applebot|duckduck|google-inspectiontool|google-extended|feedfetcher/i;
export const VISIT_STORE='visit-counter-v1';
export const VISIT_RETENTION_DAYS=90;
const PATH=/^\/[a-z0-9\-._/]{0,159}$/i;
const DAY=/^\d{4}-\d{2}-\d{2}$/;

export const visitDay=(now=Date.now())=>new Date(now).toISOString().slice(0,10);

// The page path to count for this request and response, or null when it must not be counted.
export function visitPath(request,response){
  if(request.method!=='GET'||!response)return null;
  let url;try{url=new URL(request.url);}catch{return null;}
  if(url.hostname!==HOST)return null;
  const h=request.headers;
  if(/prefetch|prerender/i.test(h.get('Sec-Purpose')||'')||/prefetch|prerender/i.test(h.get('Purpose')||'')||/prefetch/i.test(h.get('X-Moz')||''))return null;
  const dest=h.get('Sec-Fetch-Dest');
  if(dest&&dest!=='document')return null;
  const agent=h.get('User-Agent')||'';
  if(!agent||BOT.test(agent))return null;
  if(request.cf?.botManagement?.verifiedBot||request.cf?.verifiedBotCategory)return null;
  let path=url.pathname.replace(/\/index\.html$/,'/');
  if(PRIVATE.test(path))return null;
  if(/\.[a-z0-9]{1,6}$/i.test(path)&&!path.endsWith('.html'))return null;
  const page=response.status===200&&/text\/html/i.test(response.headers.get('Content-Type')||'')
    ||response.status===304&&dest==='document';
  if(!page||!PATH.test(path))return null;
  return path;
}

// Counting never delays or breaks the page: it runs after the response, and any failure is ignored.
export function countVisit(request,response,env,ctx,now=Date.now()){
  const path=visitPath(request,response);
  if(!path||!env?.LEARN_PAGES||!ctx?.waitUntil)return false;
  const store=env.LEARN_PAGES.get(env.LEARN_PAGES.idFromName(VISIT_STORE));
  ctx.waitUntil(store.fetch('https://visits.internal/hit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({path,day:visitDay(now)})}).catch(()=>{}));
  return true;
}

const keyFor=(day,path)=>`visits:${day}:${path}`;
const shiftDay=(day,delta)=>visitDay(Date.parse(day+'T00:00:00Z')+delta*86400000);

// Durable Object side: one counter per day and path, kept for 90 days.
export async function visitStore(storage,request,now=Date.now()){
  const url=new URL(request.url);
  if(url.pathname==='/hit'&&request.method==='POST'){
    let body;try{body=await request.json();}catch{return new Response(null,{status:400});}
    if(!DAY.test(body?.day||'')||typeof body.path!=='string'||!PATH.test(body.path))return new Response(null,{status:400});
    const key=keyFor(body.day,body.path);
    await storage.put(key,(Number(await storage.get(key))||0)+1);
    const today=visitDay(now);
    if(await storage.get('visits-pruned')!==today){
      const cutoff=shiftDay(today,-VISIT_RETENTION_DAYS);
      const old=[...(await storage.list({prefix:'visits:',end:keyFor(cutoff,'')})).keys()];
      for(let i=0;i<old.length;i+=128)await storage.delete(old.slice(i,i+128));
      await storage.put('visits-pruned',today);
    }
    return new Response(null,{status:204});
  }
  if(url.pathname==='/summary'&&request.method==='GET'){
    const days=Math.min(VISIT_RETENTION_DAYS,Math.max(1,Math.floor(Number(url.searchParams.get('days'))||30)));
    const to=visitDay(now),from=shiftDay(to,-(days-1));
    const rows=await storage.list({start:keyFor(from,''),end:keyFor(shiftDay(to,1),'')});
    const perDay=new Map(),perPath=new Map();
    for(let d=0;d<days;d++)perDay.set(shiftDay(from,d),0);
    for(const [key,value] of rows){
      const m=key.match(/^visits:(\d{4}-\d{2}-\d{2}):(.+)$/);if(!m||!perDay.has(m[1]))continue;
      const n=Number(value)||0;perDay.set(m[1],perDay.get(m[1])+n);perPath.set(m[2],(perPath.get(m[2])||0)+n);
    }
    const top=[...perPath].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,25).map(([path,count])=>({path,count}));
    return Response.json({from,to,timezone:'UTC',total:[...perDay.values()].reduce((s,n)=>s+n,0),days:[...perDay].map(([day,count])=>({day,count})),top,pages:perPath.size});
  }
  return new Response(null,{status:404});
}

const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex'}});

// Admin endpoint: the same admin check as the video tool (owner or editor, signed in with MFA).
export async function adminVisits(request,env,fetcher=fetch){
  const token=request.headers.get('Authorization');
  if(!/^Bearer [A-Za-z0-9._-]{20,8192}$/.test(token||''))return reply({error:'Sign in to the admin first.'},401);
  try{
    const session=await fetcher(DATABASE+'/rest/v1/rpc/get_brainilab_admin_session',{method:'POST',headers:{apikey:KEY,Authorization:token,'Content-Type':'application/json'},body:'{}',redirect:'manual',signal:AbortSignal.timeout(8000)});
    if(!session.ok)return reply({error:'Admin access could not be verified.'},403);
    const admin=await session.json();
    if(admin.admin!==true||admin.authenticated!==true||!['owner','editor'].includes(admin.role)||admin.mfa_satisfied!==true)return reply({error:'Admin access is required.'},403);
  }catch{return reply({error:'Admin access could not be verified.'},503);}
  if(!env?.LEARN_PAGES)return reply({error:'The visit counter is not available here.'},503);
  const days=new URL(request.url).searchParams.get('days')||'30';
  try{
    const store=env.LEARN_PAGES.get(env.LEARN_PAGES.idFromName(VISIT_STORE));
    const response=await store.fetch('https://visits.internal/summary?days='+encodeURIComponent(days));
    if(!response.ok)throw Error('summary');
    return reply(await response.json());
  }catch{return reply({error:'The visit counter could not be read. Try again later.'},503);}
}
