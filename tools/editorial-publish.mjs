// Uses the authenticated management connector. Never reads browser tokens or API secrets.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
export const origin='https://brainilabgames.com';
export const sha256=x=>crypto.createHash('sha256').update(x).digest('hex');
const gates=['intent','novelty','sources','examples','english','metadata','links','mobile','desktop','validators'];
const fail=x=>{throw Error(x);};
const fresh=(x,days,now)=>Number.isFinite(Date.parse(x))&&Date.parse(x)>=now-days*86400000&&Date.parse(x)<=now+300000;
export function webpWidth(b){
 if(b.toString('ascii',0,4)!=='RIFF'||b.toString('ascii',8,12)!=='WEBP')fail('Expected WebP');
 for(let o=12;o+8<=b.length;){
  const k=b.toString('ascii',o,o+4),n=b.readUInt32LE(o+4),p=o+8;
  if(p+n>b.length)fail('Truncated WebP');
  if(k==='VP8X'&&n>=10)return 1+b.readUIntLE(p+4,3);
  if(k==='VP8L'&&n>=5&&b[p]===47)return 1+(b.readUInt32LE(p+1)&16383);
  if(k==='VP8 '&&n>=10&&b.subarray(p+3,p+6).equals(Buffer.from([157,1,42])))return b.readUInt16LE(p+6)&16383;
  o=p+n+(n&1);
 }fail('WebP dimensions missing');
}
export async function getPublic(url){
 const u=new URL(url);
 if(u.origin!==origin||u.username||u.password||u.search||u.hash)fail('Canonical public origin only');
 const r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(20000)});
 if(!r.ok)fail('Public asset failed: '+r.status+' '+url);
 return {bytes:Buffer.from(await r.arrayBuffer()),type:r.headers.get('content-type')||''};
}
async function localFile(root,relative){
 if(typeof relative!=='string'||path.isAbsolute(relative))fail('Relative proof paths required');
 const full=await fs.realpath(path.resolve(root,relative)),real=await fs.realpath(root),r=path.relative(real,full);
 if(r.startsWith('..')||path.isAbsolute(r))fail('Evidence escapes packet directory');
 return fs.readFile(full);
}
export async function prepare(plan,snapshotBytes,root,fetcher=getPublic,now=Date.now()){
 const snapshot=JSON.parse(snapshotBytes),entries=[];
 if(!fresh(snapshot.capturedAt,1,now))fail('Fresh backup snapshot required');
 if(!/^[a-z0-9-]{1,100}$/.test(plan.id||''))fail('Invalid release ID');
 if(!Array.isArray(plan.entries)||!plan.entries.length||plan.entries.length>30)fail('Use 1–30 entries');
 for(const item of plan.entries){
  const bytes=await localFile(root,item.document),documentText=bytes.toString('utf8'),d=JSON.parse(documentText);
  const r=JSON.parse(await localFile(root,item.review)),documentSha256=sha256(bytes);
  if(r.documentSha256!==documentSha256)fail('Review not bound to document');
  if(!fresh(r.checkedAt,1,now))fail('Review expired');
  if(!['article','lesson','hub','links','path'].includes(item.kind))fail('Unsupported entry kind');
  for(const g of [...gates,...(item.kind==='links'?[]:['demand']),...(d.quiz?['quiz']:[])]){
   const e=r[g];
   if(e?.status!=='verified'||!/^[a-f0-9]{64}$/.test(e.proofSha256||''))fail('Missing '+g+' evidence');
   if(sha256(await localFile(root,e.proofFile))!==e.proofSha256)fail('Changed '+g+' evidence');
  }
  const demand=r.demand;
  if(item.kind!=='links'&&(!['search-console','external-estimate'].includes(demand.type)||!demand.query?.trim()||!demand.market?.trim()||demand.language!=='en'||!fresh(demand.checkedAt,30,now)))fail('Specific dated English demand evidence required');
  const old=(snapshot.entries||[]).find(e=>e.kind===(item.kind==='path'?'path':'article')&&e.slug===d.slug);
  if(!old||!Number.isInteger(old.revision)||!Number.isInteger(old.publishedRevision)||typeof old.snapshotHash!=='string')fail('Explicit fresh snapshot entry required');
  const assets=[];
  if(item.kind!=='path'){
   if(!d.cover?.alt?.trim()||!d.cover?.credit?.trim())fail('Cover alt and truthful credit required');
   for(const [width,key]of [[960,'src'],[480,'small'],[240,'thumbnail']]){
    const src=d.cover[key];
    if(!/^\/assets\/images\/learn\/[a-z0-9-]+\.webp$/.test(src||''))fail('Responsive cover paths required');
    const url=origin+src,response=await fetcher(url);
    if(!/^image\/webp(?:;|$)/i.test(response.type)||webpWidth(response.bytes)!==width)fail('Incorrect '+width+'px cover');
    assets.push({url,width,sha256:sha256(response.bytes),checkedAt:new Date(now).toISOString(),status:'verified'});
   }
  }
  const review={checkedAt:r.checkedAt};
  for(const g of [...gates,'demand','quiz'])if(r[g]){const {proofFile,...e}=r[g];review[g]=e;}
  entries.push({kind:item.kind,slug:d.slug,documentText,documentSha256,expectedRevision:old.revision,expectedPublishedRevision:old.publishedRevision,expectedSnapshotHash:old.snapshotHash,review,assets,...(item.kind==='hub'?{supportingSlugs:item.supportingSlugs}:{})});
 }
 if(new Set(entries.map(e=>e.slug)).size!==entries.length)fail('Duplicate slug');
 return {id:plan.id,authorisation:'owner-authorised-editorial-publication-2026-10-24',backupSha256:sha256(snapshotBytes),entries};
}
export function snapshotSql(items){
 if(!items.length||items.length>30)fail('Use 1–30 targets');
 for(const i of items)if(!['article','path'].includes(i.kind)||!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(i.slug))fail('Invalid snapshot target');
 const value=JSON.stringify(items).replaceAll("'","''");
 return "select jsonb_build_object('capturedAt',now(),'entries',(select jsonb_agg(jsonb_build_object('kind',x->>'kind','slug',x->>'slug','revision',coalesce(a.revision,b.revision,0),'publishedRevision',coalesce(p.revision,q.revision,0),'snapshotHash',case when coalesce(a.document,b.document) is null then 'missing' else md5(coalesce(a.document,b.document)::text) end,'document',coalesce(a.document,b.document),'publication',coalesce(p.document,q.document))) from jsonb_array_elements('"+value+"'::jsonb) x left join brainilab_editor.articles a on x->>'kind'='article' and a.slug=x->>'slug' left join brainilab_editor.learning_entities b on x->>'kind'='path' and b.kind='path' and b.slug=x->>'slug' left join public.learn_publications p on x->>'kind'='article' and p.slug=x->>'slug' left join public.learn_paths q on x->>'kind'='path' and q.slug=x->>'slug')) as snapshot;";
}
export function publishSql(packet){
 return "select brainilab_editor.publish_reviewed_release(convert_from(decode('"+Buffer.from(JSON.stringify(packet)).toString('base64')+"','base64'),'UTF8')) as receipt;\n";
}
async function main(){
 const [mode,source,snapshotFile,output]=process.argv.slice(2);
 if(mode==='snapshot'){console.log(snapshotSql(JSON.parse(await fs.readFile(source,'utf8'))));return;}
 if(mode!=='prepare'||!output)fail('Usage: node tools/editorial-publish.mjs snapshot targets.json | prepare private-plan.json private-snapshot.json private-output-dir');
 const out=path.resolve(output);
 if(/(^|[\\/])(content|assets|dist|public|\.git)([\\/]|$)/i.test(out))fail('Packets must stay outside public content directories');
 const packet=await prepare(JSON.parse(await fs.readFile(source,'utf8')),await fs.readFile(snapshotFile),path.dirname(path.resolve(source)));
 await fs.mkdir(out,{recursive:true});
 await fs.writeFile(path.join(out,'packet.json'),JSON.stringify(packet,null,2)+'\n',{flag:'wx'});
 await fs.writeFile(path.join(out,'publish.sql'),publishSql(packet),{flag:'wx'});
 console.log(JSON.stringify({state:'prepared-not-published',id:packet.id,entries:packet.entries.map(e=>e.slug)}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(e=>{console.error(e.message);process.exitCode=1;});
