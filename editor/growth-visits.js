// Growth › Visits & play: our own server-side page counter, next to GA4 (which only sees visitors who accept
// usage statistics). Reading it never changes a report, a decision or browser storage.
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const count=n=>Number(n||0).toLocaleString('en-GB');

export function visitsHTML(){
 return `<section class="admin-panel growth-own-visits" id="growth-own-visits" aria-labelledby="growth-own-visits-title"><p class="admin-eyebrow">Own counter · no cookies · everyone</p><h2 id="growth-own-visits-title">Page requests counted on our server</h2><p class="growth-copy">Every public page request that reaches our server, whatever the visitor chose in the cookie banner. Only the page and the day (UTC) are stored: no cookies, IP addresses or device data. Bots, link previews and prefetches are left out, and pages opened from the browser's hover prefetch never reach the server, so internal clicks are partly missed. Arrivals from outside are all counted. GA4 only counts visitors who accept usage statistics, so the gap between the two shows how many people decline.</p><label class="growth-own-visits-period">Period <select data-visits-days><option value="7">Last 7 days</option><option value="30" selected>Last 30 days</option><option value="90">Last 90 days</option></select></label><div data-visits-body aria-live="polite"><p class="growth-copy">Loading the counter…</p></div></section>`;
}

function bars(days){
 const max=Math.max(1,...days.map(d=>d.count));
 return `<div class="growth-table" tabindex="0" role="region" aria-label="Page requests per day"><table><caption>Page requests per day (UTC)</caption><thead><tr><th scope="col">Day</th><th scope="col">Requests</th><th scope="col"><span class="sr-only">Share of the busiest day</span></th></tr></thead><tbody>${days.slice().reverse().map(d=>`<tr><th scope="row">${esc(d.day)}</th><td>${count(d.count)}</td><td><span class="growth-own-visits-bar" style="width:${Math.round(d.count/max*100)}%"></span></td></tr>`).join('')}</tbody></table></div>`;
}

function pages(top){
 return top.length?`<div class="growth-table" tabindex="0" role="region" aria-label="Most requested pages"><table><caption>Most requested pages</caption><thead><tr><th scope="col">Page</th><th scope="col">Requests</th></tr></thead><tbody>${top.map(p=>`<tr><th scope="row"><a href="${esc(p.path)}" target="_blank" rel="noopener">${esc(p.path)}</a></th><td>${count(p.count)}</td></tr>`).join('')}</tbody></table></div>`:'<p class="growth-copy">No pages counted in this period yet.</p>';
}

export function visitsBody(data){
 if(!data||!Array.isArray(data.days))return '<p class="growth-copy">The counter returned no data.</p>';
 const active=data.days.filter(d=>d.count>0).length;
 return `<p><strong>${count(data.total)} page requests</strong> · ${esc(data.from)} to ${esc(data.to)} (UTC) · ${count(data.pages)} different pages · average ${count(Math.round(data.total/Math.max(1,data.days.length)))} a day${active<data.days.length?` · counting started ${esc((data.days.find(d=>d.count>0)||{}).day||'today')}`:''}</p>${bars(data.days)}${pages(data.top||[])}`;
}

export function bindVisits(root,sb,fetcher=fetch){
 const panel=root.querySelector('#growth-own-visits');if(!panel)return;
 const body=panel.querySelector('[data-visits-body]'),select=panel.querySelector('[data-visits-days]');
 let sequence=0;
 const load=async()=>{
  const current=++sequence;body.innerHTML='<p class="growth-copy">Loading the counter…</p>';
  try{
   const {data,error}=await sb.auth.getSession();if(error||!data?.session)throw Error('Sign in to the admin again.');
   const response=await fetcher('/api/admin/visits?days='+encodeURIComponent(select.value),{headers:{Authorization:'Bearer '+data.session.access_token},signal:AbortSignal.timeout(15000)});
   const result=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(result.error||'The counter could not be read.');
   if(current===sequence)body.innerHTML=visitsBody(result);
  }catch(error){if(current===sequence)body.innerHTML=`<p class="growth-copy" role="status">${esc(error.message||'The counter could not be read.')} <button type="button" class="admin-button" data-visits-retry>Try again</button></p>`;}
 };
 select.addEventListener('change',load);
 body.addEventListener('click',e=>{if(e.target.closest('[data-visits-retry]'))load();});
 load();
}
