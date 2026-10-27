import {pagePlayEvidence} from './growth-page-play.js';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={snapshot_missing:'No validated play snapshot',row_missing:'No exact landing row returned',baseline_missing:'Landing sessions not returned',starts_missing:'Start-session count not returned',inconsistent:'Inconsistent returned counts',zero_baseline:'Zero landing sessions returned',dates_missing:'Landing-query dates not reported',quality_limited:'Reported data-quality limitation',not_comparable:'Counts are not comparable',recorded_zero:'Zero start sessions explicitly returned',recorded_start:'Comparable recorded start sessions'};
const reasons={snapshot_missing:'Saved play-session evidence is unavailable or invalid; visits and starts remain unknown.',row_missing:'This exact landing path was not returned. Do not substitute another page, alias, source scope or site total.',baseline_missing:'The landing-session denominator is unknown; start events cannot replace it.',starts_missing:'The count of sessions with a recorded start was not returned. This is unknown, not zero play.',inconsistent:'Recorded-start sessions exceed landing sessions; do not calculate a share or prioritise from these counts.',zero_baseline:'A zero denominator does not support a session share or a start-priority comparison.',dates_missing:'Both landing-query collection dates are required before comparing the returned counts.',quality_limited:'Google reported thresholding, sampling or grouping; detailed counts cannot qualify for this focus.',not_comparable:'The saved counts do not support a comparable share; preserve the original observation.',recorded_zero:'Zero was explicitly returned for recorded-start sessions. Consent and event coverage can still miss play.',recorded_start:'A positive count, compatible denominator, known landing-query dates and no reported quality limitation qualify for the start focus.'};

// One primary availability state per exact page and source scope. Never fill a
// missing numerator with zero or borrow all-source activity for Google organic.
export function playEvidenceStatus(play,key){
 const c=play?.cohorts.find(c=>c.key===key),row=c?.row;
 let state;
 if(!play)state='snapshot_missing';
 else if(!row)state='row_missing';
 else if(row.sessions===null)state='baseline_missing';
 else if(row.sessionsWithStart===null)state='starts_missing';
 else if(row.sessionsWithStart>row.sessions)state='inconsistent';
 else if(row.sessions===0)state='zero_baseline';
 else if(![c.baselineAt,c.startsAt].every(v=>typeof v==='string'&&Number.isFinite(Date.parse(v))))state='dates_missing';
 else if(Object.values(play.snapshot.cohorts[key].quality).some(Boolean))state='quality_limited';
 else if(c.share===null)state='not_comparable';
 else state=row.sessionsWithStart>0?'recorded_start':'recorded_zero';
 return {state,label:labels[state],reason:reasons[state],qualifies:state==='recorded_start'};
}

export function playFocusCoverage(rows,report){
 const unique=[...new Set(rows.map(r=>r.url))],counts={all:{},googleOrganic:{}};
 for(const url of unique){const play=pagePlayEvidence(report,url);for(const key of Object.keys(counts)){const {state}=playEvidenceStatus(play,key);counts[key][state]=(counts[key][state]||0)+1;}}
 return {pages:unique.length,counts};
}

export function playCoverageHTML(coverage,focus){
 if(!coverage?.pages||!['google_starts','all_starts'].includes(focus))return '';
 const key=focus==='google_starts'?'googleOrganic':'all',name=key==='all'?'all measured sources':'Google / organic',counts=coverage.counts[key];
 const rows=Object.keys(labels).filter(state=>counts[state]).map(state=>`<div><dt>${esc(labels[state])}</dt><dd>${counts[state]}</dd></div>`).join('');
 return `<details class="growth-action-help" data-seo-play-coverage><summary>Why pages do or do not qualify · ${esc(name)}</summary><p>${coverage.pages} distinct pages in this decision scope and search filter, before the recorded-start filter. Each page has one primary evidence state; these are page counts, not sessions or players.</p><dl class="growth-page-checks">${rows}</dl><p>Missing counts are unknown, not zero play or proof of broken tracking. Zero returned starts also do not prove nobody played. Source scopes overlap and remain separate. A missing or limited observation does not authorise a content rewrite, new tracking or a repeated decision.</p><button type="button" class="admin-button" data-seo-reset-focus>Show this scope without the start filter</button></details>`;
}

export const playCoverageCSVHeaders=['Google organic start-evidence state','Google organic start-evidence explanation','All-source start-evidence state','All-source start-evidence explanation'];
export function playCoverageCSV(play){return ['googleOrganic','all'].flatMap(key=>{const s=playEvidenceStatus(play,key);return [s.label,s.reason];});}
