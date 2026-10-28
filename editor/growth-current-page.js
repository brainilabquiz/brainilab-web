import {publicPageURL} from './growth-seo-page.js';
import {searchSources} from './growth-seo-sources.js';
import {observePageLinks,pageLinksHTML,pageLinksCSV} from './page-link-evidence.js';

const MAX_BYTES=1024*1024;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const displayDate=v=>declaredTimestamp(v)?new Date(v).toLocaleString('en-GB',{timeZone:'UTC',dateStyle:'medium',timeStyle:'short'})+' UTC':'Not reported';
const clean=v=>typeof v==='string'?v.replace(/\s+/g,' ').trim().slice(0,240):null;
const entity=v=>v.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,(all,key)=>{const known={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '};if(key[0]!=='#')return known[key.toLowerCase()]||all;const n=key[1].toLowerCase()==='x'?parseInt(key.slice(2),16):Number(key.slice(1));return n>0&&n<=0x10ffff&&!(n>=0xd800&&n<=0xdfff)?String.fromCodePoint(n):all;});
export function declaredTimestamp(v){
 if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(v)||!Number.isFinite(Date.parse(v)))return null;
 return new Date(v.slice(0,10)+'T00:00:00Z').toISOString().slice(0,10)===v.slice(0,10)?new Date(v).toISOString():null;
}
const own=url=>typeof url==='string'&&publicPageURL(url)===url&&!url.endsWith('/index.html')&&!/^\/(?:api|cdn-cgi)(\/|$)/.test(new URL(url).pathname);
const identifier=v=>typeof v==='string'?v:v&&typeof v==='object'?v['@id']:null;

export function parseCurrentPage(html,url,checkedAt,document=globalThis.document){
 if(!own(url)||typeof html!=='string'||html.length>MAX_BYTES||!declaredTimestamp(checkedAt))return null;
 const nodes=[];
 function graph(v,depth=0){if(depth>4||nodes.length>1000||!v||typeof v!=='object')return;if(Array.isArray(v)){for(const x of v)graph(x,depth+1);}else{nodes.push(v);if(v['@graph'])graph(v['@graph'],depth+1);}}
 // Parse inert JSON text only. No DOM insertion, resource loading or script execution.
 for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)){
  if(!/(?:^|\s)type\s*=\s*(?:"application\/ld\+json"|'application\/ld\+json'|application\/ld\+json(?=\s|$))/i.test(m[1]))continue;
  try{graph(JSON.parse(m[2]));}catch{/* Malformed declarations are not evidence. */}
 }
 const articles=nodes.filter(n=>[n['@type']].flat().includes('Article')).filter(n=>{
  const ids=[identifier(n.url),identifier(n.mainEntityOfPage)].filter(v=>v!=null);
  return ids.length?ids.every(v=>v===url):n['@id']===url+'#article';
 });
 const a=articles.length===1?articles[0]:null;
 const publishedAt=declaredTimestamp(a?.datePublished),modifiedAt=declaredTimestamp(a?.dateModified);
 return {state:'ready',url,checkedAt:declaredTimestamp(checkedAt),httpStatus:200,title:clean(entity(html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1]||''))||null,publishedAt,modifiedAt,dateReason:articles.length>1?'ambiguous_article':!a?'no_matching_article':!publishedAt&&!modifiedAt?'no_usable_dates':publishedAt&&modifiedAt&&publishedAt>modifiedAt?'inconsistent_dates':null,linkEvidence:observePageLinks(html,url,document)};
}

export async function readCurrentPage(url,fetcher=globalThis.fetch,document=globalThis.document){
 if(!own(url))return {state:'unavailable',url:null,reason:'invalid_url'};
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 const failure=reason=>({state:'unavailable',url,reason,checkedAt:new Date().toISOString()});
 try{
  const r=await fetcher(url,{method:'GET',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',cache:'no-store',headers:{Accept:'text/html'},signal:controller.signal});
  if(r.status!==200||r.url!==url||!/^text\/html\s*(?:;|$)/i.test(r.headers.get('content-type')||''))return failure('unavailable');
  if(Number(r.headers.get('content-length'))>MAX_BYTES||!r.body?.getReader)return failure('unsupported_response');
  const reader=r.body.getReader(),chunks=[];let size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_BYTES){controller.abort();await reader.cancel();return failure('size_limit');}chunks.push(value);}}finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  return parseCurrentPage(new TextDecoder('utf-8',{fatal:true}).decode(bytes),url,new Date().toISOString(),document)||failure('unsupported_response');
 }catch{return failure('unavailable');}finally{clearTimeout(timer);}
}

export function updateWindow(observation,source){
 const modified=declaredTimestamp(observation?.modifiedAt),captured=declaredTimestamp(observation?.checkedAt);
 if(!modified||!captured||observation.dateReason==='inconsistent_dates'||modified>captured||!source?.period||![source.period.start,source.period.end].every(v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v)||source.period.start>source.period.end)return {state:'unknown',text:'No usable declared update date and search window can be compared. Missing dates do not mean the page is unchanged.'};
 let day;try{const parts=new Intl.DateTimeFormat('en-GB',{timeZone:source.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(modified));day=['year','month','day'].map(k=>parts.find(p=>p.type===k).value).join('-');}catch{return {state:'unknown',text:'The search timezone is unavailable; the declared update is not compared with the search days.'};}
 if(day>source.period.end)return {state:'before_update',text:'This search window ends before the declared update day. It cannot show the effect of that update.'};
 if(day>=source.period.start)return {state:'overlaps_update',text:'The declared update day falls inside this search window. The sample may include earlier content; do not treat it as a complete follow-up period.'};
 return {state:'after_update',text:'This search window starts after the declared update day. That alone does not establish comparable periods or an improvement.'};
}

export function currentPageView(report,url,observation){
 const safe=own(url),s=searchSources(report?.seoExplorer),o=observation?.url===url?observation:null,exported=[];
 const add=(item,detail)=>{const r=Array(13).fill('');r[0]='Explicit public HTML check';r[1]=item;r[2]=detail;r[9]=o?.checkedAt||'';r[10]=safe?url:'';r[11]=safe?url:'';exported.push(r);};
 let content='',status='Not checked during this Growth session.';
 if(o?.state==='loading')status='Reading the public page without account cookies…';
 else if(o?.state==='unavailable'){status='The public page could not be read. Saved observations are preserved; no change or indexing failure is inferred.';add('Read status','Unavailable; saved observations retained');}
 else if(o?.state==='ready'){
  const comparison=updateWindow(o,s);status='Public HTML checked '+displayDate(o.checkedAt)+'.';
  content=`<dl class="growth-page-checks"><div><dt>Current HTML title</dt><dd class="growth-current-title">${esc(o.title||'Not reported')}</dd></div><div><dt>Article declares published</dt><dd>${esc(displayDate(o.publishedAt))}</dd></div><div><dt>Article declares updated</dt><dd>${esc(displayDate(o.modifiedAt))}</dd></div></dl><p class="growth-current-comparison">${esc(comparison.text)}</p>${s?`<p class="growth-small">Compared with saved final Web query/page evidence: ${esc(s.period.start)} to ${esc(s.period.end)} · ${esc(s.timezone)}. The declared timestamp is converted to those search-day boundaries.</p>`:''}`;
  add('HTTP status','200');add('Current HTML title',o.title||'Not reported');add('Article declares published',o.publishedAt||'Not reported');add('Article declares updated',o.modifiedAt||'Not reported');add('Search-window check',comparison.text);
  content+=pageLinksHTML(o);exported.push(...pageLinksCSV(o));
  if(s){const r=Array(13).fill('');r[0]='Search period for declared-date context';r[2]='No comparison of traffic totals or causal effect';r[6]=s.period.start;r[7]=s.period.end;r[8]=s.timezone;r[9]=s.observedAt;r[11]=url;exported.push(r);}
 }
 const disabled=!safe||!!o;
 return {html:`<section class="growth-current-page" aria-labelledby="growth-current-page-title"><h4 id="growth-current-page-title">Check the current public page</h4><p class="growth-small">A page without a recorded Growth decision may already have been improved. Read its current title and declared article dates before choosing more work.</p><button type="button" class="admin-button" data-seo-check-current ${disabled?'disabled':''}>${o?.state==='loading'?'Reading public page…':o?'Public check recorded for this session':'Check public page now'}</button><p data-seo-current-status role="status" aria-live="polite" tabindex="-1" class="growth-small">${esc(status)}</p>${content}<p class="growth-small">Dates are the publisher’s Article declarations, not verified deployment times, Google crawl dates or rankings. Missing or ambiguous Article dates remain unknown, including on game pages. This check does not request indexing or establish why visits changed.</p><details><summary>What this check reads</summary><p>Only an explicit click makes one anonymous HTML request to this exact public URL. No account cookies are sent and no scripts, images or games are loaded from the response. A response is reused for this URL while this Growth workspace remains open; reload Growth to check again. Nothing is imported or saved to the report, decisions or baselines.</p></details></section>`,exported};
}
