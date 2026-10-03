// Gameplay regressions with real DOM and game engines; no production writes.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const tick=()=>new Promise(r=>setTimeout(r,0));
function setup(slug,query='?archive=2026-09-07'){
 const w=new JSDOM(readFileSync(`games/${slug}/index.html`,'utf8'),{url:`https://brainilabgames.com/games/${slug}/${query}`,runScripts:'outside-only'}).window;
 const saves=[];w.HTMLElement.prototype.scrollIntoView=function(){};
 w.BrainiData={pastDailyDate:x=>x,daily:()=>({number:30}),dailyNumberForDate:()=>30,recentResults:()=>[],api:{submitGameResult:async(game,p)=>{saves.push({game,...p});return {...p,clientResultId:'fixture',cloudSyncStatus:'local_only'};}}};
 w.BrainiBackendAuth={isConfigured:()=>false};w.BrainiContinuity={rewardMarkup:()=>''};
 const load=name=>w.eval(readFileSync(`assets/js/${name}.js`,'utf8'));
 load('post-game');load('puzzle-results');return {w,saves,load,q:s=>w.document.querySelector(s)};
}
// Connections: all modes, mixed/all wrong, no retry, no double-answer/advance/save.
for(const [query,count,right] of [['?archive=2026-09-07',3,1],['?daily=2026-10-02',3,0],['',20,10]]){
 const t=setup('connections',query),{w,q}=t;
 w.BrainiConnectionsPuzzles={all:()=>Array.from({length:20},(_,i)=>({id:'c'+i,clues:['Tea','Coffee','Cocoa','Cider'],choices:['Drinks','Planets','Trees','Colours'],correct:0,explanation:'All are drinks.'}))};
 t.load('connections');await w.BrainiConnections.mount(q('#connectionsGame'));q('[data-connections-start]').click();await tick();
 for(let i=0;i<count;i++){
  const buttons=[...q('[data-connections-choices]').children];
  const selected=buttons.find(b=>b.textContent===(i<right?'Drinks':'Trees'));
  selected.click();selected.click();await tick();
  assert.ok(buttons.every(b=>b.disabled));assert.match(q('[data-connections-feedback]').textContent,/Drinks/);
  buttons.find(b=>b.textContent==='Drinks').click();await tick();
  q('[data-connections-next]').click();q('[data-connections-next]').click();await tick();
 }
 assert.equal(t.saves.length,1);assert.equal(t.saves[0].correct,right);assert.equal(t.saves[0].score,right*1000);
 assert.equal(t.saves[0].accuracy,Math.round(right/count*100));assert.equal(t.saves[0].roundDetails.length,count);
 assert.equal(t.saves[0].roundDetails.filter(x=>x.correct).length,right);
 assert.match(q('.post-score').textContent,new RegExp(`${right}.*${count}`));w.close();
}
console.log('PASS Connections: 3/20 rounds, one answer, real correctness, zero score, archive/Daily, repeated input.');
// Shared single-answer games: wrong answers cannot be corrected, early/double Next ignored, save failure visible.
for(const [slug,module,pack,selector] of [['sequence','BrainiSequence','sequence-puzzles','[data-answers] button'],['odd-one-out','BrainiOddOneOut','odd-one-out-puzzles','[data-items] button'],['higher-lower','BrainiHigherLower','higher-lower-pairs','[data-higher]'],['survival','BrainiSurvival','quiz-packs','[data-answers] button']]){
 const t=setup(slug),{w,q}=t;t.load(pack);t.load(slug);
 w.BrainiData.api.submitGameResult=async(game,p)=>{t.saves.push({game,...p});throw Error('offline');};
 await w[module].mount(q('[data-intro]').parentElement);q('[data-start]').click();await tick();
 q('[data-next]').click();assert.equal(q('[data-next]').hidden,true);
 for(let i=0;i<30&&!q('.post-game');i++){
  const button=q(selector);button.click();button.click();await tick();
  assert.ok(button.disabled);q('[data-next]').click();q('[data-next]').click();await tick();
 }
 assert.equal(t.saves.length,1,slug);assert.ok(q('.post-game'),slug);assert.match(q('[data-result-reward]').textContent,/could not be saved/);w.close();
}
console.log('PASS Sequence/Odd One Out/Higher or Lower/Survival: locks, navigation, completion and save failure.');
// Order Up: refresh after a checked round, checker failure retry, locked order, two rounds once.
{
 const t=setup('order-up'),{w,q}=t;let checks=0,fail=true;
 const rounds=Array.from({length:2},(_,r)=>({roundId:'r'+r,title:'Order',prompt:'Small to large',directionLabel:'smallest first',items:Array.from({length:10},(_,i)=>({itemId:`r${r}-${i}`,label:String(i)}))}));
 w.localStorage.setItem('brainilab-orderup-v35-2026-09-07',JSON.stringify({dailyNumber:30,roundIndex:0,selectedIds:rounds[0].items.map(x=>x.itemId),roundResults:[{roundId:'r0',score:1250,exactPositions:10,correctPairs:45,totalPairs:45,accuracy:100}],finished:false}));
 w.BrainiDailyGames={loadOrderUp:async()=>({dailyNumber:30,rounds,source:'local'}),checkOrderUpRound:async(_c,r,ids)=>{checks++;assert.equal(ids.length,10);if(fail){fail=false;throw Error('offline');}return {score:1250,exactPositions:10,correctPairs:45,totalPairs:45,accuracy:100,correctOrder:r.items};}};
 t.load('order-up');await w.BrainiOrderUp.mount(q('[data-ou-start]').closest('[id]'));q('[data-ou-start]').click();await tick();await tick();
 assert.equal(checks,1);assert.equal(q('[data-ou-next]').textContent,'Retry checking');q('[data-ou-next]').click();await tick();assert.equal(checks,2);
 assert.equal(q('[data-ou-next]').textContent,'Next round');q('[data-ou-next]').click();q('[data-ou-next]').click();
 for(let i=0;i<10;i++){q('[data-order-choice]').click();await tick();}
 assert.equal(checks,3);q('[data-ou-next]').click();q('[data-ou-next]').click();await tick();assert.equal(t.saves.length,1);assert.equal(t.saves[0].correct,20);assert.ok(q('.post-game'));w.close();
}
console.log('PASS Order Up: refresh restores completion, retry keeps order, duplicate next/save blocked.');
// Topic Rush can exceed its full-score target; pending answers before deadline still count once.
{
 const t=setup('topic-rush'),{w,q}=t;let now=100000,timer;w.Date.now=()=>now;w.setInterval=fn=>(timer=fn,1);w.clearInterval=()=>{};w.requestAnimationFrame=fn=>fn();
 w.BrainiDailyGames={loadTopicRush:async()=>({title:'Colours',targetCount:2,durationSeconds:60,dailyNumber:30,topicId:'colours',source:'local'}),checkTopicRushAnswer:async(_c,g)=>({valid:true,answerId:g.toLowerCase(),canonicalAnswer:g.toLowerCase()})};
 t.load('topic-rush');await w.BrainiTopicRush.mount(q('[data-tr-start]').closest('[id]'));q('[data-tr-start]').click();await tick();
 const guess=g=>{q('[data-tr-input]').value=g;q('[data-tr-form]').dispatchEvent(new w.Event('submit',{cancelable:true}));};
 for(const g of ['red','RED','blue','green']){guess(g);await tick();}
 now+=60001;timer();await tick();assert.equal(t.saves.length,1);assert.equal(t.saves[0].correct,3);assert.equal(t.saves[0].total,3);assert.equal(t.saves[0].score,2500);assert.equal(t.saves[0].targetCount,2);w.close();
}
console.log('PASS Topic Rush: duplicate aliases, exceed target without invalid result, timer ends once.');
// Math Rush: empty input is not zero; real zero correct, repeated submit locked, timeout closes input.
for(const idle of [false,true]){
 const t=setup('math-rush'),{w,q}=t;let now=0,timer,advance;w.performance.now=()=>now;w.setInterval=fn=>(timer=fn,1);w.clearInterval=()=>{};w.setTimeout=(fn,ms)=>{if(ms===70)advance=fn;return 1;};
 w.BrainiBackendAuth={isConfigured:()=>true,getSession:async()=>null,getClient:()=>({rpc:async()=>({data:{seed:'fixture',operations:Array.from({length:60},(_,i)=>({position:i+1,a:3,b:3,operator:'−'}))}})})};
 t.load('math-rush');await w.BrainiMathRush.mount(q('[data-start]').closest('[id]'));q('[data-start]').click();await tick();
 const submit=v=>{q('[data-answer]').value=v;q('[data-form]').dispatchEvent(new w.Event('submit',{cancelable:true}));};
 submit('');assert.equal(q('[data-meta]').textContent.includes('Question 1'),true);
 if(!idle){submit('0');submit('0');advance();submit('1');advance();q('[data-skip]').click();advance();}
 now=60001;submit('0');timer();await tick();assert.equal(t.saves.length,1);assert.equal(t.saves[0].correct,idle?0:1);assert.equal(t.saves[0].total,idle?0:2);assert.equal(t.saves[0].score,idle?0:100);if(idle){assert.equal(t.saves[0].practice,true);assert.equal(t.saves[0].dailyNumber,null);}w.close();
}
console.log('PASS Math Rush: empty/zero, wrong/skip, double submit, zero-answer timeout and no late scoring.');
// Every quiz category uses this engine, including the Europe Flags practice quiz.
for(const gameId of ['brainmix','worldflags','worldcapitals','generalknowledge','science','history','sports','europeflags']){
 const w=new JSDOM('<main><h2 data-q></h2><div data-answers></div><div data-feedback></div><button data-next></button><button data-skip></button></main>',{url:'https://brainilabgames.com/',runScripts:'outside-only'}).window;
 w.console.warn=()=>{};w.BrainiData={};w.eval(readFileSync('assets/js/quiz.js','utf8'));const root=w.document.querySelector('main'),q=s=>root.querySelector(s);let complete=0,result,fail=true;
 const questions=Array.from({length:3},()=>({q:'Two plus two?',a:['4','5','6','7'],c:0,f:'Two pairs make four.'}));
 w.BrainiQuiz.mount(root,questions,{gameId,onComplete:r=>{complete++;result=r;},checkAnswer:async(_q,choice)=>{if(fail){fail=false;throw Error('offline fixture');}return {isCorrect:choice===0,correctIndex:0};}});
 q('[data-next]').click();q('[data-answers] button').click();await tick();assert.equal(q('[data-answers] button').disabled,false);
 q('[data-answers]').children[1].click();await tick();q('[data-answers]').children[0].click();q('[data-next]').click();q('[data-next]').click();
 q('[data-skip]').click();q('[data-skip]').click();await tick();q('[data-next]').click();
 q('[data-answers]').children[0].click();await tick();q('[data-next]').click();q('[data-next]').click();
 assert.equal(complete,1,gameId);assert.equal(result.correct,1);assert.equal(result.total,3);assert.equal(result.points,gameId==='brainmix'?1000:500);assert.equal(result.answerDetails.filter(x=>x.skipped).length,1);w.close();
}
console.log('PASS all eight quiz categories: checker retry, wrong/skip/correct, locks, single completion and points.');
