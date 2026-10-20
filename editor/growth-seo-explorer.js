import {csvCell} from './growth-search.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>typeof v==='number'&&Number.isFinite(v)?v.toLocaleString('en-GB',{maximumFractionDigits:1}):'—';
const date=v=>Number.isFinite(Date.parse(v))?new Date(v).toLocaleString('en-GB',{timeZone:'UTC',dateStyle:'medium',timeStyle:'short'})+' UTC':'Not measured';
const checks={https:'HTTPS',available:'Available page',title:'One page title',description:'Search description',heading:'One main heading',canonical:'Self canonical',indexable:'No noindex directive',structuredData:'Parseable JSON-LD'};
const state={verified:'HTML link verified',not_found_in_html:'Not found in fetched HTML',unavailable:'Could not inspect',robots_disallowed:'Excluded by robots.txt',not_external:'Redirects to BrainiLab · not a backlink'};
function url(value,own=false){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!u.search&&!u.hash&&(!own||u.hostname==='brainilabgames.com')&&!/^(localhost|.*\.local)$/.test(u.hostname)?u:null;}catch{return null;}}
const link=(value,own=false)=>{const u=url(value,own);return u?`<a href="${esc(u.href)}" target="_blank" rel="noopener noreferrer">${esc(own?u.pathname:u.hostname+u.pathname)}</a>`:'Unavailable';};
export function seoSnapshot(report){
 const s=report?.seoExplorer;
 return s?.schemaVersion===1&&s.domain==='brainilabgames.com'&&Number.isFinite(Date.parse(s.observedAt))&&Array.isArray(s.pages)&&Array.isArray(s.sources)&&Array.isArray(s.backlinks)&&s.pages.every(p=>url(p.url,true)&&p.checks&&(p.trust===null||typeof p.trust==='number'&&p.trust>=0&&p.trust<=100))&&s.sources.every(p=>url(p.url)&&state[p.state])&&s.backlinks.every(b=>url(b.sourceUrl)&&url(b.targetUrl,true)&&typeof b.anchor==='string'&&Array.isArray(b.rel))?s:null;
}
export function seoHTML(report,now=Date.now()){
 const s=seoSnapshot(report),links=s?.backlinks||[],domains=new Set(links.map(b=>url(b.sourceUrl)?.hostname.replace(/^www\./,''))),pages=s?.pages||[],scored=pages.filter(p=>typeof p.trust==='number'),trust=scored.length?scored.reduce((n,p)=>n+p.trust,0)/scored.length:null;
 const queries=report?.searchPerformance?.current?.queries;
 return `<section class="growth-seo-explorer growth-search" id="growth-seo-explorer" aria-labelledby="growth-seo-title"><header class="growth-toolbar"><div><p class="admin-eyebrow">BrainiLab Growth · Our own SEO index</p><h2 id="growth-seo-title">SEO Explorer</h2><p>Your keywords, known backlinks and page trust in one place.</p></div><span class="growth-mode">BrainiLab data</span></header><div class="growth-search-nav" role="group" aria-label="SEO Explorer view"><button type="button" class="admin-button" data-seo-view="links" aria-pressed="true">Backlinks</button><button type="button" class="admin-button" data-seo-view="pages" aria-pressed="false">Page Trust</button><a class="admin-button" href="#growth-search" data-seo-keywords>Keywords${Array.isArray(queries)?' · '+num(queries.length)+' query/page pairs':''} ↓</a></div>${s?`<p class="growth-period">Inspected ${esc(date(s.observedAt))}${now-Date.parse(s.observedAt)>48*3600000?' · Older than 48 hours':''}. Coverage: ${num(pages.length)} requested pages and ${num(s.sources.length)} known source URLs.</p><div class="growth-metrics"><div><span>Verified HTML links</span><strong>${num(links.length)}</strong><small>From the inspected sources</small></div><div><span>Referring domains</span><strong>${num(domains.size)}</strong><small>Known sources, not the whole web</small></div><div><span>Domain Trust · technical</span><strong>${num(trust)}${trust===null?'':' / 100'}</strong><small>${num(scored.length)} of ${num(pages.length)} pages scored</small></div><div><span>External reputation</span><strong class="growth-search-unmeasured">Not measured</strong><small>No global authority or spam verdict</small></div></div><p class="growth-caution">BrainiLab Trust v1 checks technical publishing signals. A high score does not prove factual reliability, domain reputation or ranking authority.</p><div class="growth-content-controls"><label>Find a source or page<input type="search" data-seo-filter placeholder="e.g. daily, number-route"/></label><label>Show<select data-seo-state><option value="all">All inspected sources</option>${Object.entries(state).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label></div><p data-seo-count class="growth-small" role="status" aria-live="polite"></p><div data-seo-results></div><div class="growth-search-pagination"><button class="admin-button" type="button" data-seo-prev>Previous</button><span data-seo-page></span><button class="admin-button" type="button" data-seo-next>Next</button><button class="admin-button" type="button" data-seo-export>Download current view</button></div><details><summary>Trust formula, reputation and coverage</summary><p>Page Trust is a reproducible technical checklist: ${Object.entries(s.scoreWeights||{}).map(([k,v])=>esc(checks[k]||k)+' '+num(v)).join(' · ')}. An unavailable page is unscored. Domain Trust is the arithmetic mean of successfully inspected pages; it is not weighted by traffic or an independent authority index.</p><p>Author and external-link counts are shown separately. A declared author is not verified expertise, and an external link is not an endorsement or a verified citation. This first version does not score editorial truth, site safety, domain age or spam.</p><p>A backlink is a direct link in the anonymously fetched HTML. No nofollow, sponsored or UGC attribute means only that those attributes were absent; it does not prove ranking value. First verified is our first observation, not the link creation date. Failed or blocked pages do not prove lost links; JavaScript-only links may be missed.</p><p>Only recorded public listings have been inspected. Private account pages, submitted candidatures and pending receipts are not backlinks. Total backlinks and reputation across the web remain unknown. This is BrainiLab's index, independent of Ahrefs, Moz and Majestic.</p></details>`:'<p>No public SEO crawl has been imported yet. Keywords remain available below from the existing Search Console connection. Missing backlinks or trust data are not shown as zero.</p>'}</section>`;
}
const table=(heads,rows,caption)=>`<div class="growth-table" role="region" tabindex="0" aria-label="${esc(caption)}"><table><caption>${esc(caption)}</caption><thead><tr>${heads.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
export function bindSEO(root,report){
 const s=seoSnapshot(report),panel=root.querySelector('#growth-seo-explorer');if(!panel)return;
 panel.querySelector('[data-seo-keywords]')?.addEventListener('click',()=>{root.querySelector('[data-search-view="queries"]')?.click();root.querySelector('[data-keyword-search]')?.focus({preventScroll:true});});
 if(!s)return;
 let view='links',page=0,exported=[];
 const input=panel.querySelector('[data-seo-filter]'),select=panel.querySelector('[data-seo-state]');
 function draw(){
  const query=input.value.trim().toLowerCase();let rows=[],heads=[],caption='';select.closest('label').hidden=view==='pages';
  if(view==='links'){
   const sources=s.sources.filter(r=>(select.value==='all'||select.value===r.state)&&(r.url+' '+s.backlinks.filter(b=>b.sourceUrl===r.url).map(b=>b.targetUrl+' '+b.anchor).join(' ')).toLowerCase().includes(query));
   heads=['Source & evidence','Target & anchor','Link attributes','First verified','Latest inspection'];caption='Known public sources · direct HTML links only';
   exported=[['Source','State','Target','Anchor','Rel','First verified','Checked at']];
   for(const source of sources){
    const backlinks=s.backlinks.filter(b=>b.sourceUrl===source.url);
    for(const b of backlinks.length?backlinks:[null]){
     exported.push([source.url,source.state,b?.targetUrl||'',b?.anchor||'',b?.rel.join(' ')||'',b?.firstVerifiedAt||'',source.checkedAt]);
     rows.push(`<tr><th scope="row">${link(source.url)}<small>${esc(state[source.state]||'Unknown')}${source.status?' · HTTP '+num(source.status):''}</small>${!b&&source.lastVerifiedAt?`<small>Last verified ${esc(date(source.lastVerifiedAt))}</small>`:''}</th><td>${b?`${link(b.targetUrl,true)}<small>${esc(b.anchor||'No text anchor')}</small>`:'—'}</td><td>${b?esc(b.rel.filter(r=>['nofollow','sponsored','ugc'].includes(r)).join(', ')||'No qualifying rel attribute'):'—'}</td><td>${b?esc(date(b.firstVerifiedAt)):'—'}</td><td>${esc(date(source.checkedAt))}</td></tr>`);
    }
   }
  }else{
   const pages=s.pages.filter(p=>p.url.toLowerCase().includes(query)).slice().sort((a,b)=>(a.trust??-1)-(b.trust??-1)||a.url.localeCompare(b.url));
   heads=['Page','Page Trust · technical','Failed checks','Declared author','External links','Inspected'];caption='Published pages · lower technical scores first';
   exported=[['Page','HTTP status','Technical trust','Failed checks','Declared author','External links','Checked at']];
   rows=pages.map(p=>{
    const failed=Object.keys(checks).filter(k=>!p.checks[k]).map(k=>checks[k]);
    exported.push([p.url,p.status||'',p.trust??'',p.trust===null?'Not inspected':failed.join('; '),p.authorDeclared,p.externalSourceLinks,p.checkedAt]);
    return `<tr><th scope="row">${link(p.url,true)}<small>${p.status?'HTTP '+num(p.status):'Could not inspect'}</small></th><td><strong>${p.trust===null?'Not measured':num(p.trust)+' / 100'}</strong></td><td>${p.trust===null?'Page could not be inspected':esc(failed.join(' · ')||'All checklist checks passed')}</td><td>${p.trust===null?'—':p.authorDeclared?'Declared':'Not found'}</td><td>${p.trust===null?'—':num(p.externalSourceLinks)}</td><td>${esc(date(p.checkedAt))}</td></tr>`;
   });
  }
  const total=Math.max(1,Math.ceil(rows.length/25));page=Math.min(page,total-1);
  panel.querySelector('[data-seo-results]').innerHTML=rows.length?table(heads,rows.slice(page*25,page*25+25),caption):'<p>No observations match this view. This does not mean no backlinks exist.</p>';
  panel.querySelector('[data-seo-count]').textContent=rows.length+' rows · '+caption;
  panel.querySelector('[data-seo-page]').textContent=`Page ${page+1} of ${total}`;
  panel.querySelector('[data-seo-prev]').disabled=page===0;panel.querySelector('[data-seo-next]').disabled=page===total-1;
  panel.querySelector('[data-seo-export]').disabled=rows.length===0;
 }
 panel.querySelectorAll('[data-seo-view]').forEach(b=>b.onclick=()=>{view=b.dataset.seoView;page=0;panel.querySelectorAll('[data-seo-view]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));draw();});
 input.addEventListener('input',()=>{page=0;draw();});select.addEventListener('change',()=>{page=0;draw();});
 panel.querySelector('[data-seo-prev]').onclick=()=>{page--;draw();};panel.querySelector('[data-seo-next]').onclick=()=>{page++;draw();};
 panel.querySelector('[data-seo-export]').onclick=()=>{const blob=new Blob([exported.map(r=>r.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),objectURL=URL.createObjectURL(blob),a=document.createElement('a');a.href=objectURL;a.download='brainilab-seo-'+view+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(objectURL),1000);};
 draw();
}
