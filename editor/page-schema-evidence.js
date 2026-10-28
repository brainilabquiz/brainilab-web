import {publicLinkAddress} from './page-link-evidence.js';

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
export function observePageSchema(fragment,url,nodes,{incomplete=false}={}){
 if(!fragment)return {state:'unavailable',reason:'parser_unavailable'};
 if(fragment.querySelector('base[href]'))return {state:'unavailable',reason:'declared_base'};
 const mains=fragment.querySelectorAll('main');
 if(mains.length!==1)return {state:'unavailable',reason:'ambiguous_main'};
 const articles=nodes.filter(n=>types(n).some(t=>['Article','NewsArticle','BlogPosting'].includes(t)));
 const a=!incomplete&&articles.length===1?articles[0]:null,checks=[];
 const add=(field,declaration,page,note='')=>checks.push({field,declaration:declaration||null,page:page||null,state:declaration&&page?(declaration===page?'same':'different'):'unknown',note});
 const canonical=one([...fragment.querySelectorAll('link[rel~="canonical"][href]')].map(n=>address(n.getAttribute('href'),url)));
 add('Canonical and response URL',canonical,url,'The publisher’s canonical declaration is compared with the exact response URL; Google’s selected canonical is not read here.');
 const identity=a?[a.url,a.mainEntityOfPage].filter(v=>v!=null).map(v=>address(typeof v==='object'?v['@id']:v,url)):[];
 const identities=[...new Set(identity)];
 add('Article page identity',identity.length&&identity.every(Boolean)&&identities.length===1?identities[0]:null,canonical,'Missing or conflicting Article identities remain unknown. A game or library page may not need Article markup.');
 const headings=mains[0].querySelectorAll('h1');
 add('Article headline and main heading',text(a?.headline),headings.length===1?text(headings[0].textContent):null,'Whitespace is normalised; different wording is a review prompt, not proof of invalid markup.');
 const authors=[a?.author].flat().filter(Boolean);
 let author=null;
 if(authors.length===1&&typeof authors[0]==='object'){
  const v=authors[0],matches=v['@id']?nodes.filter(n=>n!==v&&n['@id']===v['@id']):[];
  // Inline names and graph references must not disagree or choose among duplicate IDs.
  if(matches.length<=1){const direct=text(v.name),referenced=text(matches[0]?.name);if(!direct||!referenced||direct===referenced)author=direct||referenced;}
 }
 const bylines=mains[0].querySelectorAll('.article-byline [rel~="author"],.article-byline > span');
 add('Article author and byline',author,bylines.length===1?text(bylines[0].textContent):null,'Only the existing article byline is compared. Names do not establish identity, expertise or factual accuracy. Multiple or unresolved authors remain unknown.');
 const images=[a?.image].flat().filter(Boolean),declared=[];
 for(const image of images.slice(0,10)){
  let v=image;
  if(typeof v==='object'&&!v.url&&!v.contentUrl&&v['@id']){const found=nodes.filter(n=>n['@id']===v['@id']);v=found.length===1?found[0]:null;}
  const href=imageAddress(typeof v==='object'?(v?.contentUrl||v?.url):v,url);if(href)declared.push(href);
 }
 const social=one([...fragment.querySelectorAll('meta[property="og:image"][content]')].map(n=>imageAddress(n.getAttribute('content'),url)));
 add('Article image and social preview',images.length<=10&&declared.length===images.length&&declared.length?(declared.includes(social)?social:declared.join(' · ')):null,social,'Different crops or preview assets can be valid. The image is not loaded; this does not verify its content, dimensions or eligibility.');
 return {state:'ready',articleState:incomplete?'incomplete':articles.length===1?'single':articles.length?'ambiguous':'absent',checks};
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
