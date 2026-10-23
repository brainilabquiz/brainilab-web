import {publicPageURL,technicalChecks} from './growth-seo-page.js';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dated=v=>Number.isFinite(Date.parse(v));
const date=v=>dated(v)?new Date(v).toISOString():'Not observed';
const link=(url,label)=>`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`;
function external(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!u.hash&&(!u.search||/^\?page=[1-9][0-9]{0,4}$/.test(u.search))&&/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(u.hostname)&&!u.hostname.endsWith('.local')&&!u.hostname.endsWith('.localhost')&&!/^(?:\d+\.){3}\d+$/.test(u.hostname)&&!['brainilabgames.com','www.brainilabgames.com','mail.google.com','accounts.google.com','docs.google.com','drive.google.com'].includes(u.hostname)?u.href:null;}catch{return null;}}

export const destinationStates={all:'All link destinations',review:'Needs a check',missing:'HTTP 404 / 410 observed',redirect:'Different final URL observed',noindex:'Noindex observed',canonical:'Canonical needs review',unknown:'Inspection incomplete or unavailable',responding:'Responding · no routing issue observed'};

export function linkDestinations(snapshot){
 const verified=new Map((snapshot?.sources||[]).filter(s=>s.state==='verified'&&dated(s.checkedAt)).map(s=>[s.url,s])),groups=new Map(),seen=new Set();
 for(const b of snapshot?.backlinks||[]){
  const target=publicPageURL(b.targetUrl),source=external(b.sourceUrl),observation=verified.get(source);
  if(!target||!source||!dated(b.verifiedAt)||!observation||observation.checkedAt!==b.verifiedAt||!Array.isArray(b.rel))continue;
  const key=JSON.stringify([source,target,[...new Set(b.rel)].sort()]);if(seen.has(key))continue;seen.add(key);
  if(!groups.has(target))groups.set(target,[]);groups.get(target).push(b);
 }
 return [...groups].map(([url,links])=>{
  const page=(snapshot.pages||[]).find(p=>p.url===url),complete=!!page&&dated(page.checkedAt)&&page.trust!==null&&page.checks?.available===true&&Object.keys(technicalChecks).every(k=>typeof page.checks[k]==='boolean')&&page.status>=200&&page.status<300&&!!publicPageURL(page.finalUrl);
  let state='unknown',next='Inspect this exact live URL before diagnosing a problem. A missing or blocked inspection is not a broken link.';
  if(page&&dated(page.checkedAt)&&[404,410].includes(page.status)){state='missing';next='Confirm the response on the live URL, then restore the intended page or review a relevant redirect. Keep existing game progress intact.';}
  else if(complete){
   if(page.finalUrl!==url){state='redirect';next='Check that the final page still leads to the intended game or article. A different final URL alone is not a broken link.';}
   else if(!page.checks.indexable){state='noindex';next='Check whether the noindex directive is intentional before changing it. This observation is not Google indexing status.';}
   else if(!page.checks.canonical){state='canonical';next='Inspect the canonical on this exact URL. An index.html alias may intentionally point to its preferred URL; do not merge its evidence.';}
   else{state='responding';next='Preserve the working route. Review the page evidence and a relevant path into play before proposing an editorial change.';}
   const extra=Object.keys(technicalChecks).filter(k=>!page.checks[k]);
   if(extra.length)next+=' Checklist observations to review: '+extra.map(k=>technicalChecks[k]).join(', ')+'.';
  }
  return {url,links,page,state,next,complete,sourcePages:[...new Set(links.map(b=>b.sourceUrl))].sort(),linkObservedAt:links.map(b=>b.verifiedAt).sort((a,b)=>Date.parse(b)-Date.parse(a))[0]};
 }).sort((a,b)=>['missing','noindex','redirect','canonical','unknown','responding'].indexOf(a.state)-['missing','noindex','redirect','canonical','unknown','responding'].indexOf(b.state)||a.url.localeCompare(b.url));
}

export function destinationsView(snapshot,filter='all',query=''){
 const all=linkDestinations(snapshot),q=query.trim().toLowerCase(),items=all.filter(r=>(filter==='all'||filter==='review'&&r.state!=='responding'||r.state===filter)&&[r.url,...r.sourcePages,...r.links.map(b=>b.anchor)].join(' ').toLowerCase().includes(q));
 const heads=['Exact link destination','Observed response','Source evidence','Next check'],caption='Incoming link destinations · exact URLs, saved observations';
 const exported=[['Target URL','State','HTTP status','Final URL','Page inspected at','Link verified at','Source pages','Verified HTML links in sample','Next check']];
 const rows=items.map(r=>{
  exported.push([r.url,destinationStates[r.state],r.page?.status||'',r.page?.finalUrl||'',r.page?.checkedAt||'',r.linkObservedAt,r.sourcePages.join(' '),r.links.length,r.next]);
  return `<tr class="growth-link-destination"><th scope="row">${link(r.url,new URL(r.url).pathname)}<button type="button" class="admin-button" data-seo-review-url="${esc(r.url)}" aria-label="Review evidence for ${esc(new URL(r.url).pathname)}">Review evidence</button></th><td><strong>${esc(destinationStates[r.state])}</strong><small>${r.page?.status?'HTTP '+esc(r.page.status):'No usable response recorded'} · ${esc(date(r.page?.checkedAt))}</small>${r.page?.finalUrl&&publicPageURL(r.page.finalUrl)?`<small>Final: ${link(r.page.finalUrl,new URL(r.page.finalUrl).pathname)}</small>`:''}</td><td>${r.links.length} HTML link${r.links.length===1?'':'s'} · ${r.sourcePages.length} source page${r.sourcePages.length===1?'':'s'}<small>Links verified ${esc(date(r.linkObservedAt))}</small><details><summary>Show recorded sources</summary><ul>${r.sourcePages.map(s=>`<li>${link(s,new URL(s).hostname+new URL(s).pathname+new URL(s).search)}</li>`).join('')}</ul></details></td><td>${esc(r.next)}</td></tr>`;
 });
 return {heads,rows,caption,exported,note:`${all.length} exact destinations in the verified HTML sample · ${all.filter(r=>r.state==='unknown').length} without a completed inspection. The crawl shares a 250-page budget; uncovered targets remain unknown. Aliases are not merged.`,help:'<p class="growth-small">Page and source observations have their own dates. This view does not start a crawl, edit redirects or contact a publisher. Responding does not guarantee content quality, Google indexing, ranking value or an AI citation. No visits or players are attributed to a backlink.</p>'};
}
