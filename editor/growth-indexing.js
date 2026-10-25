import {publicPageURL} from './growth-seo-page.js';
import {csvCell} from './growth-search.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=v=>Number.isFinite(Date.parse(v))?new Date(v).toISOString():'Not reported';
const validDate=v=>typeof v==='string'&&Number.isFinite(Date.parse(v));
const names={PASS:'Indexed / valid',NEUTRAL:'Excluded / not indexed',FAIL:'Indexing error',PARTIAL:'Unknown / reserved',VERDICT_UNSPECIFIED:'Unknown'};

export function indexingSnapshot(report){
 const s=report?.googleIndexing;
 if(s?.schemaVersion!==1||s.property!=='sc-domain:brainilabgames.com'||s.source!=='Google URL Inspection API'||s.mode!=='indexed_version'||!validDate(s.observedAt)||!Array.isArray(s.inventory)||!Array.isArray(s.results)||!Array.isArray(s.failures)||new Set(s.inventory).size!==s.inventory.length||s.inventory.some(u=>!publicPageURL(u)))return null;
 const seen=new Set();
 for(const r of s.results){
  if(!s.inventory.includes(r.url)||seen.has(r.url)||!validDate(r.observedAt)||!Object.hasOwn(names,r.verdict)||[r.googleCanonical,r.userCanonical].some(v=>v!==null&&!publicPageURL(v))||r.lastCrawlTime!==null&&!validDate(r.lastCrawlTime)||['coverageState','robotsTxtState','indexingState','pageFetchState'].some(k=>r[k]!==null&&typeof r[k]!=='string'))return null;
  seen.add(r.url);
 }
 if(s.failures.some(r=>!s.inventory.includes(r.url)||!validDate(r.observedAt)||!['quota','authorization','unavailable','invalid_response'].includes(r.reason)))return null;
 return s;
}

function items(s){
 const rows=new Map(s.results.map(r=>[r.url,r])),failed=new Map();
 for(const r of s.failures)if(!failed.has(r.url)||Date.parse(r.observedAt)>Date.parse(failed.get(r.url).observedAt))failed.set(r.url,r);
 return s.inventory.map(url=>{const row=rows.get(url),attempt=failed.get(url),failure=attempt&&(!row||Date.parse(attempt.observedAt)>=Date.parse(row.observedAt))?attempt:null;return {url,row,failure};});
}
const unknownRow=row=>row&&(/^(URL is unknown to Google)$/i.test(row.coverageState||'')||['PARTIAL','VERDICT_UNSPECIFIED'].includes(row.verdict));
const status=x=>x.failure?'Latest inspection unavailable':x.row?/^(URL is unknown to Google)$/i.test(x.row.coverageState||'')?'URL unknown to Google':names[x.row.verdict]:'Not inspected';
function next(x){
 if(x.failure)return 'Keep the previous dated verdict; a failed request does not establish deindexing. Resolve the recorded limit/access issue before retrying.';
 if(!x.row)return 'No Google inspection in this snapshot. HTTP checks and search impressions are separate evidence.';
 if(x.row.googleCanonicalWithheld||x.row.googleCanonical&&x.row.googleCanonical!==x.url)return 'Review Google’s selected canonical and the live page; a deliberate alternate URL is not automatically an error.';
 if(x.row.verdict==='PASS')return 'Preserve working setup. Indexed does not guarantee impressions, ranking, clicks or AI recommendations.';
 return 'Check current content, links, sitemap and any intentional exclusions before choosing a fix. Do not repeatedly request indexing or rewrite for a quota.';
}

export function indexingView(report,scope='all',filter=''){
 const s=indexingSnapshot(report);if(!s)return {rows:[],exported:[],caption:'Google indexing evidence not imported'};
 const q=filter.trim().toLowerCase();
 const values=items(s).filter(x=>(x.url+' '+(x.row?.coverageState||'')+' '+status(x)).toLowerCase().includes(q)&&(scope==='all'||scope==='unknown'&&(!x.row||x.failure||unknownRow(x.row))||scope===x.row?.verdict&&!x.failure));
 const rows=values.map(x=>`<tr><th scope="row"><a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${esc(new URL(x.url).pathname)}</a></th><td><strong>${esc(status(x))}</strong>${x.failure&&x.row?`<small>Previous: ${esc(names[x.row.verdict])}</small>`:''}</td><td>${esc(x.row?.coverageState||'Not observed')}<small>${esc(next(x))}</small></td><td>${esc(date(x.row?.lastCrawlTime))}</td><td>${esc(date(x.row?.observedAt))}${x.failure?`<small>Attempt: ${esc(date(x.failure.observedAt))} · ${esc(x.failure.reason)}</small>`:''}</td></tr>`);
 const exported=[['URL','Latest status','Last successful verdict','Google coverage','Google last crawl','Observation collected','Google canonical','Declared canonical','Latest failed attempt','Failure reason','Next check'],...values.map(x=>[x.url,status(x),x.row?.verdict||'',x.row?.coverageState||'',x.row?.lastCrawlTime||'',x.row?.observedAt||'',x.row?.googleCanonical||'',x.row?.userCanonical||'',x.failure?.observedAt||'',x.failure?.reason||'',next(x)])];
 return {rows,exported,caption:'Google indexed-version observations · separate from the live HTML checklist'};
}

export function indexingHTML(report){
 const s=indexingSnapshot(report),count=key=>s?.results.filter(r=>r.verdict===key).length||0;
 return `<section class="growth-search growth-indexing" id="growth-indexing" aria-labelledby="growth-indexing-title"><header class="growth-toolbar"><div><p class="admin-eyebrow">Google Search Console</p><h2 id="growth-indexing-title">What Google has indexed</h2></div></header>${!s?'<p>No validated Google URL Inspection observation imported. A responding page, sitemap or technical checklist does not prove Google indexing.</p>':`<p class="growth-period">${s.inventory.length} public sitemap URLs · ${s.results.length} with a saved verdict. Snapshot updated ${esc(date(s.observedAt))}; every URL keeps its own observation and Google crawl date.</p><p>${count('PASS')} indexed / valid · ${count('NEUTRAL')} excluded / not indexed · ${count('FAIL')} errors. These describe the inspected inventory, not a ranking or the whole domain’s visibility.</p><p class="growth-small">The API reports the version known to Google, not a live URL test. Failed inspections preserve earlier dated verdicts. No indexing request is sent by opening this panel.</p><div class="growth-content-controls"><label>Google indexing status<select data-index-scope><option value="all">All sitemap URLs</option><option value="PASS">Indexed / valid</option><option value="NEUTRAL">Excluded / not indexed</option><option value="FAIL">Indexing errors</option><option value="unknown">Unknown / unavailable</option></select></label><label>Find a URL or coverage status<input type="search" data-index-filter placeholder="e.g. discovered, number-route"/></label></div><p data-index-count class="growth-small" role="status" aria-live="polite"></p><div data-index-results></div><div class="growth-search-pagination"><button class="admin-button" type="button" data-index-prev>Previous</button><span data-index-page></span><button class="admin-button" type="button" data-index-next>Next</button><button class="admin-button" type="button" data-index-export>Download indexing evidence</button></div>`}</section>`;
}

export function bindIndexing(root,report){
 const panel=root.querySelector('#growth-indexing');if(!panel||!indexingSnapshot(report))return;
 let page=0,exported=[];const scope=panel.querySelector('[data-index-scope]'),input=panel.querySelector('[data-index-filter]');
 function draw(){
  const v=indexingView(report,scope.value,input.value),pages=Math.max(1,Math.ceil(v.rows.length/25));page=Math.min(page,pages-1);exported=v.exported;
  panel.querySelector('[data-index-results]').innerHTML=v.rows.length?`<div class="growth-table" role="region" tabindex="0" aria-label="${esc(v.caption)}"><table><caption>${esc(v.caption)}</caption><thead><tr>${['URL','Google verdict','Coverage and next check','Google last crawl','Observation collected'].map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${v.rows.slice(page*25,page*25+25).join('')}</tbody></table></div>`:'<p>No inspected URLs match this scope/filter. Missing evidence does not establish deindexing.</p>';
  panel.querySelector('[data-index-count]').textContent=`${v.rows.length} matching sitemap URLs`;panel.querySelector('[data-index-page]').textContent=`Page ${page+1} of ${pages}`;panel.querySelector('[data-index-prev]').disabled=page===0;panel.querySelector('[data-index-next]').disabled=page===pages-1;panel.querySelector('[data-index-export]').disabled=!v.rows.length;
 }
 scope.onchange=input.oninput=()=>{page=0;draw();};panel.querySelector('[data-index-prev]').onclick=()=>{page--;draw();};panel.querySelector('[data-index-next]').onclick=()=>{page++;draw();};
 panel.querySelector('[data-index-export]').onclick=()=>{const objectURL=URL.createObjectURL(new Blob([exported.map(r=>r.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=objectURL;a.download='brainilab-google-indexing.csv';a.click();setTimeout(()=>URL.revokeObjectURL(objectURL),1000);};draw();
}

export function pageIndexContext(report,url){
 const s=indexingSnapshot(report),x=s?items(s).find(r=>r.url===url):null;
 if(!x)return {html:'<section><h4>Google indexing</h4><p>No matching Google URL Inspection observation for this exact URL. HTML availability and noindex checks do not establish indexing.</p></section>',exported:[]};
 const rows=[['Google verdict',x.row?names[x.row.verdict]:'Not inspected'],['Google coverage',x.row?.coverageState||'Not observed'],['Google last crawl',date(x.row?.lastCrawlTime)]];
 return {html:`<section><h4>Google indexing</h4><p>${esc(status(x))} · Last successful observation ${esc(date(x.row?.observedAt))}${x.failure?` · Failed attempt ${esc(date(x.failure.observedAt))}`:''}</p><p>${esc(x.row?.coverageState||'Not observed')} · Google last crawl ${esc(date(x.row?.lastCrawlTime))}</p><p>${esc(next(x))}</p></section>`,exported:rows.map(([name,value])=>{const row=Array(13).fill('');row[0]='Google URL Inspection API';row[1]=name;row[2]=value;row[9]=x.row?.observedAt||'';row[11]=url;return row;})};
}
