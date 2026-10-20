const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=v=>typeof v==='number'&&Number.isFinite(v)?v.toLocaleString('en-GB',{maximumFractionDigits:2}):'Not measured';
const at=v=>Number.isFinite(Date.parse(v))?new Date(v).toLocaleString('en-GB',{timeZone:'UTC',dateStyle:'medium',timeStyle:'short'})+' UTC':'Unknown';
export const originLabels={published_listing:'Recorded public listing',owner_submitted_listing:'Owner-submitted listing',reviewed_public_candidate:'Reviewed public candidate',google_links_report:'Google Links source'};

export function reputationSnapshot(snapshot){
 const r=snapshot?.reputation,stamp=v=>Number.isFinite(Date.parse(v)),count=v=>Number.isInteger(v)&&v>=0;
 return r?.schemaVersion===1&&r.domain==='brainilabgames.com'&&r.source==='google_search_console_ui'&&['manualActions','securityIssues','links'].every(k=>r[k]&&stamp(r[k].observedAt)&&(r[k].sourceUpdatedAt===null||stamp(r[k].sourceUpdatedAt)))&&['manualActions','securityIssues'].every(k=>['no_issues_reported','issues_reported','unavailable'].includes(r[k].state))&&count(r.links.externalLinks)&&Array.isArray(r.links.referringSites)&&r.links.referringSites.every(x=>typeof x?.host==='string'&&count(x.links))&&Array.isArray(r.links.targetPages)&&r.links.targetPages.every(x=>typeof x?.url==='string'&&count(x.links))?r:null;
}

export function keywordSnapshot(snapshot){
 const k=snapshot?.keywords;
 if(!k||k.schemaVersion!==1||k.property!=='sc-domain:brainilabgames.com'||k.aggregation!=='byProperty'||k.dataState!=='final'||!Number.isFinite(Date.parse(k.observedAt)))return null;
 return ['current','discovery'].every(w=>k[w]?.period&&Array.isArray(k[w].queries)&&k[w].queries.every(r=>typeof r.query==='string'&&!/@|https?:\/\/|[\x00-\x1f]/.test(r.query)&&Number.isInteger(r.clicks)&&Number.isInteger(r.impressions)&&r.clicks>=0&&r.impressions>=r.clicks&&(r.position===null||typeof r.position==='number'&&Number.isFinite(r.position))))?k:null;
}

export function keywordView(snapshot,window,filter){
 const k=keywordSnapshot(snapshot);
 if(!k)return {heads:[],rows:[],exported:[],caption:'No query-only observation imported',note:'The existing query/page view remains below. Missing keywords are not zero demand.'};
 const period=k[window].period;
 const items=k[window].queries.filter(r=>r.query.toLowerCase().includes(filter)).slice().sort((a,b)=>b.impressions-a.impressions||b.clicks-a.clicks||a.query.localeCompare(b.query));
 return {
  heads:['Observed query','Clicks','Impressions','CTR','Average position'],
  rows:items.map(r=>`<tr><th scope="row">${esc(r.query)}</th><td>${number(r.clicks)}</td><td>${number(r.impressions)}</td><td>${r.impressions?number(100*r.clicks/r.impressions)+'%':'—'}</td><td>${number(r.position)}</td></tr>`),
  exported:[['Query','Clicks','Impressions','CTR','Average position','Period start','Period end','Timezone','Aggregation','Collected at'],...items.map(r=>[r.query,r.clicks,r.impressions,r.impressions?r.clicks/r.impressions:'',r.position??'',period.start,period.end,k.timezone,k.aggregation,k.observedAt])],
  caption:`${window==='discovery'?'90-day discovery':'28-day current'} · ${period.start} to ${period.end} · ${k.timezone}`,
  note:`Collected ${at(k.observedAt)}. Visible query-only property rows; final Web Search data, all markets, no language filter. The windows overlap: never add them or infer growth from their difference. Average position is historical, not a live rank. Google hides some queries; search volume and difficulty remain unmeasured. ${number(k[window].rowsWithheld)} sensitive-format rows withheld.`
 };
}

export function reputationHTML(snapshot,now=Date.now()){
 const r=snapshot?.reputation,links=snapshot?.backlinks||[],sources=snapshot?.sources||[];
 const hosts=new Set(links.map(b=>new URL(b.sourceUrl).hostname.replace(/^www\./,'')));
 const submitted=new Set(sources.filter(s=>s.discovery==='owner_submitted_listing').map(s=>s.url));
 const qualified=links.filter(b=>b.rel.some(x=>['nofollow','ugc','sponsored'].includes(x))).length;
 const google=reputationSnapshot(snapshot);
 const status={no_issues_reported:'No issues reported',issues_reported:'Issues reported',unavailable:'Not inspected'};
 const report=(key,label)=>{
  const item=google?.[key];
  return `<li><strong>${label}:</strong> ${esc(status[item?.state]||'Not inspected')}${item?` · observed ${esc(at(item.observedAt))}${now-Date.parse(item.observedAt)>7*86400000?' · Older than seven days':''}. Source update: ${esc(at(item.sourceUpdatedAt))}.`:'.'}</li>`;
 };
 return `<div class="growth-caution"><strong>Reputation evidence, without an invented score.</strong> No domain-authority, spam or editorial-quality number is calculated. Technical checks and backlinks alone do not establish trustworthiness.</div><h3>What we can substantiate</h3><ul><li>${number(links.length)} direct HTML links verified from ${number(hosts.size)} known source hosts. This is not a whole-web total or a count of independent owners.</li><li>${number(links.filter(b=>submitted.has(b.sourceUrl)).length)} verified links came from recorded owner-submitted listings. A public listing is not an independent endorsement.</li><li>${number(qualified)} verified links have nofollow, UGC or sponsored attributes. An absent attribute does not establish ranking value.</li>${report('manualActions','Google manual actions')}${report('securityIssues','Google security issues')}</ul>${google?`<h3>Google Links report</h3><p>${number(google.links.externalLinks)} external links reported by Google · observed ${esc(at(google.links.observedAt))}. Source update: ${esc(at(google.links.sourceUpdatedAt))}. This is a saved UI observation, separate from our current HTML checks.</p><div class="growth-table" role="region" tabindex="0" aria-label="Google reported referring sites"><table><caption>Sites visible in the Google Links report · separate sample</caption><thead><tr><th scope="col">Referring site</th><th scope="col">Google-reported links</th></tr></thead><tbody>${google.links.referringSites.map(x=>`<tr><th scope="row">${esc(x.host)}</th><td>${number(x.links)}</td></tr>`).join('')}</tbody></table></div><div class="growth-table" role="region" tabindex="0" aria-label="Google reported target pages"><table><caption>Target pages visible in Google Links</caption><thead><tr><th scope="col">Target page</th><th scope="col">Google-reported links</th></tr></thead><tbody>${google.links.targetPages.map(x=>`<tr><th scope="row">${esc(x.url)}</th><td>${number(x.links)}</td></tr>`).join('')}</tbody></table></div>`:'<p>No dated Google Links report has been imported. This means unavailable evidence, not zero links.</p>'}<p class="growth-small">Google’s Links report is a sample collected over time; a reported link may since have changed. Do not add its counts to the HTML index. “No issues reported” does not prove a safe site, good reputation or the absence of algorithmic ranking problems. Editorial independence and expertise remain unverified.</p>`;
}
