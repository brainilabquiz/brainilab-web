import {searchSources} from './growth-seo-sources.js';
import {publicPageURL} from './growth-seo-page.js';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const count=v=>Number.isSafeInteger(v)&&v>=0?v:null;
const num=v=>count(v)===null?'Not measured':v.toLocaleString('en-GB');
const date=v=>Number.isFinite(Date.parse(v))?new Date(v).toISOString():'Unknown';
const states={pending:'Pending review',approved:'Approved',published:'Published',monitoring:'In follow-up',dismissed:'Set aside'};
const protectedStates=new Set(['published','monitoring','dismissed']);
const pathOK=p=>typeof p==='string'&&/^\/(?:[a-z0-9-]+\/)*$/.test(p)&&!!publicPageURL('https://brainilabgames.com'+p);
const periodOK=p=>p&&[p.start,p.end].every(v=>/^\d{4}-\d{2}-\d{2}$/.test(v||'')&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v)&&p.start<=p.end;
const blank=()=>Array(13).fill('');
const reviewButton=url=>`<button class="admin-button" type="button" data-seo-review-url="${esc(url)}" aria-label="Review evidence for ${esc(new URL(url).pathname)}">Review evidence</button>`;
const decisionButton=id=>`<button class="admin-button" type="button" data-seo-open-decision="${id}">Open recorded decision</button>`;
const qualityText=q=>q===null?'Quality flags not supplied':Object.entries(q).filter(([,v])=>v).map(([k])=>({thresholded:'Thresholding',sampled:'Sampling',otherRow:'Grouped dimensions'}[k])).join('; ')||'No thresholding, sampling or grouping reported';

export function currentDecisions(workspace){
 if(!Array.isArray(workspace?.opportunities))return null;
 // A partial or malformed decision set cannot authorise prioritising an old brief.
 const rows=workspace.opportunities.filter(r=>publicPageURL(r?.url));
 if(rows.some(r=>!Number.isSafeInteger(r.id)||r.id<1||!Object.hasOwn(states,r.state)||!Number.isSafeInteger(r.revision)||r.revision<1||typeof r.updated_at!=='string'||!Number.isFinite(Date.parse(r.updated_at))))return null;
 return rows;
}

function analyticsSnapshot(report){
 const s=report?.searchPerformance,c=s?.current;
 return s?.schemaVersion===1&&s.property==='sc-domain:brainilabgames.com'&&s.analyticsProperty==='555562532'&&Number.isFinite(Date.parse(s.observedAt))&&periodOK(c?.period)&&typeof c.analyticsTimezone==='string'&&Array.isArray(c.landingPages)?s:null;
}

export function playerActivity(report,url){
 const s=analyticsSnapshot(report),c=s?.current;
 if(!publicPageURL(url)||!s)return null;
 const path=new URL(url).pathname;
 // GA4 intentionally normalises query/trailing-slash variants. Never assign its
 // landing-path sample to an index.html alias, nor sum duplicate imported rows.
 if(!pathOK(path))return null;
 const matches=c.landingPages.filter(r=>r.path===path);
 if(matches.length!==1)return null;
 const row=matches[0];
 const keys=['thresholded','sampled','otherRow'],quality=keys.every(k=>typeof c.analyticsQuality?.[k]==='boolean')?Object.fromEntries(keys.map(k=>[k,c.analyticsQuality[k]])):null;
 return {path,period:c.period,observedAt:s.observedAt,timezone:c.analyticsTimezone,quality,sessions:count(row.sessions),engagedSessions:count(row.engagedSessions),events:Object.fromEntries(['game_start','game_complete','practice_start','practice_complete','article_read','registration_request'].map(k=>[k,count(row.events?.[k])]))};
}

export function actionRows(report,workspace,scope='needs_review',filter=''){
 const decisions=currentDecisions(workspace),sources=searchSources(report?.seoExplorer);
 if(!decisions||!sources)return {rows:[],decisions,sources};
 const q=filter.trim().toLowerCase();
 const rows=decisions.map(d=>{
  const matches=sources.webPages.rows.filter(r=>'https://brainilabgames.com'+r.path===d.url&&r.impressions>0&&(!q||(d.url+' '+states[d.state]+' '+r.query).toLowerCase().includes(q))).slice().sort((a,b)=>b.impressions-a.impressions||b.clicks-a.clicks||a.query.localeCompare(b.query));
  const protectedPage=decisions.some(other=>other.url===d.url&&protectedStates.has(other.state));
  return {decision:d,query:matches[0]||null,activity:playerActivity(report,d.url),protectedPage};
 }).filter(r=>r.query&&(scope!=='needs_review'||(['pending','approved'].includes(r.decision.state)&&!r.protectedPage))&&(r.decision.url+' '+r.query.query+' '+states[r.decision.state]).toLowerCase().includes(q));
 rows.sort((a,b)=>b.query.impressions-a.query.impressions||a.decision.url.localeCompare(b.decision.url)||a.decision.id-b.decision.id);
 return {rows,decisions,sources};
}

export function actionsView(report,workspace,scope,filter){
 const data=actionRows(report,workspace,scope,filter),s=data.sources;
 if(!data.decisions)return {heads:[],rows:[],exported:[],caption:'Current decisions unavailable',note:'Load Growth decisions before choosing work. Imported proposal status is not a current decision; no old brief is promoted here.'};
 if(!s)return {heads:[],rows:[],exported:[],caption:'No validated query/page evidence',note:'Current decisions exist, but no matching final Web query/page source is available. Missing demand is unknown; no action is invented.'};
 const heads=['Existing page','Recorded decision','Strongest matched query','Impressions for that query/page','Organic landing sessions','Game starts in those sessions'];
 const rows=data.rows.map(r=>`<tr><th scope="row">${esc(new URL(r.decision.url).pathname)}${reviewButton(r.decision.url)}</th><td><strong>${esc(states[r.decision.state])}</strong><small>Last recorded ${esc(date(r.decision.updated_at))}</small>${decisionButton(r.decision.id)}${r.protectedPage?'<small>Preserve this decision; do not repeat the change.</small>':''}</td><td>${esc(r.query.query)}</td><td>${num(r.query.impressions)}</td><td>${num(r.activity?.sessions)}</td><td>${num(r.activity?.events.game_start)}</td></tr>`);
 const exported=[['Page','Decision','Decision last recorded','Strongest observed query','Query/page impressions','Query/page clicks','Historical average position','Search period start','Search period end','Search timezone','Search collected at','Organic landing sessions','Game start events in those sessions','Analytics period start','Analytics period end','Analytics timezone','Analytics collected at','Analytics quality','Guard'],...data.rows.map(r=>[r.decision.url,states[r.decision.state],r.decision.updated_at,r.query.query,r.query.impressions,r.query.clicks,r.query.position??'',s.period.start,s.period.end,s.timezone,s.observedAt,r.activity?.sessions??'',r.activity?.events.game_start??'',r.activity?.period.start||'',r.activity?.period.end||'',r.activity?.timezone||'',r.activity?.observedAt||'',r.activity?qualityText(r.activity.quality):'Unmeasured landing-path sample',r.protectedPage?'Preserve recorded decision; inspect current page and later changes. No keyword conversion attribution. Missing events are not zero.':'Read current page and recorded decision before proposing work. No keyword conversion attribution. Missing events are not zero.'])];
 const c=analyticsSnapshot(report)?.current;
 const analytics=periodOK(c?.period)?`Analytics landing-path period ${c.period.start} to ${c.period.end} · ${c.analyticsTimezone||'timezone unknown'}.`:'No validated Analytics landing-path period.';
 const small=data.rows.length&&data.rows.every(r=>r.query.impressions<10)?' Every matched query here has fewer than 10 observed impressions; investigate relevance before prioritising work.':'';
 return {heads,rows,exported,caption:`Saved checks to review · final Web query/page ${s.period.start} to ${s.period.end} · ${s.timezone}`,note:`Ordered by one query/page row's observed impressions, not a score or forecast. ${analytics} Missing sessions and events are not zero.${small}`,help:'<details class="growth-action-help"><summary>Sources and limits for these checks</summary><p>Decision states come from the currently loaded Growth workspace, not the imported proposal status. Reload Growth before acting; later website changes may not be recorded. Published, follow-up and set-aside pages are excluded from Needs review. Queries and pages are not added.</p><p>Analytics normalises landing-path variants and measures google / organic sessions. Its period and day boundaries can differ from Search Console. Events are counts in those sessions, not unique players or keyword conversions. Missing events remain Not measured. Use Review evidence for collection dates, quality flags and recorded decisions.</p></details>'};
}

export function pageActionContext(report,workspace,url){
 const decisions=currentDecisions(workspace),matched=decisions?.filter(d=>d.url===url)||[],activity=playerActivity(report,url),exported=[];
 const protectedPage=matched.some(d=>protectedStates.has(d.state));
 let html='<section aria-labelledby="growth-page-decisions-title"><h4 id="growth-page-decisions-title">Recorded decisions</h4>';
 if(!decisions)html+='<p>Current decisions are unavailable. Load Growth before choosing work; an imported proposal status is not a current decision.</p>';
 else if(!matched.length)html+='<p>No decision for this exact URL in the currently loaded workspace. This does not mean the page has never changed.</p>';
 else html+=`<ul>${matched.map(d=>`<li><strong>${esc(states[d.state])}</strong> · last recorded ${esc(date(d.updated_at))}${d.published_at?` · publication recorded ${esc(date(d.published_at))}`:''}${decisionButton(d.id)}</li>`).join('')}</ul>`;
 html+='<p class="growth-small">Reload Growth before acting. A recorded decision covers its own proposal; later edits and other URLs may not appear here. No decision is changed by this review.</p></section>';
 for(const d of matched){const row=blank();row[0]='Recorded decision';row[1]=states[d.state];row[2]=`Decision ${d.id}; current loaded workspace; later edits may not be recorded`;row[9]=d.updated_at;row[11]=url;exported.push(row);}
 html+='<section aria-labelledby="growth-page-activity-title"><h4 id="growth-page-activity-title">From a visit towards a game</h4>';
 if(!activity)html+='<p>No single validated google / organic landing-path row matches this page. Missing sessions and game events are not zero. Index.html aliases are not assigned Analytics totals.</p>';
 else{
  const measures=[['Organic landing sessions',activity.sessions],['Engaged sessions',activity.engagedSessions],['Game start events',activity.events.game_start],['Practice start events',activity.events.practice_start],['Game completion events',activity.events.game_complete],['Practice completion events',activity.events.practice_complete]];
  html+=`<p class="growth-small">GA4 google / organic · ${esc(activity.period.start)} to ${esc(activity.period.end)} · ${esc(activity.timezone)}. Collected ${esc(date(activity.observedAt))}. This is a normalised landing-path sample, separate from the exact-URL search sample.</p><dl class="growth-page-checks">${measures.map(([label,value])=>`<div><dt>${label}</dt><dd>${num(value)}</dd></div>`).join('')}</dl>`;
  if(activity.quality===null)html+='<p class="growth-small">Quality flags were not supplied with this observation.</p>';
  else if(Object.values(activity.quality).some(Boolean))html+='<p class="growth-caution">Google reported thresholding, sampling or grouped data. Treat these detailed figures as limited.</p>';
  html+='<p class="growth-small">Events occurred within sessions that started on this path; they may involve later pages. Event counts are not unique players. Consent and tracking coverage can limit the sample. These figures do not identify which query or backlink brought a player; no conversion rate is inferred.</p>';
  for(const [label,value] of measures){const row=blank();row[0]='Analytics landing-path sample';row[1]=label;row[2]=value===null?'Not measured':String(value);row[6]=activity.period.start;row[7]=activity.period.end;row[8]=activity.timezone;row[9]=activity.observedAt;row[11]=url;exported.push(row);}
  const q=blank();q[0]='Analytics quality';q[2]=qualityText(activity.quality);q[6]=activity.period.start;q[7]=activity.period.end;q[8]=activity.timezone;q[9]=activity.observedAt;q[11]=url;exported.push(q);
 }
 html+='</section>';
 const steps=[protectedPage?'Preserve the recorded published, follow-up or set-aside decision. Read it and check for later changes before considering new work.':matched.length?'Read the live page and recorded decision before proposing or implementing a change. A pending decision alone is not evidence that an edit is needed.':'Check the live page and current Growth decisions before selecting work; no matching decision is proof of no prior edits.',activity?'Inspect the first useful route from this landing page into a relevant game. The session and event sample is descriptive, not keyword attribution or proof of a defect.':'Player activity for this landing path is unmeasured in this sample. Do not infer zero players or create a traffic forecast.', 'Keep search and Analytics periods separate. Review complete equal, non-overlapping periods after a verified change; preserve the original baseline.'];
 return {html,exported,steps};
}
