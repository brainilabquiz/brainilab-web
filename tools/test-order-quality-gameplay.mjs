import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {pathToFileURL} from 'node:url';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href),b=JSON.parse(readFileSync('content/game-batches/order-quality-20261015.json','utf8'));
const tick=()=>new Promise(r=>setTimeout(r,0));
function setup(slug,query=''){
 const w=new JSDOM(readFileSync(`games/${slug}/index.html`,'utf8'),{url:`https://brainilabgames.com/games/${slug}/${query}`,runScripts:'outside-only'}).window;
 const saves=[];w.HTMLElement.prototype.scrollIntoView=function(){};w.BrainiBackendAuth={isConfigured:()=>false};w.BrainiContinuity={rewardMarkup:()=>''};
 w.BrainiData={pastDailyDate:x=>x,recentResults:()=>[],daily:()=>({number:50}),dailyNumberForDate:()=>50,api:{submitGameResult:async(game,p)=>{saves.push({game,...p});return {...p,clientResultId:'isolated-quality-fixture',cloudSyncStatus:'local_only'};}}};
 const load=name=>w.eval(readFileSync(`assets/js/${name}.js`,'utf8'));load('post-game');load('puzzle-results');return {w,saves,load,q:s=>w.document.querySelector(s)};
}
for(const mode of ['correct','reverse','swap'])for(let offset=0;offset<(mode==='swap'?2:8);offset+=2){
 const t=setup('order-up','?archive=2026-09-07'),{w,q}=t;let checks=0;
 const rounds=b.orderup.slice(offset,offset+2).map(r=>({roundId:r.external_key,title:r.title,prompt:r.prompt,directionLabel:r.direction_label,items:r.items.map((label,i)=>({itemId:r.external_key+'-'+i,label}))}));
 w.BrainiDailyGames={loadOrderUp:async()=>({dailyNumber:50,rounds,source:'local'}),checkOrderUpRound:async(_content,r,ids)=>{
  checks++;const positions=ids.map(id=>r.items.findIndex(i=>i.itemId===id));let pairs=0;for(let i=0;i<10;i++)for(let j=i+1;j<10;j++)if(positions[i]<positions[j])pairs++;
  return {score:Math.round(pairs/45*1250),exactPositions:positions.filter((p,i)=>p===i).length,correctPairs:pairs,totalPairs:45,accuracy:Math.round(pairs/45*10000)/100,correctOrder:r.items};
 }};
 t.load('order-up');await w.BrainiOrderUp.mount(q('[data-ou-start]').closest('[id]'));q('[data-ou-start]').click();await tick();
 for(const round of rounds){
  let items=round.items.slice();if(mode==='reverse')items.reverse();if(mode==='swap')[items[0],items[1]]=[items[1],items[0]];
  for(const item of items){const button=[...w.document.querySelectorAll('[data-order-choice]')].find(x=>x.dataset.orderChoice===item.itemId);assert.ok(button,item.label);button.click();button.click();await tick();}
  assert.ok(q('[data-ou-next]'));q('[data-ou-next]').click();q('[data-ou-next]').click();await tick();
 }
 assert.equal(checks,2);assert.equal(t.saves.length,1);assert.equal(t.saves[0].score,mode==='correct'?2500:mode==='reverse'?0:2444);assert.ok(q('.post-game'));w.close();
}
for(const correct of [true,false]){
 const t=setup('odd-one-out'),{w,q}=t;t.load('odd-one-out-puzzles');
 const fillers=w.BrainiOddOneOutPuzzles.all().slice(0,2).map(p=>({...p,external_key:p.id,odd_index:p.odd})),records=[...b.oddoneout,...fillers];
 w.BrainiBackendAuth={isConfigured:()=>true,getSession:async()=>null,getClient:()=>({rpc:async(name,args)=>{
  if(name==='get_brainilab_odd_one_out_game')return {data:{puzzles:records.map(p=>({puzzle_id:p.external_key,category:p.category,prompt:p.prompt,items:p.items}))}};
  if(name==='check_brainilab_odd_one_out_answer'){const p=records.find(p=>p.external_key===args.p_puzzle_id);assert.ok(p);return {data:{correct:args.p_item_index===p.odd_index,correct_index:p.odd_index,explanation:p.explanation}};}
  throw Error('Unexpected fixture RPC '+name);
 }})};
 t.load('odd-one-out');await w.BrainiOddOneOut.mount(q('[data-intro]').parentElement);q('[data-start]').click();await tick();
 for(const p of records){
  const buttons=[...q('[data-items]').querySelectorAll('button')],index=correct?p.odd_index:(p.odd_index+1)%4;buttons[index].click();buttons[index].click();await tick();assert.ok(buttons.every(x=>x.disabled));assert.ok(q('[data-feedback]').textContent.includes(p.explanation));q('[data-next]').click();q('[data-next]').click();await tick();
 }
 assert.equal(t.saves.length,1);assert.equal(t.saves[0].correct,correct?10:0);assert.ok(q('.post-game'));w.close();
}
console.log('PASS eight Order Up rounds: correct/reverse/partial scoring, locked cards and one save; eight explicit-rule Odd One Out questions: correct/wrong, explanations and first-answer locks.');
