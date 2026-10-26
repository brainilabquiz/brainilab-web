const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const protectedStates=new Set(['published','monitoring','dismissed']);
const labels={approved:'Approved',pending:'Pending review',conflict:'Conflicting records · review first'};

// The caller supplies validated current decisions and the independent search
// source. A missing query row must never erase saved, unfinished work.
export function reviewQueue(decisions,sources){
 if(!decisions)return null;
 const groups=new Map();
 for(const d of decisions){if(!groups.has(d.url))groups.set(d.url,[]);groups.get(d.url).push(d);}
 return [...groups.entries()].flatMap(([url,records])=>{
  if(records.some(d=>protectedStates.has(d.state)))return [];
  const active=records.filter(d=>['approved','pending'].includes(d.state));
  if(!active.length)return [];
  const state=active.length===1?active[0].state:'conflict';
  const hasSearch=sources?sources.webPages.rows.some(r=>'https://brainilabgames.com'+r.path===url&&r.impressions>0):null;
  return [{url,state,records:active.slice().sort((a,b)=>a.id-b.id),hasSearch}];
 }).sort((a,b)=>(a.state==='approved'?0:a.state==='conflict'?1:2)-(b.state==='approved'?0:b.state==='conflict'?1:2)||a.url.localeCompare(b.url));
}

export function reviewQueueHTML(decisions,sources,matchedCount=0){
 const rows=reviewQueue(decisions,sources);
 if(rows===null)return '<p class="growth-caution" data-seo-review-queue>Saved review queue unavailable. Reload current decisions before choosing work; imported proposals cannot replace them.</p>';
 if(!rows.length)return '<p class="growth-small" data-seo-review-queue>No pending or approved pages in the loaded decisions. Published, follow-up and set-aside decisions remain protected.</p>';
 const approved=rows.filter(r=>r.state==='approved').length,pending=rows.filter(r=>r.state==='pending').length,conflicts=rows.filter(r=>r.state==='conflict').length;
 const source=sources?`Final Web query/page source: ${sources.period.start} to ${sources.period.end} · ${sources.timezone}; collected ${sources.observedAt}.`:'No validated final Web query/page source is available.';
 return `<details class="growth-decision-queue" data-seo-review-queue${approved||!matchedCount?' open':''}><summary>Saved review queue · ${rows.length} pages · ${approved} approved · ${pending} pending${conflicts?' · '+conflicts+' conflicting':''}</summary><p>Approved work comes first; recheck the live page and recorded decision before resuming. Pending records are not approved opportunities. Missing search evidence does not cancel a decision or establish zero demand.</p><p class="growth-small">This queue uses the current loaded decisions, independently of the search text, decision scope and evidence focus. Reload Growth before acting. The download covers the matched evidence table, separately from this queue.</p><ul>${rows.map(r=>`<li><div><strong>${esc(new URL(r.url).pathname)}</strong><span class="growth-state">${esc(labels[r.state])}</span></div><p>${r.hasSearch===null?'Search evidence is unavailable; demand remains unknown.':r.hasSearch?'Observed searches are available. Inspect relevance and current content before changing this page.':'No matching query/page row was returned for this exact URL. Demand remains unknown.'}${r.state==='conflict'?' Reconcile these records before resuming; none is promoted as approved.':''}</p>${r.records.map(d=>`<p class="growth-small">Revision ${d.revision} · last recorded ${esc(new Date(d.updated_at).toISOString())}<button class="admin-button" type="button" data-seo-open-decision="${d.id}" aria-label="Open recorded decision ${d.id} for ${esc(new URL(r.url).pathname)}">Open recorded decision${r.records.length>1?' '+d.id:''}</button></p>`).join('')}</li>`).join('')}</ul><p class="growth-small">${esc(source)} No query rows are added and no player or keyword attribution is inferred.</p></details>`;
}
