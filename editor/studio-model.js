// Portable, file-based client work. No BrainiLab workspace, OAuth or database access.
import {inertPublicHTML} from './page-link-evidence.js';
import {articleTimestamp} from '../lib/article-date.js';
import {sitemapDate} from '../lib/sitemap-date.js';
export const STUDIO_VERSION=1;
export const limits={file:2*1024*1024,rows:2000,pages:100,actions:100};
export const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text=(v,max=500)=>{if(typeof v!=='string'||v.length>max||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v))throw Error('A text field is missing or too long.');return v.trim();};
const stamp=v=>{if(typeof v!=='string'||!/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(v)||!Number.isFinite(Date.parse(v))||Date.parse(v)>Date.now()+300000)throw Error('Use a capture time with a timezone, no later than now.');return v;};
const day=v=>{if(typeof v!=='string'||!/^\d{4}-\d\d-\d\d$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)throw Error('Use a valid calendar date.');return v;};
export function publicURL(value,base){
 if(typeof value!=='string'||value.length>2000||/[\x00-\x20\\]/.test(value)||value.startsWith('//'))return null;
 try{const u=new URL(value,base);if(u.protocol!=='https:'||u.username||u.password||u.port||u.search||u.hash||!/^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(u.hostname)||/\.(?:local|localhost|internal|test|invalid)$/.test(u.hostname)||/^\/(?:admin|auth|account|api|login|logout|profile|settings)(?:\/|$)/i.test(u.pathname))return null;return u.href;}catch{return null;}
}
export function siteOrigin(value){const u=publicURL(value);if(!u||new URL(u).pathname!=='/')throw Error('Use the HTTPS home address, without a path, query or fragment.');return new URL(u).origin;}
export function project(profile){
 const name=text(profile.name,100),origin=siteOrigin(profile.origin),goal=text(profile.goal,300),measure=text(profile.measure,100);
 if(!name||!goal||!measure)throw Error('Add a business name, goal and success measure.');
 return {version:STUDIO_VERSION,profile:{name,origin,goal,measure},demo:false,search:null,pages:[],backlinks:[],draft:{url:origin+'/',question:'',title:'',description:'',answer:'',body:'',sources:''},actions:[]};
}
export function parseCSV(input){
 if(typeof input!=='string'||input.length>limits.file)throw Error('Use a CSV smaller than 2 MB.');
 const rows=[];let row=[],cell='',quoted=false,closed=false;
 const push=()=>{row.push(cell);cell='';closed=false;};
 for(let i=0;i<input.length;i++){
  const c=input[i];if(i===0&&c==='\uFEFF')continue;
  if(quoted){if(c==='"'){if(input[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;continue;}
  if(c==='"'){if(cell||closed)throw Error('The CSV contains a misplaced quote.');quoted=true;}
  else if(c===',')push();
  else if(c==='\n'||c==='\r'){if(c==='\r'&&input[i+1]==='\n')i++;push();if(row.some(v=>v!==''))rows.push(row);row=[];if(rows.length>limits.rows+1)throw Error('Use at most 2,000 rows in one import.');}
  else{if(closed)throw Error('The CSV contains text after a closing quote.');cell+=c;}
 }
 if(quoted)throw Error('The CSV contains an unclosed quote.');push();if(row.some(v=>v!==''))rows.push(row);
 if(rows.length<2||rows.length>limits.rows+1||rows.some(r=>r.length!==rows[0].length))throw Error('Use a header and consistently sized CSV rows.');
 return rows;
}
const count=v=>{if(v==='')return null;if(!/^\d+$/.test(v)||!Number.isSafeInteger(Number(v)))throw Error('Clicks and impressions must be whole non-negative numbers, or blank.');return Number(v);};
const decimal=v=>{if(v==='')return null;if(!/^\d+(?:\.\d+)?$/.test(v)||!Number.isFinite(Number(v)))throw Error('Use a non-negative number with a decimal point, or leave it blank.');return Number(v);};
function searchMeta(meta){const start=day(meta.start),end=day(meta.end),capturedAt=stamp(meta.capturedAt);if(start>end||end>capturedAt.slice(0,10))throw Error('The search period must end on or before its capture date.');return {start,end,capturedAt,timezone:'America/Los_Angeles',source:'Uploaded Google Search Console Pages CSV; period and origin supplied by the user',type:'web',aggregation:'byPage'};}
export function importSearch(csv,profile,meta){
 const [header,...rows]=parseCSV(csv),h=header.map(v=>v.trim().toLowerCase()),ix=h.indexOf('top pages')>=0?h.indexOf('top pages'):h.indexOf('page'),click=h.indexOf('clicks'),impression=h.indexOf('impressions'),position=h.indexOf('position');
 if(ix<0||click<0||impression<0||new Set(h).size!==h.length)throw Error('Use an English Pages CSV with Top pages (or Page), Clicks and Impressions columns.');
 const seen=new Set();return {...searchMeta(meta),rows:rows.map(r=>{
  const url=publicURL(r[ix]);if(!url||new URL(url).origin!==profile.origin)throw Error('Every page must belong to this exact project origin and have no private path or query.');if(seen.has(url))throw Error('Duplicate page rows: use one export and one period.');seen.add(url);
  const clicks=count(r[click].trim()),impressions=count(r[impression].trim()),averagePosition=position<0?null:decimal(r[position].trim());
  if(clicks!==null&&impressions!==null&&clicks>impressions)throw Error('A page has more clicks than impressions. Check the export.');
  return {url,clicks,impressions,averagePosition};
 })};
}
export function importBacklinks(csv,profile){
 const [header,...rows]=parseCSV(csv),h=header.map(v=>v.trim().toLowerCase()),source=h.indexOf('source'),target=h.indexOf('target'),at=h.indexOf('observed at'),rel=h.indexOf('rel');
 if(source<0||target<0||at<0||new Set(h).size!==h.length)throw Error('Use Source, Target, Observed at and optional Rel columns.');
 const seen=new Set();return rows.map(r=>{
  const sourceURL=publicURL(r[source]),targetURL=publicURL(r[target]);if(!sourceURL||!targetURL||new URL(sourceURL).origin===profile.origin||new URL(targetURL).origin!==profile.origin)throw Error('Use an external public source and a target on this exact project origin.');
  const attributes=rel<0?'':text(r[rel],120).toLowerCase().split(/\s+/).filter(Boolean).sort().join(' ');if(attributes&&!/^[a-z -]+$/.test(attributes))throw Error('Use ordinary rel names separated by spaces.');
  const observedAt=stamp(r[at]),key=JSON.stringify([sourceURL,targetURL,attributes]);if(seen.has(key))throw Error('Duplicate source, target and rel combination.');seen.add(key);return {source:sourceURL,target:targetURL,observedAt,rel:attributes};
 });
}
export const checkLabels=['Canonical / supplied URL','Article identity / canonical','Headline / main heading','Author / marked byline','Published / HTML metadata','Updated / HTML metadata','Article image / social preview'];
const clean=v=>typeof v==='string'?v.replace(/\s+/g,' ').trim().slice(0,800):null;
const one=a=>a.length===1?a[0]:null;
// Same precision-preserving date contract as the existing Learn comparator.
const instant=value=>{const v=articleTimestamp(value);if(typeof v!=='string'||v.length<=10||!sitemapDate(v))return null;return (BigInt(Math.floor(Date.parse(v)/1000))*1000000000n+BigInt((v.match(/\.(\d+)/)?.[1]||'').padEnd(9,'0').slice(0,9))).toString();};
const comparisonState=(label,a,b)=>{const date=label===checkLabels[4]||label===checkLabels[5],left=date?instant(a):a,right=date?instant(b):b;return left&&right?(left===right?'same':'different'):'unknown';};
export async function inspectHTML(html,url,capturedAt,profile,document){
 if(typeof html!=='string'||new TextEncoder().encode(html).length>limits.file)throw Error('Use an HTML file smaller than 2 MB.');
 if(!publicURL(url)||new URL(url).origin!==profile.origin)throw Error('The supplied page must belong to this exact project origin.');stamp(capturedAt);
 const f=inertPublicHTML(html,document);if(!f||f.querySelector('base[href]'))throw Error('A page with a declared base URL cannot be compared safely here.');
 const nodes=[];let incomplete=false;function walk(x,depth=0){if(depth>8||nodes.length>1000)throw Error('Graph limit');if(Array.isArray(x))for(const n of x)walk(n,depth+1);else if(x&&typeof x==='object'){nodes.push(x);if(x['@graph'])walk(x['@graph'],depth+1);}}
 for(const s of f.querySelectorAll('script[type="application/ld+json"]')){if(s.closest('noscript'))continue;try{walk(JSON.parse(s.textContent));}catch{incomplete=true;}}
 const articles=nodes.filter(n=>[n['@type']].flat().some(t=>['Article','BlogPosting','NewsArticle'].includes(t))),a=!incomplete?one(articles):null,main=one([...f.querySelectorAll('main')]);
 const address=v=>typeof v==='string'?publicURL(v,url):null;
 const canonical=one([...f.querySelectorAll('link[rel~="canonical"][href]')].map(n=>address(n.getAttribute('href'))));
 const meta=name=>one([...f.querySelectorAll('meta')].filter(n=>n.getAttribute('property')===name).map(n=>clean(n.getAttribute('content'))));
 const checks=[],add=(label,declaration,evidence,note='')=>checks.push({label,declaration:clean(declaration),evidence:clean(evidence),state:comparisonState(label,clean(declaration),clean(evidence)),note});
 add(checkLabels[0],canonical,url,'The page address is supplied by the user; no response or Google canonical is verified. An intentional alias may be valid.');
 const ids=a?[a.url,a.mainEntityOfPage].filter(v=>v!=null).map(v=>address(typeof v==='object'?v['@id']:v)):[],identity=ids.length&&ids.every(Boolean)&&new Set(ids).size===1?ids[0]:null;
 add(checkLabels[1],identity,canonical);
 add(checkLabels[2],clean(a?.headline),main?clean(one([...main.querySelectorAll('h1')])?.textContent):null);
 const authors=[a?.author].flat().filter(Boolean),author=authors.length===1?clean(typeof authors[0]==='object'?authors[0].name:authors[0]):null;
 add(checkLabels[3],author,main?clean(one([...main.querySelectorAll('[rel~="author"], [itemprop="author"]')])?.textContent):null,'Only explicitly marked bylines are compared; other author markup remains unknown.');
 add(checkLabels[4],clean(a?.datePublished),meta('article:published_time'),'Different time representations need context; no date is changed.');
 add(checkLabels[5],clean(a?.dateModified),meta('article:modified_time'),'Metadata is not proof of a deployment time.');
 const images=[a?.image].flat().filter(Boolean).map(v=>address(typeof v==='object'?v.url||v['@id']:v));
 add(checkLabels[6],images.length===1?images[0]:null,address(meta('og:image')),'Different image crops may be valid. Images are not loaded.');
 const links=[],seen=new Set();let omitted=0,scanned=0;
 if(main)for(const n of main.querySelectorAll('a[href]')){
  if(scanned>=1000||links.length>=200)break;scanned++;
  const href=address(n.getAttribute('href'));if(!href){omitted++;continue;}
  const label=clean(n.textContent)||'',rel=[...new Set((n.getAttribute('rel')||'').toLowerCase().split(/\s+/).filter(v=>/^[a-z-]{1,30}$/.test(v)))].sort().join(' '),key=JSON.stringify([href,label,rel]);if(seen.has(key))continue;seen.add(key);
  links.push({url:href,label,rel,kind:new URL(href).origin===profile.origin?'internal':'external'});
 }
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(html));
 return {url,capturedAt,sha256:[...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join(''),title:clean(one([...f.querySelectorAll('title')])?.textContent)||'',checks,links,linkState:main?'bounded main-content sample':'unknown: no single main element',omitted,truncated:!!main&&scanned<main.querySelectorAll('a[href]').length,incomplete};
}
export function validateProject(input){
 if(!input||input.version!==STUDIO_VERSION)throw Error('Use a Growth Studio version 1 project file.');
 const p=project(input.profile);p.demo=input.demo===true;
 if(p.demo&&!p.profile.origin.endsWith('.example'))throw Error('The demonstration label requires an example-domain project.');
 if(input.search){
  const s=input.search;if(!Array.isArray(s.rows)||s.rows.length>limits.rows||s.type!=='web'||s.aggregation!=='byPage'||s.timezone!=='America/Los_Angeles')throw Error('Search evidence has an unsupported scope.');
  const csv=[['Top pages','Clicks','Impressions','Position'],...s.rows.map(r=>[r.url,r.clicks??'',r.impressions??'',r.averagePosition??''])].map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\n');p.search=importSearch(csv,p.profile,s);
 }
 if(!Array.isArray(input.pages)||input.pages.length>limits.pages||!Array.isArray(input.backlinks)||input.backlinks.length>limits.rows||!Array.isArray(input.actions)||input.actions.length>limits.actions)throw Error('This project exceeds the pilot limits.');
 const seen=new Set();p.pages=input.pages.map(page=>{
  if(!publicURL(page.url)||new URL(page.url).origin!==p.profile.origin||seen.has(page.url)||!/^[a-f0-9]{64}$/.test(page.sha256)||!Array.isArray(page.checks)||page.checks.length!==7||!Array.isArray(page.links)||page.links.length>200||typeof page.truncated!=='boolean'||typeof page.incomplete!=='boolean'||!Number.isInteger(page.omitted)||page.omitted<0||page.omitted>1000)throw Error('A saved HTML observation is invalid.');seen.add(page.url);
  return {url:page.url,capturedAt:stamp(page.capturedAt),sha256:page.sha256,title:text(page.title,800),checks:page.checks.map((c,i)=>{if(c.label!==checkLabels[i]||!['same','different','unknown'].includes(c.state))throw Error('A schema comparison is invalid.');return {label:c.label,state:c.state,declaration:c.declaration===null?null:text(c.declaration,800),evidence:c.evidence===null?null:text(c.evidence,800),note:text(c.note,500)};}),links:page.links.map(l=>{if(!publicURL(l.url)||!['internal','external'].includes(l.kind)||l.kind!==(new URL(l.url).origin===p.profile.origin?'internal':'external'))throw Error('An observed link is invalid.');return {url:l.url,label:text(l.label,800),rel:text(l.rel,120),kind:l.kind};}),linkState:text(page.linkState,100),omitted:page.omitted,truncated:page.truncated,incomplete:page.incomplete};
 });
 const backlinks=[['Source','Target','Observed at','Rel'],...input.backlinks.map(b=>[b.source,b.target,b.observedAt,b.rel])];p.backlinks=input.backlinks.length?importBacklinks(backlinks.map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\n'),p.profile):[];
 const d=input.draft;if(!d||!publicURL(d.url)||new URL(d.url).origin!==p.profile.origin)throw Error('The draft address must belong to this project.');
 p.draft={url:d.url,question:text(d.question,500),title:text(d.title,300),description:text(d.description,500),answer:text(d.answer,2000),body:text(d.body,50000),sources:text(d.sources,5000)};
 p.actions=input.actions.map(a=>{if(!publicURL(a.url)||new URL(a.url).origin!==p.profile.origin||!['planned','done'].includes(a.state))throw Error('An action has an invalid page or state.');return {url:a.url,title:text(a.title,300),evidence:text(a.evidence,2000),state:a.state};});
 if(new TextEncoder().encode(JSON.stringify(p)).length>limits.file)throw Error('This project exceeds 2 MB. Keep a smaller evidence sample so its download can be reopened.');
 return p;
}
export function demoProject(){
 const p=project({name:'Juniper Workshop',origin:'https://juniper.example/',goal:'Help people choose and book a beginner workshop.',measure:'Confirmed workshop enquiries'});p.demo=true;
 p.search=importSearch('Top pages,Clicks,Impressions,Position\nhttps://juniper.example/workshops/,12,240,8.2\nhttps://juniper.example/first-workshop/,3,180,12.4',p.profile,{start:'2026-09-01',end:'2026-09-28',capturedAt:'2026-10-01T09:00:00Z'});
 p.draft={url:p.profile.origin+'/first-workshop/',question:'What should I bring to my first pottery workshop?',title:'Your first pottery workshop: what to bring',description:'A practical guide to clothing, materials and what to expect at your first workshop.',answer:'Wear comfortable clothes and closed shoes. Ask the studio which materials are included before you arrive.',body:'Explain what the studio provides, where to arrive and what a beginner will make. Check each practical detail with the workshop owner before publishing.',sources:'Workshop owner: confirm included materials, access and arrival time.'};
 p.actions=[{url:p.draft.url,title:'Check the workshop information with the owner',evidence:'Demonstration only: the search sample suggests reviewing this existing page. No real demand or booking is established.',state:'planned'}];return p;
}
export function draftMarkdown(p){const d=p.draft;return '---\ntitle: '+JSON.stringify(d.title)+'\ndescription: '+JSON.stringify(d.description)+'\nurl: '+JSON.stringify(d.url)+'\nstatus: draft\n---\n\n# '+d.title+'\n\n'+d.answer+'\n\n'+d.body+'\n\n## Review notes — remove before publication\n\nReader question: '+d.question+'\n\nSource review notes:\n'+d.sources+'\n';}
export function reportHTML(raw,{includeDraft=false}={}){
 const p=validateProject(raw),row=(a,b)=>'<tr><th scope="row">'+esc(a)+'</th><td>'+esc(b)+'</td></tr>',table=(heads,rows)=>'<table><thead><tr>'+heads.map(h=>'<th scope="col">'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+rows+'</tbody></table>';
 return '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src \'none\'; base-uri \'none\'; form-action \'none\'"><title>'+esc(p.profile.name)+' — review</title><style>body{font:16px/1.6 system-ui,sans-serif;color:#18362e;max-width:920px;margin:40px auto;padding:24px}h1{font-size:36px}h2{margin-top:36px}table{width:100%;border-collapse:collapse;font-size:14px}th,td{border-bottom:1px solid #ccd9d0;text-align:left;padding:10px;vertical-align:top;overflow-wrap:anywhere}p,li{overflow-wrap:anywhere}small{color:#405c50}pre{white-space:pre-wrap}@media print{body{margin:0;padding:0}h2{break-after:avoid}tr{break-inside:avoid}}</style><header><small>GROWTH STUDIO · '+(p.demo?'SIMULATED DEMONSTRATION':'FILE-BASED PROJECT REVIEW')+'</small><h1>'+esc(p.profile.name)+'</h1><p>'+esc(p.profile.origin)+'</p></header><h2>The business goal</h2><p>'+esc(p.profile.goal)+'</p><p>Success measure: '+esc(p.profile.measure)+'. No conversion measurement is connected in this pilot.</p><h2>Search observations</h2>'+(p.search?'<p>'+esc(p.search.start)+' to '+esc(p.search.end)+' · '+esc(p.search.timezone)+'. Captured '+esc(p.search.capturedAt)+'. Uploaded Web Pages CSV; user-supplied period and property. Rows are not a site total.</p>'+table(['Page','Clicks','Impressions','Historical average position'],p.search.rows.map(r=>'<tr>'+[r.url,r.clicks??'Unknown',r.impressions??'Unknown',r.averagePosition??'Unknown'].map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join('')):'<p>Search data not supplied. Missing evidence is unknown.</p>')+'<h2>Supplied HTML and schema</h2>'+(p.pages.length?p.pages.map(page=>'<h3>'+esc(page.url)+'</h3><p>Supplied capture: '+esc(page.capturedAt)+' · SHA256 '+esc(page.sha256)+'. The capture time and address are user-supplied; no live response was verified.</p>'+table(['Comparison','Observation'],page.checks.map(c=>row(c.label,c.state+' · declaration: '+(c.declaration||'unknown')+' · HTML: '+(c.evidence||'unknown')+' · '+c.note)).join(''))+'<p>'+page.links.filter(l=>l.kind==='internal').length+' internal and '+page.links.filter(l=>l.kind==='external').length+' external link combinations in a bounded main-content sample. Destinations were not fetched.</p>').join(''):'<p>No HTML captures supplied.</p>')+'<h2>Incoming link records</h2><p>'+p.backlinks.length+' supplied source/target/rel records. The tool has not verified these links, their independence or resulting visits.</p>'+table(['Source','Target','Supplied observation','Rel'],p.backlinks.map(b=>'<tr>'+[b.source,b.target,b.observedAt,b.rel||'Not recorded'].map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join(''))+'<h2>Reviewed next actions</h2>'+(p.actions.length?'<ol>'+p.actions.map(a=>'<li><strong>'+esc(a.title)+'</strong> · '+esc(a.state)+'<p>'+esc(a.url)+'</p><p>'+esc(a.evidence)+'</p></li>').join('')+'</ol>':'<p>No actions recorded. Search impressions alone do not justify a change.</p>')+(includeDraft?'<h2>Article draft — not published</h2><p>'+esc(p.draft.url)+'</p><pre>'+esc(draftMarkdown(p))+'</pre>':'')+'<h2>Scope and next review</h2><p>This is a supplied-file review, not a live site audit or Google connection. Schema differences need context; unknown fields are not failures. Source notes do not fact-check a draft. AEO/GEO review means clear answers and attributable claims, not an AI visibility score. Indexing, live ranks, conversions, uplift and revenue have not been established. No content was published.</p><p>Generated '+esc(new Date().toISOString())+'. Source capture dates above remain unchanged.</p></html>';
}
