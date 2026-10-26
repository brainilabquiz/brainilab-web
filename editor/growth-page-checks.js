const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const technicalChecks={https:'HTTPS',available:'Available page',title:'One page title',description:'Search description',heading:'One main heading',canonical:'Self canonical',indexable:'No noindex directive',structuredData:'Parseable JSON-LD'};
export function publicPageURL(value){try{const u=new URL(value);return u.origin==='https://brainilabgames.com'&&!u.username&&!u.password&&!u.port&&!u.search&&!u.hash&&/^\/(?:[a-z0-9-]+\/)*(?:index\.html)?$/.test(u.pathname)&&!/^\/(admin|auth|account|profile)(\/|$)/.test(u.pathname)?u.href:null;}catch{return null;}}
const stamp=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v.slice(0,10)+'T00:00:00Z').toISOString().slice(0,10)===v.slice(0,10)?Date.parse(v):null;
const inspected=p=>!!p&&Number.isFinite(p.trust)&&p.trust>=0&&p.trust<=100&&Object.keys(technicalChecks).every(k=>typeof p.checks?.[k]==='boolean')&&stamp(p.checkedAt)!==null;
const displayDate=v=>stamp(v)!==null?new Date(v).toLocaleString('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'UTC'})+' UTC':'Unknown';
export const pageCheckScopes={all:'All observed entries',attention:'Failed checks to verify',aliases:'Legacy URL context',uninspected:'Not inspected'};
const labels={passed:'All eight checks passed',attention:'Failed checks to verify',alias:'Legacy alias · canonical unconfirmed',uninspected:'Not inspected'};
const digest=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v)&&v!=='e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'?v:null;
export function pageCheckContext(snapshot,page){
 if(!inspected(page))return {state:'uninspected',passed:null,failed:[],destination:null,label:labels.uninspected,text:'No complete dated checklist. Missing checks are unknown, not failures.'};
 const failed=Object.keys(technicalChecks).filter(k=>!page.checks[k]),passed=8-failed.length;
 const result={state:failed.length?'attention':'passed',passed,failed,destination:null,label:failed.length?labels.attention:labels.passed,text:failed.length?'Recheck the reported failures on the current public page before choosing a repair.':'Preserve the passing technical setup; this does not prove indexing, content quality or search authority.'};
 if(failed.length!==1||failed[0]!=='canonical'||!publicPageURL(page.url)||!page.url.endsWith('/index.html')||page.status!==200||!Array.isArray(snapshot?.pages))return result;
 const destinationURL=page.url.slice(0,-'index.html'.length);
 if(!publicPageURL(destinationURL)||/^\/(api|cdn-cgi)(\/|$)/.test(new URL(destinationURL).pathname)||page.finalUrl!==destinationURL||snapshot.pages.filter(p=>p.url===page.url).length!==1)return result;
 const matches=snapshot.pages.filter(p=>p.url===destinationURL);
 if(matches.length!==1)return result;
 const target=matches[0];
 // Only the same dated observation can resolve this context. A missing, older,
 // ambiguous or failing destination never clears the raw canonical failure.
 if(!inspected(target)||target.status!==200||target.finalUrl!==destinationURL||stamp(target.checkedAt)!==stamp(page.checkedAt)||stamp(snapshot.observedAt)!==stamp(page.checkedAt)||Object.keys(technicalChecks).some(k=>!target.checks[k]))return result;
 const canonicalConfirmed=!!digest(page.sha256)&&digest(page.sha256)===digest(target.sha256);
 return {...result,state:'alias',canonicalConfirmed,label:canonicalConfirmed?'Legacy alias · matching HTML response':labels.alias,destination:target,text:canonicalConfirmed?'The legacy request and clean destination have matching recorded HTML hashes in the same observation. The destination passed all eight checks. Keep the alias raw 7/8 result; do not propose a clean-page repair from this alias mismatch.':'The legacy request ended at a clean destination that separately passed all eight checks. Its response canonical was not retained and the two HTML responses are not proven identical. The alias canonical remains unconfirmed; inspect its exact response before diagnosing or editing the clean page.'};
}
export function canonicalContextHTML(context,withButton=true){
 if(context?.state!=='alias')return '';
 const t=context.destination;
 return `<aside class="growth-canonical-note"><strong>${esc(context.label)}</strong><p>${esc(context.text)}</p><p>Destination: <a href="${esc(t.url)}" target="_blank" rel="noopener noreferrer">${esc(new URL(t.url).pathname)}</a> · inspected ${esc(displayDate(t.checkedAt))}.</p>${withButton?`<button class="admin-button" type="button" data-seo-review-url="${esc(t.url)}">Review verified destination evidence</button>`:''}<p>Searches, backlinks and play sessions remain attached to their exact URLs. No Google-selected canonical, redirect status code or indexing verdict is inferred.</p></aside>`;
}
export function technicalView(snapshot,scope='all',filter=''){
 const mode=Object.hasOwn(pageCheckScopes,scope)?scope:'all',q=filter.trim().toLowerCase();
 const entries=(snapshot.pages||[]).map(p=>({page:p,context:pageCheckContext(snapshot,p)}));
 const counts=Object.fromEntries(['passed','attention','alias','uninspected'].map(state=>[state,entries.filter(r=>r.context.state===state).length]));
 counts.aliasConfirmed=entries.filter(r=>r.context.state==='alias'&&r.context.canonicalConfirmed).length;counts.aliasUnconfirmed=counts.alias-counts.aliasConfirmed;
 const selected=entries.filter(r=>(mode==='all'||(mode==='attention'?r.context.state==='attention'||r.context.state==='alias'&&!r.context.canonicalConfirmed:r.context.state===(mode==='aliases'?'alias':mode)))&&r.page.url.toLowerCase().includes(q));
 const rank={attention:0,uninspected:1,passed:2,alias:3},group=c=>c.state==='alias'&&!c.canonicalConfirmed?'attention':c.state;selected.sort((a,b)=>rank[group(a.context)]-rank[group(b.context)]||(a.context.passed??-1)-(b.context.passed??-1)||a.page.url.localeCompare(b.page.url));
 const heads=['Page & external evidence','Recorded checks passed','Recorded failures & context','Declared author','Outbound links','Inspected'];
 const exported=[['Page','HTTP status','Technical checks passed (of 8)','Failed checks','Declared author','External links','Checked at','Triage state','Observed final URL','Destination checked at','Canonical context','Requested response SHA256','Destination response SHA256']];
 const rows=selected.map(({page:p,context:c})=>{
  const rawFailed=c.passed===null?'Not inspected':c.failed.map(k=>technicalChecks[k]).join('; ');
  exported.push([p.url,p.status??'',c.passed??'',rawFailed,p.authorDeclared,p.externalSourceLinks,p.checkedAt,c.label,p.finalUrl||'',c.destination?.checkedAt||'',c.text,p.sha256||'',c.destination?.sha256||'']);
  const target=c.destination?.url||p.url;
  const links=(snapshot.backlinks||[]).filter(b=>b.targetUrl===p.url).length;
  return `<tr><th scope="row"><a href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">${esc(new URL(p.url).pathname)}</a><button class="admin-button" type="button" data-seo-review-url="${esc(target)}" aria-label="Review evidence for ${esc(new URL(target).pathname)}">${c.destination?'Review verified destination':'Review evidence'}</button><small>${esc(c.label)} · ${p.status?'HTTP '+esc(p.status):'Could not inspect'}</small><small>${links} verified incoming HTML links to this exact URL · aliases not merged</small></th><td><strong>${c.passed===null?'Not inspected':c.passed+' / 8 checks'}</strong></td><td>${c.state==='alias'?`<details class="growth-canonical-details"><summary>Compare alias and destination evidence</summary>${canonicalContextHTML(c,false)}</details>`:esc(c.passed===null?'Page could not be fully inspected':rawFailed||'All checklist checks passed')}</td><td>${c.passed===null?'—':p.authorDeclared?'Declared':'Not found'}</td><td>${c.passed===null?'—':esc(p.externalSourceLinks??'Not measured')}</td><td>${esc(displayDate(p.checkedAt))}</td></tr>`;
 });
 return {heads,rows,exported,counts,caption:`Page checks · ${pageCheckScopes[mode].toLowerCase()} · requested URLs remain separate`,note:`Snapshot entries: ${counts.attention} other failed checklists, ${counts.uninspected} not fully inspected, ${counts.aliasUnconfirmed} legacy aliases with an unconfirmed response canonical, ${counts.aliasConfirmed} aliases with matching HTML hashes and ${counts.passed} passing all eight checks. Unconfirmed aliases remain in Failed checks to verify. Raw results, dates and exact-URL evidence are preserved.`,help:'<p class="growth-small">Destination context requires exactly one independently inspected clean URL, all eight checks passed and the same capture time. This alone does not confirm the alias response canonical. Matching valid HTML hashes can establish the same response; different or missing hashes leave it unconfirmed. Missing, stale, duplicate or failing destinations keep the original failed-check triage. This view makes no new request or decision and does not establish Google indexing or authority.</p>'};
}
