import {boundedText,publicJSON} from './public-json.js';
export const HEALTH_CRON='*/5 * * * *';
export const PRODUCTION_ORIGIN='https://brainilabgames.com';
export function healthOrigin(value){const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port||u.pathname!=='/'||u.search||u.hash||!(u.hostname==='brainilabgames.com'||/^[a-z0-9-]+-brainilab-web\.brainilabquiz\.workers\.dev$/.test(u.hostname)))throw Error('Unsupported health origin');return u.origin;}
const articles=p=>/^\/learn\/(?!paths\/|topics\/)[a-z0-9-]+\/$/.test(p);
const courses=p=>/^\/learn\/paths\/[a-z0-9-]+\/$/.test(p);
function locations(xml,origin){return [...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)].flatMap(m=>{try{const u=new URL(m[1].trim());return (u.origin===origin||origin!==PRODUCTION_ORIGIN&&u.origin===PRODUCTION_ORIGIN)&&!u.search&&!u.hash&&u.pathname.length<=256?[u.pathname]:[];}catch{return [];}});}
export async function checkPublicPages(value,{fetcher=fetch,now=Date.now}={}){
 const origin=healthOrigin(value),checkedAt=new Date(now()).toISOString(),checks=[];
 async function get(path,kind){
  const start=now(),row={path,kind,status:null,ok:false,durationMs:0};let text='';
  try{
   const r=await fetcher(origin+path,{method:'GET',redirect:'manual',headers:{Accept:kind==='sitemap'?'application/xml':'text/html','User-Agent':'BrainiLabAvailability/1.0'},signal:AbortSignal.timeout(10000)});row.status=r.status;
   text=await boundedText(r,2*1024*1024);
   if(r.status!==200){row.code=/error code:\s*(110[0-9])/i.exec(text)?.[1]||'http';}
   else if(kind==='sitemap')row.ok=/<urlset\b/.test(text)&&text.includes('http://www.sitemaps.org/schemas/sitemap/0.9')&&/<\/urlset>/.test(text);
   else{
    row.ok=/text\/html/i.test(r.headers.get('content-type')||'')&&/<main\b/i.test(text)&&/<h1\b[^>]*>\s*[^<\s]/i.test(text);
    if(row.ok&&(kind==='article'||kind==='course')){
     const entities=[...text.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].flatMap(m=>{const j=JSON.parse(m[1]);return j['@graph']||[j];});
     row.ok=entities.some(e=>[].concat(e['@type']).includes(kind==='course'?'Course':'Article'));
    }
   }
   if(!row.ok&&!row.code)row.code='content';
  }catch(e){row.code=e?.name==='TimeoutError'||e?.name==='AbortError'?'timeout':'unavailable';}
  row.durationMs=Math.max(0,now()-start);checks.push(row);return text;
 }
 const [, ,xml]=await Promise.all([get('/learn/','library'),get('/learn/paths/','academy'),get('/sitemap.xml','sitemap')]);
 const paths=locations(xml,origin),reading=paths.filter(articles),learning=paths.filter(courses),slot=Math.floor(now()/300000);
 for(const [set,kind]of [[reading,'article'],[learning,'course']]){
  if(set.length)await get(set[slot%set.length],kind);
  else checks.push({path:'/sitemap.xml',kind,status:null,ok:false,durationMs:0,code:'missing-'+kind});
 }
 return {schemaVersion:1,checkedAt,ok:checks.every(c=>c.ok),articleCount:reading.length,courseCount:learning.length,checks};
}
export async function recordHealth(storage,result){
 const previous=await storage.get('site-health-v1'),failures=result.checks.filter(c=>!c.ok);
 const lastError=failures.length?{checkedAt:result.checkedAt,checks:failures}:previous?.lastError||null;
 const record={latest:result,lastError,consecutiveFailures:result.ok?0:Math.min(1000000,(previous?.consecutiveFailures||0)+1)};
 await storage.put('site-health-v1',record);return record;
}
function namespace(env){return env.LEARN_PAGES.get(env.LEARN_PAGES.idFromName('site-health-v1'));}
export async function scheduledHealth(env){if(!env.LEARN_PAGES)throw Error('Health binding unavailable');const r=await namespace(env).fetch(new Request('https://health.internal/_site-health/check',{method:'POST'}));if(!r.ok)throw Error('Availability check failed');}
export async function healthStatus(env,now=Date.now()){
 try{
  if(!env.LEARN_PAGES)throw Error('Missing binding');
  const r=await namespace(env).fetch(new Request('https://health.internal/_site-health/status'));
  const record=await publicJSON(r,32768),at=Date.parse(record?.latest?.checkedAt),stale=!Number.isFinite(at)||now-at>15*60000||at>now+60000;
  const ok=!stale&&record.latest.ok===true;
  return Response.json({schemaVersion:1,ok,stale,...record},{status:ok?200:503,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 }catch{return Response.json({schemaVersion:1,ok:false,stale:true},{status:503,headers:{'Cache-Control':'no-store'}});}
}
