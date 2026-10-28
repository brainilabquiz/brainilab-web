import {playSnapshot} from './growth-play-sessions.js';
import {pagePlayEvidence} from './growth-page-play.js';

const scopes={all:'All measured sources',googleOrganic:'Google / organic only'};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const count=v=>Number.isSafeInteger(v)&&v>=0;
const date=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))?new Date(v).toISOString():'Unknown';
const own=value=>{try{const u=new URL(value);return u.origin==='https://brainilabgames.com'&&!u.username&&!u.password&&!u.search&&!u.hash?u:null;}catch{return null;}};

// Only selected public landing rows enter the private article context.
export function articlePlayEvidence(report,urls){
 const s=report?.property==='sc-domain:brainilabgames.com'?playSnapshot(report):null;
 if(!s)return {available:false,pages:[]};
 const pages=[...new Set(urls)].map(own).filter(Boolean).slice(0,12).map(u=>({url:u.href,path:u.pathname,cohorts:Object.entries(scopes).map(([key,label])=>{
  const c=s.cohorts[key],e=pagePlayEvidence(report,u.href)?.cohorts.find(row=>row.key===key),r=e?.row;
  return {key,label,returned:!!r,sessions:r?.sessions??null,sessionsWithStart:r?.sessionsWithStart??null,
   share:e?.share??null};
 })}));
 return {available:true,source:s.source,property:s.property,period:{...s.period},timezone:s.timezone,observedAt:s.observedAt,cohorts:Object.entries(scopes).map(([key,label])=>{const c=s.cohorts[key];return {key,label,quality:{...c.quality},rowsWithheld:c.rowsWithheld,baselineObservedAt:c.landingBaselineObservedAt??null,startsObservedAt:c.landingStartsObservedAt??null};}),pages};
}

export function articlePlayEvidenceHTML(activity,now=Date.now()){
 if(!activity?.available)return '<details class="article-evidence-activity"><summary>Measured landings &amp; recorded starts</summary><p>No validated saved play-session observation. Missing data is unknown, not zero visits or zero play.</p></details>';
 const number=v=>count(v)?v.toLocaleString('en-GB'):'Not returned';
 return `<details class="article-evidence-activity"><summary>Measured landings &amp; recorded starts</summary><p>GA4 · ${esc(activity.period.start)} to ${esc(activity.period.end)} · ${esc(activity.timezone)}. Snapshot collected ${esc(date(activity.observedAt))}.</p>${now-Date.parse(activity.observedAt)>48*3600000?'<p>Older than 48 hours; showing dated saved evidence.</p>':''}<p class="article-help">A landing session with a recorded game_start or practice_start. Their union is queried once. This is not a finished game or a unique player. A start can happen later in the session and in any game; it does not prove that this article or its link caused it.</p>${activity.pages.map(p=>`<section class="article-evidence-page"><h4>${esc(p.path)}</h4>${p.cohorts.map(c=>`<p><strong>${esc(c.label)}</strong> · ${c.returned?`Landing sessions: ${number(c.sessions)} · Sessions with a recorded start: ${number(c.sessionsWithStart)}${c.share===null?' · Share not comparable':` · ${(100*c.share).toLocaleString('en-GB',{maximumFractionDigits:1})}% of observed landing sessions`}`:'No matching landing row returned; visits and recorded starts remain unknown.'}</p>${c.returned&&count(c.sessions)&&count(c.sessionsWithStart)&&c.sessionsWithStart>c.sessions?'<p>Counts are inconsistent; review the source before drawing conclusions.</p>':''}`).join('')}</section>`).join('')}${activity.cohorts.map(c=>`<p class="article-help"><strong>${esc(c.label)} · source dates and quality</strong> · Landing baseline collected ${esc(date(c.baselineObservedAt))}; landing starts collected ${esc(date(c.startsObservedAt))}.${(!c.baselineObservedAt||!c.startsObservedAt)?' Landing-query dates are unknown; no session share is shown.':''}${Object.values(c.quality).some(Boolean)?' Google reported sampling, thresholding or grouping; no session share is shown.':''} Across the full saved queries, ${number(c.rowsWithheld)} non-public or sensitive-format rows were withheld; this is not a count for this article or a unique-page count.</p>`).join('')}<p class="article-help">All sources includes Google / organic; never add these scopes. Missing starts are not zero. Consent, historical test traffic and start-event coverage limit the sample. GA4 landing paths are normalised by the saved collector; they are separate from exact-URL Search Console rows. Do not divide recorded starts by Google clicks, attribute them to a keyword or backlink, or infer improvement from overlapping periods. Use a complete follow-up period before rewriting a recent change.</p></details>`;
}
