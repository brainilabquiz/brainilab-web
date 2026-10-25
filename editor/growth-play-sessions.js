import {csvCell} from './growth-search.js';
import {publicPageURL} from './growth-seo-page.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const count=v=>Number.isSafeInteger(v)&&v>=0;
const number=v=>count(v)?v.toLocaleString('en-GB'):'Not returned';
const date=v=>Number.isFinite(Date.parse(v))?new Date(v).toISOString():'Unknown';
const flags=['thresholded','sampled','otherRow'];
const label={all:'All measured sources',googleOrganic:'Google / organic only'};
const period=p=>p&&[p.start,p.end].every(v=>/^\d{4}-\d{2}-\d{2}$/.test(v||'')&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v)&&Date.parse(p.end)-Date.parse(p.start)===27*86400000;

export function playSnapshot(report){
 const s=report?.playSessions;
 if(s?.schemaVersion!==1||s.property!=='555562532'||s.source!=='GA4 Data API'||!Number.isFinite(Date.parse(s.observedAt))||!period(s.period)||typeof s.timezone!=='string'||JSON.stringify(s.startEvents)!=='["game_start","practice_start"]')return null;
 for(const key of Object.keys(label)){
  const c=s.cohorts?.[key];
  if(!c||!flags.every(k=>typeof c.quality?.[k]==='boolean')||!Array.isArray(c.landingPages)||!['baselineObservedAt','startsObservedAt'].every(k=>Number.isFinite(Date.parse(c[k])))||!count(c.rowsWithheld))return null;
  if(['sessions','sessionsWithStart','startEventCount'].some(k=>c[k]!==null&&!count(c[k])))return null;
  if(['landingBaselineObservedAt','landingStartsObservedAt'].some(k=>c[k]!=null&&!Number.isFinite(Date.parse(c[k]))))return null;
  const seen=new Set();
  for(const r of c.landingPages){
   if(typeof r.path!=='string'||!/^\/(?:[a-z0-9-]+\/)*$/.test(r.path)||!publicPageURL('https://brainilabgames.com'+r.path)||seen.has(r.path)||['sessions','sessionsWithStart','startEventCount'].some(k=>r[k]!==null&&!count(r[k])))return null;
   seen.add(r.path);
  }
 }
 return s;
}

export function sessionShare(row,quality){
 return flags.every(k=>quality?.[k]===false)&&count(row?.sessions)&&row.sessions>0&&count(row.sessionsWithStart)&&row.sessionsWithStart<=row.sessions?row.sessionsWithStart/row.sessions:null;
}
const percent=(row,quality)=>{const v=sessionShare(row,quality);return v===null?'Not comparable':(100*v).toLocaleString('en-GB',{maximumFractionDigits:1})+'%';};
const table=(caption,heads,rows)=>`<div class="growth-table" role="region" tabindex="0" aria-label="${esc(caption)}"><table><caption>${esc(caption)}</caption><thead><tr>${heads.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
const cells=(row,q)=>`<td>${number(row.sessions)}</td><td>${number(row.sessionsWithStart)}</td><td>${number(row.startEventCount)}</td><td>${percent(row,q)}</td>`;
const heads=['Source scope','Landing sessions','Sessions with a recorded start','Start events','Share of observed sessions'];

export function playSessionsHTML(report,now=Date.now()){
 const s=playSnapshot(report);
 return `<section class="growth-search growth-play-sessions" id="growth-play-sessions" aria-labelledby="growth-play-title"><header class="growth-toolbar"><div><p class="admin-eyebrow">Visits and useful activity</p><h2 id="growth-play-title">From a visit to a game</h2></div></header>${!s?'<p>No validated play-session observation imported. Missing starts are unknown, not zero. Existing event counts cannot establish how many sessions played.</p>':`<p class="growth-period">GA4 · ${esc(s.period.start)} to ${esc(s.period.end)} · ${esc(s.timezone)}. Snapshot collected ${esc(date(s.observedAt))}.</p>${now-Date.parse(s.observedAt)>48*3600000?'<p class="growth-caution">Older than 48 hours; showing dated saved evidence.</p>':''}<p>Sessions with an existing <code>game_start</code> or <code>practice_start</code> event. The union is queried once, so a session with both is not added twice.</p>${table('Separate source scopes · totals are queried separately, not summed from landing rows',heads,Object.keys(label).map(key=>{const c=s.cohorts[key];return `<tr><th scope="row">${label[key]}</th>${cells(c,c.quality)}</tr>`;}) )}<p class="growth-small">A recorded start may happen after the landing page. These are GA4-reported session estimates, not unique players, new customers, finished games or keyword conversions. Consent, historical internal testing and changes in start-event coverage limit this sample. An unrecorded start does not prove that a visitor did not play. Missing rows remain Not returned; an explicitly returned zero remains zero. Rates are hidden for missing, zero-denominator, inconsistent or quality-limited counts.</p><div class="growth-content-controls"><label>Landing-page source scope<select data-play-scope>${Object.entries(label).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label><label>Find a landing page<input data-play-filter type="search" placeholder="e.g. number-route"/></label></div><p data-play-note class="growth-small"></p><p data-play-count role="status" aria-live="polite" class="growth-small"></p><div data-play-results></div><div class="growth-search-pagination"><button type="button" class="admin-button" data-play-prev>Previous</button><span data-play-page></span><button type="button" class="admin-button" data-play-next>Next</button><button type="button" class="admin-button" data-play-export>Download session evidence</button></div><details><summary>Source dates, privacy and interpretation</summary><p>All sources and Google / organic are overlapping scopes; never add them. Search Console clicks use a different source and may use different dates. A session share is descriptive, not proof that a change caused more play.</p><p>The landing-page table uses public normalised paths. Query strings, private routes and visitor identifiers are excluded. Each session has one landing dimension; aliases are normalised without attributing a session to a later article or backlink. Scored games and practice remain different events; their union is a recorded-play signal, not a ranked result.</p><p>Totals may differ from the visible public landing rows. Use complete equal, non-overlapping follow-up periods and preserve the original baseline. This panel makes no Google requests and changes no tracking or game state.</p></details>`}</section>`;
}

export function bindPlaySessions(root,report){
 const s=playSnapshot(report),panel=root.querySelector('#growth-play-sessions');if(!s||!panel)return;
 let page=0,exported=[];
 const scope=panel.querySelector('[data-play-scope]'),input=panel.querySelector('[data-play-filter]');
 function draw(){
  const c=s.cohorts[scope.value],filter=input.value.trim().toLowerCase();
  const rows=c.landingPages.filter(r=>r.path.includes(filter)).slice().sort((a,b)=>(b.sessionsWithStart??-1)-(a.sessionsWithStart??-1)||(b.sessions??-1)-(a.sessions??-1)||a.path.localeCompare(b.path));
  const pages=Math.max(1,Math.ceil(rows.length/25));page=Math.min(page,pages-1);
  const caption=label[scope.value]+' · public session landing paths';
  panel.querySelector('[data-play-results]').innerHTML=rows.length?table(caption,['Landing page',...heads.slice(1)],rows.slice(page*25,page*25+25).map(r=>`<tr><th scope="row"><a href="https://brainilabgames.com${esc(r.path)}" target="_blank" rel="noopener noreferrer">${esc(r.path)}</a></th>${cells(r,c.quality)}</tr>`)):'<p>No public landing rows returned for this scope/filter. This is not zero visits or zero players.</p>';
  const limited=flags.some(k=>c.quality[k]);
  panel.querySelector('[data-play-note]').textContent=`Landing baseline collected ${date(c.landingBaselineObservedAt)}; landing starts collected ${date(c.landingStartsObservedAt)}. ${limited?'Google reported thresholding, sampling or grouping; shares are unavailable.':'No thresholding, sampling or grouping reported.'} ${c.rowsWithheld} non-public or sensitive-format rows withheld across the two queries; not a unique-page count.`;
  panel.querySelector('[data-play-count]').textContent=`${rows.length} matching public paths · ${caption}`;
  panel.querySelector('[data-play-page]').textContent=`Page ${page+1} of ${pages}`;panel.querySelector('[data-play-prev]').disabled=page===0;panel.querySelector('[data-play-next]').disabled=page===pages-1;
  exported=[['Scope','Landing path','Sessions','Sessions with a recorded start','Start event count','Session share','Period start','Period end','Timezone','Snapshot collected','Landing baseline collected','Landing starts collected','Thresholded','Sampled','Grouped','Limit'],...rows.map(r=>[label[scope.value],r.path,r.sessions??'',r.sessionsWithStart??'',r.startEventCount??'',sessionShare(r,c.quality)??'',s.period.start,s.period.end,s.timezone,s.observedAt,c.landingBaselineObservedAt||'',c.landingStartsObservedAt||'',...flags.map(k=>c.quality[k]),'Recorded game/practice start; not unique players, completed games or query attribution. Missing counts are not zero.'])];
  panel.querySelector('[data-play-export]').disabled=!rows.length;
 }
 scope.onchange=input.oninput=()=>{page=0;draw();};panel.querySelector('[data-play-prev]').onclick=()=>{page--;draw();};panel.querySelector('[data-play-next]').onclick=()=>{page++;draw();};
 panel.querySelector('[data-play-export]').onclick=()=>{const objectURL=URL.createObjectURL(new Blob([exported.map(r=>r.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=objectURL;a.download='brainilab-play-sessions.csv';a.click();setTimeout(()=>URL.revokeObjectURL(objectURL),1000);};draw();
}
