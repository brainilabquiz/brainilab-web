import {contentHTML,bindContent} from './growth-content.js';
import {searchHTML,bindSearch} from './growth-search.js';
import {seoHTML,bindSEO,createPageCheckSession} from './growth-seo-explorer.js';
import {playSessionsHTML,bindPlaySessions} from './growth-play-sessions.js';
import {indexingHTML,bindIndexing} from './growth-indexing.js';
import {distributionHTML,bindDistribution} from './growth-distribution.js';
import {toolsHTML,bindTools,connectionText} from './growth-tools.js';
import {openSEOHTML,bindOpenSEO,evidenceLink} from './growth-openseo.js';
import {confirmationsHTML} from './growth-confirmations.js';
import {comparison} from './growth-followup.js';
import {workbenchHTML,bindWorkbench} from './growth-workbench.js';
import {bindGrowthNavigation} from './growth-navigation.js';
export {comparison};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeURL=value=>{try{const u=new URL(value);return u.protocol==='https:'&&['brainilabgames.com','github.com','developers.google.com'].includes(u.hostname)?u.href:null;}catch{return null;}};
const link=(url,text)=>safeURL(url)?`<a href="${esc(safeURL(url))}" target="_blank" rel="noopener noreferrer">${esc(text)}</a>`:esc(text);
const number=v=>v===null||v===undefined?'—':Number(v).toLocaleString('en-GB',{maximumFractionDigits:2});
const metric=(key,value)=>key==='ctr'&&value!=null?number(value*100)+'%':number(value);
const labels={pending:'Pending review',approved:'Approved',published:'Published',monitoring:'In follow-up',dismissed:'Set aside'};
const transitions={pending:['pending','approved','dismissed'],approved:['approved','pending','published','dismissed'],published:['published','monitoring'],monitoring:['monitoring'],dismissed:['dismissed','pending']};
let context,workspace,epoch=0,busy=false,dirty=false,area='overview',releaseNavigation=()=>{};
let refreshPending=false;
let pageCheckSession=createPageCheckSession();
const decisionDrafts=new Set();
function status(message){const el=context?.root.querySelector('[data-growth-status]');if(el)el.textContent=message;}
function summary(){
 const r=workspace.report?.document,s=r?.propertySummary;
 return `<header class="growth-lead"><div><p class="admin-eyebrow">BrainiLab Growth</p><h2>A useful next move.</h2><p>Turn real search signals into a change you can review, publish and learn from.</p><p><a class="admin-button" href="/admin/growth-studio/" target="_blank" rel="noopener noreferrer">Open portable client workspace ↗</a></p></div><span class="growth-mode">Private · Search Console</span></header>${s?`<div class="growth-metrics">${[['Clicks',s.clicks],['Impressions',s.impressions],['CTR',s.ctr==null?'—':number(s.ctr*100)+'%'],['Visible queries',s.queryRows]].map(([name,value])=>`<div><span>${name}</span><strong>${esc(typeof value==='number'?number(value):value)}</strong></div>`).join('')}</div><p class="growth-period">Data: <strong>${esc(r.availablePeriod.start)} to ${esc(r.availablePeriod.end)}</strong> · Search Console dates (Pacific time). Imported ${esc(new Date(workspace.report.importedAt).toLocaleDateString('en-GB'))}.</p><p class="growth-caution">Visible queries cover ${number(s.visibleQueryImpressions)} of ${number(s.impressions)} impressions. Hidden queries are not assigned to guessed keywords. These figures are a historical baseline.</p>`:'<section class="admin-panel" data-growth-first-report><h3>Start with your first report</h3><p>Import the JSON report produced by the private Growth importer. No sample numbers are shown here.</p></section>'}`;
}
function proposalCard(o){
 const p=o.proposal,e=p.pageEvidence||{},base=workspace.reports.find(r=>r.id===o.baseline_report)?.period;
 const cmp=comparison(o,workspace.report,workspace.reports);
 return `<article class="growth-proposal" data-opportunity="${o.id}" tabindex="-1"><header><div><p class="admin-eyebrow">${esc(p.priority||'Opportunity')}</p><h3>${esc(p.name)}</h3>${link(o.url,'Open existing page ↗')}</div><span class="growth-state" data-state="${esc(o.state)}">${labels[o.state]}</span></header><p>${esc(p.hypothesis)}</p><dl class="growth-evidence"><div><dt>Impressions</dt><dd>${number(e.impressions)}</dd></div><div><dt>Clicks</dt><dd>${number(e.clicks)}</dd></div><div><dt>Avg. position</dt><dd>${number(e.position)}</dd></div></dl><p class="growth-small">Baseline ${esc(base?.start||'unknown')}–${esc(base?.end||'unknown')} · ${esc(p.confidence)}</p><details><summary>Review the proposed change</summary><h4>What we have now</h4><p>${esc(p.currentTitle?.[0]||'Title not captured')}</p><p>${esc(p.brief?.finding||p.nextAction)}</p><h4>Proposed copy / action</h4><p class="growth-copy">${esc(p.brief?.proposedCopy||p.nextAction)}</p>${p.brief?.checks?.length?`<h4>Before publication</h4><ul>${p.brief.checks.map(c=>`<li>${esc(c)}</li>`).join('')}</ul>`:''}<h4>Search evidence</h4>${p.queryEvidence?.length?`<ul>${p.queryEvidence.map(q=>`<li><strong>${esc(q.value)}</strong> · ${number(q.impressions)} impressions · position ${number(q.position)}</li>`).join('')}</ul>`:'<p>No query-level evidence imported.</p>'}<p>Evidence snapshot: <code>${esc(p.querySourceSnapshot||p.pageSourceSnapshot||'Not supplied')}</code></p><h4>Existing supporting pages</h4><ul>${(p.existingLearnLinks||[]).map(u=>`<li>${link(u,safeURL(u)?new URL(u).pathname:'Invalid supporting URL')}</li>`).join('')}</ul><form data-growth-form="${o.id}"><label>Decision<select name="state">${transitions[o.state].map(s=>`<option value="${s}">${labels[s]}</option>`).join('')}</select></label><label>What did you decide or change?<textarea name="note" required minlength="5" maxlength="3000" rows="3" placeholder="Explain the decision so we can review it later."></textarea></label><label>Verified page or GitHub change URL <span>(required to record publication)</span><input name="reference" type="url" value="${esc(o.change_reference||'')}" maxlength="1000"/></label><p class="growth-small">Saving a decision does not publish website content. Record publication only after the change is live and checked.</p><button class="admin-button primary" type="submit">Save decision</button></form></details><details><summary>Follow-up and change history</summary><p>${esc(cmp.message)}</p>${cmp.ready?`<div class="growth-table"><table><thead><tr><th>Metric</th><th>Before</th><th>After</th></tr></thead><tbody>${['clicks','impressions','ctr','position'].map(k=>`<tr><th>${esc(k)}</th><td>${metric(k,cmp.before?.[k])}</td><td>${metric(k,cmp.after?.[k])}</td></tr>`).join('')}</tbody></table></div>`:''}<ol class="growth-history">${workspace.events.filter(e=>e.opportunity_id===o.id).map(e=>`<li><strong>${esc(labels[e.to_state])}</strong> · <time>${esc(new Date(e.created_at).toLocaleString('en-GB'))}</time><p>${esc(e.note)}</p></li>`).join('')}</ol></details></article>`;
}
function draw(decisionFilter='all'){
 const renderedEpoch=epoch;
 const drafts=[...decisionDrafts].map(form=>({form,open:form.closest('details')?.open??true}));
 releaseNavigation();
 context.root.innerHTML=`<div class="growth-workspace" data-growth>${summary()}${contentHTML(workspace.report?.document)}${toolsHTML(workspace.report?.document)}<div class="growth-toolbar"><h2>Decisions & follow-up</h2><label>Show<select data-growth-filter><option value="all">All decisions</option>${Object.entries(labels).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label></div><div class="growth-proposals">${workspace.opportunities.map(proposalCard).join('')||'<p>No proposals yet. Import a report with evidence-linked opportunities.</p>'}</div><p data-growth-empty hidden>No proposals match this filter.</p><section class="growth-import admin-panel"><h2>Data & connection</h2><p>${esc(connectionText(workspace.report?.document))} No Google credentials are stored in this page.</p><form data-growth-import><label>Growth report JSON<input type="file" name="report" accept="application/json,.json" required/></label><button class="admin-button" type="submit">Import report</button></form><details><summary>Set up the read-only Google connection</summary><p>Use the private Search Console connector with a Google OAuth desktop client and the <code>webmasters.readonly</code> scope. An owner must authorize that connection in Google. Keep the client file and refresh token on the private machine, outside the website.</p><p>The prepared connector exports to the same importer. The daily local exporter reuses a verified same-day report. Importing it preserves earlier decisions and their baselines.</p>${link('https://developers.google.com/webmaster-tools/v1/how-tos/authorizing','Google authorization documentation ↗')}</details><p class="growth-small">Imports add a dated report and new opportunities. Existing decisions and their original baselines are preserved.</p></section><p data-growth-status role="status" aria-live="polite"></p></div>`;
 const root=context.root;
 root.querySelector('.growth-lead').insertAdjacentHTML('afterend',distributionHTML(workspace.report?.document));
 bindDistribution(root,workspace.report?.document);
 root.querySelector('.growth-distribution').insertAdjacentHTML('afterend',searchHTML(workspace.report?.document));
 bindSearch(root,workspace.report?.document);
 root.querySelector('#growth-search').insertAdjacentHTML('afterend',playSessionsHTML(workspace.report?.document)+indexingHTML(workspace.report?.document));
 bindPlaySessions(root,workspace.report?.document);bindIndexing(root,workspace.report?.document);
 root.querySelector('.growth-search').insertAdjacentHTML('beforebegin',seoHTML(workspace.report?.document));
 bindSEO(root,workspace.report?.document,workspace,pageCheckSession);
 root.querySelector('.growth-import').insertAdjacentHTML('beforebegin','<div data-growth-confirmations>'+confirmationsHTML(workspace.confirmedAccounts)+'</div>');
 root.querySelector('.growth-import').insertAdjacentHTML('beforebegin',openSEOHTML(workspace.report?.document));
 bindOpenSEO(root);
 root.querySelector('.growth-lead').insertAdjacentHTML('afterend',workbenchHTML());
 workspace.opportunities.filter(o=>o.proposal?.provider==='openseo').forEach(o=>{
  const card=root.querySelector(`[data-opportunity="${Number(o.id)}"]`),e=o.proposal.providerEvidence;
  if(!card||!e)return;
  card.querySelector('header').insertAdjacentHTML('afterend',`<p class="growth-copy"><strong>OpenSEO evidence</strong> · ${esc(e.country)} · ${esc(e.language)} · ${esc(e.observedAt)}<br>Estimated monthly searches: ${number(e.estimatedMonthlySearches)}. Estimates are not measured visits.</p>`);
  const detail=card.querySelector('details');
  detail.insertAdjacentHTML('beforeend',`<p>${esc(e.finding)}</p><ul>${(e.sources||[]).map(s=>`<li>${evidenceLink(s,s)}</li>`).join('')}</ul>`);
 });
 bindTools(root,workspace.report?.document); bindContent(root,workspace.report?.document);
 // Keep other edited forms mounted, including native selection and their
 // original revision-bound handlers. A refreshed record cannot rebase a draft.
 const retained=new Set(drafts.map(d=>d.form));
 for(const {form,open}of drafts){
  const id=form.dataset.growthForm,slots=[...root.querySelectorAll('[data-growth-form]')].filter(f=>f.dataset.growthForm===id),records=workspace.opportunities.filter(o=>String(o.id)===id);
  if(slots.length===1&&records.length===1){slots[0].replaceWith(form);form.closest('details').open=open;}
  else{const recovery=root.ownerDocument.createElement('article');recovery.className='growth-proposal';root.querySelector('.growth-proposals').append(recovery);recovery.append(form);}
  if(records.length!==1||String(records[0].revision)!==form.dataset.growthRevision){const warning=root.ownerDocument.createElement('p');warning.className='growth-caution';warning.dataset.growthDraftWarning='';warning.textContent='This record changed or is no longer loaded. Your unsaved draft is kept at its original revision. Copy it before reloading Growth to review the current decision; it cannot be saved onto the newer record.';form.before(warning);}
 }
 const filter=root.querySelector('[data-growth-filter]');
 const cards=root.querySelectorAll('.growth-proposals > [data-opportunity]');
 function filterDecisions(){
  let matches=0;
  for(const card of cards){
   const selected=filter.value==='all'||card.querySelector('.growth-state').dataset.state===filter.value;
   if(selected)matches++;
   card.hidden=!selected&&!card.querySelector('[data-growth-draft-warning]');
  }
  root.querySelector('[data-growth-empty]').hidden=!cards.length||matches>0;
 }
 filter.value=decisionFilter;
 filter.onchange=filterDecisions;
 filterDecisions();
 root.querySelectorAll('[data-growth-form]').forEach(form=>{
  if(retained.has(form))return;
  const o=workspace.opportunities.find(o=>String(o.id)===form.dataset.growthForm);form.dataset.growthRevision=String(o.revision);
  form.oninput=()=>{if(renderedEpoch===epoch&&root.contains(form)){decisionDrafts.add(form);dirty=true;}};
  form.onsubmit=async e=>{
   e.preventDefault();if(renderedEpoch!==epoch||!root.contains(form)||busy||refreshPending||!form.reportValidity())return;
   const records=workspace.opportunities.filter(d=>d.id===o.id);
   if(records.length!==1||records[0].revision!==o.revision||records[0].url!==o.url||records[0].state!==o.state||records[0].baseline_report!==o.baseline_report){status('This decision changed. Your draft is preserved; copy it before reloading Growth to review the current record.');return;}
   decisionDrafts.add(form);dirty=true;const f=new FormData(form);
   await mutate('admin_update_growth_opportunity',{p_id:o.id,p_revision:o.revision,p_state:f.get('state'),p_note:f.get('note'),p_reference:f.get('reference')},'Decision saved. Website content was not published.',form);
  };
 });
 const importer=root.querySelector('[data-growth-import]');
 importer.onsubmit=async e=>{
  e.preventDefault();
  const file=importer.elements.report.files[0];
  if(!file||renderedEpoch!==epoch||!root.contains(importer)||busy||refreshPending)return;
  if(dirty){status('Save your decision before importing another report.');return;}
  try{
   if(file.size>1000000)throw Error('Use a report smaller than 1 MB.');
   const data=JSON.parse(await file.text());
   if(renderedEpoch!==epoch||!root.contains(importer)||busy||refreshPending)return;
   if(dirty){status('Save your decision before importing another report.');return;}
   await mutate('admin_import_growth_report',{p_report:data},'Report imported. Existing decisions and baselines were preserved.');
  }catch(error){if(renderedEpoch===epoch)status(error.message||'Invalid report file.');}
 };
 bindWorkbench(root,workspace);
 releaseNavigation=bindGrowthNavigation(root,{initial:area,onChange:value=>{area=value;}});
}
async function refreshAfterSave(ctx,run,message){
 refreshPending=true;
 const submits=[...ctx.root.querySelectorAll('[data-growth-form] button[type="submit"],[data-growth-import] button[type="submit"]')].filter(button=>!button.disabled);
 for(const button of submits)button.disabled=true;
 let retry;
 async function reload(){
  if(run!==epoch||busy||!refreshPending||(retry&&!ctx.root.contains(retry)))return;
  busy=true;
  if(retry)retry.disabled=true;
  try{
   const updated=await ctx.rpc('admin_get_growth_workspace');
   if(run!==epoch)return;
   workspace=updated;
   draw(ctx.root.querySelector('[data-growth-filter]').value);
   refreshPending=false;
   for(const button of submits)if(button.isConnected)button.disabled=false;
   status(message+(dirty?' Other unsaved decisions were kept.':''));
   const result=ctx.root.querySelector('[data-growth-status]');
   result.tabIndex=-1;
   result.focus();
  }catch{
   if(run!==epoch)return;
   status('Saved, but the updated view could not load. Reload saved data to continue.');
   if(!retry){
    retry=ctx.root.ownerDocument.createElement('button');
    retry.type='button';
    retry.className='admin-button';
    retry.dataset.growthReload='';
    retry.textContent='Reload saved data';
    retry.onclick=reload;
    ctx.root.querySelector('[data-growth-status]').after(retry);
   }
   retry.disabled=false;
   retry.focus();
  }finally{if(run===epoch)busy=false;}
 }
 await reload();
}
async function mutate(name,args,message,savedForm){
 const run=epoch,ctx=context;
 const controls=[...ctx.root.querySelectorAll('button,input,textarea,select')].filter(el=>!el.disabled);
 busy=true;
 for(const el of controls)el.disabled=true;
 status('Saving…');
 try{
  await ctx.rpc(name,args);
 }catch(error){
  if(run===epoch)status(error.message||'Could not save. Your last report is unchanged.');
  return;
 }finally{
  if(run===epoch){
   busy=false;
   for(const el of controls)if(el.isConnected)el.disabled=false;
  }
 }
 if(run!==epoch)return;
 decisionDrafts.delete(savedForm);
 dirty=decisionDrafts.size>0;
 await refreshAfterSave(ctx,run,message);
}
export const GrowthAdmin={
 async render(options){releaseNavigation();pageCheckSession.refresh=null;context=options;const run=++epoch;busy=false;refreshPending=false;dirty=false;decisionDrafts.clear();pageCheckSession=createPageCheckSession();area='overview';const data=await options.rpc('admin_get_growth_workspace');if(run!==epoch)return;workspace=data;draw();},
 canLeave(){return !busy&&(!dirty||confirm('Leave without saving this Growth decision?'));},
 reset(){releaseNavigation();releaseNavigation=()=>{};pageCheckSession.refresh=null;epoch++;busy=false;refreshPending=false;dirty=false;decisionDrafts.clear();pageCheckSession=createPageCheckSession();area='overview';if(context?.root.querySelector('[data-growth]'))context.root.replaceChildren();context=null;workspace=null;}
};
if(typeof window!=='undefined'){window.BrainiGrowth=GrowthAdmin;window.addEventListener('beforeunload',e=>{if(dirty||busy){e.preventDefault();e.returnValue='';}});}
