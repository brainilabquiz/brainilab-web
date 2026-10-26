import {pagePlayEvidence} from './growth-page-play.js';
import {playSnapshot} from './growth-play-sessions.js';
import {declaredTimestamp,updateWindow} from './growth-current-page.js';
import {playEvidenceStatus,playCoverageCSVHeaders,playCoverageCSV} from './growth-play-coverage.js';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>Number.isSafeInteger(v)&&v>=0?v.toLocaleString('en-GB'):'Not returned';
export const evidenceFocus={search:'All observed searches',clicks:'Observed Google clicks',google_starts:'Recorded starts · Google / organic',all_starts:'Recorded starts · all sources'};
export const focusKey=v=>Object.hasOwn(evidenceFocus,v)?v:'search';
export function queryOrder(focus){return focusKey(focus)==='clicks'?(a,b)=>b.clicks-a.clicks||b.impressions-a.impressions||a.query.localeCompare(b.query):(a,b)=>b.impressions-a.impressions||b.clicks-a.clicks||a.query.localeCompare(b.query);}
const cohort=(play,key)=>play?.cohorts.find(c=>c.key===key)||null;

// These are explicit observations, not weighted opportunity scores or approval.
export function focusActionRows(rows,report,focus){
 const key=focusKey(focus),scope=key==='google_starts'?'googleOrganic':'all';
 return rows.map(r=>({...r,play:pagePlayEvidence(report,r.url)})).filter(r=>key==='clicks'?r.query.clicks>0:key.endsWith('_starts')?playEvidenceStatus(r.play,scope).qualifies:true).sort((a,b)=>(key.endsWith('_starts')?(cohort(b.play,scope)?.row?.sessionsWithStart??-1)-(cohort(a.play,scope)?.row?.sessionsWithStart??-1):0)||queryOrder(key)(a.query,b.query)||a.url.localeCompare(b.url)||(a.decision?.id??0)-(b.decision?.id??0));
}

export function playCells(play){
 return ['googleOrganic','all'].map(key=>{const c=cohort(play,key),status=playEvidenceStatus(play,key);return `<td><strong>${num(c?.row?.sessionsWithStart)}</strong><small>Landing sessions: ${num(c?.row?.sessions)}</small><details><summary>${esc(status.label)}</summary><p>${esc(status.reason)}</p></details></td>`;}).join('');
}

function checked(observations,url){const o=observations instanceof Map?observations.get(url):null;return o?.url===url?o:null;}
export function currentCheckHTML(observations,url,source){
 const o=checked(observations,url);
 if(!o)return '<small>No explicit current-page check in this loaded session. No decision is not proof of no prior edits.</small>';
 if(o.state==='loading')return '<small>Current public-page check is in progress.</small>';
 if(o.state!=='ready')return '<small>The current public page could not be read. Preserve saved evidence; no change is inferred.</small>';
 const comparison=updateWindow(o,source);
 return `<details class="growth-action-update"><summary>Current public-page check</summary><p>Checked ${esc(o.checkedAt)}. Article declares updated ${esc(o.modifiedAt||'Not reported')}.</p><p>${esc(comparison.text)}</p><p>Publisher declarations do not prove a deployment date. Preserve recent work and inspect the current copy before choosing another edit.</p></details>`;
}

export const focusCSVHeaders=['Evidence focus','Google organic landing sessions (play snapshot)','Google organic sessions with a recorded start','Google organic landing baseline collected','Google organic landing starts collected','Google organic play quality','All-source landing sessions','All-source sessions with a recorded start','All-source landing baseline collected','All-source landing starts collected','All-source play quality','Play period start','Play period end','Play timezone','Play snapshot collected','Explicit current-page check collected','Article declares updated','Search-window context for declared update',...playCoverageCSVHeaders];
export function focusCSV(row,focus,observations,source){
 const values=[evidenceFocus[focusKey(focus)]],s=row.play?.snapshot;
 for(const key of ['googleOrganic','all']){const c=cohort(row.play,key);values.push(c?.row?.sessions??'',c?.row?.sessionsWithStart??'',c?.baselineAt||'',c?.startsAt||'',c?.quality||'No validated play snapshot');}
 const o=checked(observations,row.url),valid=o?.state==='ready'&&declaredTimestamp(o.checkedAt);
 values.push(s?.period.start||'',s?.period.end||'',s?.timezone||'',s?.observedAt||'',valid?o.checkedAt:'',valid?o.modifiedAt||'':'',valid?updateWindow(o,source).text:o?'Current page unavailable or still being read':'No explicit current-page check in this session');
 return [...values,...playCoverageCSV(row.play)];
}

export function focusNote(report,focus,count){
 const key=focusKey(focus),s=playSnapshot(report);
 const ordering=key==='clicks'?'Positive returned clicks on one matching query/page row; ordered by clicks, then impressions. Query rows are not added.':key==='google_starts'?'Returned Google / organic sessions with a recorded start, ordered by that count. Only comparable observations qualify.':key==='all_starts'?'Returned all-source sessions with a recorded start, ordered by that count. Only comparable observations qualify. This is not an organic-only scope.':"Ordered by one query/page row's observed impressions, not a score or forecast.";
 const period=s?`Play-session period ${s.period.start} to ${s.period.end} · ${s.timezone}; collected ${s.observedAt}.`:'No validated play-session snapshot; starts remain unknown.';
 return `${ordering} ${period} ${count?'':'No rows qualify for this scope/filter/focus; this does not establish zero demand, visits or play. '}Search and play are separate samples, not keyword conversions. Review relevance, current copy and decisions before choosing work; source limits are below.`;
}
