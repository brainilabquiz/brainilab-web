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
  if(!b||typeof b!=='object'||!scope.topics.some(t=>t.slug===b.topic)||b.source!=='published-question-tables'||!/^[a-f0-9]{64}$/.test(b.sha256)||ids.has(b.topic)||!Array.isArray(b.providers)||b.providers.length>3)return null;ids.add(b.topic);
  const seen=new Set();for(const p of b.providers){if(!p||typeof p!=='object'||!providers.includes(p.name)||seen.has(p.name)||typeof p.complete!=='boolean'||!stamp(p.observedAt)||!Array.isArray(p.prompts)||p.prompts.length>2000||!p.prompts.every(text))return null;seen.add(p.name);}
 }
 for(const p of s.pages){if(!p||typeof p!=='object'||!topic(p.url)||urls.has(p.url)||!stamp(p.checkedAt)||!/^[a-f0-9]{64}$/.test(p.sha256)||!['ready','unknown','not_declared'].includes(p.state)||!Array.isArray(p.questions)||p.questions.length>100||!p.questions.every(text)||p.state!=='ready'&&p.questions.length)return null;urls.add(p.url);}
 return s;
}

function targetedVerification(evidence, page, topic, bank, now){
 if(!['ready','not_declared'].includes(page?.state)||!Array.isArray(evidence?.verifications)||evidence.verifications.length>6)return null;
 const matches=evidence.verifications.filter(row=>row?.url===page.url);
 if(matches.length!==1)return null;
 const [check]=matches;
 if(check.scopeVersion!==scope.version||!stamp(check.declarationsAt)||!stamp(check.cloudAt)||!stamp(check.localAt)||
    !/^[a-f0-9]{64}$/.test(check.receiptSha256)||!/^[a-f0-9]{64}$/.test(check.declarationsSha256)||
    !Array.isArray(check.rows)||check.rows.length===0||check.rows.length>100)return null;
 const archived=page.state==='not_declared';
 if(archived?Date.parse(page.checkedAt)<=Date.parse(check.declarationsAt):
    (page.declarationsSha256&&page.declarationsSha256!==check.declarationsSha256)||check.rows.length!==page.questions.length)return null;
 const times={anytime:check.cloudAt,fixed:check.cloudAt,local:check.localAt};
 if(Object.values(times).some(at=>Date.parse(at)>now+300000)||(!archived&&bank?.providers.some(p=>p.complete&&Date.parse(p.observedAt)>Date.parse(times[p.name]))))return null;
 const counterparts=new Map(topic.equivalents);
 if(check.rows.some((row,index)=>!Array.isArray(row)||row.length!==2||!text(row[0])||(!archived&&row[0]!==page.questions[index])||
     !Array.isArray(row[1])||row[1].length!==providers.length||row[1].some(s=>!['text','equivalent','unmatched'].includes(s))||
     (row[1].includes('equivalent')&&!counterparts.has(row[0]))))return null;
 const recent=!archived&&Object.values(times).every(at=>now-Date.parse(at)<=2*DAY);
 const rows=check.rows.map(([name,states])=>{
  const matched=providers.filter((_,index)=>states[index]!=='unmatched');
  const equivalent=states.includes('equivalent');
  return {name,state:matched.length?(equivalent?'reviewed_equivalent':'matched'):'review_needed',
   matchedPrompt:equivalent?counterparts.get(name):matched.length?name:null,providers:matched,
   providerDetail:providers.map((provider,index)=>provider+' · '+({text:'text match',equivalent:'reviewed equivalent',unmatched:'no checked match'})[states[index]]).join(', '),
   review:equivalent?scope.review:null,reviewKey:JSON.stringify([page.url,normal(name),states,scope.version])};
 });
 return {rows,recent,archived,declarationsAt:check.declarationsAt,unknown:!recent&&!archived,reviewNeeded:recent?rows.filter(row=>row.state==='review_needed').length:0,times};
}

export function compareQuiz(snapshot,url,current=null,now=Date.now()){
 const t=topic(url);if(!t)return null;
 const evidence=quizEvidence(snapshot),b=evidence?.banks.find(b=>b.topic===t.slug),saved=evidence?.pages.find(p=>p.url===url);
 const fresh=current?.url===url&&current.state==='ready'&&current.quizQuestions?{...current.quizQuestions,url,checkedAt:current.checkedAt}:null;
 const p=fresh&&(!saved||Date.parse(fresh.checkedAt)>Date.parse(saved.checkedAt))?fresh:saved;
 const complete=providers.every(name=>b?.providers.some(p=>p.name===name&&p.complete));
 const verification=targetedVerification(evidence,p,t,b,now);
 if(verification)return {url,topic:t.slug,page:p,bank:b||null,complete,...verification,source:'targeted'};
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
 const label=r=>(c.source==='targeted'&&!c.recent?'Dated · ':'')+labels[r.state];
 const rows=c.rows.map(r=>'<tr><th scope="row">'+esc(r.name)+'</th><td>'+esc(label(r))+'</td><td>'+esc(r.matchedPrompt||'Not established')+'</td><td>'+esc(r.providerDetail||r.providers.join(', ')||'Not established')+'</td></tr>').join('');
 const note='No literal match is a review candidate, not a proven semantic error. The reviewed equivalences are reused only while their exact counterpart remains in a bank. Eligibility in a bank does not guarantee selection in a random 20-question run. Missing hasPart is not an error; acceptedAnswer is not required by this check. No indexing, rich result, click or game is established.';
 const times=c.source==='targeted'?providers.map(name=>name+': '+when(c.times[name])).join('; '):
  (c.bank?.providers||[]).map(p=>p.name+': '+when(p.observedAt)+(p.complete?' · complete prompt inventory':' · incomplete')).join('; ');
 const sourceLabel=c.source==='targeted'?'Targeted check of the listed declarations':'Banks';
 const summary=c.archived?'The current page declares no Question entries. These '+c.rows.length+' earlier declarations were observed '+when(c.declarationsAt)+'.':c.source==='targeted'&&!c.recent?'Dated verification of these declarations.':c.unknown?'No current complete comparison is available. Preserve the dated observations; unknown is not a failure.':c.reviewNeeded?c.reviewNeeded+' declarations need a wording and bank review.':'All '+c.rows.length+' declared questions have a saved match or reviewed equivalent.';
 const html='<section class="growth-quiz-schema" aria-label="Dynamic quiz question evidence"><h4>Dynamic quiz questions</h4><p>Public declarations: '+esc(c.page?when(c.page.checkedAt):'Not observed')+'. '+sourceLabel+': '+esc(times||'Not imported')+'.</p><p>'+esc(summary)+'</p>'+(rows?'<div class="growth-table" role="region" tabindex="0" aria-label="Declared questions and bank evidence"><table><thead><tr><th scope="col">Declaration</th><th scope="col">Comparison</th><th scope="col">Observed counterpart</th><th scope="col">Provider</th></tr></thead><tbody>'+rows+'</tbody></table></div>':'<p>No usable Question list was established. No question or answer is inferred from the initial game placeholder.</p>')+'<p class="growth-small">'+esc(note)+'</p></section>';
 const originalCapture=c.archived?'; original declaration capture: '+c.declarationsAt:'';
 const exported=c.rows.map(r=>{const row=Array(13).fill('');row[0]='Dynamic quiz question';row[1]=r.name;row[2]=label(r)+'; counterpart: '+(r.matchedPrompt||'unknown')+'; providers: '+(r.providerDetail||r.providers.join(', '))+originalCapture+'; stable review key: '+r.reviewKey;row[9]=c.source==='targeted'?c.times.anytime:c.page.checkedAt;row[10]=r.review||'';row[11]=url;return row;});
 const row=Array(13).fill('');row[0]='Dynamic quiz evidence dates';row[1]=c.topic;row[2]=sourceLabel+': '+(times||'Banks not imported')+'; '+note;row[9]=c.page?.checkedAt||'';row[11]=url;exported.push(row);
 return {html,exported,comparison:c};
}

export function quizSchemaOverview(snapshot,now=Date.now()){
 const comparisons=scope.topics.map(t=>compareQuiz(snapshot,origin+t.path,null,now));
 const html='<h3 tabindex="-1">Dynamic quiz schema</h3><p>Saved declarations compared with published banks and the local fallback. Targeted checks cover the listed questions. Open a quiz for the observations and dates.</p><div class="growth-table" role="region" tabindex="0" aria-label="Six dynamic quizzes"><table><thead><tr><th scope="col">Quiz</th><th scope="col">Comparison</th><th scope="col">Evidence</th></tr></thead><tbody>'+comparisons.map(c=>'<tr><th scope="row">'+esc(c.topic)+'</th><td>'+esc(c.archived?'No current declarations · '+c.rows.length+' previously checked':c.unknown?(c.source==='targeted'?'Dated verification':'Unknown or dated evidence'):c.reviewNeeded?c.reviewNeeded+' need review':c.rows.length+' matched or reviewed')+'</td><td><button class="admin-button" type="button" data-seo-review-url="'+esc(c.url)+'">Review evidence</button></td></tr>').join('')+'</tbody></table></div>';
 return {html,exported:[['Section','Item','Detail','Clicks','Impressions','Historical average position','Period start','Period end','Timezone','Observed at','Source URL','Target URL','Rel'],...comparisons.flatMap(c=>quizSchemaView(snapshot,c.url,null,now).exported)],status:'Six quizzes · '+comparisons.filter(c=>!c.unknown&&c.reviewNeeded).length+' with review candidates · '+comparisons.filter(c=>c.unknown).length+' unknown or dated'};
}
