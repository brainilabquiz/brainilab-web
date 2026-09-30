import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const html=readFileSync('games/brainiword/index.html','utf8');
const script=[...new JSDOM(html).window.document.querySelectorAll('script:not([src])')].find(s=>s.textContent.includes('const ROWS=5')).textContent;
for(const [query,resumed] of [['',false],['?try=1',false],['?archive=2026-09-07',false],['',true]]){
 const d=new JSDOM(html,{url:'https://brainilabgames.com/games/brainiword/'+query,runScripts:'outside-only'}),w=d.window;
 let starts=0,valid=false,fail=false,ready;
 const original=w.document.addEventListener.bind(w.document);
 w.document.addEventListener=(name,fn,...args)=>name==='DOMContentLoaded'?ready=fn:original(name,fn,...args);
 w.BrainiData={pastDailyDate:x=>x};w.BrainiDailyHub={resolve:async()=>({games:{}})};
 w.BrainiSiteAnalytics={gameStart:(game,round,mode)=>{assert.equal(game,'brainiword');assert.equal(mode,'daily');starts++;}};
 w.BrainiDailyGames={loadBrainiWord:async()=>({dailyNumber:30,challengeDate:'2026-09-30'}),checkBrainiWordGuess:async()=>{if(fail)throw Error('offline');return {validWord:valid,states:['absent','absent','absent','absent','absent'],won:false,finished:false};}};
 if(resumed)w.localStorage.setItem('brainilab-brainiword-2026-09-30',JSON.stringify({dailyNumber:30,guesses:['PLANT'],evaluations:[['absent','absent','absent','absent','absent']],finished:false}));
 w.eval(script);await ready();assert.equal(starts,0);
 const key=k=>w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:k,bubbles:true}));
 const settle=()=>new Promise(r=>setTimeout(r,0));
 for(const k of 'ALLEY')key(k);key('Enter');await settle();assert.equal(starts,0,'invalid word');
 fail=true;key('Enter');await settle();assert.equal(starts,0,'network error');
 fail=false;valid=true;key('Enter');key('Enter');await settle();
 assert.equal(starts,query||resumed?0:1,'one start on first accepted guess only');d.window.close();
}
// Test the teaching examples against the game evaluator, with the dictionary service stubbed.
const d=new JSDOM('',{url:'https://brainilabgames.com/',runScripts:'outside-only'}),w=d.window;
w.BrainiBackendAuth={isConfigured:()=>true,getClient:()=>({rpc:async()=>({data:true})})};
w.eval(readFileSync('assets/js/daily-games.js','utf8'));
for(const [answer,guess,expected] of [['APPLE','ALLEY',['correct','present','absent','present','absent']],['LEVEL','LEMON',['correct','correct','absent','absent','absent']],['APPLE','AMPLE',['correct','absent','correct','correct','correct']]]){
 const r=await w.BrainiDailyGames.checkBrainiWordGuess({source:'local',fallbackAnswer:answer},guess,1);assert.deepEqual(Array.from(r.states),expected);
}
w.close();
console.log('PASS: BrainiWord first valid guess, duplicate submit, invalid/network failure, archive/trial/resume exclusions and all article examples.');
