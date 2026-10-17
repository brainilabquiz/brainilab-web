import {escapeHTML as esc} from './distribution-tools.js';
const fields=['verifiedSends','unresolvedSends','permanentFailures','humanReplies','automaticAcknowledgements'];
const day=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!v.startsWith('0000-')&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
const unlimitedPolicy=(p,asOf)=>p&&Object.hasOwn(p,'dailyLimit')&&p.dailyLimit===null&&p.providerLimitsApply===true&&day(p.effectiveLocalDate)&&p.effectiveLocalDate<=asOf?{effectiveLocalDate:p.effectiveLocalDate,dailyLimit:null,providerLimitsApply:true}:null;
export function outreachSnapshot(s){
 try{
  if(s?.schemaVersion!==1||s.timezone!=='Europe/Madrid'||!day(s.asOfLocalDate)||!Array.isArray(s.days)||s.days.length!==14||!Number.isSafeInteger(s.undatedSends)||s.undatedSends<0)return null;
  const policy=s.dailyLimit===20?{dailyLimit:20}:Object.hasOwn(s,'dailyLimit')&&s.dailyLimit===null?unlimitedPolicy(s.policyAuthorization,s.asOfLocalDate):null;
  if(!policy)return null;
  const expected=Array.from({length:14},(_,n)=>new Date(Date.parse(s.asOfLocalDate+'T00:00:00Z')-n*86400000).toISOString().slice(0,10));
  if(new Set(s.days.map(r=>r.localDate)).size!==14||s.days.some(r=>!expected.includes(r.localDate)||fields.some(k=>!Number.isSafeInteger(r[k])||r[k]<0||r[k]>100000)||fields.slice(2).some(k=>r[k]>r.verifiedSends)))return null;
  return {asOfLocalDate:s.asOfLocalDate,dailyLimit:policy.dailyLimit,...(s.dailyLimit===null?{policyAuthorization:policy}:{}),undatedSends:s.undatedSends,days:s.days.map(r=>Object.fromEntries(['localDate',...fields].map(k=>[k,r[k]]))).sort((a,b)=>b.localDate.localeCompare(a.localDate))};
 }catch{return null;}
}
export function outreachHTML(value,observedAt,now=Date.now()){
 const s=outreachSnapshot(value);
 if(!s)return '<section class="growth-outreach"><h3>Daily email outreach</h3><p>No valid email summary imported yet. Check the private contact register before sending.</p></section>';
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));
 const r=s.days[0],used=r.verifiedSends+r.unresolvedSends,limited=s.dailyLimit!==null,remaining=limited?Math.max(0,s.dailyLimit-used):null;
 const stale=today!==s.asOfLocalDate||!Number.isFinite(Date.parse(observedAt))||now-Date.parse(observedAt)>48*3600000;
 const blocked=stale||s.undatedSends>0||r.unresolvedSends>0||r.permanentFailures>=2||(limited&&used>=s.dailyLimit);
 const checks='Check Gmail, replies, exclusions and organisation aliases before sending.';
 const reason=stale?'Refresh the private register: these counts are from another day or an old snapshot.':s.undatedSends?'Some send records have no usable date. Reconcile them before sending.':r.unresolvedSends?'Check Sent for unresolved messages before another send.':r.permanentFailures>=2?'Repeated permanent failures: stop this batch and review contact quality.':limited&&used>=s.dailyLimit?'Daily limit reached. Bounces still count; do not send replacements.':limited?`${remaining} slots remain in the recorded daily limit. ${checks}`:checks;
 const policyText=limited?`Internal daily limit: ${s.dailyLimit}.`:'No internal daily cap. Provider limits still apply.';
 return `<section class="growth-outreach" aria-labelledby="growth-outreach-title"><h3 id="growth-outreach-title">Daily email outreach</h3><p>${esc(s.asOfLocalDate)} · Europe/Madrid · private register collected ${esc(observedAt||'date unavailable')}. This is a saved ledger, not a live Gmail connection.</p><p class="growth-small" data-outreach-policy>${esc(policyText)}</p><p class="${blocked?'growth-caution':'growth-small'}" data-outreach-status>${esc(reason)}</p><dl class="growth-outreach-counts"><div><dt>Verified sends</dt><dd>${r.verifiedSends}${limited?` / ${s.dailyLimit}`:''}</dd></div><div><dt>Unresolved sends</dt><dd>${r.unresolvedSends}</dd></div><div><dt>Permanent failures</dt><dd>${r.permanentFailures}</dd></div><div><dt>Human replies recorded</dt><dd>${r.humanReplies}</dd></div></dl><p class="growth-small">${r.automaticAcknowledgements} automatic acknowledgements recorded for this day’s messages. Replies and failures describe the sending cohort and may have arrived later. Sending is not proof of delivery, a published link or a visit.</p><details><summary>Previous 14 sending dates</summary><div class="growth-table" role="region" tabindex="0" aria-label="Email outreach by sending date"><table><caption>Recorded sends and later response observations · no automatic follow-ups</caption><thead><tr><th scope="col">Sending date</th><th scope="col">Verified</th><th scope="col">Unresolved</th><th scope="col">Failed permanently</th><th scope="col">Human replies</th><th scope="col">Automatic acknowledgements</th></tr></thead><tbody>${s.days.map(d=>`<tr><th scope="row">${esc(d.localDate)}</th>${fields.map(k=>`<td>${d[k]}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details><p class="growth-small">Only aggregate counts are exported. Names, addresses, message text and private mail links stay in the private register. There is no send or retry button here.</p></section>`;
}
