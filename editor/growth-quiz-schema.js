import scope from '../lib/quiz-schema-scope.json' with {type:'json'};

const origin='https://brainilabgames.com',providers=['anytime','fixed','local'],DAY=86400000;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const stamp=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d\d:\d\d)$/.test(v)&&Number.isFinite(Date.parse(v));
const text=v=>typeof v==='string'&&v.length>0&&v.length<=480&&!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v);
const normal=v=>v.normalize('NFKC').replace(/\s+/g,' ').trim().toLowerCase();
const when=v=>stamp(v)?new Date(v).toISOString():'Not observed';
const topic=url=>scope.topics.find(t=>origin+t.path===url);
export const quizPageURLs=scope.topics.map(t=>origin+t.path);
const types=n=>[n?.['@type']].flat();

// Only parse inert JSON-LD from the same HTML already requested by Growth.
export function observeQuizQuestions(fragment,url){
 if(!topic(url))return null;
 const unknown={state:'unknown',questions:[]};if(!fragment||fragment.querySelector('base[href]'))return unknown;
 const nodes=[];let bad=false;
 function walk(v,depth=0){if(depth>8||nodes.length>1000)throw Error('bounded graph');if(Array.isArray(v)){for(const n of v)walk(n,depth+1);}else if(v&&typeof v==='object'){nodes.push(v);if(v['@graph'])walk(v['@graph'],depth+1);}}
 for(const n of fragment.querySelectorAll('script[type="application/ld+json"]')){if(n.closest('noscript'))continue;try{walk(JSON.parse(n.textContent));}catch{bad=true;}}
 const quizzes=nodes.filter(n=>types(n).includes('Quiz'));if(bad||quizzes.length!==1)return unknown;
 const q=quizzes[0];if(q.url&&q.url!==url||q['@id']&&q['@id']!==url+'#quiz')return unknown;
 if(!Object.hasOwn(q,'hasPart'))return {state:'not_declared',questions:[]};
 const parts=[q.hasPart].flat();if(parts.length>100)return unknown;
 const names=[];
 for(let p of parts){
  if(!p||typeof p!=='object')return unknown;
  if(p['@id']){const found=nodes.filter(n=>n['@id']===p['@id']);if(found.length>1)return unknown;if(found.length&&found[0]!==p){if(p.name&&p.name!==found[0].name)return unknown;p=found[0];}}
  if(!types(p).includes('Question')||!text(p.name))return unknown;names.push(p.name.replace(/\s+/g,' ').trim());
 }
 return {state:'ready',questions:names};
}

export function quizEvidence(snapshot){
 const s=snapshot?.quizSchema;if(s?.schemaVersion!==1||s.domain!=='brainilabgames.com'||!Array.isArray(s.banks)||!Array.isArray(s.pages)||s.banks.length>6||s.pages.length>6)return null;
 const ids=new Set(),urls=new Set();
 for(const b of s.banks){
  if(!scope.topics.some(t=>t.slug===b.topic)||b.source!=='published-question-tables'||!/^[a-f0-9]{64}$/.test(b.sha256)||ids.has(b.topic)||!Array.isArray(b.providers)||b.providers.length>3)return null;ids.add(b.topic);
  const seen=new Set();for(const p of b.providers){if(!providers.includes(p.name)||seen.has(p.name)||typeof p.complete!=='boolean'||!stamp(p.observedAt)||!Array.isArray(p.prompts)||p.prompts.length>2000||!p.prompts.every(text))return null;seen.add(p.name);}
 }
 for(const p of s.pages){if(!topic(p.url)||urls.has(p.url)||!stamp(p.checkedAt)||!/^[a-f0-9]{64}$/.test(p.sha256)||!['ready','unknown','not_declared'].includes(p.state)||!Array.isArray(p.questions)||p.questions.length>100||!p.questions.every(text)||p.state!=='ready'&&p.questions.length)return null;urls.add(p.url);}
 return s;
}

export function compareQuiz(snapshot,url,current=null,now=Date.now()){
 const t=topic(url);if(!t)return null;
 const evidence=quizEvidence(snapshot),b=evidence?.banks.find(b=>b.topic===t.slug),saved=evidence?.pages.find(p=>p.url===url);
 const fresh=current?.url===url&&current.state==='ready'&&current.quizQuestions?{...current.quizQuestions,url,checkedAt:current.checkedAt}:null;
 const p=fresh&&(!saved||Date.parse(fresh.checkedAt)>Date.parse(saved.checkedAt))?fresh:saved;
 const complete=providers.every(name=>b?.providers.some(p=>p.name===name&&p.complete));
 const dated=v=>stamp(v)&&Date.parse(v)<=now+300000&&now-Date.parse(v)<=2*DAY;
 const recent=!!p&&dated(p.checkedAt)&&complete&&b.providers.every(v=>dated(v.observedAt));
 const rows=p?.state==='ready'?p.questions.map(name=>{
  const found=b?.providers.filter(v=>v.prompts.some(q=>normal(q)===normal(name)))||[];
  const equivalent=t.equivalents.find(([declared])=>normal(declared)===normal(name));
  const reviewed=!found.length&&equivalent?b?.providers.filter(v=>v.prompts.some(q=>normal(q)===normal(equivalent[1])))||[]:[];
  return {name,state:!recent?'unknown':found.length?'matched':reviewed.length?'reviewed_equivalent':'review_needed',matchedPrompt:found.length?name:reviewed.length?equivalent[1]:null,providers:(found.length?found:reviewed).map(v=>v.name),review:reviewed.length?scope.review:null,reviewKey:JSON.stringify([url,normal(name),b?.sha256||null,scope.version])};
 }):[];
 return {url,topic:t.slug,page:p||null,bank:b||null,complete,recent,rows,reviewNeeded:rows.filter(r=>r.state==='review_needed').length,unknown:!p||p.state!=='ready'||!recent};
}

const labels={matched:'Observed in saved banks',reviewed_equivalent:'Reviewed equivalent',review_needed:'No match — review wording and banks',unknown:'Unknown — evidence incomplete or dated'};
export function quizSchemaView(snapshot,url,current=null,now=Date.now()){
 const c=compareQuiz(snapshot,url,current,now);if(!c)return {html:'',exported:[]};
 const rows=c.rows.map(r=>'<tr><th scope="row">'+esc(r.name)+'</th><td>'+esc(labels[r.state])+'</td><td>'+esc(r.matchedPrompt||'Not established')+'</td><td>'+esc(r.providers.join(', ')||'Not established')+'</td></tr>').join('');
 const note='No literal match is a review candidate, not a proven semantic error. The reviewed equivalences are reused only while their exact counterpart remains in a bank. Eligibility in a bank does not guarantee selection in a random 20-question run. Missing hasPart is not an error; acceptedAnswer is not required by this check. No indexing, rich result, click or game is established.';
 const times=(c.bank?.providers||[]).map(p=>p.name+': '+when(p.observedAt)+(p.complete?' · complete prompt inventory':' · incomplete')).join('; ');
 const html='<section class="growth-quiz-schema" aria-label="Dynamic quiz question evidence"><h4>Dynamic quiz questions</h4><p>Public declarations: '+esc(c.page?when(c.page.checkedAt):'Not observed')+'. Banks: '+esc(times||'Not imported')+'.</p><p>'+(c.unknown?'No current complete comparison is available. Preserve the dated observations; unknown is not a failure.':c.reviewNeeded?esc(c.reviewNeeded)+' declarations need a wording and bank review.':'All '+c.rows.length+' declared questions have a saved match or reviewed equivalent.')+'</p>'+(rows?'<div class="growth-table" role="region" tabindex="0" aria-label="Declared questions and bank evidence"><table><thead><tr><th scope="col">Declaration</th><th scope="col">Comparison</th><th scope="col">Observed counterpart</th><th scope="col">Provider</th></tr></thead><tbody>'+rows+'</tbody></table></div>':'<p>No usable Question list was established. No question or answer is inferred from the initial game placeholder.</p>')+'<p class="growth-small">'+esc(note)+'</p></section>';
 const exported=c.rows.map(r=>{const row=Array(13).fill('');row[0]='Dynamic quiz question';row[1]=r.name;row[2]=labels[r.state]+'; counterpart: '+(r.matchedPrompt||'unknown')+'; providers: '+r.providers.join(', ')+'; stable review key: '+r.reviewKey;row[9]=c.page.checkedAt;row[10]=r.review||'';row[11]=url;return row;});
 const row=Array(13).fill('');row[0]='Dynamic quiz evidence dates';row[1]=c.topic;row[2]=(times||'Banks not imported')+'; '+note;row[9]=c.page?.checkedAt||'';row[11]=url;exported.push(row);
 return {html,exported,comparison:c};
}

export function quizSchemaOverview(snapshot,now=Date.now()){
 const comparisons=scope.topics.map(t=>compareQuiz(snapshot,origin+t.path,null,now));
 const html='<h3 tabindex="-1">Dynamic quiz schema</h3><p>Saved declarations compared with complete published prompt inventories and the local fallback. Opening this view makes no requests. Existing reviewed wording is reused; no Growth decisions are created or reopened.</p><div class="growth-table" role="region" tabindex="0" aria-label="Six dynamic quizzes"><table><thead><tr><th scope="col">Quiz</th><th scope="col">Comparison</th><th scope="col">Evidence</th></tr></thead><tbody>'+comparisons.map(c=>'<tr><th scope="row">'+esc(c.topic)+'</th><td>'+esc(c.unknown?'Unknown or dated evidence':c.reviewNeeded?c.reviewNeeded+' need review':c.rows.length+' matched or reviewed')+'</td><td><button class="admin-button" type="button" data-seo-review-url="'+esc(c.url)+'">Review evidence</button></td></tr>').join('')+'</tbody></table></div>';
 return {html,exported:[['Section','Item','Detail','Clicks','Impressions','Historical average position','Period start','Period end','Timezone','Observed at','Source URL','Target URL','Rel'],...comparisons.flatMap(c=>quizSchemaView(snapshot,c.url,null,now).exported)],status:'Six quizzes · '+comparisons.filter(c=>!c.unknown&&c.reviewNeeded).length+' with review candidates · '+comparisons.filter(c=>c.unknown).length+' unknown or dated'};
}
