import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const read=p=>readFileSync(p,'utf8'),today=new Date().toISOString().slice(0,10);
const uuid='10000000-0000-4000-8000-000000000001';
const questions=Array.from({length:10},(_,i)=>({q:'Question '+i,a:['A','B','C','D'],c:0}));
const payload={dailyChallengeId:uuid,dailyNumber:54,challengeDate:today,questions,source:'supabase'};
// Failed cloud fetch prefers the exact official cached pack; local fallback is never sticky.
for(const cached of [true,false]){
 const w=new JSDOM('',{url:'https://brainilabgames.com/',runScripts:'outside-only'}).window;
 let requests=0,offline=true;
 w.BrainiData={dailyNumberForDate:()=>54,api:{syncDailyChallengeMeta:async()=>{}}};
 w.BrainiQuizPacks={get:()=>questions};
 w.BrainiBackendAuth={isConfigured:()=>true,getClient:()=>({rpc:async()=>{requests++;if(offline)throw Error('offline');return {data:{daily_challenge_id:uuid,challenge_date:today,daily_number:54,questions:questions.map((q,i)=>({prompt:q.q,question_version_id:uuid,position:i+1,options:q.a.map(text=>({id:uuid,text}))}))}};}})};
 w.console.warn=()=>{};
 if(cached)w.localStorage.setItem('brainilab_daily_payload_v1_'+today,JSON.stringify(payload));
 w.eval(read('assets/js/supabase-daily.js'));
 assert.equal((await w.BrainiDaily.loadToday()).source,cached?'supabase':'local');
 offline=false;
 assert.equal((await w.BrainiDaily.loadToday()).source,'supabase');
 assert.equal(requests,cached?1:2,'A local fallback must retry; an official cache may be reused');
 w.close();
}
// Reconnect can record the real run while retaining the legacy local run as practice.
{
 const w=new JSDOM('',{url:'https://brainilabgames.com/games/brain-mix/',runScripts:'outside-only'}).window;
 w.eval(read('assets/js/data.js'));const d=w.BrainiData.daily().number;
 const old=await w.BrainiData.api.submitGameResult('brainmix',{contentSource:'local',dailyNumber:d,dailyChallengeId:null,score:6000,correct:6,total:10});
 assert.equal(old.practice,true);
 // Recreate the historical stored shape, rather than only testing the new writer.
 const saved=JSON.parse(w.localStorage.getItem('brainilab.mock.v1'));saved.recentResults[0].practice=false;
 const next=new JSDOM('',{url:w.location.href,runScripts:'outside-only'}).window;
 next.localStorage.setItem('brainilab.mock.v1',JSON.stringify(saved));next.eval(read('assets/js/data.js'));
 const actual=await next.BrainiData.api.submitGameResult('brainmix',{contentSource:'supabase',dailyNumber:d,dailyChallengeId:uuid,score:4000,correct:4,total:10});
 assert.notEqual(actual.clientResultId,old.clientResultId);assert.equal(actual.practice,undefined);
 assert.equal(next.BrainiData.recentResults().find(r=>r.clientResultId===old.clientResultId).practice,true);
 const retry=await next.BrainiData.api.submitGameResult('brainmix',{contentSource:'supabase',dailyNumber:d,dailyChallengeId:uuid,score:10000});
 assert.equal(retry.clientResultId,actual.clientResultId,'Pending official evidence must remain locked');
 w.close();next.close();
}
// Real page lifecycle: failure has an honest retry/practice choice; only official Daily mounts score.
for(const mode of ['offline','practice','official','archive']){
 const w=new JSDOM(read('games/brain-mix/index.html'),{url:'https://brainilabgames.com/games/brain-mix/'+(mode==='practice'?'?try=1':mode==='archive'?'?archive=2026-09-07':''),runScripts:'outside-only'}).window;
 let init,mounted,saved,checks=0;
 const listen=w.document.addEventListener.bind(w.document);
 w.document.addEventListener=(event,fn,...rest)=>event==='DOMContentLoaded'?init=fn:listen(event,fn,...rest);
 const daily={...payload,source:mode==='official'?'supabase':'local',dailyChallengeId:mode==='official'?uuid:null};
 w.BrainiData={pastDailyDate:x=>x,api:{submitGameResult:async(_game,p)=>(saved=p,{...p,clientResultId:'new-result'})}};
 w.BrainiDaily={loadToday:async()=>daily,loadDate:async()=>daily,validDaily:()=>true,verifyDailyResult:async()=>{checks++;}};
 w.BrainiDailyHub={resolve:async()=>({games:{brainmix:{completed:false}}}),renderBrainMixCompleted:async()=>{}};
 w.BrainiQuiz={mount:(_root,_q,opts)=>{mounted=opts;}};
 w.BrainiPostGame={mount:()=>{}};w.console.error=()=>{};
 w.eval([...w.document.querySelectorAll('script:not([src])')].find(s=>s.textContent.includes('const root=document.getElementById("leafQuiz")')).textContent);
 await init();
 if(mode==='offline'){
  assert.equal(mounted,undefined);assert.ok(w.document.querySelector('[data-daily-retry]'));
  assert.equal(w.document.querySelector('.daily-load-error a').getAttribute('href'),'?try=1');
  assert.match(w.document.querySelector('.daily-load-error').textContent,/progress hasn’t changed/);
 }else{
  assert.equal(mounted.practice,mode!=='official');
  await mounted.onComplete({points:6000,correct:6,total:10,timeSec:30,results:[],answerDetails:[]});
  assert.equal(saved.practice,mode!=='official');assert.equal(checks,mode==='official'?1:0);
 }
 w.close();
}
console.log('PASS Brain Mix fallback: exact cached official pack, reconnection, legacy practice retention, official retry lock, failure/retry UI, opt-in practice, archive and verification.');
