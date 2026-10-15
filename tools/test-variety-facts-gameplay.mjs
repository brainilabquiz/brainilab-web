import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {pathToFileURL} from 'node:url';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href),b=JSON.parse(readFileSync('content/game-batches/variety-facts-20261015.json','utf8'));
const tick=()=>new Promise(r=>setTimeout(r,0)),load=(w,name)=>w.eval(readFileSync('assets/js/'+name+'.js','utf8'));
const groups=[b.higherlower.slice(0,10),[...b.higherlower.slice(10),b.repair,...b.higherlower.slice(0,7)]];
for(const records of groups)for(const mode of ['correct','wrong','mixed']){
 const w=new JSDOM(readFileSync('games/higher-lower/index.html','utf8'),{url:'https://brainilabgames.com/games/higher-lower/',runScripts:'outside-only'}).window,saves=[];let checks=0;
 w.HTMLElement.prototype.scrollIntoView=function(){};w.BrainiContinuity={rewardMarkup:()=>''};
 w.BrainiData={recentResults:()=>[],anytimeHistory:()=>({}),recordAnytimeHistory:()=>{},api:{submitGameResult:async(g,p)=>{saves.push(p);return {...p,clientResultId:'isolated-facts-fixture',cloudSyncStatus:'local_only'};}}};
 w.BrainiBackendAuth={isConfigured:()=>true,getSession:async()=>null,getClient:()=>({rpc:async(name,args)=>{
  if(name==='get_brainilab_higher_lower_game')return {data:{pairs:records.map(p=>({...p,pair_id:p.external_key}))}};
  if(name==='check_brainilab_higher_lower_answer'){checks++;const p=records.find(p=>p.external_key===args.p_pair_id),labels={longer_shorter:['Longer','Shorter'],heavier_lighter:['Heavier','Lighter'],earlier_later:['Earlier','Later']};return {data:{correct:args.p_choice===p.expected_choice,direction:p.expected_choice,label:labels[p.comparison_type][p.expected_choice==='first'?0:1],right_value:p.right_value,explanation:p.explanation}};}
  throw Error('Unexpected fixture RPC '+name);
 }})};
 load(w,'post-game');load(w,'puzzle-results');load(w,'higher-lower');const q=s=>w.document.querySelector(s);await w.BrainiHigherLower.mount(q('[data-intro]').parentElement);q('[data-start]').click();await tick();
 let expected=0,combo=0,correct=0;
 for(const [i,p] of records.entries()){
  const right=mode==='correct'||(mode==='mixed'&&i%3!==1),choice=right?p.expected_choice:(p.expected_choice==='first'?'second':'first'),button=q(choice==='first'?'[data-higher]':'[data-lower]');
  assert.ok(q('[data-metric]').textContent.includes(p.right_label));button.click();button.click();await tick();assert.ok(q('[data-higher]').disabled&&q('[data-lower]').disabled);assert.ok(q('[data-feedback]').textContent.includes(p.explanation));
  if(right){correct++;combo++;expected+=100+Math.min(100,(combo-1)*20);}else combo=0;
  q('[data-next]').click();q('[data-next]').click();await tick();
 }
 assert.equal(checks,10);assert.equal(saves.length,1);assert.equal(saves[0].correct,correct);assert.equal(saves[0].score,expected);assert.equal(saves[0].accuracy,correct*10);assert.ok(q('.post-game'));w.close();
}
for(const gameId of ['brainmix','generalknowledge','science','history'])for(const mode of ['correct','wrong','skip']){
 const w=new JSDOM('<main><h2 data-q></h2><div data-answers></div><div data-feedback></div><button data-next></button><button data-skip></button></main>',{url:'https://brainilabgames.com/',runScripts:'outside-only'}).window;
 w.BrainiData={};load(w,'quiz');const q=s=>w.document.querySelector(s),questions=b.quiz.map(p=>({q:p.prompt,a:p.options.map(o=>o.text),c:p.options.findIndex(o=>o.is_correct),f:p.explanation}));let result,count=0;
 w.BrainiQuiz.mount(q('main'),questions,{gameId,onComplete:r=>{result=r;count++;},checkAnswer:async(p,choice)=>({isCorrect:choice===p.c,correctIndex:p.c,explanation:p.f})});
 for(const p of questions){
  if(mode==='skip'){q('[data-skip]').click();q('[data-skip]').click();await tick();}
  else{const i=mode==='correct'?p.c:(p.c+1)%4,button=q('[data-answers]').children[i];button.click();button.click();await tick();assert.ok([...q('[data-answers]').children].every(x=>x.disabled));}
  q('[data-next]').click();q('[data-next]').click();await tick();
 }
 assert.equal(count,1);assert.equal(result.correct,mode==='correct'?12:0);assert.equal(result.total,12);assert.equal(result.points,mode==='correct'?(gameId==='brainmix'?12000:6000):0);w.close();
}
console.log('PASS real engines: 12 new comparisons plus duration correction, full/wrong/mixed combo scores, answer locks/single save; 12 quiz questions correct/wrong/skip across shared game modes.');
