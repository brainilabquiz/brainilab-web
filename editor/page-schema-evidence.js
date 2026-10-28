import {publicLinkAddress} from './page-link-evidence.js';
import {articleTimestamp} from '../lib/article-date.js';
import {sitemapDate} from '../lib/sitemap-date.js';
import {articlePreviews} from '../lib/article-preview-images.js';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text=v=>typeof v==='string'&&v.length<=480?v.replace(/\s+/g,' ').trim():null;
const one=values=>values.length===1?values[0]:null;
const types=n=>[n?.['@type']].flat();
const address=(v,url)=>typeof v==='string'?publicLinkAddress(v,url)?.href||null:null;
const imageAddress=(v,url)=>{
 const publicAddress=address(v,url);if(publicAddress)return publicAddress;
 if(typeof v!=='string'||v.length>2048||/[\x00-\x20\\]/.test(v)||v.startsWith('//'))return null;
 try{const u=new URL(v,url);return u.protocol==='https:'&&['brainilabgames.com','www.brainilabgames.com'].includes(u.hostname)&&!u.username&&!u.password&&!u.port&&!u.search&&!u.hash&&/^\/assets\/[a-z0-9_./-]+$/i.test(u.pathname)?u.href:null;}catch{return null;}
};

// Compare declarations with this single inert response. No validation service or fetch.
export function observePageSchema(fragment,url,nodes,{incomplete=false,resources=null,resourceLabel='Article'}={}){
 if(!fragment)return {state:'unavailable',reason:'parser_unavailable'};
 if(fragment.querySelector('base[href]'))return {state:'unavailable',reason:'declared_base'};
 const mains=fragment.querySelectorAll('main');
 if(mains.length!==1)return {state:'unavailable',reason:'ambiguous_main'};
 const articles=resources??nodes.filter(n=>types(n).some(t=>['Article','NewsArticle','BlogPosting'].includes(t)));
 const a=!incomplete&&articles.length===1?articles[0]:null,checks=[];
 const add=(field,declaration,page,note='')=>checks.push({field,declaration:declaration||null,page:page||null,state:declaration&&page?(declaration===page?'same':'different'):'unknown',note});
 const canonical=one([...fragment.querySelectorAll('link[rel~="canonical"][href]')].map(n=>address(n.getAttribute('href'),url)));
 add('Canonical and response URL',canonical,url,'The publisher’s canonical declaration is compared with the exact response URL; Google’s selected canonical is not read here.');
 const identity=a?[a.url,a.mainEntityOfPage].filter(v=>v!=null).map(v=>address(typeof v==='object'?v['@id']:v,url)):[];
 const identities=[...new Set(identity)];
 add(resourceLabel+' page identity',identity.length&&identity.every(Boolean)&&identities.length===1?identities[0]:null,canonical,'Missing or conflicting identities remain unknown. A game or library page may not need Article markup.');
 const headings=mains[0].querySelectorAll('h1');
 add(resourceLabel+' headline and main heading',text(resourceLabel==='Course'?a?.name:a?.headline),headings.length===1?text(headings[0].textContent):null,'Whitespace is normalised; different wording is a review prompt, not proof of invalid markup.');
 const authors=[a?.author].flat().filter(Boolean);
 let author=null;
 if(authors.length===1&&typeof authors[0]==='object'){
  const v=authors[0],matches=v['@id']?nodes.filter(n=>n!==v&&n['@id']===v['@id']):[];
  // Inline names and graph references must not disagree or choose among duplicate IDs.
  if(matches.length<=1){const direct=text(v.name),referenced=text(matches[0]?.name);if(!direct||!referenced||direct===referenced)author=direct||referenced;}
 }
 const bylines=mains[0].querySelectorAll('.article-byline [rel~="author"],.article-byline > span');
 add(resourceLabel+' author and byline',author,bylines.length===1?text(bylines[0].textContent):null,'Only the existing byline is compared. Names do not establish identity, expertise or factual accuracy. Multiple or unresolved authors remain unknown.');
 const images=[a?.image].flat().filter(Boolean),declared=[];
 for(const image of images.slice(0,10)){
  let v=image;
  if(typeof v==='object'&&!v.url&&!v.contentUrl&&v['@id']){const found=nodes.filter(n=>n['@id']===v['@id']);v=found.length===1?found[0]:null;}
  const href=imageAddress(typeof v==='object'?(v?.contentUrl||v?.url):v,url);if(href)declared.push(href);
 }
 const social=one([...fragment.querySelectorAll('meta[property="og:image"][content]')].map(n=>imageAddress(n.getAttribute('content'),url)));
 add(resourceLabel+' image and social preview',images.length<=10&&declared.length===images.length&&declared.length?(declared.includes(social)?social:declared.join(' · ')):null,social,'Different crops or preview assets can be valid. The image is not loaded; this does not verify its content, dimensions or eligibility.');
 return {state:'ready',articleState:incomplete?'incomplete':articles.length===1?'single':articles.length?'ambiguous':'absent',checks};
}

export const learnSchemaFields={canonical:'Canonical / response URL',identity:'Declared page identity',headline:'Title / main heading',author:'Author / visible byline',preview:'Image / social preview',cover:'Image / visible cover',published:'Published date / visible time',modified:'Updated date / HTML metadata',lessons:'Ordered lesson names and URLs'};
export function learnSchemaURL(url){
 return typeof url==='string'&&/^https:\/\/brainilabgames\.com\/learn\/(?:paths\/)?[a-z0-9]+(?:-[a-z0-9]+)*\/$/.test(url)&&!/^https:\/\/brainilabgames\.com\/learn\/(?:topics|paths|authors)\/$/.test(url);
}
const instant=value=>{
 const v=articleTimestamp(value);if(typeof v!=='string'||!/^\d{4}-\d\d-\d\dT/.test(v)||!sitemapDate(v)||!Number.isFinite(Date.parse(v)))return null;
 return (BigInt(Math.floor(Date.parse(v)/1000))*1000000000n+BigInt((v.match(/\.(\d+)/)?.[1]||'').padEnd(9,'0').slice(0,9))).toString();
};
export function observeLearnSchema(fragment,url,nodes,options={}){
 if(!learnSchemaURL(url))return null;
 const kind=url.includes('/learn/paths/')?'Course':'Article',resources=nodes.filter(n=>types(n).some(t=>kind==='Course'?t==='Course':['Article','NewsArticle','BlogPosting'].includes(t)));
 const base=observePageSchema(fragment,url,nodes,{...options,resources,resourceLabel:kind});
 if(base.state!=='ready')return {state:'unknown',kind,checks:[]};
 const keys=['canonical','identity','headline','author','preview'],checks=base.checks.map((c,i)=>({field:keys[i],state:c.state,declaration:c.declaration,page:c.page}));
 const a=!options.incomplete&&resources.length===1?resources[0]:null,main=fragment.querySelector('main');
 const add=(field,declaration,page,normal=v=>v)=>{const d=declaration?normal(declaration):null,p=page?normal(page):null;checks.push({field,declaration:declaration||null,page:page||null,state:d&&p?(d===p?'same':'different'):'unknown'});};
 const images=[a?.image].flat().filter(Boolean),declared=[];
 for(let v of images.slice(0,10)){
  if(typeof v==='object'&&!v.url&&!v.contentUrl&&v['@id']){const matches=nodes.filter(n=>n['@id']===v['@id']);v=matches.length===1?matches[0]:null;}
  const href=imageAddress(typeof v==='object'?(v?.contentUrl||v?.url):v,url);if(href)declared.push(href);
 }
 const covers=main.querySelectorAll(kind==='Course'?'.academy-hero > img[src]':'.article-cover img[src]'),cover=covers.length===1?imageAddress(covers[0].getAttribute('src'),url):null;
 add('cover',images.length&&images.length<=10&&declared.length===images.length?(declared.includes(cover)?cover:declared.join(' · ')):null,cover);
 const registered=kind==='Article'&&cover?articlePreviews[new URL(cover).pathname]:null;
 if(checks.at(-1).state==='different'&&registered&&declared.includes(new URL(registered.src,url).href))checks.at(-1).state='equivalent';
 const times=main.querySelectorAll('.article-byline time[datetime]');
 add('published',text(a?.datePublished),times.length===1?text(times[0].getAttribute('datetime')):null,instant);
 const modified=fragment.querySelectorAll('meta[property="article:modified_time"][content]');
 add('modified',text(a?.dateModified),modified.length===1?text(modified[0].getAttribute('content')):null,instant);
 if(kind==='Course'){
  const parts=Array.isArray(a?.hasPart)?a.hasPart:null,links=[...main.querySelectorAll('.path-lessons > li .lesson-copy h3 a[href]')];
  const declaredLessons=parts&&parts.length<=100&&parts.every((p,i)=>p&&typeof p==='object'&&address(p.url,url)&&text(p.name)&&p.position===i+1)?parts.map(p=>[address(p.url,url),text(p.name)]):null;
  const visibleLessons=links.length&&links.length<=100&&links.every(l=>address(l.getAttribute('href'),url)&&text(l.textContent))?links.map(l=>[address(l.getAttribute('href'),url),text(l.textContent)]):null;
  add('lessons',declaredLessons?JSON.stringify(declaredLessons):null,visibleLessons?JSON.stringify(visibleLessons):null);
 }
 return {state:a?'ready':'unknown',kind,checks};
}

// Matched values are not repeated for every article in the saved Growth report.
// Full values remain in the hashed private HTML; differences/unknowns retain context.
export function compactLearnSchema(evidence){
 if(!evidence)return null;
 return {state:evidence.state,kind:evidence.kind,checks:evidence.checks.map(c=>[c.field,c.state]),details:evidence.checks.filter(c=>c.state!=='same').map(c=>[c.field,c.declaration?.slice(0,800)||null,c.page?.slice(0,800)||null])};
}

export function pageSchemaHTML(observation){
 const s=observation?.schemaEvidence;
 if(s?.state!=='ready')return '<p>No unambiguous Article-to-page comparison is available from this response. Missing evidence remains unknown.</p>';
 const label={same:'Same text or address',different:'Different — review context',unknown:'Unknown'};
 const rows=s.checks.map(c=>'<li><strong>'+esc(c.field)+'</strong> · '+esc(label[c.state]||label.unknown)+'<dl><dt>Declaration</dt><dd>'+esc(c.declaration||'Not unambiguously available')+'</dd><dt>Page evidence</dt><dd>'+esc(c.page||'Not unambiguously available')+'</dd></dl><p>'+esc(c.note)+'</p></li>').join('');
 return '<details class="page-schema-evidence"><summary>Article declarations and page content</summary><p>Read '+esc(observation.checkedAt)+'. '+(s.articleState==='single'?'One Article declaration was found.':'A single usable Article declaration was not established; Article comparisons remain unknown.')+' This compares the returned HTML, separate from the draft and saved Google observations.</p><ul>'+rows+'</ul><p>These are informational comparisons, not publication requirements, a complete schema validator or a fact-check. Fields absent from this response do not prove an error. No Google indexing, rich result, AI citation, visit or game is established.</p></details>';
}

export function pageSchemaCSV(observation){
 const s=observation?.schemaEvidence;if(s?.state!=='ready')return [];
 return s.checks.map(c=>{const row=Array(13).fill('');row[0]='Current Article/page comparison';row[1]=c.field;row[2]=c.state+'; declaration: '+(c.declaration||'unknown')+'; page: '+(c.page||'unknown')+'; '+c.note;row[9]=observation.checkedAt;row[10]=observation.url;row[11]=observation.url;return row;});
}
