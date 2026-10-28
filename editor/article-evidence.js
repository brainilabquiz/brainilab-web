import {articleAddress,articleLinks,publishedRecord} from '../lib/article-links.js';
import {pageReview} from './growth-seo-page.js';
import {searchSources} from './growth-seo-sources.js';

const origin='https://brainilabgames.com',property='sc-domain:brainilabgames.com';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const stamp=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))?v:null;
const label=v=>String(v??'').replace(/\s+/g,' ').trim().slice(0,240);
const number=v=>Number.isFinite(v)?String(v):'Unknown';
const date=v=>stamp(v)?new Date(v).toISOString():'Unknown';
const link=(href,name)=>articleAddress(href)?`<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(name)}</a>`:esc(name);

export function incomingArticleLinks(articles,document){
 const index=new Map();
 for(const row of articles.filter(publishedRecord)){
  if(Object.hasOwn(row,'published_revision')&&row.revision!==row.published_revision)continue;
  const other=row.document||row,slug=row.slug||other.slug;if(!slug)continue;
  for(const l of articleLinks({...other,slug},document)){
   if(l.address?.kind!=='internal')continue;
   const key=l.address.path.replace(/\/index\.html$/,'/');
   if(!index.has(key))index.set(key,new Map());
   const entries=index.get(key),entry=entries.get(slug)||{slug,title:label(other.title),locations:[]};
   if(!entry.locations.includes(l.location))entry.locations.push(l.location);entries.set(slug,entry);
  }
 }
 return index;
}

function snapshot(report){
 const s=report?.seoExplorer;
 if(report?.property!==property||s?.schemaVersion!==1||s.domain!=='brainilabgames.com'||!stamp(s.observedAt))return null;
 if(!['pages','sources','backlinks'].every(k=>Array.isArray(s[k])&&s[k].length<=10000))return null;
 if(!s.backlinks.every(b=>b&&typeof b.sourceUrl==='string'&&typeof b.targetUrl==='string'&&typeof b.anchor==='string'&&Array.isArray(b.rel)&&b.rel.every(x=>typeof x==='string')))return null;
 return s;
}

function observedPage(report,s,url,role){
 let r=null;try{r=s?pageReview(s,url):null;}catch{/* Invalid imported evidence remains unknown. */}
 const search=s?searchSources(s):null;
 const inspection=report?.property===property&&report.googleIndexing?.property===property&&Array.isArray(report.googleIndexing.results)?report.googleIndexing.results.find(x=>x.url===url&&stamp(x.observedAt)):null;
 return {url,role,
  search:search?{observedAt:search.observedAt,period:search.period,timezone:search.timezone,searchType:'web',aggregation:'byPage',markets:'All markets; no language filter',queries:(r?.queries||[]).slice(0,5).map(q=>({query:q.query,clicks:q.clicks,impressions:q.impressions,position:q.position})),matchingRows:r?.queries.length||0}:null,
  checks:r?.page&&r.inspected?{checkedAt:r.page.checkedAt,httpStatus:r.page.status,finalUrl:r.page.finalUrl,label:r.checkContext.label,note:r.checkContext.text,failed:r.failed}:null,
  indexing:inspection?{observedAt:inspection.observedAt,coverageState:label(inspection.coverageState),verdict:label(inspection.verdict)}:null,
  backlinks:(r?.links||[]).slice(0,5).map(b=>({sourceUrl:b.sourceUrl,targetUrl:b.targetUrl,rel:[...new Set(b.rel)].sort(),verifiedAt:b.verifiedAt,firstVerifiedAt:b.firstVerifiedAt})),matchingBacklinks:r?.links.length||0};
}

export function articleEvidence(article,{document,articles=[],review=null,report=null,growth=null,incomingIndex=null}={}){
 const a=article||{},url=/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(a.slug||'')?origin+'/learn/'+a.slug+'/':null;
 const links=review?.links||articleLinks(a,document),index=incomingIndex||incomingArticleLinks(articles,document);
 const incoming=[...(index.get('/learn/'+a.slug+'/')?.values()||[])].filter(x=>x.slug!==a.slug);
 const destinations=new Map(url?[[url,'Article']]:[]);
 for(const l of links){
  // Preserve exact URLs in Growth. A www alias, index.html or query is not merged.
  if(l.address?.kind==='internal'&&l.address.url.startsWith(origin+'/')&&!l.address.query&&!l.address.hash)destinations.set(l.address.url,destinations.get(l.address.url)||l.location);
 }
 const s=snapshot(report);
 const evidence=growth||{available:!!s,source:'Saved Growth report',pages:[...destinations].slice(0,12).map(([u,role])=>observedPage(report,s,u,role))};
 return {url,links:links.map(({address,...l})=>({...l,kind:address?.kind||'invalid'})),incoming,growth:evidence,
  guidance:'Answer the reader’s question near the start and attribute factual claims to the sources actually checked. AEO/GEO does not require an artificial FAQ or a special schema. Choose links for the reader; no link quota, reciprocal-link scheme or authority score is used.'};
}

export function articleEvidenceHTML(model){
 const internal=model.links.filter(l=>l.kind==='internal'),external=model.links.filter(l=>l.kind==='external');
 const list=items=>items.length?'<ul>'+items.map(l=>`<li>${link(l.href,l.label||l.href)} <small>· ${esc(l.location)}</small>${l.rel?.length?` <small>· rel: ${esc(l.rel.join(' '))}</small>`:''}</li>`).join('')+'</ul>':'<p>None in this draft.</p>';
 const pages=model.growth.pages||[];
 return `<p class="article-help">${esc(model.guidance)}</p><h3>Internal links in this draft</h3>${list(internal)}<h3>External links and citations</h3>${list(external)}<p class="article-help">An outgoing link is not a backlink. Check the exact destination, supporting passage and any paid or user-contributed relationship before publication.</p><h3>Links from published readings</h3>${model.incoming.length?'<ul>'+model.incoming.map(x=>`<li>${link('/learn/'+x.slug+'/',x.title||x.slug)} <small>· ${esc(x.locations.join(', '))}</small></li>`).join('')+'</ul>':'<p>No links to this URL were found in the supplied published article catalogue. Review relevant readings when it would help their readers; this is not a failure or a quota.</p>'}<h3>Saved Growth evidence</h3>${!model.growth.available?'<p>No valid saved SEO Explorer evidence loaded. Missing data is unknown, not zero demand or zero backlinks.</p>':''}${pages.map(p=>`<section class="article-evidence-page"><h4>${esc(p.role)} · ${link(p.url,new URL(p.url).pathname)}</h4>${p.checks?`<p>${esc(p.checks.label)} · HTTP ${esc(p.checks.httpStatus)} · checked ${esc(date(p.checks.checkedAt))}. ${esc(p.checks.note)}</p>`:'<p>No complete dated HTML checklist for this exact URL. Check the live page before diagnosing a problem.</p>'}${p.indexing?`<p>Google’s saved index: ${esc(p.indexing.coverageState)} · observed ${esc(date(p.indexing.observedAt))}. This is not a live test or an indexing request.</p>`:''}${p.search?`<p>Final Web query/page sample · ${esc(p.search.period.start)} to ${esc(p.search.period.end)} · ${esc(p.search.timezone)} · collected ${esc(date(p.search.observedAt))}. ${esc(p.search.markets)}.</p>${p.search.queries.length?'<ul>'+p.search.queries.map(q=>`<li>${esc(q.query)} · ${number(q.clicks)} clicks · ${number(q.impressions)} impressions · historical average position ${number(q.position)}</li>`).join('')+'</ul>':'<p>No matching rows in this dated sample. This does not establish zero demand.</p>'}${p.search.matchingRows>5?`<p>Showing 5 of ${p.search.matchingRows} matching rows; inspect the full source in Growth.</p>`:''}`:'<p>No usable Web query/page observation. Query-only and Images data are not substituted.</p>'}${p.backlinks.length?'<ul>'+p.backlinks.map(b=>`<li>${link(b.sourceUrl,new URL(b.sourceUrl).hostname+new URL(b.sourceUrl).pathname)} · HTML href verified ${esc(date(b.verifiedAt))} · rel: ${esc(b.rel.join(' ')||'not declared')}</li>`).join('')+'</ul>':'<p>No matching verified HTML backlinks in the inspected sample. This is not a worldwide total.</p>'}${p.matchingBacklinks>5?`<p>Showing 5 of ${p.matchingBacklinks} matching links.</p>`:''}</section>`).join('')}<p class="article-help">These sources retain independent dates and exact URLs. Do not add overlapping windows, treat historical positions as live ranks, or infer visits, games, endorsement or AI citations from a link. Preserve recent changes until a complete follow-up period is available.</p>`;
}
