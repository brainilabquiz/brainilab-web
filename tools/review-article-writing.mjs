import {readFile,writeFile,realpath} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {inspectArticle} from '../lib/article-writing.js';
const digest=b=>createHash('sha256').update(b).digest('hex');
const parse=s=>JSON.parse(s.replace(/^\uFEFF/,''));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const [command,folder,...flags]=process.argv.slice(2);
if(!['brief','review'].includes(command)||!folder){console.log('Usage: node tools/review-article-writing.mjs brief|review <private-folder> [--revision] [--publish]\nThe folder needs documents.json and a fresh baseline.json. Brief creates a private review template; it never drafts facts or publishes.');process.exitCode=1;}
else await main().catch(e=>{console.error(e.message);process.exitCode=1;});

async function main(){
 const root=await realpath(path.resolve(folder));
 if(/(^|[\\/])(content|assets|dist|public|\.git)([\\/]|$)/i.test(root))throw Error('Keep research and review files in a private work folder, outside public content directories.');
 const load=async name=>parse(await readFile(path.join(root,name),'utf8'));
 const docs=await load('documents.json'),baseline=await load('baseline.json');
 if(!Array.isArray(docs)||!Array.isArray(baseline.articles)||!docs.length)throw Error('Expected articles in documents.json and baseline.json.');
 const revision=flags.includes('--revision'),publish=flags.includes('--publish');
 if(flags.some(x=>!['--revision','--publish'].includes(x)))throw Error('Unknown option. Use --revision or --publish.');
 const hashes=new Map(await Promise.all(docs.map(async d=>{
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(d.slug||'')||d.slug.length>100)throw Error('Invalid article URL in documents.json.');
  const bytes=await readFile(path.join(root,d.slug+'.json'));
  if(JSON.stringify(parse(bytes.toString('utf8')))!==JSON.stringify(d))throw Error(d.slug+': documents.json and the individual article file are out of sync.');
  return[d.slug,digest(bytes)];
 })));
 if(command==='brief'){
  const lessons=new Set((baseline.paths||[]).flatMap(p=>(p.document?.lessons||[]).map(l=>l.slug)));
  const categories=[...new Set(baseline.articles.map(x=>x.document.topic))].map(topic=>{const list=baseline.articles.filter(x=>x.document.topic===topic);return{topic,total:list.length,lessons:list.filter(x=>lessons.has(x.slug)).length,independent:list.filter(x=>!lessons.has(x.slug)).length};}).sort((a,b)=>a.independent-b.independent||a.topic.localeCompare(b.topic));
  const brief={version:1,createdAt:new Date().toISOString(),limits:'Private editorial record. Pending fields need real research and manual review; this tool does not invent demand or validate facts.',categories,articles:docs.map(d=>({slug:d.slug,documentSha256:hashes.get(d.slug),readerQuestion:d.title,intent:'',whyThisAddsSomethingNew:'',demand:{status:'pending',query:'',market:'',language:'en',observedAt:null,provider:'',displayedMetric:null,evidence:[]},sources:(d.sources||[]).map(s=>({url:s.url,status:'pending',openedAt:null,claims:[],evidence:[]})),english:{status:'pending',notes:''},cover:{status:'pending',notes:'Inspect the original, wide cover, square and small crops; verify rights, alt text and credit.'},mobile:{status:'pending',evidence:[]},desktop:{status:'pending',evidence:[]}}))};
  await writeFile(path.join(root,'editorial-brief.json'),JSON.stringify(brief,null,2)+'\n',{flag:'wx'});
  console.log('Created editorial-brief.json with pending research and review fields. Existing briefs are never overwritten.');return;
 }
 const {JSDOM}=await import(process.env.JSDOM_MODULE?pathToFileURL(process.env.JSDOM_MODULE).href:'jsdom');
 const dom=new JSDOM(''),seen=new Set(),items=[],manual=[];
 let brief=null;try{brief=await load('editorial-brief.json');}catch(e){if(e.code!=='ENOENT')throw e;}
 const dateOK=value=>Number.isFinite(Date.parse(value))&&Date.parse(value)<=Date.now()+300000&&Date.parse(value)>=Date.now()-30*86400000;
 const evidence=async(list,label)=>{
  if(!Array.isArray(list)||!list.length){manual.push(label+': add evidence files and their SHA-256 hashes.');return;}
  for(const item of list){
   if(!item||typeof item.file!=='string'||!item.sha256){manual.push(label+': incomplete evidence reference.');continue;}
   try{const target=await realpath(path.resolve(root,item.file)),rel=path.relative(root,target);if(rel.startsWith('..')||path.isAbsolute(rel))throw Error('outside folder');if(digest(await readFile(target))!==item.sha256)throw Error('hash changed');}
   catch{manual.push(label+': evidence missing, changed or outside the private folder ('+item.file+').');}
  }
 };
 for(const d of docs){
  const found=baseline.articles.find(a=>a.slug===d.slug);
  const result=inspectArticle(d,{document:dom.window.document,articles:[...baseline.articles,...docs.filter(x=>x.slug!==d.slug)],paths:baseline.paths||[],mode:revision?'revision':'new'});
  if(seen.has(d.slug))result.problems.push({code:'duplicate-target',field:'article-slug',message:'Duplicate target URL in this batch.'});seen.add(d.slug);
  if(revision&&(!found||!Number.isInteger(found.revision)||found.revision<1))result.problems.push({code:'revision',field:'article-slug',message:'Revision mode needs an existing article and its current revision in the baseline.'});
  result.passed=!result.problems.length;
  items.push({slug:d.slug,...result});
  const b=brief?.articles?.find(x=>x.slug===d.slug),label=d.slug;
  if(!b){manual.push(label+': create and complete the editorial brief.');continue;}
  if(b.documentSha256!==hashes.get(d.slug))manual.push(label+': the article changed after its brief was bound. Re-review the changed copy and update its hash.');
  if(!b.intent?.trim()||!b.whyThisAddsSomethingNew?.trim())manual.push(label+': record intent and why this reading adds something new.');
  const demand=b.demand||{};
  if(demand.status!=='reviewed'||!demand.query?.trim()||!demand.market?.trim()||!demand.language?.trim()||!demand.provider?.trim()||!dateOK(demand.observedAt))manual.push(label+': add dated, relevant demand research from the last 30 days.');
  await evidence(demand.evidence,label+' demand');
  for(const s of d.sources||[]){const source=b.sources?.find(x=>x.url===s.url);if(!source||source.status!=='reviewed'||!dateOK(source.openedAt)||!Array.isArray(source.claims)||!source.claims.length||source.claims.some(c=>!c.claim?.trim()||!c.location?.trim()||c.reviewed!==true))manual.push(label+': check the actual claims against '+s.url+'.');await evidence(source?.evidence,label+' source '+s.url);}
  for(const key of ['english','cover','mobile','desktop'])if(b[key]?.status!=='reviewed')manual.push(label+': '+key+' review is pending.');
  await evidence(b.mobile?.evidence,label+' mobile');await evidence(b.desktop?.evidence,label+' desktop');
 }
 dom.window.close();
 if(publish&&!dateOK(baseline.capturedAt))manual.push('Refresh the catalogue snapshot before preparing a publication.');
 const problems=items.flatMap(x=>x.problems.map(p=>({slug:x.slug,...p}))),warnings=items.flatMap(x=>x.warnings.map(p=>({slug:x.slug,...p})));
 const report={checkedAt:new Date().toISOString(),mode:revision?'revision':'new',publicationReview:publish,passed:!problems.length&&(!publish||!manual.length),problems,warnings,manualReviewPending:manual,articles:items.map(({slug,metrics})=>({slug,...metrics})),limits:'Structural checks and evidence completeness only. A reviewed label is a manual assertion, not independent verification of facts, search demand, English or image rights. Publishing still uses the existing guarded release workflow.'};
 await writeFile(path.join(root,'writing-review.json'),JSON.stringify(report,null,2)+'\n');
 const list=(heading,values)=>'<h2>'+heading+'</h2>'+(values.length?'<ul>'+values.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'<p>None.</p>');
 const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>BrainiLab writing review</title><style>body{font:16px/1.65 system-ui;background:#fffdf8;color:#242238;max-width:850px;margin:40px auto;padding:0 20px}h1,h2{color:#2d296e}li{margin:8px 0}section{padding:16px 0;border-bottom:1px solid #ddd9e8}small{color:#656177}</style></head><body><h1>Writing review</h1><p>'+esc(report.passed?'Structural checks passed. Read the manual review notes before publication.':'Some checks need attention.')+'</p>'+items.map(x=>'<section><h2>'+esc(x.slug)+'</h2><p>'+x.metrics.words+' words · '+x.metrics.minutes+' min read · '+x.metrics.sections+' sections</p></section>').join('')+list('Fix before publishing',problems.map(x=>x.slug+': '+x.message))+list('Writing suggestions',warnings.map(x=>x.slug+': '+x.message))+list('Manual review',manual)+'<small>'+esc(report.limits)+'</small></body></html>';
 await writeFile(path.join(root,'writing-review.html'),html);
 console.log(JSON.stringify({passed:report.passed,problems:problems.length,suggestions:warnings.length,manualReviewPending:manual.length,report:'writing-review.html'}));
 if(!report.passed)process.exitCode=1;
}
