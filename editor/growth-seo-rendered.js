// Saved public browser observations have a separate scope from fetched HTML.
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rels=new Set(['nofollow','ugc','sponsored','noopener','noreferrer']);
const origins=new Set(['published_listing','owner_submitted_listing','reviewed_public_candidate','google_links_report']);
function expandRendered(v){
 try{
  const bounds={prefixes:2000,anchors:1000,rels:32,schemas:64,origins:4};
  if(v?.schemaVersion!==2||v.domain!=='brainilabgames.com'||Object.entries(bounds).some(([k,n])=>!Array.isArray(v[k])||!v[k].length||v[k].length>n)||typeof v.datePrefix!=='string'||v.datePrefix.length>40||!Array.isArray(v.rows)||v.rows.length>1000||v.prefixes.some(p=>typeof p!=='string'||p.length>1000))return null;
  const at=(key,i)=>{if(!Number.isInteger(i)||i<0||i>=v[key].length)throw Error('Invalid DOM reference');return v[key][i];};
  const url=pair=>{if(!Array.isArray(pair)||pair.length!==2||typeof pair[1]!=='string'||pair[1].length>1000)throw Error('Invalid DOM URL');return at('prefixes',pair[0])+pair[1];};
  const observations=v.rows.map(r=>{
   if(!Array.isArray(r)||r.length<6||r.length>9||typeof r[4]!=='string'||r[4].length>40||typeof r[5]!=='string'||! /^[A-Za-z0-9+/]{43}=$/.test(r[5]))throw Error('Invalid DOM tuple');
   const hash=atob(r[5]);if(hash.length!==32||btoa(hash)!==r[5])throw Error('Invalid capture hash');
   const source=url(r[0]),canonical=r.length>6?r[6]:0,counts=at('schemas',r.length>7?r[7]:0);
   if(!Array.isArray(counts)||counts.length!==3)throw Error('Invalid schema counts');
   return {sourceUrl:source,targetUrl:url(r[1]),anchor:at('anchors',r[2]),rel:at('rels',r[3]),observedAt:v.datePrefix+r[4],evidenceSha256:[...hash].map(c=>c.charCodeAt(0).toString(16).padStart(2,'0')).join(''),canonical:canonical===0?source:canonical===null?null:url(canonical),structuredData:{jsonldBlocks:counts[0],microdataElements:counts[1],rdfaElements:counts[2]},discovery:at('origins',r.length>8?r[8]:0),method:'saved_browser_dom'};
  });
  return {schemaVersion:1,domain:v.domain,observations};
 }catch{return null;}
}
function publicURL(value,own=false){
 try{const u=new URL(value);return typeof value==='string'&&value.length<=1000&&value===u.href&&u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!u.search&&!u.hash&&/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(u.hostname)&&!/^\d+(?:\.\d+){3}$/.test(u.hostname)&&!/(?:\.local|\.localhost|\.internal|\.test)$/.test(u.hostname)&&!['mail.google.com','accounts.google.com','drive.google.com','docs.google.com','outlook.live.com','login.live.com'].includes(u.hostname)&&own===(u.hostname==='brainilabgames.com')&&/^\/[a-zA-Z0-9/_.~-]*$/.test(u.pathname)&&! /\/(admin|auth|account|profile|dashboard|settings|login|sign-in|edit)(\/|$)/i.test(u.pathname);}catch{return false;}
}
export function renderedSnapshot(s){
 let v=s?.renderedEvidence;const seen=new Set();if(v?.schemaVersion===2)v=expandRendered(v);
 if(v?.schemaVersion!==1||v.domain!=='brainilabgames.com'||!Array.isArray(v.observations)||v.observations.length>1000)return null;
 for(const r of v.observations){
  if(!r||!publicURL(r.sourceUrl)||!publicURL(r.targetUrl,true)||!Number.isFinite(Date.parse(r.observedAt))||!/(?:Z|[+-]\d{2}:\d{2})$/.test(r.observedAt)||Date.parse(r.observedAt)>Date.now()||! /^[a-f0-9]{64}$/.test(r.evidenceSha256)||r.method!=='saved_browser_dom'||!origins.has(r.discovery)||typeof r.anchor!=='string'||r.anchor.length>180||/[@\x00-\x1f]/.test(r.anchor)||!Array.isArray(r.rel)||r.rel.some(x=>!rels.has(x))||r.canonical!==null&&!publicURL(r.canonical)||!r.structuredData||['jsonldBlocks','microdataElements','rdfaElements'].some(k=>r.structuredData[k]!==null&&(!Number.isInteger(r.structuredData[k])||r.structuredData[k]<0||r.structuredData[k]>100000)))return null;
  const key=JSON.stringify([r.sourceUrl,r.targetUrl,[...new Set(r.rel)].sort()]);if(seen.has(key))return null;seen.add(key);
 }
 return v;
}
const link=u=>`<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(u)}</a>`;
const date=v=>new Date(v).toLocaleString('en-GB',{timeZone:'UTC',dateStyle:'medium',timeStyle:'medium'})+' UTC';
const count=v=>v===null?'Unknown':String(v);
export function renderedView(s,query=''){
 const snapshot=renderedSnapshot(s),observations=(snapshot?.observations||[]).filter(r=>(r.sourceUrl+' '+r.targetUrl+' '+r.anchor).toLowerCase().includes(query.toLowerCase()));
 const exported=[['Evidence scope','Source','Target','Anchor','Rel','Observed at','DOM capture SHA256','Declared canonical','JSON-LD blocks','Microdata elements','RDFa elements','Discovery origin']];
 const rows=observations.map(r=>{
  const d=r.structuredData;
  exported.push(['saved_browser_dom',r.sourceUrl,r.targetUrl,r.anchor,r.rel.join(' '),r.observedAt,r.evidenceSha256,r.canonical||'',d.jsonldBlocks??'unknown',d.microdataElements??'unknown',d.rdfaElements??'unknown',r.discovery]);
  return `<tr><th scope="row">${link(r.sourceUrl)}<small>Public browser DOM · ${esc(r.discovery.replaceAll('_',' '))}</small></th><td>${link(r.targetUrl)}<small>${esc(r.anchor||'No text anchor')}</small><small>rel: ${esc(r.rel.join(' ')||'None observed')}</small></td><td>${esc(date(r.observedAt))}<details><summary>Saved capture</summary><p>SHA256: ${esc(r.evidenceSha256)}</p><p>Declared canonical: ${r.canonical?link(r.canonical):'Unknown'}</p></details></td><td>JSON-LD blocks: ${count(d.jsonldBlocks)}<br>Microdata elements: ${count(d.microdataElements)}<br>RDFa elements: ${count(d.rdfaElements)}</td></tr>`;
 });
 return {rows,exported,heads:['Public source','Observed destination','Original observation','Schema in saved DOM'],caption:'Saved DOM evidence · separate from HTML backlinks',note:snapshot?'One row per source, destination and rel. Original capture dates retained; no new page checks.':'No valid saved DOM evidence is available. This does not establish that a public link or structured data is absent.',help:'<p class="growth-caution">DOM observations are not added to verified HTML links, referring hosts, publication totals or Page Trust. A link seen in the browser can be absent from fetched HTML. Zero schema elements describes this saved DOM; it is not a schema error or a Google eligibility result. Indexing, ranking value and visits remain unverified.</p>'};
}
