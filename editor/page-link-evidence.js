import {articleAddress} from '../lib/article-links.js';
import {publicPageURL} from './growth-page-checks.js';

const LIMIT=200,SCAN_LIMIT=1000;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clean=v=>String(v??'').replace(/\s+/g,' ').trim().slice(0,240);

// Observe only public, query-free destinations. Never fetch or "clean" a private URL.
export function publicLinkAddress(href,base){
 if(typeof href!=='string'||!href||/[\x00-\x20\\]/.test(href)||href.startsWith('//'))return null;
 try{
  const u=new URL(href,base),address=articleAddress(u.href);
  if(!address||u.search||u.port||u.hash&&!/^#[a-z0-9-]{1,120}$/i.test(u.hash))return null;
  if(address.kind==='internal'){
   const page=new URL(u.href);page.hash='';
   page.hostname='brainilabgames.com';
   if(!publicPageURL(page.href)||/^\/(?:api|cdn-cgi)(\/|$)/.test(page.pathname))return null;
  }else if(!/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(u.hostname)||/\.(?:local|localhost|internal|test|invalid)$/.test(u.hostname)||/^(?:\d+\.){3}\d+$/.test(u.hostname))return null;
  return {href:u.href,kind:address.kind};
 }catch{return null;}
}

export function observePageLinks(html,url,document){
 if(!document?.implementation?.createHTMLDocument)return {state:'unavailable',reason:'parser_unavailable'};
 // A detached template is inert: do not append it, enable scripts or load resources.
 const inert=document.implementation.createHTMLDocument(''),template=inert.createElement('template');
 template.innerHTML=html;
 if(template.content.querySelector('base[href]'))return {state:'unavailable',reason:'declared_base'};
 const mains=template.content.querySelectorAll('main');
 if(mains.length!==1)return {state:'unavailable',reason:mains.length?'ambiguous_main':'no_main'};
 const anchors=mains[0].querySelectorAll('a[href]'),seen=new Set(),links=[];
 let omitted=0,scanned=0;
 for(const a of anchors){
  if(scanned>=SCAN_LIMIT||links.length>=LIMIT)break;
  scanned++;
  const address=publicLinkAddress(a.getAttribute('href'),url);
  if(!address){omitted++;continue;}
  const label=clean(a.textContent)||clean(a.querySelector('img[alt]')?.getAttribute('alt'));
  const rel=[...new Set((a.getAttribute('rel')||'').toLowerCase().split(/\s+/).filter(x=>/^[a-z][a-z0-9-]{0,39}$/.test(x)))].sort();
  const location=a.closest('#sources')?'Source list':a.matches('[data-article-game],.article-game-link')?'Game invitation':a.closest('nav')?'Navigation':'Page content';
  const key=JSON.stringify([address.href,label,rel,location]);
  if(seen.has(key))continue;
  seen.add(key);links.push({...address,label,rel,location});
 }
 return {state:'ready',scope:'Single main element in returned HTML',links,scanned,omitted,truncated:scanned<anchors.length};
}

export function pageLinksHTML(observation){
 const s=observation?.linkEvidence;
 if(s?.state!=='ready')return '<p>No unambiguous main-content link sample is available from this response. Missing links are unknown, not broken or absent.</p>';
 const links=s.links.filter(l=>publicLinkAddress(l.href,observation.url)),shown=links.slice(0,20);
 const rows=shown.map(l=>'<li><a href="'+esc(l.href)+'" target="_blank" rel="noopener noreferrer">'+esc(l.label||'No text or image alternative')+'</a><small> · '+esc(l.kind)+' · '+esc(l.location)+'</small><br><code>'+esc(l.href)+'</code>'+(l.rel.length?'<small> · rel: '+esc(l.rel.join(' '))+'</small>':'')+'</li>').join('');
 return '<details class="page-link-evidence"><summary>Links in the current public HTML · '+links.length+(s.truncated?' in bounded sample':'')+'</summary><p>Read '+esc(observation.checkedAt)+'. Main-content anchors only; repeated destination, label, rel and location combinations appear once. This is separate from draft links and incoming backlinks.</p>'+(rows?'<ul>'+rows+'</ul>':'<p>No eligible public, query-free anchors were found in this sample.</p>')+(links.length>shown.length?'<p>Showing '+shown.length+' of '+links.length+' observed combinations.</p>':'')+(s.omitted?'<p>Some anchors were omitted by the public-address filter. Their URLs and text are not exported.</p>':'')+(s.truncated?'<p>The bounded scan stopped early; this is not a complete link inventory.</p>':'')+'<p>Destinations were not followed. An HTML anchor does not verify its response, supporting passage, visibility, Google crawl, AI citation or resulting visit or game. Script-added links, site-wide navigation and CSS visibility are outside this observation.</p></details>';
}

export function pageLinksCSV(observation){
 const s=observation?.linkEvidence;
 if(s?.state!=='ready')return [];
 return s.links.filter(l=>publicLinkAddress(l.href,observation.url)).map(l=>{
  const row=Array(13).fill('');row[0]='Current outgoing HTML link';row[1]=l.label;row[2]=l.kind+'; '+l.location+'; destination not fetched'+(s.truncated?'; bounded partial sample':'');row[9]=observation.checkedAt;row[10]=observation.url;row[11]=l.href;row[12]=l.rel.join(' ');return row;
 });
}
