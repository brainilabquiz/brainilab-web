import {learnSchemaFields,learnSchemaURL} from './page-schema-evidence.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const stamp=v=>typeof v==='string'&&Number.isFinite(Date.parse(v));
const labels={same:'Matches captured HTML',equivalent:'Registered preview identity · URLs differ',different:'Different — review context',unknown:'Unknown'};
// A dated source correction is a reason not to reopen work from an older capture.
// This is not a claimed deployment time or proof that a later response is correct.
const courseCorrection={at:'2026-10-28T19:07:06Z',url:'https://github.com/brainilabquiz/brainilab-web/commit/2a355b1b80bb59d9c4f6623384c7271ed83d7d0c'};
export function learnEvidence(snapshot){
 const s=snapshot?.learnSchema;if(s?.schemaVersion!==1||s.domain!=='brainilabgames.com'||!Array.isArray(s.pages)||s.pages.length>500)return null;
 const seen=new Set(),maxChecks=Object.keys(learnSchemaFields).length;
 for(const p of s.pages){
  if(!p||!learnSchemaURL(p.url)||seen.has(p.url)||!['Article','Course'].includes(p.kind)||!['ready','unknown'].includes(p.state)||!stamp(p.checkedAt)||!['sha256','contentSha256'].every(k=>typeof p[k]==='string'&&/^[a-f0-9]{64}$/.test(p[k]))||!Array.isArray(p.checks)||p.checks.length>maxChecks||!Array.isArray(p.details)||p.details.length>maxChecks)return null;
  if((p.kind==='Course')!==p.url.includes('/learn/paths/'))return null;seen.add(p.url);
  const fields=new Set();for(const c of p.checks){if(!Array.isArray(c)||c.length!==2||!Object.hasOwn(learnSchemaFields,c[0])||!Object.hasOwn(labels,c[1])||fields.has(c[0]))return null;fields.add(c[0]);}
  const details=new Set();for(const v of p.details){if(!Array.isArray(v)||v.length!==3||!p.checks.some(c=>c[0]===v[0]&&c[1]!=='same')||details.has(v[0])||v.slice(1).some(t=>t!==null&&(typeof t!=='string'||t.length>800)))return null;details.add(v[0]);}
 }
 return s;
}
export function learnComparison(snapshot,url,current=null,now=Date.now()){
 if(!learnSchemaURL(url))return null;
 const saved=learnEvidence(snapshot)?.pages.find(p=>p.url===url),explicit=current?.state==='ready'&&current.url===url&&current.learnSchema?{...current.learnSchema,url,checkedAt:current.checkedAt}:null;
 const p=explicit&&(!saved||Date.parse(explicit.checkedAt)>Date.parse(saved.checkedAt))?explicit:saved;
 if(!p)return {url,page:null,unknown:true,reviewNeeded:0,historical:false};
 const historical=p.kind==='Course'&&Date.parse(p.checkedAt)<Date.parse(courseCorrection.at),dated=!stamp(p.checkedAt)||Date.parse(p.checkedAt)>now+300000||now-Date.parse(p.checkedAt)>172800000;
 const unknown=p.state!=='ready'||historical||dated;
 return {url,page:p,unknown,historical,dated,reviewNeeded:unknown?0:p.checks.filter(c=>c[1]==='different').length};
}
export function learnSchemaPage(snapshot,url,current=null,now=Date.now()){
 const c=learnComparison(snapshot,url,current,now);if(!c)return {html:'',exported:[]};
 const p=c.page,exported=[],add=(item,detail)=>{const r=Array(13).fill('');r[0]='Learn schema / public HTML';r[1]=item;r[2]=detail;r[9]=p?.checkedAt||'';r[10]=c.historical?courseCorrection.url:'';r[11]=url;exported.push(r);};
 const message=!p?'No saved comparison. Missing schema evidence is unknown, not a failure.':c.historical?'This capture predates a known course renderer correction. Keep it as historical evidence; do not repeat the completed work or claim the old difference is current.':c.unknown?'The comparison is incomplete or older than 48 hours. Preserve its date; it does not establish a current failure.':c.reviewNeeded?'Different declarations need context review against the captured response. Different wording or image crops can be valid.':'The comparable declarations match this captured response. Unknown fields remain unknown.';
 let content='';
 for(const [id,state] of p?.checks||[]){const detail=p.details.find(v=>v[0]===id),d=detail?.[1],visible=detail?.[2];content+='<li><strong>'+esc(learnSchemaFields[id])+'</strong> · '+esc(labels[state])+(detail?'<dl><dt>Declaration</dt><dd>'+esc(d||'Not unambiguously available')+'</dd><dt>HTML evidence</dt><dd>'+esc(visible||'Not unambiguously available')+'</dd></dl>':'')+'</li>';add(learnSchemaFields[id],labels[state]+(detail?'; declaration: '+(d||'unknown')+'; HTML: '+(visible||'unknown'):'')+'; stable review key: '+(p.contentSha256||JSON.stringify([p.kind,p.checks,p.details]))+':'+id);}
 add('Observation context',message+'; HTML SHA256: '+(p?.sha256||'Temporary explicit check; not imported'));
 const html='<section class="growth-learn-schema" aria-label="Learn structured data and public HTML"><h4>Learn schema · '+esc(p?.kind||'saved page')+'</h4><p>'+esc(message)+'</p>'+(p?'<p class="growth-small">Captured '+esc(p.checkedAt)+'. Exact URL and response hash; no aliases merged.</p><ul>'+content+'</ul>':'')+(c.historical?'<p><a href="'+courseCorrection.url+'" target="_blank" rel="noopener noreferrer">Recorded course source correction ↗</a></p>':'')+'<p class="growth-small">Dates compare instants, retaining source precision. Published compares the visible byline time; updated compares HTML metadata when present. Images are not loaded; different crops may be valid. Course lessons compare the ordered names and URLs in the visible lesson list. Passing does not establish facts, expertise, Google indexing, rich results, AI citations, clicks or games. No required Article fields, artificial FAQ or authority score are inferred.</p></section>';
 return {html,exported,comparison:c};
}
export function learnSchemaTable(snapshot,query='',now=Date.now()){
 const pages=(learnEvidence(snapshot)?.pages||[]).filter(p=>(p.url+' '+p.kind).toLowerCase().includes(query.toLowerCase()));
 const rows=pages.map(p=>{const c=learnComparison(snapshot,p.url,null,now);return '<tr><th scope="row">'+esc(new URL(p.url).pathname)+'</th><td>'+esc(p.kind)+'</td><td>'+esc(c.historical?'Historical · correction already recorded':c.unknown?'Unknown or dated':c.reviewNeeded?c.reviewNeeded+' differences to review':'Comparable fields match')+'</td><td>'+esc(p.checkedAt)+'</td><td><button class="admin-button" type="button" data-seo-review-url="'+esc(p.url)+'">Review evidence</button></td></tr>';});
 return {rows,heads:['Page','Resource','Schema / HTML','Captured','Evidence'],caption:'Saved Learn article and course comparisons',help:'Saved public HTML only. Reused revisions keep their own dates; this view makes no requests. Missing, ambiguous or historical evidence does not justify another edit.',note:pages.length+' dated page observations · comparisons do not reopen Growth decisions or baselines',exported:[['Section','Item','Detail','Clicks','Impressions','Historical average position','Period start','Period end','Timezone','Observed at','Source URL','Target URL','Rel'],...pages.flatMap(p=>learnSchemaPage(snapshot,p.url,null,now).exported)]};
}
