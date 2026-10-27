import {searchSources} from './growth-seo-sources.js';
import {playSnapshot} from './growth-play-sessions.js';
import {pagePlayEvidence} from './growth-page-play.js';
import {playEvidenceStatus} from './growth-play-coverage.js';
import {publicPageURL,pageCheckContext} from './growth-page-checks.js';
import {declaredTimestamp} from './growth-current-page.js';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>Number.isSafeInteger(v)&&v>=0?v.toLocaleString('en-GB'):'Not returned';
export const playLandingScopes={all:'All measured sources',googleOrganic:'Google / organic only'};
const validPeriod=p=>p&&[p.start,p.end].every(v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v)&&Date.parse(p.end)-Date.parse(p.start)===89*86400000;

// An absent Web query row must not erase a real, separately measured landing.
// This is a review list, never keyword attribution or approval for another edit.
export function playLandingData(report,decisions,scope='all',filter=''){
 const sources=searchSources(report?.seoExplorer),snapshot=playSnapshot(report),base={rows:[],sources,snapshot,scope};
 if(!Array.isArray(decisions))return {...base,reason:'Load current Growth decisions before selecting work. Saved proposal states cannot replace the workspace.'};
 if(!sources||!validPeriod(sources.period)||!declaredTimestamp(sources.observedAt))return {...base,reason:'No validated final Web query/page sample is available to check coverage. Missing search evidence is unknown.'};
 if(!snapshot)return {...base,reason:'No validated play-session snapshot is available. Missing visits and starts are unknown.'};
 if(!Object.hasOwn(playLandingScopes,scope))return {...base,reason:'Choose a known measured source scope; source scopes cannot be substituted.'};
 const seo=report.seoExplorer,at=declaredTimestamp(seo.observedAt),assigned=new Set(decisions.map(d=>d.url)),queried=new Set(sources.webPages.rows.map(r=>'https://brainilabgames.com'+r.path)),q=filter.trim().toLowerCase();
 const rows=snapshot.cohorts[scope].landingPages.flatMap(row=>{
  const url='https://brainilabgames.com'+row.path;
  if(publicPageURL(url)!==url||/^\/(api|cdn-cgi)(\/|$)/.test(row.path)||assigned.has(url)||queried.has(url)||!url.toLowerCase().includes(q))return [];
  const matches=(seo.pages||[]).filter(p=>p.url===url);if(matches.length!==1)return [];
  const inspection=matches[0],checked=declaredTimestamp(inspection.checkedAt);
  if(!at||!checked||checked>at||inspection.status!==200||inspection.finalUrl!==url||pageCheckContext(seo,inspection).passed===null)return [];
  const play=pagePlayEvidence(report,url),evidence=playEvidenceStatus(play,scope);if(!evidence.qualifies)return [];
  return [{url,inspection,play,cohort:play.cohorts.find(c=>c.key===scope),row}];
 }).sort((a,b)=>b.row.sessionsWithStart-a.row.sessionsWithStart||b.row.sessions-a.row.sessions||a.url.localeCompare(b.url));
 return {...base,rows,reason:null};
}

export function playLandingsView(report,decisions,scope='all',filter=''){
 const data=playLandingData(report,decisions,scope,filter),s=data.snapshot,g=data.sources;
 if(data.reason)return {heads:[],rows:[],exported:[],caption:'Measured landings unavailable',note:data.reason,help:''};
 const label=playLandingScopes[scope],status='No matching row in the returned Web query/page sample; not zero demand',guard='No recorded decision is not proof of no prior edits. Read current content and recent work before proposing a change. Recorded starts are not unique players or keyword/backlink conversions.';
 const heads=['Existing landing page','Saved page check','Measured source','Landing sessions','Sessions with a recorded start','Search sample coverage'];
 const rows=data.rows.map(r=>`<tr><th scope="row">${esc(new URL(r.url).pathname)}<button class="admin-button" type="button" data-seo-review-url="${esc(r.url)}" aria-label="Review evidence for ${esc(new URL(r.url).pathname)}">Review evidence</button></th><td>HTTP 200<small>Checked ${esc(r.inspection.checkedAt)}</small><small>No recorded decision. Check current content and recent work first.</small></td><td>${esc(label)}<small>${esc(r.cohort.quality)}</small></td><td>${num(r.row.sessions)}</td><td>${num(r.row.sessionsWithStart)}<small>Union of recorded game/practice starts; not summed event counts.</small></td><td>${esc(status)}</td></tr>`);
 const exported=[['Page','Source scope','Landing sessions','Sessions with a recorded start','Start event count','Play period start','Play period end','Play timezone','Play snapshot collected','Landing baseline collected','Landing starts collected','Play quality','Saved page HTTP','Page checked at','Observed final URL','Query sample status','Search period start','Search period end','Search timezone','Search collected at','Review guard'],...data.rows.map(r=>[r.url,label,r.row.sessions,r.row.sessionsWithStart,r.row.startEventCount??'',s.period.start,s.period.end,s.timezone,s.observedAt,r.cohort.baselineAt,r.cohort.startsAt,r.cohort.quality,r.inspection.status,r.inspection.checkedAt,r.inspection.finalUrl,status,g.period.start,g.period.end,g.timezone,g.observedAt,guard])];
 const note=`${label}${scope==='all'?' · not an organic-only scope':''}. GA4 play period ${s.period.start} to ${s.period.end} · ${s.timezone}; collected ${s.observedAt}. Web query/page period ${g.period.start} to ${g.period.end} · ${g.timezone}; collected ${g.observedAt}. These separate samples are not query-to-player attribution. ${data.rows.length?'':'No rows qualify; this does not establish zero visits, play or demand.'}`;
 const help='<details class="growth-action-help"><summary>Why these other landing pages appear</summary><p>These public paths have a comparable positive count of sessions with a recorded start, one dated exact-URL HTTP 200 inspection, no returned Web query/page row and no currently recorded Growth decision in any state. Counts are ordered directly, without a score or forecast. Missing or ambiguous page inspections remain outside this review list.</p><p>A missing query row is not zero search demand or proof that Google never showed the page. All-source activity does not establish Google traffic. The source scopes overlap and must never be added. A recorded start may happen after the landing page and does not establish a completed game or unique player. Consent, historical owner/QA visits and event coverage limit the sample.</p><p>'+guard+' This view makes no requests, changes no decisions and cannot publish an edit.</p></details>';
 return {heads,rows,exported,caption:'Measured starts outside the returned query sample · '+label,note,help};
}
