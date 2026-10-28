import {JSDOM} from 'jsdom';
import {createHash} from 'node:crypto';
import {inertPublicHTML} from '../editor/page-link-evidence.js';
import {observeLearnSchema,learnSchemaURL} from '../editor/page-schema-evidence.js';
import {boundedText} from '../lib/public-json.js';
import {healthOrigin,PRODUCTION_ORIGIN} from '../lib/site-health.js';

const normal=value=>String(value||'').replace(/\s+/g,' ').trim();
const MAX_HTML=2*1024*1024,MAX_PAGES=2000;
function exposed(element){
 if(!element)return false;
 for(let e=element;e?.nodeType===1;e=e.parentElement)if(['SCRIPT','STYLE','TEMPLATE','NOSCRIPT'].includes(e.tagName)||e.hasAttribute('hidden')||e.getAttribute('aria-hidden')==='true'||/(?:display\s*:\s*none|visibility\s*:\s*hidden)/i.test(e.getAttribute('style')||''))return false;
 return true;
}
export function compareLearnSchema(html,path,{document}={}){
 const url=PRODUCTION_ORIGIN+path;if(!learnSchemaURL(url))throw Error('Unsupported Learn page');
 const owned=document?null:new JSDOM('<!doctype html>',{url:PRODUCTION_ORIGIN}),parser=document||owned.window.document;
 try{
  const fragment=inertPublicHTML(html,parser),nodes=[],problems=[];let incomplete=false;
  const add=(field,state,declaration=null,page=null)=>problems.push({field,state,declaration,page});
  function graph(value,depth=0){
   if(depth>4||nodes.length>=1000){incomplete=true;return;}
   if(!value||typeof value!=='object')return;
   if(Array.isArray(value)){for(const v of value)graph(v,depth+1);}
   else{nodes.push(value);if(value['@graph'])graph(value['@graph'],depth+1);}
  }
  const scripts=[...fragment.querySelectorAll('script[type="application/ld+json" i]')].filter(s=>!s.closest('noscript'));
  if(scripts.length>32){incomplete=true;add('json_ld','unverified','too_many_declarations');}
  else for(const script of scripts){try{if(script.textContent.length>512*1024)throw Error('Oversized declaration');graph(JSON.parse(script.textContent));}catch{incomplete=true;add('json_ld','unverified','malformed_or_oversized_json');}}
  const evidence=observeLearnSchema(fragment,url,nodes,{incomplete});
  if(evidence?.state!=='ready')add('primary_entity','unverified');
  for(const c of evidence?.checks||[])if(!['same','equivalent'].includes(c.state))add(c.field,c.state==='different'?'different':'unverified',c.declaration,c.page);
  for(const [field,selector]of [['headline','main h1'],['author','main .article-byline [rel~="author"],main .article-byline > span'],['cover',path.includes('/paths/')?'main .academy-hero > img':'main .article-cover img'],['published','main .article-byline time']]){
   const matches=fragment.querySelectorAll(selector);if(matches.length!==1||!exposed(matches[0]))add(field+'_visibility','unverified');
  }
  const times=fragment.querySelectorAll('main .article-byline time[datetime]');
  if(times.length===1){const stamp=Date.parse(times[0].getAttribute('datetime'));
   const expected=Number.isFinite(stamp)?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(stamp):null;
   if(!expected)add('published_label','unverified');
   else if(normal(times[0].textContent)!==normal(expected))add('published_label','different',expected,normal(times[0].textContent));
  }
  return {path,kind:evidence?.kind||null,ok:problems.length===0,sha256:createHash('sha256').update(html).digest('hex'),checks:(evidence?.checks||[]).map(c=>({field:c.field,state:c.state})),problems};
 }finally{owned?.window.close();}
}
function cataloguePaths(xml,origin){
 if(/<!DOCTYPE/i.test(xml))throw Error('Unsupported sitemap declaration');
 const dom=new JSDOM(xml,{contentType:'application/xml'});
 try{
  const d=dom.window.document;if(d.documentElement.localName!=='urlset'||d.documentElement.namespaceURI!=='http://www.sitemaps.org/schemas/sitemap/0.9')throw Error('Invalid sitemap root');
  const paths=[];
  for(const loc of d.querySelectorAll('url > loc')){
   const u=new URL(loc.textContent.trim());if(!u.pathname.startsWith('/learn/'))continue;
   if(![origin,PRODUCTION_ORIGIN].includes(u.origin)||u.username||u.password||u.search||u.hash)throw Error('Unexpected Learn sitemap address');
   if(learnSchemaURL(PRODUCTION_ORIGIN+u.pathname))paths.push(u.pathname);
  }
  const unique=[...new Set(paths)].sort();if(unique.length!==paths.length||!unique.length||unique.length>MAX_PAGES)throw Error('Invalid Learn catalogue inventory');
  if(!unique.some(p=>p.includes('/paths/'))||!unique.some(p=>!p.includes('/paths/')))throw Error('Incomplete article/course inventory');
  return unique;
 }finally{dom.window.close();}
}
export async function checkLearnCatalogue(value,{fetcher=fetch,clock=Date.now,pause=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}){
 const origin=healthOrigin(value),start=clock(),checkedAt=new Date(start).toISOString(),pages=[],problems=[];
 const parser=new JSDOM('<!doctype html>',{url:PRODUCTION_ORIGIN});let paths=[],cursor=0,transportFailure=false;
 async function read(path,type){
  const r=await fetcher(origin+path,{method:'GET',redirect:'manual',headers:{Accept:type,'User-Agent':'BrainiLabSchemaGate/1.0'},signal:AbortSignal.timeout(12000)});
  if(r.status!==200)throw Error('HTTP '+r.status);
  if(path!=='/sitemap.xml'&&!/text\/html/i.test(r.headers.get('content-type')||''))throw Error('Unexpected HTML response');
  return boundedText(r,MAX_HTML);
 }
 try{
  paths=cataloguePaths(await read('/sitemap.xml','application/xml'),origin);
  async function worker(){
   while(cursor<paths.length&&!transportFailure&&problems.length<8){
    if(clock()-start>5*60000){transportFailure=true;problems.push({path:'/learn/',field:'coverage',state:'unverified',reason:'audit_timeout'});break;}
    const path=paths[cursor++];
    try{const html=await read(path,'text/html'),page=compareLearnSchema(html,path,{document:parser.window.document});pages.push(page);problems.push(...page.problems.map(p=>({path,...p})));}
    catch(e){transportFailure=true;problems.push({path,field:'response',state:'unverified',reason:e.message});}
    await pause(100);
   }
  }
  await Promise.all([worker(),worker()]);
  if(pages.length!==paths.length)problems.push({path:'/learn/',field:'coverage',state:'unverified',reason:'incomplete_catalogue'});
  if(!transportFailure){const latest=cataloguePaths(await read('/sitemap.xml','application/xml'),origin);if(JSON.stringify(latest)!==JSON.stringify(paths))problems.push({path:'/sitemap.xml',field:'inventory',state:'unverified',reason:'catalogue_changed_during_check'});}
 }catch(e){problems.push({path:'/sitemap.xml',field:'inventory',state:'unverified',reason:e.message});}
 finally{parser.window.close();}
 return {ok:problems.length===0,checkedAt,durationMs:clock()-start,articles:paths.filter(p=>!p.includes('/paths/')).length,courses:paths.filter(p=>p.includes('/paths/')).length,checked:pages.length,pages,problems};
}
