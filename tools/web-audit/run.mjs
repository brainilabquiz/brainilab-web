import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {extractLinks} from './extract.mjs';
const {JSDOM}=createRequire(new URL('../../package.json',import.meta.url))('jsdom');
const robotsParser=createRequire(import.meta.url)('robots-parser');
const repo=fileURLToPath(new URL('../../',import.meta.url));
const origin='https://brainilabgames.com';
const privateRoot=path.resolve(repo,'../audit-results',new Date().toISOString().replace(/[:.]/g,'-'));
const denied=/^\/(?:api|admin|auth|logout|signout|profile|groups)(?:\/|$)/i;
export function publicTarget(value){
 try{const u=new URL(value);if(u.origin!==origin||u.username||u.password||denied.test(decodeURIComponent(u.pathname)))return null;
 if(u.search&&!u.pathname.startsWith('/assets/'))return null;
 u.hash='';return u.href;}catch{return null;}
}
async function read(url,method='GET'){
 let current=publicTarget(url);if(!current)throw Error('Outside the public audit scope');
 for(let redirects=0;redirects<=4;redirects++){
  const r=await fetch(current,{method,redirect:'manual',signal:AbortSignal.timeout(20000),headers:{'User-Agent':'BrainiLabOwnerAudit/1.0'}});
  if([301,302,303,307,308].includes(r.status)){
   const next=publicTarget(new URL(r.headers.get('location')||'',current).href);
   await r.body?.cancel();if(!next)return {url,status:r.status,state:'redirect-outside-scope',finalUrl:current};
   current=next;continue;
  }
  if(method==='HEAD'&&[405,501].includes(r.status)){await r.body?.cancel();method='GET';continue;}
  const row={url,status:r.status,finalUrl:current,type:r.headers.get('content-type')||'',xRobots:r.headers.get('x-robots-tag')||''};
  if(method==='GET'){
   let length=0;const chunks=[];
   for await(const chunk of r.body||[]){length+=chunk.length;if(length>2*1024*1024)throw Error('HTML response exceeds audit limit');chunks.push(chunk);}
   row.html=Buffer.concat(chunks).toString('utf8');
  }else await r.body?.cancel();
  row.state=[401,403,429,503].includes(r.status)?'unverified':r.status>=500?'server-error':r.status>=400?'broken':'ok';
  return row;
 }
 return {url,state:'redirect-limit',status:null};
}
async function pool(items,work){let cursor=0;const out=[];await Promise.all([0,1].map(async()=>{while(cursor<items.length){const item=items[cursor++];try{out.push(await work(item));}catch(e){out.push({url:typeof item==='string'?item:item.url,state:'unverified',error:e.message});}await new Promise(r=>setTimeout(r,125));}}));return out;}
async function main(){
 const mode=process.argv[2]||'all';if(!['all','links','kit'].includes(mode))throw Error('Choose all, links or kit');
 await fs.mkdir(privateRoot,{recursive:true});
 const sitemap=await read(origin+'/sitemap.xml');if(sitemap.status!==200)throw Error('Sitemap unavailable');
 const xml=new JSDOM(sitemap.html,{contentType:'text/xml'});const urls=[...xml.window.document.querySelectorAll('url>loc')].map(e=>e.textContent.trim()).map(publicTarget).filter(Boolean);xml.window.close();
 const robotsResponse=await read(origin+'/robots.txt');if(robotsResponse.status!==200)throw Error('Cannot verify robots.txt');
 const robots=robotsParser(origin+'/robots.txt',robotsResponse.html);
 const candidates=[...new Set(urls)];const pageUrls=candidates.filter(url=>robots.isAllowed(url,'BrainiLabOwnerAudit/1.0')!==false);
 if(!pageUrls.length||pageUrls.length>1000)throw Error('Unexpected sitemap size');
 console.log(JSON.stringify({stage:'pages',total:pageUrls.length,output:privateRoot}));
 let completed=0;const targets=new Map(),issues=[];
 const pages=await pool(pageUrls,async url=>{
  const row=await read(url);const file=createHash('sha256').update(url).digest('hex').slice(0,20)+'.html';
  await fs.writeFile(path.join(privateRoot,file),row.html||'');
  if(row.status===200&&row.type.includes('html')){
   const dom=new JSDOM(row.html,{url}),d=dom.window.document;
   const canonical=d.querySelector('link[rel=canonical]')?.href;
   if(canonical!==url)issues.push({url,issue:'canonical',observed:canonical||null});
   if(/noindex/i.test((d.querySelector('meta[name=robots]')?.content||'')+' '+row.xRobots))issues.push({url,issue:'noindex'});
   for(const script of d.querySelectorAll('script[type="application/ld+json"]'))try{JSON.parse(script.textContent)}catch{issues.push({url,issue:'invalid-jsonld'})}
   dom.window.close();
   if(mode!=='kit')for(const link of await extractLinks(row.html,url)){const target=publicTarget(link.url);if(target&&robots.isAllowed(target,'BrainiLabOwnerAudit/1.0')!==false&&!targets.has(target))targets.set(target,{url:target,source:url,tag:link.tag,attribute:link.attribute});}
  }
  completed++;if(completed%50===0)console.log(JSON.stringify({stage:'pages',done:completed,total:pageUrls.length}));
  const {html,...metadata}=row;return {...metadata,file};
 });
 await fs.writeFile(path.join(privateRoot,'snapshot.json'),JSON.stringify({origin,checkedAt:new Date().toISOString(),pages},null,2));
 let inventory=null;
 if(mode!=='links'){
  const python=process.env.BRAINILAB_PYTHON||'python';
  const result=spawnSync(python,['-X','utf8',path.join(repo,'tools/web-audit/kit_snapshot.py'),path.join(privateRoot,'snapshot.json'),path.join(privateRoot,'kit.json')],{encoding:'utf8',windowsHide:true});
  if(result.status!==0)throw Error(result.stderr||'Kit adapter failed');
  inventory=JSON.parse(await fs.readFile(path.join(privateRoot,'kit.json'),'utf8'));
  for(const page of inventory.pages){if(page.status!==200)continue;
   for(const field of ['title','lang','description','viewport'])if(!page[field])issues.push({url:page.url,issue:'missing-'+field});
   if(page.headings.filter(h=>h[0]==='h1').length!==1)issues.push({url:page.url,issue:'h1-count'});
   if(page.imagesMissingAlt.length)issues.push({url:page.url,issue:'missing-alt',images:page.imagesMissingAlt});
  }
 }
 const pageByUrl=new Map(pages.map(p=>[p.url,p]));const linkResults=[];
 if(mode!=='kit'){
  const remaining=[];
  for(const target of targets.values()){const page=pageByUrl.get(target.url);if(page)linkResults.push({...target,status:page.status,state:page.state});else remaining.push(target);}
  let count=0;const checked=await pool(remaining,async target=>{const {html,...row}=await read(target.url,'HEAD');count++;if(count%100===0)console.log(JSON.stringify({stage:'links',done:count,total:remaining.length}));return {...target,...row};});linkResults.push(...checked);
 }
 const broken=linkResults.filter(r=>r.state==='broken'||r.state==='server-error');
 const unverified=linkResults.filter(r=>r.state!=='ok'&&r.state!=='broken'&&r.state!=='server-error');
 const report={checkedAt:new Date().toISOString(),mode,origin,sitemapPages:candidates.length,robotsExcludedPages:candidates.length-pageUrls.length,readPages:pages.length,kitPages:inventory?.pages.length||0,links:linkResults.length,brokenLinks:broken,unverifiedLinks:unverified,issues,pageErrors:pages.filter(p=>p.status!==200),scope:'On-demand anonymous static sitemap inventory and first-party link checks, respecting robots.txt. No gameplay, login, publication, scheduled monitoring, external-site crawl, accessibility certification or indexing guarantee.'};
 await fs.writeFile(path.join(privateRoot,'report.json'),JSON.stringify(report,null,2));
 await fs.writeFile(path.join(privateRoot,'links.json'),JSON.stringify(linkResults,null,2));
 console.log(JSON.stringify(report));
 await fs.writeFile(path.resolve(repo,'../last-audit-path.txt'),privateRoot);
 process.exitCode=report.pageErrors.length||broken.length||issues.length?1:0;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e.message);process.exitCode=2});
