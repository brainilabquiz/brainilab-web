import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const batch=JSON.parse(readFileSync('content/game-batches/logic-variety-20261014.json','utf8'));
const tick=()=>new Promise(r=>setTimeout(r,0));
function setup(slug,records,kind){
 const w=new JSDOM(readFileSync(`games/${slug}/index.html`,'utf8'),{url:`https://brainilabgames.com/games/${slug}/`,runScripts:'outside-only'}).window;
 const saves=[];w.HTMLElement.prototype.scrollIntoView=function(){};
 w.BrainiData={recentResults:()=>[],api:{submitGameResult:async(_,p)=>{saves.push(p);return {...p,clientResultId:'fixture',cloudSyncStatus:'local_only'};}}};
 w.BrainiBackendAuth={isConfigured:()=>true,getSession:async()=>null,getClient:()=>({rpc:async(name,args)=>{
  if(name===`get_brainilab_${kind}_game`)return {data:{puzzles:records.map(p=>({puzzle_id:p.external_key,category:p.category,sequence:p.sequence_values,options:p.options,numbers:p.numbers,target:p.target}))}};
  const p=records.find(p=>p.external_key===args.p_puzzle_id);assert.ok(p,name);
  if(name==='check_brainilab_sequence_answer')return {data:{correct:args.p_answer===p.answer_value,answer:p.answer_value,explanation:p.explanation}};
  if(name==='check_brainilab_number_route_answer')return {data:{correct:JSON.stringify(args.p_operators)===JSON.stringify(p.solution),solution:p.solution}};
  if(name==='reveal_brainilab_number_route_solution')return {data:{solution:p.solution}};
  throw Error('Unexpected fixture RPC '+name);
 }})};
 for(const module of ['post-game','puzzle-results',slug])w.eval(readFileSync(`assets/js/${module}.js`,'utf8'));
 return {w,saves,root:w.document.querySelector('[data-start]').closest('[id]')};
}
for(const [offset,right] of [[0,true],[8,true],[0,false]]){
 const records=Array.from({length:10},(_,i)=>batch.sequence[(offset+i)%18]),t=setup('sequence',records,'sequence'),{root,w}=t;
 await w.BrainiSequence.mount(root);root.querySelector('[data-start]').click();await tick();
 for(const p of records){
  assert.equal(root.querySelector('[data-sequence]').textContent,p.sequence_values.join('')+'?');
  const expected=right?p.answer_value:p.options.find(n=>n!==p.answer_value);
  const button=[...root.querySelectorAll('[data-answers] button')].find(b=>Number(b.textContent)===expected);
  assert.ok(button);button.click();await tick();assert.match(root.querySelector('[data-feedback]').textContent,new RegExp(p.explanation.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.ok([...root.querySelectorAll('[data-answers] button')].every(b=>b.disabled));
  root.querySelector('[data-next]').click();await tick();
 }
 assert.equal(t.saves.length,1);assert.equal(t.saves[0].correct,right?10:0);assert.equal(t.saves[0].score,right?2500:0);w.close();
}
let perfect;
for(const [offset,mode] of [[0,'correct'],[2,'correct'],[0,'retry'],[0,'skip']]){
 const records=Array.from({length:10},(_,i)=>batch.numberroute[(offset+i)%12]),t=setup('number-route',records,'number_route'),{root,w}=t;
 await w.BrainiNumberRoute.mount(root);root.querySelector('[data-start]').click();await tick();
 const choose=async operators=>{for(const op of operators){const button=[...root.querySelectorAll('[data-ops] button')].find(b=>b.textContent===op);assert.ok(button&&!button.disabled,op);button.click();await tick();}};
 for(const p of records){
  assert.equal(Number(root.querySelector('[data-target]').textContent),p.target);
  if(mode==='skip')root.querySelector('[data-skip]').click();
  else{
   if(mode==='retry'){await choose(['+','+','+']);assert.match(root.querySelector('[data-feedback]').textContent,/Attempt 2/);}
   await choose(p.solution);assert.match(root.querySelector('[data-feedback]').textContent,/Target reached/);
   if(p.external_key==='exp-20261014-numberroute-01')assert.ok(root.querySelector('[data-feedback]').textContent.includes('((3 + 5) ÷ 2) × 7 = 28'),'The feedback displays mathematically correct grouping');
  }
  await tick();root.querySelector('[data-next]').click();await tick();
 }
 assert.equal(t.saves.length,1);
 assert.equal(t.saves[0].correct,mode==='skip'?0:10);
 if(mode==='correct'){assert.equal(t.saves[0].score,2500);perfect=t.saves[0].score;}
 if(mode==='retry')assert.ok(t.saves[0].score>0&&t.saves[0].score<perfect,'Extra attempts reduce points for the new routes');
 if(mode==='skip')assert.equal(t.saves[0].score,0);
 w.close();
}
console.log('PASS new logic gameplay: all 18 sequences and 12 routes render/play in real engines; correct/wrong/skip/retry scores, answer locks, explanations and one final save.');
