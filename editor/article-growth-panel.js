import {articleEvidence,articleEvidenceHTML,incomingArticleLinks} from './article-evidence.js';
import {publishedRecord} from '../lib/article-links.js';
import {readCurrentPage} from './growth-current-page.js';
import {pageLinksHTML} from './page-link-evidence.js';
import {pageSchemaHTML} from './page-schema-evidence.js';

// Read only, shared cache for this editor session. Never enters the CMS document.
export function bindArticleGrowthPanel({root,rpc,article,review,articles,cache}){
 const box=root.querySelector('#article-evidence'),button=box.querySelector('button'),status=box.querySelector('[role=status]'),body=box.querySelector('[data-article-evidence]');
 const publicPages=cache.publicPages??=new Map(),listeners=cache.publicPageListeners??=new Set();
 let disposed=false,loading=false,error='',incomingIndex=null;
 const publicURL=()=>{const slug=article()?.slug;return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug||'')&&articles().some(r=>(r.slug||r.document?.slug)===slug&&publishedRecord(r))?'https://brainilabgames.com/learn/'+slug+'/':null;};
 function publicHTML(){
  const url=publicURL(),o=url?publicPages.get(url):null;
  const state=o?.state==='loading'?'Reading the public HTML…':o?.state==='unavailable'?'The public page could not be read. Your draft and saved evidence are unchanged.':o?.state==='ready'?'Read '+o.checkedAt+'. This is the published response, separate from your draft.':'No public request has been made for this article in this editor session.';
  return '<section class="article-public-links"><h3>Compare with current public links and Article declarations</h3><button type="button" class="admin-button" data-article-check-public '+(!url||o?'disabled':'')+'>'+(o?.state==='loading'?'Reading public page…':o?'Public check recorded for this session':'Read current public page')+'</button><p role="status" aria-live="polite" tabindex="-1">'+state+'</p>'+(!url?'<p>A published article in the loaded catalogue is needed. New drafts are not fetched.</p>':o?.state==='ready'?pageLinksHTML(o)+pageSchemaHTML(o):'')+'<p class="article-help">One explicit click reads this exact public page without cookies, scripts or subresources. No link destinations are followed, draft text is changed, report is imported or indexing is requested. Results and errors are reused while this editor session stays open.</p></section>';
 }
 function update(){
  if(disposed)return;
  const active=body.ownerDocument.activeElement,open=box.open,publicFocus=!!active?.matches('[data-article-check-public],.article-public-links [role=status]');
  const disclosures=['.article-evidence-activity','.page-link-evidence','.page-schema-evidence'].map(selector=>{const d=body.querySelector(selector);return {selector,open:!!d?.open,focused:!!d&&active===d.querySelector(':scope > summary')};});
  status.textContent=loading?'Loading the saved report…':error||(!cache.report?'Load the existing Growth report. No Google query or website crawl is made.':'Saved report loaded. Source dates below are independent; nothing was added to the draft.');
  button.disabled=loading;button.textContent=cache.report?'Reload saved Growth report':'Load saved Growth report';box.open=open;
if(open){incomingIndex??=incomingArticleLinks(articles(),body.ownerDocument);body.innerHTML=publicHTML()+articleEvidenceHTML(articleEvidence(article(),{document:body.ownerDocument,articles:articles(),review:review(),report:cache.report,incomingIndex}));}
  for(const saved of disclosures){const d=body.querySelector(saved.selector);if(d)d.open=saved.open;}
  if(active===button)button.focus();
  else if(publicFocus)body.querySelector('.article-public-links [role=status]')?.focus();
  else {const saved=disclosures.find(d=>d.focused);if(saved)body.querySelector(saved.selector+' > summary')?.focus({preventScroll:true});}
 }
 button.onclick=async()=>{
  if(loading||disposed)return;loading=true;error='';update();
  try{const workspace=await rpc('admin_get_growth_workspace');if(disposed)return;const candidate=workspace?.report?.document;if(!candidate||!articleEvidence(article(),{document:body.ownerDocument,articles:[],report:candidate,incomingIndex:new Map()}).growth.available)error='No valid saved report is available. Existing evidence and your draft are unchanged.';else cache.report=candidate;}
  catch{if(!disposed)error='The saved report could not load. Existing evidence and your draft are unchanged. You can try again.';}
  finally{if(!disposed){loading=false;update();}}
 };
 body.onclick=async event=>{
  if(!event.target.closest('[data-article-check-public]')||disposed)return;
  const url=publicURL();if(!url||publicPages.has(url))return;
  publicPages.set(url,{state:'loading',url});update();
  const result=await readCurrentPage(url,body.ownerDocument.defaultView.fetch?.bind(body.ownerDocument.defaultView)||globalThis.fetch,body.ownerDocument);
  publicPages.set(url,result);for(const refresh of listeners)refresh();
 };
 listeners.add(update);
 box.ontoggle=()=>{if(box.open)update();};
 update();return {update,dispose(){disposed=true;listeners.delete(update);button.onclick=null;body.onclick=null;box.ontoggle=null;}};
}
