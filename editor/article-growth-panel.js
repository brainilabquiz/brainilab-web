import {articleEvidence,articleEvidenceHTML,incomingArticleLinks} from './article-evidence.js';

// Read only, shared cache for this editor session. Never enters the CMS document.
export function bindArticleGrowthPanel({root,rpc,article,review,articles,cache}){
 const box=root.querySelector('#article-evidence'),button=box.querySelector('button'),status=box.querySelector('[role=status]'),body=box.querySelector('[data-article-evidence]');
 let disposed=false,loading=false,error='',incomingIndex=null;
 function update(){
  if(disposed)return;
  const active=body.ownerDocument.activeElement,open=box.open;
  status.textContent=loading?'Loading the saved report…':error||(!cache.report?'Load the existing Growth report. No Google query or website crawl is made.':'Saved report loaded. Source dates below are independent; nothing was added to the draft.');
  button.disabled=loading;button.textContent=cache.report?'Reload saved Growth report':'Load saved Growth report';box.open=open;
  if(open){incomingIndex??=incomingArticleLinks(articles(),body.ownerDocument);body.innerHTML=articleEvidenceHTML(articleEvidence(article(),{document:body.ownerDocument,articles:articles(),review:review(),report:cache.report,incomingIndex}));}
  if(active===button)button.focus();
 }
 button.onclick=async()=>{
  if(loading||disposed)return;loading=true;error='';update();
  try{const workspace=await rpc('admin_get_growth_workspace');if(disposed)return;cache.report=workspace?.report?.document||null;if(!cache.report)error='No saved report is available. Your draft is unchanged.';}
  catch{if(!disposed)error='The saved report could not load. Existing evidence and your draft are unchanged. You can try again.';}
  finally{if(!disposed){loading=false;update();}}
 };
 box.ontoggle=()=>{if(box.open)update();};
 update();return {update,dispose(){disposed=true;button.onclick=null;box.ontoggle=null;}};
}
