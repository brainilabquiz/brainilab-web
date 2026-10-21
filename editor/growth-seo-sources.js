const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>Number.isFinite(v)?v.toLocaleString('en-GB',{maximumFractionDigits:2}):'Not observed';
const date=v=>Number.isFinite(Date.parse(v))?new Date(v).toISOString():'Unknown';
const host=v=>{try{return new URL(v).hostname.toLowerCase().replace(/^www\./,'');}catch{return null;}};
const safePath=v=>typeof v==='string'&&/^\/(?:[a-z0-9-]+\/)*$/.test(v)&&!/^\/(admin|auth|account|profile)(\/|$)/.test(v);
const page=v=>typeof v==='string'&&/^\/(?:[a-z0-9-]+\/)*(?:index\.html)?$/.test(v)&&!/^\/(admin|auth|account|profile)(\/|$)/.test(v)?`<a href="https://brainilabgames.com${esc(v)}" target="_blank" rel="noopener noreferrer">${esc(v)}</a>`:'Not inspected';
const destinations=links=>{const paths=[...new Set(links.map(b=>new URL(b.targetUrl).pathname))],html=paths.map(page).join('<br>');return paths.length>3?`<details><summary>${paths.length} verified destinations</summary>${html}</details>`:html||'No inspected HTML link';};

export function searchSources(snapshot){
 const s=snapshot?.searchSources;
 if(s?.schemaVersion!==1||s.property!=='sc-domain:brainilabgames.com'||s.source!=='google_search_console_api'||s.dataState!=='final'||!Number.isFinite(Date.parse(s.observedAt))||!s.period?.start||!s.period?.end)return null;
 return ['images','webPages'].every(key=>s[key]?.searchType===(key==='images'?'image':'web')&&s[key].aggregation===(key==='images'?'byProperty':'byPage')&&Array.isArray(s[key].rows)&&s[key].rows.every(r=>typeof r.query==='string'&&r.query.length<=200&&!/@|https?:\/\/|[\x00-\x1f]/.test(r.query)&&Number.isInteger(r.clicks)&&r.clicks>=0&&Number.isInteger(r.impressions)&&r.impressions>=r.clicks&&(r.position===null||Number.isFinite(r.position)&&r.position>=0)&&(key!=='webPages'||safePath(r.path))))?s:null;
}

export function discoveryView(snapshot,key,filter){
 const s=searchSources(snapshot);
 if(!s||!['images','webPages'].includes(key))return {heads:[],rows:[],exported:[],caption:'Additional search source not imported',note:'Missing evidence is not zero demand. The Web query-only source remains available.'};
 const isPage=key==='webPages',kind=isPage?'Web query/page':'Google Images query-only';
 const rows=s[key].rows.filter(r=>(r.query+' '+(r.path||'')).toLowerCase().includes(filter)).slice().sort((a,b)=>b.impressions-a.impressions||b.clicks-a.clicks||a.query.localeCompare(b.query)||String(a.path||'').localeCompare(b.path||''));
 return {
  heads:['Observed query',...(isPage?['Page to inspect']:[]),'Clicks','Impressions','CTR','Average position'],
  rows:rows.map(r=>`<tr><th scope="row">${esc(r.query)}</th>${isPage?`<td>${page(r.path)}<button class="admin-button" type="button" data-seo-review-url="https://brainilabgames.com${esc(r.path)}" aria-label="Review evidence for ${esc(r.path)}">Review evidence</button></td>`:''}<td>${num(r.clicks)}</td><td>${num(r.impressions)}</td><td>${r.impressions?num(100*r.clicks/r.impressions)+'%':'—'}</td><td>${num(r.position)}</td></tr>`),
  exported:[['Query','Page','Clicks','Impressions','CTR','Average position','Search type','Aggregation','Period start','Period end','Timezone','Collected at'],...rows.map(r=>[r.query,r.path||'',r.clicks,r.impressions,r.impressions?r.clicks/r.impressions:'',r.position??'',s[key].searchType,s[key].aggregation,s.period.start,s.period.end,s.timezone,s.observedAt])],
  caption:`${kind} · 90 days · ${s.period.start} to ${s.period.end} · ${s.timezone}`,
  note:`Collected ${date(s.observedAt)}. All markets; no language filter. Inspect the actual query and destination before changing a game or article. Rows are ordered by observed impressions, not an opportunity score. Images and Web Search are separate; query/page counts are not query-only totals. Never add these sources or overlapping windows. Historical average position is not a live rank; volume and difficulty remain unknown. ${num(s[key].rowsWithheld)} sensitive-format or non-public rows withheld.`
 };
}

export function referralView(report,filter){
 const m=report?.measurement,s=report?.seoExplorer;
 const valid=m?.schemaVersion===2&&m.property==='555562532'&&m.mode==='api_snapshot'&&m.source==='GA4 Data API'&&Number.isFinite(Date.parse(m.observedAt))&&m.period?.start&&m.period?.end&&typeof m.timezone==='string'&&Array.isArray(m.sources);
 if(!valid)return {heads:[],rows:[],exported:[],caption:'No dated referral acquisition observation imported',note:'A backlink is not a visit. Missing Analytics data is not zero traffic.'};
 const known=new Map(),referrals=new Map();
 for(const b of s?.backlinks||[]){const h=host(b.sourceUrl);if(!h)continue;const list=known.get(h)||[];list.push(b);known.set(h,list);}
 for(const r of m.sources){
  const match=/^([a-z0-9.-]+) \/ referral$/.exec(r.label||'');
  if(!match||!Number.isInteger(r.sessions)||r.sessions<0||!Number.isInteger(r.engagedSessions)||r.engagedSessions<0||r.engagedSessions>r.sessions)continue;
  const h=match[1].replace(/^www\./,'');if(!/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(h))continue;
  const old=referrals.get(h)||{sessions:0,engagedSessions:0};old.sessions+=r.sessions;old.engagedSessions+=r.engagedSessions;referrals.set(h,old);
 }
 const hosts=[...new Set([...known.keys(),...referrals.keys()])].filter(h=>h.includes(filter)).sort((a,b)=>(referrals.get(b)?.sessions??-1)-(referrals.get(a)?.sessions??-1)||a.localeCompare(b));
 const items=hosts.map(h=>({host:h,traffic:referrals.get(h),links:known.get(h)||[]}));
 const quality=Object.entries(m.quality||{}).filter(([,v])=>v===true).map(([k])=>k).join(', ');
 return {
  heads:['Referring host','Observed sessions','Engaged sessions','Verified HTML destinations','Practical next step'],
  rows:items.map(x=>`<tr><th scope="row">${esc(x.host)}</th><td>${num(x.traffic?.sessions)}</td><td>${num(x.traffic?.engagedSessions)}</td><td>${destinations(x.links)}</td><td>${x.traffic?.sessions?'Check the linked landing page and play path; preserve what works.':'Verify fit and placement before investing more distribution work.'}</td></tr>`),
  exported:[['Host','Sessions','Engaged sessions','Verified target URLs','GA4 period start','GA4 period end','Timezone','GA4 collected at','HTML checked at'],...items.map(x=>[x.host,x.traffic?.sessions??'',x.traffic?.engagedSessions??'',[...new Set(x.links.map(b=>b.targetUrl))].join(' '),m.period.start,m.period.end,m.timezone,m.observedAt,s?.observedAt||''])],
  caption:`Referral traffic · ${m.period.start} to ${m.period.end} · ${m.timezone}`,
  note:`GA4 collected ${date(m.observedAt)}; HTML checks ${date(s?.observedAt)}. Hosts are ordered by observed referral sessions, not link authority. Host-level traffic cannot be assigned to an individual backlink, landing page, player or account. No row means not observed, not zero. Only explicit referral-medium source rows are included; other media are excluded. This is not a channel-group classification. Consent and attribution limit coverage. Do not repeat a host’s sessions for each of its links or divide counts from different periods.${quality?' GA4 quality flags: '+quality+'.':''}`
 };
}
