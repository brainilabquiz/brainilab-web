import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {pathToFileURL} from 'node:url';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const batch=JSON.parse(readFileSync('content/game-batches/knowledge-variety-20261014.json','utf8'));
const norm=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const tick=()=>new Promise(r=>setTimeout(r,0));
function setup(slug,query=''){
 const w=new JSDOM(readFileSync(`games/${slug}/index.html`,'utf8'),{url:`https://brainilabgames.com/games/${slug}/${query}`,runScripts:'outside-only'}).window;
 const saves=[];w.HTMLElement.prototype.scrollIntoView=function(){};
 w.BrainiData={recentResults:()=>[],daily:()=>({number:40}),dailyNumberForDate:()=>40,api:{submitGameResult:async(game,p)=>{saves.push({game,...p});return {...p,clientResultId:'isolated-fixture',cloudSyncStatus:'local_only'};}}};
 w.BrainiContinuity={rewardMarkup:()=>''};w.BrainiBackendAuth={isConfigured:()=>false};
 const load=name=>w.eval(readFileSync(`assets/js/${name}.js`,'utf8'));load('post-game');load('puzzle-results');return {w,saves,load,q:s=>w.document.querySelector(s)};
}
for(const topic of batch.topicrush){
 const t=setup('topic-rush'),{w,q}=t;let now=100000,timer;w.Date.now=()=>now;w.setInterval=fn=>(timer=fn,1);w.clearInterval=()=>{};w.requestAnimationFrame=fn=>fn();
 const forms=new Map();topic.answers.forEach((a,i)=>[a.answer,...a.aliases].forEach(x=>forms.set(norm(x),{valid:true,answerId:`a${i}`,canonicalAnswer:a.answer})));
 w.BrainiDailyGames={loadTopicRush:async()=>({title:topic.title,prompt:topic.prompt,targetCount:topic.target_count,durationSeconds:60,dailyNumber:40,topicId:topic.external_key,source:'local'}),checkTopicRushAnswer:async(_c,g)=>forms.get(norm(g))||{valid:false,reason:'not_in_list'}};
 t.load('topic-rush');await w.BrainiTopicRush.mount(q('[data-tr-start]').closest('[id]'));q('[data-tr-start]').click();await tick();
 const guess=async g=>{q('[data-tr-input]').value=g;q('[data-tr-form]').dispatchEvent(new w.Event('submit',{cancelable:true}));await tick();};
 await guess('not a valid member');await guess(topic.answers[0].answer);await guess(topic.answers[0].aliases[0]||topic.answers[0].answer.toUpperCase());
 for(const a of topic.answers.slice(1,topic.target_count+1))await guess(a.aliases[0]||a.answer);
 now+=60001;timer();await tick();timer();await tick();assert.equal(t.saves.length,1);
 const r=t.saves[0];assert.equal(r.correct,topic.target_count+1);assert.equal(r.score,2500);assert.equal(new Set(r.topicRushAnswers).size,r.topicRushAnswers.length);assert.ok(q('.post-game'));w.close();
}
// Cover all eight new questions in real Daily-sized cloud rounds, plus fully wrong play.
for(const [offset,correct] of [[0,true],[3,true],[6,true],[0,false]]){
 const t=setup('connections','?daily=2026-10-14'),{w,q}=t;const records=Array.from({length:3},(_,i)=>batch.connections[(offset+i)%8]);
 w.BrainiBackendAuth={isConfigured:()=>true,getSession:async()=>null,getClient:()=>({rpc:async(name,args)=>{
  if(name==='get_brainilab_daily_connections')return {data:{puzzles:records.map(p=>({puzzle_id:p.external_key,clues:p.clues,prompt:p.prompt,category:p.category,choices:[p.correct_connection,...p.distractors].map((text,i)=>({id:p.external_key+'-'+i,text}))}))}};
  if(name==='check_brainilab_connections_guess'){const p=records.find(p=>p.external_key===args.p_puzzle_id);assert.ok(p);return {data:{correct:args.p_choice_id===p.external_key+'-0',explanation:p.explanation,correct_choice_id:p.external_key+'-0',answer:p.correct_connection}};}
  throw Error('Unexpected fixture RPC '+name);
 }})};
 t.load('connections');await w.BrainiConnections.mount(q('#connectionsGame'));q('[data-connections-start]').click();await tick();
 for(const p of records){
  const buttons=[...q('[data-connections-choices]').children],selected=buttons.find(b=>b.textContent===(correct?p.correct_connection:p.distractors[0]));assert.ok(selected,p.external_key);
  selected.click();selected.click();await tick();assert.ok(buttons.every(b=>b.disabled));assert.ok(q('[data-connections-feedback]').textContent.includes(p.explanation));q('[data-connections-next]').click();q('[data-connections-next]').click();await tick();
 }
 assert.equal(t.saves.length,1);assert.equal(t.saves[0].correct,correct?3:0);assert.equal(t.saves[0].roundDetails.filter(r=>r.correct).length,correct?3:0);assert.ok(q('.post-game'));w.close();
}
console.log('PASS four Topic Rush themes: invalid/alias/double answers, target cap and one save; all eight Connections: correct/wrong, explanation, answer locks and single result.');
