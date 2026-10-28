import {comparison} from './growth-followup.js';
import {currentDecisions} from './growth-seo-actions.js';
import {pagePlayEvidence} from './growth-page-play.js';
import {csvCell} from './growth-search.js';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const scopes={all:'All next moves',approved:'Resume approved work',pending:'Review pending proposals',ready:'Review comparable results',needs_data:'Needs matching evidence',waiting:'Waiting for full days',conflict:'Reconcile records'};
const order={approved:0,conflict:1,ready:2,pending:3,needs_data:4,waiting:5};
const num=v=>typeof v==='number'&&Number.isFinite(v)?v.toLocaleString('en-GB',{maximumFractionDigits:2}):'Unknown';
const range=p=>p?`${p.start} to ${p.end} · ${p.timezone}`:'Not available';
const title={approved:'Resume the approved change',pending:'Review before approving',conflict:'Reconcile conflicting records',ready:'Review the observed result',waiting:'Let the observation window finish',needs_data:'Load matching evidence'};
const fullCSV=['Page','Decision ID','Revision','Next move','Reason','Publication day (Pacific)','Baseline start','Baseline end','Earliest follow-up start','Earliest follow-up end','Loaded period start','Loaded period end','Search timezone','Before clicks','After clicks','Before impressions','After impressions','Before CTR','After CTR','Before historical position','After historical position','Separate Google organic landing sessions','Separate Google organic sessions with a start','Play period start','Play period end','Play timezone','Landing baseline collected','Landing starts collected','Play quality','Baseline filters','Loaded filters','Verified publication reference','Interpretation'];

export function workbenchRows(workspace,now=Date.now()){
 const decisions=currentDecisions(workspace);if(!decisions)return null;
 const groups=new Map();for(const d of decisions){if(!groups.has(d.url))groups.set(d.url,[]);groups.get(d.url).push(d);}
 return [...groups].flatMap(([url,records])=>{
  if(records.every(d=>d.state==='dismissed'))return [];
  const conflict=records.length!==1,d=records[0],published=['published','monitoring'].includes(d.state),followup=!conflict&&published?comparison(d,workspace.report,workspace.reports,now):null;
  const state=conflict?'conflict':published?(followup.status==='unpublished'?'needs_data':followup.status):d.state;
  if(!Object.hasOwn(order,state))return [];
  const play=pagePlayEvidence(workspace.report?.document,url),organic=play?.cohorts.find(c=>c.key==='googleOrganic');
  return [{url,records,state,followup,play:play?{period:play.snapshot.period,timezone:play.snapshot.timezone,cohort:organic}:null,message:conflict?'Review the loaded records together. None is promoted as approved.':followup?.message|| (state==='approved'?'Read the recorded decision and current page before resuming. Approval does not prove the old brief still needs an edit.':'Review the query, current page and prior work. Pending is not permission to publish.')}];
 }).sort((a,b)=>order[a.state]-order[b.state]||(a.followup?.earliestPeriod?.end||'').localeCompare(b.followup?.earliestPeriod?.end||'')||a.url.localeCompare(b.url));
}

export function workbenchCSV(rows){
 return [fullCSV,...rows.flatMap(r=>r.records.map(d=>{const f=r.followup,c=r.play?.cohort,p=r.play?.period;return [r.url,d.id,d.revision,title[r.state],f?.reason||r.state,f?.publishedDay,f?.baseline?.start,f?.baseline?.end,f?.earliestPeriod?.start,f?.earliestPeriod?.end,f?.currentPeriod?.start,f?.currentPeriod?.end,f?.baseline?.timezone,f?.before?.clicks,f?.after?.clicks,f?.before?.impressions,f?.after?.impressions,f?.before?.ctr,f?.after?.ctr,f?.before?.position,f?.after?.position,c?.row?.sessions,c?.row?.sessionsWithStart,p?.start,p?.end,r.play?.timezone,c?.baselineAt,c?.startsAt,c?.quality,f?.baselineScope,f?.currentScope,f?.publicationReference||'',r.message+' Play is a separate dated observation, not a before/after result, keyword conversion or completed game.'];}))];
}

function detail(r){
 const f=r.followup,c=r.play?.cohort;
 const measurement=f?`<dl><dt>Original baseline</dt><dd>${esc(range(f.baseline))}</dd><dt>Original scope</dt><dd>${esc(f.baselineScope)}</dd><dt>Earliest full follow-up</dt><dd>${esc(range(f.earliestPeriod))}</dd><dt>Loaded Search Console period</dt><dd>${esc(range(f.currentPeriod))}</dd><dt>Loaded scope</dt><dd>${esc(f.currentScope)}</dd></dl>${f.ready?'<table><caption>Observed Search Console page counts · no causal conclusion</caption><thead><tr><th scope="col">Metric</th><th scope="col">Before</th><th scope="col">After</th></tr></thead><tbody>'+['clicks','impressions','ctr','position'].map(k=>'<tr><th scope="row">'+esc(k==='position'?'Historical average position':k==='ctr'?'CTR':k)+'</th><td>'+esc(k==='ctr'&&f.before[k]!==null?num(100*f.before[k])+'%':num(f.before[k]))+'</td><td>'+esc(k==='ctr'&&f.after[k]!==null?num(100*f.after[k])+'%':num(f.after[k]))+'</td></tr>').join('')+'</tbody></table>':''}`:'';
 const play=r.play?`<p><strong>Separate Google / organic play observation</strong><br>${esc(range({...r.play.period,timezone:r.play.timezone}))}. Landing sessions: ${esc(num(c?.row?.sessions))}; sessions with a recorded start: ${esc(num(c?.row?.sessionsWithStart))}. Baseline collected ${esc(c?.baselineAt||'unknown')}; starts collected ${esc(c?.startsAt||'unknown')}. ${esc(c?.quality||'Quality unknown')}.</p>`:'<p>No validated exact-landing play observation is available.</p>';
 return `<details><summary>Evidence and measurement plan</summary>${measurement}${play}<p class="growth-small">Play is shown for its own period and scope. It is not a before/after outcome, completed games, unique players or keyword conversion. Missing counts remain unknown. Nothing here runs a query, changes a decision or proves that an edit worked.</p></details>`;
}

export function workbenchHTML(){return `<section class="growth-workbench" aria-labelledby="growth-workbench-title"><header><p class="admin-eyebrow">From evidence to a next move</p><h2 id="growth-workbench-title">What needs your attention?</h2><p>Resume approved work first. Review published changes only when the original baseline and a full matching period can be compared.</p></header><div class="growth-workbench-controls"><label>Find a page<input type="search" data-workbench-search placeholder="e.g. number-route or learn"/></label><label>Next move<select data-workbench-state>${Object.entries(scopes).map(([k,v])=>'<option value="'+k+'">'+v+'</option>').join('')}</select></label><button type="button" class="admin-button" data-workbench-export>Download this worklist</button></div><p data-workbench-status class="growth-small" role="status" aria-live="polite"></p><div data-workbench-results></div><p class="growth-small">Uses the current loaded decisions and saved report. Reopen Growth before acting if records may have changed. Priority reflects recorded work and measurement readiness, with no opportunity score or traffic forecast. Baselines, published work and set-aside decisions are preserved.</p></section>`;}

export function bindWorkbench(root,workspace,now=Date.now()){
 const panel=root.querySelector('.growth-workbench');if(!panel)return;
 const rows=workbenchRows(workspace,now),search=panel.querySelector('[data-workbench-search]'),select=panel.querySelector('[data-workbench-state]'),results=panel.querySelector('[data-workbench-results]'),status=panel.querySelector('[data-workbench-status]'),button=panel.querySelector('[data-workbench-export]');let selected=[],page=0;
 results.insertAdjacentHTML('afterend','<div class="growth-workbench-pages"><button type="button" class="admin-button" data-workbench-prev>Previous</button><span data-workbench-page></span><button type="button" class="admin-button" data-workbench-next>Next</button></div>');
 const draw=()=>{
  const q=search.value.trim().toLowerCase();selected=(rows||[]).filter(r=>(r.url+' '+title[r.state]).toLowerCase().includes(q)&&(select.value==='all'||r.state===select.value));
  status.textContent=rows===null?'Current decisions are incomplete. Reload Growth before choosing work.':`${selected.length} page${selected.length===1?'':'s'} in this worklist · ${(rows||[]).filter(r=>r.state==='approved').length} approved · ${(rows||[]).filter(r=>r.state==='ready').length} with comparable search evidence.`;
  button.disabled=!selected.length;
  const pages=Math.max(1,Math.ceil(selected.length/5));page=Math.min(page,pages-1);
  panel.querySelector('[data-workbench-page]').textContent=`Page ${page+1} of ${pages}`;panel.querySelector('[data-workbench-prev]').disabled=page===0;panel.querySelector('[data-workbench-next]').disabled=page===pages-1;
  results.innerHTML=selected.length?'<ol class="growth-workbench-list">'+selected.slice(page*5,page*5+5).map(r=>'<li><div><h3>'+esc(new URL(r.url).pathname)+'</h3><strong class="growth-workbench-state">'+esc(title[r.state])+'</strong></div><p>'+esc(r.message)+'</p>'+detail(r)+'<div class="growth-workbench-actions">'+r.records.map(d=>'<button type="button" class="admin-button" data-workbench-open="'+d.id+'" data-followup="'+!!r.followup+'">'+(r.followup?'Open publication history':r.state==='conflict'?'Open record '+d.id:'Open recorded decision')+'</button>').join('')+'</div></li>').join('')+'</ol>':'<p class="growth-small">'+(rows===null?'No actionable worklist is inferred from incomplete decisions.':rows.length?'No pages match these controls.':'No active or published decisions are loaded. Review the existing SEO Explorer evidence before creating work.')+'</p>';
  results.querySelectorAll('[data-workbench-open]').forEach(b=>b.onclick=()=>{
   const id=Number(b.dataset.workbenchOpen);if(!Number.isSafeInteger(id))return;
   const card=root.querySelector(`[data-opportunity="${id}"]`);if(!card)return;
   const filter=root.querySelector('[data-growth-filter]');if(filter){filter.value='all';filter.dispatchEvent(new filter.ownerDocument.defaultView.Event('change'));}
   card.hidden=false;const sections=card.querySelectorAll(':scope > details'),target=b.dataset.followup==='true'?sections[1]:sections[0];if(target)target.open=true;
   card.focus();card.scrollIntoView?.({block:'start',behavior:'auto'});
  });
 };
 search.addEventListener('input',()=>{page=0;draw();});select.addEventListener('change',()=>{page=0;draw();});
 panel.querySelector('[data-workbench-prev]').onclick=()=>{page--;draw();};panel.querySelector('[data-workbench-next]').onclick=()=>{page++;draw();};
 button.onclick=()=>{const text=workbenchCSV(selected).map(r=>r.map(csvCell).join(',')).join('\r\n'),url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'})),a=panel.ownerDocument.createElement('a');a.href=url;a.download='brainilab-growth-worklist.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 draw();
}
