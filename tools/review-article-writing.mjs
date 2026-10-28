import {readFile,writeFile,realpath,stat} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {inspectArticle} from '../lib/article-writing.js';
import {articleEvidence,articleEvidenceHTML} from '../editor/article-evidence.js';
const digest=b=>createHash('sha256').update(b).digest('hex');
const parse=s=>JSON.parse(s.replace(/^\uFEFF/,''));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const [command,folder,...flags]=process.argv.slice(2);
if(!['brief','review'].includes(command)||!folder){console.log('Usage: node tools/review-article-writing.mjs brief|review <private-folder> [--revision] [--publish] [brief only: --growth <private-report.json>]\nBrief creates a private review template, never facts or a publication.');process.exitCode=1;}
else await main().catch(e=>{console.error(e.message);process.exitCode=1;});

async function main(){
 const root=await realpath(path.resolve(folder));
 if(/(^|[\\/])(content|assets|dist|public|\.git)([\\/]|$)/i.test(root))throw Error('Keep research and review files in a private work folder, outside public content directories.');
 const load=async name=>parse(await readFile(path.join(root,name),'utf8'));
 const docs=await load('documents.json'),baseline=await load('baseline.json');
 if(!Array.isArray(docs)||!Array.isArray(baseline.articles)||!docs.length)throw Error('Expected articles in documents.json and baseline.json.');
 let revision=false,publish=false,growthFile=null;
 for(let i=0;i<flags.length;i++){
  if(flags[i]==='--revision')revision=true;
  else if(flags[i]==='--publish')publish=true;
  else if(flags[i]==='--growth'&&command==='brief'&&!growthFile&&flags[i+1]&&!flags[i+1].startsWith('--'))growthFile=flags[++i];
  else throw Error('Use --revision, --publish, or brief --growth <private-report.json>. Review uses the saved hash-bound context.');
 }
 const hashes=new Map(await Promise.all(docs.map(async d=>{
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(d.slug||'')||d.slug.length>100)throw Error('Invalid article URL in documents.json.');
  const bytes=await readFile(path.join(root,d.slug+'.json'));
  if(JSON.stringify(parse(bytes.toString('utf8')))!==JSON.stringify(d))throw Error(d.slug+': documents.json and the individual article file are out of sync.');
  return[d.slug,digest(bytes)];
 })));
 const {JSDOM}=await import(process.env.JSDOM_MODULE?pathToFileURL(process.env.JSDOM_MODULE).href:'jsdom');
 const dom=new JSDOM('');
 try{
  const inspect=d=>inspectArticle(d,{document:dom.window.document,articles:[...baseline.articles,...docs.filter(x=>x.slug!==d.slug)],paths:baseline.paths||[],mode:revision?'revision':'new'});
  const plan=(d,review,report=null,growth=null)=>articleEvidence(d,{document:dom.window.document,articles:baseline.articles,review,report,growth});
  const linkHash=model=>digest(JSON.stringify(model.links.map(l=>[l.href,l.location])));
  if(command==='brief'){
   try{await readFile(path.join(root,'editorial-brief.json'));throw Error('The editorial brief already exists. Existing briefs are never overwritten.');}catch(e){if(e.code!=='ENOENT')throw e;}
   let growthContext=null;
   if(growthFile){
    const file=await realpath(path.resolve(growthFile));if((await stat(file)).size>1000000)throw Error('Use a saved Growth report smaller than 1 MB.');
    const raw=await readFile(file),report=parse(raw.toString('utf8'));
    if(report.property!=='sc-domain:brainilabgames.com'||report.seoExplorer?.domain!=='brainilabgames.com'||report.seoExplorer?.schemaVersion!==1)throw Error('Use the saved BrainiLab Growth report; no other property is accepted.');
    const models=docs.map(d=>({slug:d.slug,model:plan(d,inspect(d),report)}));
    if(models.some(x=>!x.model.growth.available))throw Error('The saved SEO Explorer evidence is invalid or unavailable; do not substitute zero metrics.');
    const context={version:1,sourceReportSha256:digest(raw),articles:models.map(({slug,model})=>({slug,linkTargetsSha256:linkHash(model),growth:model.growth}))};
    const bytes=Buffer.from(JSON.stringify(context,null,2)+'\n'),name='growth-context-'+digest(bytes).slice(0,16)+'.json';
    try{await writeFile(path.join(root,name),bytes,{flag:'wx'});}catch(e){if(e.code!=='EEXIST'||!bytes.equals(await readFile(path.join(root,name))))throw e;}
    growthContext={file:name,sha256:digest(bytes)};
   }
   const lessons=new Set((baseline.paths||[]).flatMap(p=>(p.document?.lessons||[]).map(l=>l.slug)));
   const categories=[...new Set(baseline.articles.map(x=>x.document.topic))].map(topic=>{const list=baseline.articles.filter(x=>x.document.topic===topic);return{topic,total:list.length,lessons:list.filter(x=>lessons.has(x.slug)).length,independent:list.filter(x=>!lessons.has(x.slug)).length};}).sort((a,b)=>a.independent-b.independent||a.topic.localeCompare(b.topic));
   const brief={version:2,createdAt:new Date().toISOString(),limits:'Private editorial record. Pending fields need real research and manual review; this tool does not invent demand or validate facts.',categories,...(growthContext?{growthContext}:{}),articles:docs.map(d=>({
    slug:d.slug,documentSha256:hashes.get(d.slug),readerQuestion:d.title,intent:'',whyThisAddsSomethingNew:'',
    demand:{status:'pending',query:'',market:'',language:'en',observedAt:null,provider:'',displayedMetric:null,intentMatch:{status:'pending',notes:''},evidence:[]},
    sources:(d.sources||[]).map(s=>({url:s.url,status:'pending',openedAt:null,claims:[],evidence:[]})),
    answerReview:{status:'pending',location:'',sourceUrls:[],notes:'Check the central answer and its attribution; no FAQ or AI-citation promise is required.'},
    linkReview:{status:'pending',checkedAt:null,notes:'Open the actual internal and external destinations and supporting passages. Saved Growth observations do not replace a live check.',evidence:[]},
    english:{status:'pending',notes:'',evidence:[]},cover:{status:'pending',notes:'Inspect the original, wide cover, square and small crops; verify rights, alt text and credit.',evidence:[]},mobile:{status:'pending',evidence:[]},desktop:{status:'pending',evidence:[]}
   }))};
   await writeFile(path.join(root,'editorial-brief.json'),JSON.stringify(brief,null,2)+'\n',{flag:'wx'});
   console.log('Created editorial-brief.json with pending research and review fields. Existing briefs are never overwritten.');return;
  }
  const seen=new Set(),items=[],manual=[];
  let brief=null;try{brief=await load('editorial-brief.json');}catch(e){if(e.code!=='ENOENT')throw e;}
  const dateOK=(value,age=30*86400000)=>typeof value==='string'&&Number.isFinite(Date.parse(value))&&Date.parse(value)<=Date.now()+300000&&Date.parse(value)>=Date.now()-age;
  const evidenceFile=async item=>{
   if(!item||typeof item.file!=='string'||!item.sha256)throw Error('incomplete reference');
   const target=await realpath(path.resolve(root,item.file)),rel=path.relative(root,target);
   if(rel.startsWith('..')||path.isAbsolute(rel))throw Error('outside folder');
   const bytes=await readFile(target);if(digest(bytes)!==item.sha256)throw Error('hash changed');return bytes;
  };
  const evidence=async(list,label)=>{
   if(!Array.isArray(list)||!list.length){manual.push(label+': add evidence files and their SHA-256 hashes.');return;}
   for(const item of list)try{await evidenceFile(item);}catch{manual.push(label+': evidence missing, changed or outside the private folder ('+String(item?.file||'incomplete reference')+').');}
  };
  let savedGrowth=null;
  if(brief?.growthContext)try{
   const context=parse((await evidenceFile(brief.growthContext)).toString('utf8'));
   if(context.version!==1||!Array.isArray(context.articles))throw Error('invalid context');savedGrowth=context.articles;
  }catch{manual.push('Saved Growth context is missing, changed or outside the private folder. Preserve its original provenance and re-review it.');}
  for(const d of docs){
   const found=baseline.articles.find(a=>a.slug===d.slug),result=inspect(d);
   if(seen.has(d.slug))result.problems.push({code:'duplicate-target',field:'article-slug',message:'Duplicate target URL in this batch.'});seen.add(d.slug);
   if(revision&&(!found||!Number.isInteger(found.revision)||found.revision<1))result.problems.push({code:'revision',field:'article-slug',message:'Revision mode needs an existing article and its current revision in the baseline.'});
   result.passed=!result.problems.length;
   const model=plan(d,result),saved=savedGrowth?.find(x=>x.slug===d.slug);
   if(saved){if(saved.linkTargetsSha256===linkHash(model))model.growth=saved.growth;else manual.push(d.slug+': link destinations changed after the saved Growth context. Preserve the old record and create a current private brief.');}
   else if(savedGrowth)manual.push(d.slug+': no matching article in the saved Growth context.');
   items.push({slug:d.slug,...result,evidence:model});
   const b=brief?.articles?.find(x=>x.slug===d.slug),label=d.slug;
   if(!b){manual.push(label+': create and complete the editorial brief.');continue;}
   if(b.documentSha256!==hashes.get(d.slug))manual.push(label+': the article changed after its brief was bound. Re-review the changed copy and update its hash.');
   if(!b.readerQuestion?.trim()||!b.intent?.trim()||!b.whyThisAddsSomethingNew?.trim())manual.push(label+': record intent and why this reading adds something new.');
   const demand=b.demand||{};
   if(demand.status!=='reviewed'||!demand.query?.trim()||!demand.market?.trim()||!demand.language?.trim()||!demand.provider?.trim()||!dateOK(demand.observedAt))manual.push(label+': add dated, relevant demand research from the last 30 days.');
   await evidence(demand.evidence,label+' demand');
   if(demand.intentMatch?.status!=='reviewed'||!demand.intentMatch.notes?.trim())manual.push(label+': explain how the observed query matches this question; keep broad or mixed-intent metrics separate.');
   for(const s of d.sources||[]){const source=b.sources?.find(x=>x.url===s.url);if(!source||source.status!=='reviewed'||!dateOK(source.openedAt)||!Array.isArray(source.claims)||!source.claims.length||source.claims.some(c=>!c.claim?.trim()||!c.location?.trim()||c.reviewed!==true))manual.push(label+': check the actual claims against '+s.url+'.');await evidence(source?.evidence,label+' source '+s.url);}
   if(brief.version>=2){
    const answer=b.answerReview;
    if(answer?.status!=='reviewed'||!answer.location?.trim()||!answer.notes?.trim()||!Array.isArray(answer.sourceUrls)||!answer.sourceUrls.length||answer.sourceUrls.some(u=>!d.sources?.some(s=>s.url===u)))manual.push(label+': review the central answer, its location and attribution to checked sources.');
    if(b.linkReview?.status!=='reviewed'||!dateOK(b.linkReview.checkedAt,86400000)||!b.linkReview.notes?.trim())manual.push(label+': check the actual link destinations within 24 hours and record the result.');
    await evidence(b.linkReview?.evidence,label+' links');
   }
   for(const key of ['english','cover','mobile','desktop'])if(b[key]?.status!=='reviewed')manual.push(label+': '+key+' review is pending.');
   for(const key of ['english','cover']){if(!b[key]?.notes?.trim())manual.push(label+': record the actual '+key+' review and its limits.');await evidence(b[key]?.evidence,label+' '+key);}
   await evidence(b.mobile?.evidence,label+' mobile');await evidence(b.desktop?.evidence,label+' desktop');
  }
  if(publish&&!dateOK(baseline.capturedAt,86400000))manual.push('Refresh the catalogue snapshot before publication: it must be from the last 24 hours.');
  const problems=items.flatMap(x=>x.problems.map(p=>({slug:x.slug,...p}))),warnings=items.flatMap(x=>x.warnings.map(p=>({slug:x.slug,...p})));
  const report={checkedAt:new Date().toISOString(),mode:revision?'revision':'new',publicationReview:publish,passed:!problems.length&&(!publish||!manual.length),problems,warnings,manualReviewPending:manual,articles:items.map(({slug,metrics,evidence})=>({slug,...metrics,linkPlan:evidence})),limits:'Structural checks and evidence completeness only. A reviewed label is a manual assertion, not independent verification of facts, demand, English or image rights. Saved Growth dates remain independent. Publishing still uses the guarded release workflow.'};
  await writeFile(path.join(root,'writing-review.json'),JSON.stringify(report,null,2)+'\n');
  const list=(heading,values)=>'<h2>'+heading+'</h2>'+(values.length?'<ul>'+values.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'<p>None.</p>');
  const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>BrainiLab writing review</title><style>body{font:16px/1.65 system-ui;background:#fffdf8;color:#242238;max-width:850px;margin:40px auto;padding:0 20px;overflow-wrap:anywhere}h1,h2{color:#2d296e}li{margin:8px 0}section{padding:16px 0;border-bottom:1px solid #ddd9e8}small{color:#656177}</style></head><body><h1>Writing review</h1><p>'+esc(report.passed?'Structural checks passed. Read the manual review notes before publication.':'Some checks need attention.')+'</p>'+items.map(x=>'<section><h2>'+esc(x.slug)+'</h2><p>'+x.metrics.words+' words · '+x.metrics.minutes+' min read · '+x.metrics.sections+' sections</p><details><summary>Search evidence &amp; link plan</summary>'+articleEvidenceHTML(x.evidence)+'</details></section>').join('')+list('Fix before publishing',problems.map(x=>x.slug+': '+x.message))+list('Writing suggestions',warnings.map(x=>x.slug+': '+x.message+(x.sectionIndex===undefined?'':' (section '+(x.sectionIndex+1)+')')+(x.excerpt?' — “'+x.excerpt+'”':'')))+list('Manual review',manual)+'<small>'+esc(report.limits)+'</small></body></html>';
  await writeFile(path.join(root,'writing-review.html'),html);
  console.log(JSON.stringify({passed:report.passed,problems:problems.length,suggestions:warnings.length,manualReviewPending:manual.length,report:'writing-review.html'}));
  if(!report.passed)process.exitCode=1;
 }finally{dom.window.close();}
}
