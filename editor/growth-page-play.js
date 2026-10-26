import {playSnapshot,sessionShare} from './growth-play-sessions.js';
import {publicPageURL} from './growth-seo-page.js';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=v=>Number.isSafeInteger(v)&&v>=0?v.toLocaleString('en-GB'):'Not returned';
const date=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))?new Date(v).toISOString():'Not reported';
const scopes={all:'All measured sources',googleOrganic:'Google / organic only'};
const flags={thresholded:'Thresholding',sampled:'Sampling',otherRow:'Grouped dimensions'};
const quality=q=>Object.keys(flags).filter(k=>q[k]).map(k=>flags[k]).join('; ')||'No thresholding, sampling or grouping reported';
const missing='No matching public landing row returned. This is unknown, not zero visits or zero players.';
const limitations='The two source scopes overlap; never add them. A recorded game_start or practice_start may occur after the landing page. Sessions are GA4 estimates, not unique players or completed games. Consent, historical owner/QA visits and changes in event coverage limit the sample. Search queries and backlinks are not attributed to these sessions.';

// Reuse the already imported union-session observation. Never borrow a site
// total, another scope, another page or an index.html alias for a missing row.
export function pagePlayEvidence(report,url){
 const s=playSnapshot(report);
 if(!s||typeof url!=='string'||publicPageURL(url)!==url)return null;
 const path=new URL(url).pathname;
 if(!/^\/(?:[a-z0-9-]+\/)*$/.test(path))return null;
 const cohorts=Object.entries(scopes).map(([key,label])=>{
  const c=s.cohorts[key],row=c.landingPages.find(r=>r.path===path)||null;
  const datesKnown=[c.landingBaselineObservedAt,c.landingStartsObservedAt].every(v=>date(v)!=='Not reported');
  const share=row&&datesKnown?sessionShare(row,c.quality):null;
  return {key,label,row,share,quality:quality(c.quality),baselineAt:c.landingBaselineObservedAt,startsAt:c.landingStartsObservedAt};
 });
 return {path,snapshot:s,cohorts,hasRows:cohorts.some(c=>c.row!==null)};
}

const shareText=c=>c.share===null?'Not comparable':(100*c.share).toLocaleString('en-GB',{maximumFractionDigits:1})+'%';
const measureNames=['Landing sessions','Sessions with a recorded start','Start events','Share of observed sessions'];
const values=c=>[number(c.row?.sessions),number(c.row?.sessionsWithStart),number(c.row?.startEventCount),shareText(c)];

export function pagePlayContext(report,url){
 const e=pagePlayEvidence(report,url),exported=[];
 if(!e)return {hasRows:false,html:'<section aria-labelledby="growth-page-play-title"><h4 id="growth-page-play-title">Sessions reaching a recorded start</h4><p>No validated play-session observation matches this public landing path. Missing sessions and starts are unknown, not zero. Index.html aliases are not assigned landing totals.</p></section>',exported,text:'## Sessions reaching a recorded start — separate observation\n\nNo validated play-session observation matches this public landing path. Missing sessions and starts are unknown, not zero. Index.html aliases are not assigned landing totals.'};
 const s=e.snapshot;
 const period=`${s.period.start} to ${s.period.end} · ${s.timezone}`;
 const text=['## Sessions reaching a recorded start — separate observation','',`GA4 Data API; ${period}; snapshot collected ${date(s.observedAt)}.`,`Exact public landing path: ${e.path}. Query strings and aliases are not joined.`, ''];
 const add=(item,detail,at)=>{const r=Array(13).fill('');r[0]='GA4 landing play sessions';r[1]=item;r[2]=detail;r[6]=s.period.start;r[7]=s.period.end;r[8]=s.timezone;r[9]=at||'';r[11]=url;exported.push(r);};
 add('Snapshot collected',date(s.observedAt),s.observedAt);
 const rows=e.cohorts.map(c=>{
  const vals=values(c);
  text.push(`### ${c.label}`,...measureNames.map((name,i)=>`- ${name}: ${vals[i]}`),`- Landing baseline collected: ${date(c.baselineAt)}`,`- Landing starts collected: ${date(c.startsAt)}`,`- Quality: ${c.quality}`,c.row?'Only this returned landing row is shown.':missing,'');
  measureNames.forEach((name,i)=>add(c.label+' · '+name,vals[i],i===0?c.baselineAt:c.startsAt));
  add(c.label+' · Landing baseline collected',date(c.baselineAt),c.baselineAt);
  add(c.label+' · Landing starts collected',date(c.startsAt),c.startsAt);
  add(c.label+' · Quality',c.quality,s.observedAt);
  if(!c.row)add(c.label+' · Missing path',missing,s.observedAt);
  return `<tr><th scope="row">${esc(c.label)}${!c.row?'<small>No matching row returned</small>':''}</th>${vals.map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`;
 });
 text.push(limitations,'Shares require compatible returned counts, known landing-query dates and no reported quality limitation. An absent numerator or denominator, zero denominator or inconsistent counts leave the share Not comparable. An explicitly returned numeric zero remains zero. No keyword conversion or causal effect is inferred.');
 add('Interpretation',limitations,s.observedAt);
 const html=`<section aria-labelledby="growth-page-play-title"><h4 id="growth-page-play-title">Sessions reaching a recorded start</h4><p class="growth-small">GA4 · ${esc(period)}. Snapshot collected ${esc(date(s.observedAt))}. Exact public landing path ${esc(e.path)}; query strings and aliases are not joined.</p><div class="growth-table" role="region" tabindex="0" aria-label="Recorded starts for this landing path"><table><caption>Separate source scopes for this landing path · no site totals substituted</caption><thead><tr>${['Source scope',...measureNames].map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>${e.cohorts.map(c=>`<p class="growth-small"><strong>${esc(c.label)}</strong> · Landing baseline collected ${esc(date(c.baselineAt))}; landing starts collected ${esc(date(c.startsAt))}. ${esc(c.quality)}.${c.row?'':' '+missing}</p>`).join('')}<p class="growth-small">${esc(limitations)}</p><p class="growth-small">Shares are hidden for a missing numerator or denominator, inconsistent counts, unknown landing-query dates, a zero denominator or reported quality limitations. An explicitly returned zero remains zero. This is descriptive activity, not keyword conversion or proof that an edit worked.</p></section>`;
 return {hasRows:e.hasRows,html,exported,text:text.join('\n')};
}
