import {searchSources} from './growth-seo-sources.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>Number.isFinite(v)?v.toLocaleString('en-GB',{maximumFractionDigits:2}):'Not observed';
const date=v=>Number.isFinite(Date.parse(v))?new Date(v).toISOString():'Unknown';
export const technicalChecks={https:'HTTPS',available:'Available page',title:'One page title',description:'Search description',heading:'One main heading',canonical:'Self canonical',indexable:'No noindex directive',structuredData:'Parseable JSON-LD'};
function own(value){try{const u=new URL(value);return u.origin==='https://brainilabgames.com'&&!u.username&&!u.password&&!u.port&&!u.search&&!u.hash&&/^\/(?:[a-z0-9-]+\/)*(?:index\.html)?$/.test(u.pathname)&&!/^\/(admin|auth|account|profile)(\/|$)/.test(u.pathname)?u.href:null;}catch{return null;}}
const external=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!u.hash&&(!u.search||/^\?page=[1-9][0-9]{0,4}$/.test(u.search))&&/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(u.hostname)&&!u.hostname.endsWith('.local')&&!u.hostname.endsWith('.localhost')&&!/^(?:\d+\.){3}\d+$/.test(u.hostname)&&!['brainilabgames.com','www.brainilabgames.com'].includes(u.hostname)?u.href:null;}catch{return null;}};
const anchor=(url,label)=>`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`;
const table=(caption,heads,rows)=>`<div class="growth-table" role="region" tabindex="0" aria-label="${esc(caption)}"><table><caption>${esc(caption)}</caption><thead><tr>${heads.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;

export function pageChoices(snapshot){
 const sources=searchSources(snapshot);
 return [...new Set([...(snapshot?.pages||[]).map(p=>own(p.url)),...(snapshot?.backlinks||[]).map(b=>own(b.targetUrl)),...(sources?.webPages.rows||[]).map(r=>own('https://brainilabgames.com'+r.path))].filter(Boolean))].sort();
}

export function pageReview(snapshot,target){
 const url=own(target);if(!url||!pageChoices(snapshot).includes(url))return null;
 const page=(snapshot.pages||[]).find(p=>p.url===url)||null,sources=searchSources(snapshot);
 const queries=(sources?.webPages.rows||[]).filter(r=>'https://brainilabgames.com'+r.path===url).slice().sort((a,b)=>b.impressions-a.impressions||b.clicks-a.clicks||a.query.localeCompare(b.query));
 const verified=new Set((snapshot.sources||[]).filter(s=>s.state==='verified').map(s=>s.url)),seen=new Set();
 const links=(snapshot.backlinks||[]).filter(b=>{
  if(b.targetUrl!==url||!verified.has(b.sourceUrl)||!external(b.sourceUrl)||!Number.isFinite(Date.parse(b.verifiedAt)))return false;
  const key=JSON.stringify([b.sourceUrl,b.targetUrl,[...new Set(b.rel)].sort()]);if(seen.has(key))return false;seen.add(key);return true;
 });
 const inspected=!!page&&page.trust!==null&&Object.keys(technicalChecks).every(k=>typeof page.checks?.[k]==='boolean');
 const failed=inspected?Object.keys(technicalChecks).filter(k=>!page.checks[k]):[];
 const steps=[!inspected?'Check the live page before diagnosing technical problems; this snapshot has no completed inspection.':failed.length?'Review the failed checks on the live page: '+failed.map(k=>technicalChecks[k]).join(', ')+'.':'Preserve the passing technical setup; these checks do not establish authority, indexing or content quality.',
  queries.length?'Read the observed queries alongside the page. Check the answer and route into a relevant game before proposing an edit.':'No matching query/page rows were returned for this exact URL. Do not invent demand or rewrite the page for a quota.',
  links.length?'Open the recorded source pages to check link context. A submitted listing is not necessarily an independent endorsement.':'No matching verified HTML links appear in this inspected sample. This does not establish an absence of backlinks.'];
 return {url,page,inspected,failed,queries,links,sources,steps};
}

export function pageReviewHTML(snapshot,target){
 const r=pageReview(snapshot,target);
 if(!r)return {html:'<p>No public page is available to review. Missing evidence is not zero demand or traffic.</p>',exported:[],status:'No page selected'};
 const p=r.page,s=r.sources;
 const queryRows=r.queries.slice(0,25).map(q=>`<tr><th scope="row">${esc(q.query)}</th><td>${num(q.clicks)}</td><td>${num(q.impressions)}</td><td>${num(q.position)}</td></tr>`);
 const linkRows=r.links.slice(0,25).map(b=>`<tr><th scope="row">${anchor(b.sourceUrl,new URL(b.sourceUrl).hostname+new URL(b.sourceUrl).pathname+new URL(b.sourceUrl).search)}</th><td>${esc(b.anchor||'No text anchor')}</td><td>${esc(b.rel.filter(x=>['nofollow','ugc','sponsored'].includes(x)).join(', ')||'No qualifying rel attribute')}</td><td>${esc(date(b.verifiedAt))}</td></tr>`);
 const html=`<article class="growth-page-review" aria-labelledby="growth-page-review-title"><header class="growth-workflow-heading"><div><h3 id="growth-page-review-title" tabindex="-1">Page evidence</h3><p class="growth-page-address">${esc(new URL(r.url).pathname)}</p></div>${anchor(r.url,'Open live page ↗')}</header><p class="growth-small">Exact URL only. Redirects, index.html variants and other aliases are not merged. Opening this review uses saved observations.</p><section aria-labelledby="growth-page-checks-title"><h4 id="growth-page-checks-title">Technical inspection</h4><p class="growth-small">${p?`HTTP ${num(p.status)} · Inspected ${esc(date(p.checkedAt))}`:'Not inspected in this snapshot. Search or link evidence can exist without a completed page inspection.'}</p>${r.inspected?`<dl class="growth-page-checks">${Object.entries(technicalChecks).map(([key,label])=>`<div><dt>${esc(label)}</dt><dd>${p.checks[key]?'Passed':'Needs review'}</dd></div>`).join('')}</dl>`:'<p>No completed checklist is available; missing checks are not failures.</p>'}</section><section aria-labelledby="growth-page-query-title"><h4 id="growth-page-query-title">Observed searches for this page</h4>${s?`<p class="growth-small">Final Web query/page · ${esc(s.period.start)} to ${esc(s.period.end)} · ${esc(s.timezone)}. Collected ${esc(date(s.observedAt))}. All markets; no language filter.</p>`:'<p class="growth-small">No validated query/page observation was imported.</p>'}${queryRows.length?table('Exact-page query sample · up to 25 rows; the download includes every match',['Observed query','Clicks','Impressions','Historical average position'],queryRows):'<p>No matching query/page rows in the returned sample. This is not zero search demand.</p>'}<p class="growth-small">Query-only property rows and Google Images cannot be assigned to this page. Rows and overlapping windows must not be added. Average position is historical, not a live rank or search volume.</p></section><section aria-labelledby="growth-page-links-title"><h4 id="growth-page-links-title">Recorded incoming HTML links</h4>${linkRows.length?table('Links to this exact URL from successfully inspected sources · up to 25 rows',['Source','Anchor','Attributes','Link verified at'],linkRows):'<p>No matching verified HTML links in the inspected sample. Failed sources and JavaScript-only links leave coverage unknown.</p>'}<p class="growth-small">This is a limited HTML sample, not a global backlink total or reputation score. Host-level referral traffic is not attributed to this page or any individual link.</p></section><section aria-labelledby="growth-page-next-title"><h4 id="growth-page-next-title">Next checks</h4><ul>${r.steps.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><p class="growth-small">Review current content and recent changes first. Nothing is rewritten or published from this panel.</p></section></article>`;
 const blank=()=>Array(13).fill(''),exported=[['Section','Item','Detail','Clicks','Impressions','Historical average position','Period start','Period end','Timezone','Observed at','Source URL','Target URL','Rel']];
 let row=blank();row[0]='Page';row[1]=r.url;row[2]='Exact URL; aliases not merged';row[11]=r.url;exported.push(row);
 if(r.inspected)for(const [key,label] of Object.entries(technicalChecks)){row=blank();row[0]='Technical check';row[1]=label;row[2]=p.checks[key]?'Passed':'Needs review';row[9]=p.checkedAt;row[11]=r.url;exported.push(row);}
 else{row=blank();row[0]='Technical check';row[2]='Not inspected; unknown, not a failure';row[11]=r.url;exported.push(row);}
 for(const q of r.queries)exported.push(['Web query/page',q.query,'Final byPage sample',q.clicks,q.impressions,q.position??'',s.period.start,s.period.end,s.timezone,s.observedAt,'',r.url,'']);
 for(const b of r.links){row=blank();row[0]='Incoming HTML link';row[1]=b.anchor;row[2]='Recorded sample; not an endorsement';row[9]=b.verifiedAt;row[10]=b.sourceUrl;row[11]=r.url;row[12]=b.rel.join(' ');exported.push(row);}
 for(const step of r.steps){row=blank();row[0]='Next check';row[2]=step;exported.push(row);}
 row=blank();row[0]='Limitations';row[2]='No global backlink total, authority score, search volume, live rank or page-level referral attribution. Missing samples are not zero. Preserve recent changes before comparing equal non-overlapping periods.';exported.push(row);
 return {html,exported,status:`${r.queries.length} matching query/page rows · ${r.links.length} recorded HTML links · exact URL sample`};
}
