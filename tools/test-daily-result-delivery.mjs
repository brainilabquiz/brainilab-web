import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const tick=()=>new Promise(r=>setTimeout(r,0));
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const today=new Date().toISOString().slice(0,10);
for(const slug of ['order-up','topic-rush','brainiword'])for(const mode of ['verified','failed','empty','practice','archive','reload']){
 const html=readFileSync(`games/${slug}/index.html`,'utf8');
 const query=mode==='practice'?'?try=1':mode==='archive'?'?archive=2026-09-07':'';
 const w=new JSDOM(html,{url:`https://brainilabgames.com/games/${slug}/${query}`,runScripts:'outside-only'}).window;
 const q=s=>w.document.querySelector(s),gameId=slug.replaceAll('-','');
 w.HTMLElement.prototype.scrollIntoView=function(){};
 const saving=deferred(),checking=deferred(),hub=deferred();let saves=0,verifications=0,payload,canonical,now=100000,timer;
 const existing={gameId,clientResultId:'saved',correct:1,total:1,won:true,attempts:2,accuracy:100,score:2250,dailyNumber:30,answersVerified:true};
 if(mode==='reload')canonical=existing;
 w.BrainiData={pastDailyDate:x=>x,dailyNumberForDate:()=>30,dateForDailyNumber:()=>today,dailyGameIdsForNumber:()=>[gameId],authState:()=>({status:'authenticated'}),daily:()=>({number:30,completedGames:canonical?.answersVerified?[gameId]:[]}),recentResults:()=>canonical?[canonical]:[],api:{submitGameResult:(_id,p)=>{saves++;payload=p;return saving.promise;}}};
 w.BrainiDailyRules={model:()=>({version:'daily-choice-v1',primary:gameId})};
 w.BrainiDailyHub={resolve:()=>mode==='reload'?Promise.resolve({games:{[gameId]:{result:existing}}}):slug==='brainiword'?Promise.reject(Error('offline status')):hub.promise};
 w.BrainiContinuity={rewardMarkup:r=>r.practice?'Practice round':r.answersVerified?'+50 XP':r.clientResultId?'Checking your XP.':''};
 w.BrainiDailyGames={verifyResult:async()=>{verifications++;await checking.promise;},loadBrainiWord:async()=>({source:'supabase',challengeDate:today,dailyNumber:30})};
 const load=name=>w.eval(readFileSync(`assets/js/${name}.js`,'utf8'));
 load('post-game');
 if(slug==='order-up'){
  const rounds=Array.from({length:2},(_,r)=>({roundId:'r'+r,title:'Order',prompt:'Small to large',items:Array.from({length:10},(_,i)=>({itemId:`${r}-${i}`,label:String(i)}))}));
  w.BrainiDailyGames.loadOrderUp=async()=>({dailyNumber:30,rounds,source:'supabase'});
  w.BrainiDailyGames.checkOrderUpRound=async(_c,r)=>({score:1250,exactPositions:10,correctPairs:45,totalPairs:45,accuracy:100,correctOrder:r.items});
  load('order-up');await w.BrainiOrderUp.mount(q('[data-ou-start]').closest('[id]'));
  if(mode!=='reload'){
   q('[data-ou-start]').click();await tick();
   for(let r=0;r<2;r++){for(let i=0;i<10;i++){q('[data-order-choice]').click();await tick();}q('[data-ou-next]').click();await tick();}
  }
 }else if(slug==='topic-rush'){
  w.Date.now=()=>now;w.setInterval=fn=>(timer=fn,1);w.clearInterval=()=>{};w.requestAnimationFrame=fn=>fn();
  w.BrainiDailyGames.loadTopicRush=async()=>({title:'Colours',dailyNumber:30,targetCount:2,durationSeconds:60,source:'supabase'});
  w.BrainiDailyGames.checkTopicRushAnswer=async(_c,g)=>({valid:true,answerId:g,canonicalAnswer:g});
  load('topic-rush');await w.BrainiTopicRush.mount(q('[data-tr-start]').closest('[id]'));
  if(mode!=='reload'){
   q('[data-tr-start]').click();await tick();q('[data-tr-input]').value='red';q('[data-tr-form]').dispatchEvent(new w.Event('submit',{cancelable:true}));await tick();now+=60001;timer();await tick();timer();
  }
 }else{
  const script=[...w.document.querySelectorAll('script:not([src])')].find(s=>s.textContent.includes('const ROWS=5')).textContent;
  let ready;const listen=w.document.addEventListener.bind(w.document);
  w.document.addEventListener=(n,fn,...args)=>n==='DOMContentLoaded'?ready=fn:listen(n,fn,...args);
  const timeout=w.setTimeout.bind(w);w.setTimeout=(fn,ms,...args)=>timeout(fn,ms===8000?ms:0,...args);
  w.BrainiDailyGames.checkBrainiWordGuess=async()=>({validWord:true,states:Array(5).fill('correct'),won:true,finished:true,answer:'PLANT'});
  w.eval(script);await ready();
  if(mode!=='reload'){for(const key of ['P','L','A','N','T','Enter','Enter'])w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key,bubbles:true}));}
  for(let i=0;i<12&&!q('.post-game');i++)await tick();
 }
 await tick();
 assert.ok(q('.post-game'),`${slug}/${mode}: immediate result`);
 assert.ok(q('.post-primary'));assert.equal(saves,mode==='reload'?0:1);
 if(slug==='brainiword')assert.equal(q('.post-score-label').textContent,'','No misleading correct-answers label');
 if(mode==='reload'){assert.match(q('[data-result-reward]').textContent,/50 XP/);w.close();continue;}
 const practice=['practice','archive'].includes(mode);
 assert.match(q('[data-result-reward]').textContent,practice?/Practice round/:/Saving your result/);
 const heading=q('.post-score'),guide=q('.post-guide');q('.post-primary').focus();
 if(mode==='failed')saving.reject(Error('offline'));
 else if(mode==='empty')saving.resolve(null);
 else saving.resolve({...payload,gameId,clientResultId:'saved',cloudSyncStatus:'synced'});
 await tick();
 if(mode==='failed'||mode==='empty')assert.match(q('[data-result-reward]').textContent,/could not be saved/);
 else if(practice){assert.equal(verifications,0);assert.match(q('[data-result-reward]').textContent,/Practice round/);}
 else{
  assert.equal(verifications,1);canonical={...payload,gameId,clientResultId:'saved',answersVerified:true,correct:0,accuracy:0,won:false,score:0};checking.resolve();await tick();await tick();
  assert.equal(q('.post-points strong').textContent,'0');
  assert.equal(heading.textContent,slug==='order-up'?'0%':slug==='brainiword'?'Not solved':'0');
  assert.match(q('.post-primary').textContent,/Choose an optional extra/);
  assert.match(q('[data-result-reward]').textContent,/50 XP/);
 }
 hub.resolve({dailyNumber:30,games:{},model:{version:'daily-choice-v1',primary:gameId}});await tick();
 assert.equal(q('.post-score'),heading,'No remount during status/save updates');
 assert.equal(q('.post-guide'),guide);assert.equal(w.document.activeElement,q('.post-primary'),'Keep keyboard focus');
 assert.equal(saves,1);w.close();
}
console.log('PASS Order Up, Topic Rush and BrainiWord: deferred/failed/empty save, canonical results, practice/archive, existing results, Daily actions and stable focus.');
