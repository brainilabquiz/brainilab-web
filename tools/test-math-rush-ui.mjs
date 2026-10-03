import {readFileSync} from 'node:fs';import {pathToFileURL} from 'node:url';import assert from 'node:assert/strict';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href),tick=()=>new Promise(r=>setTimeout(r,0));
for(const [mode,expected]of [['perfect',6000],['mixed',1750],['early-error',50],['wrong',0]]){
 const w=new JSDOM(readFileSync('games/math-rush/index.html','utf8'),{url:'https://brainilabgames.com/games/math-rush/?try=1',runScripts:'outside-only'}).window;
 let payload,now=1000;w.performance.now=()=>now;w.setInterval=()=>1;w.clearInterval=()=>{};w.setTimeout=fn=>{queueMicrotask(fn);return 1;};w.HTMLElement.prototype.scrollIntoView=function(){};
 w.BrainiBackendAuth={isConfigured:()=>false};w.BrainiData={api:{submitGameResult:async(g,p)=>{payload=p;return {...p,clientResultId:'test'};}}};
 for(const name of ['post-game','math-rush'])w.eval(readFileSync('assets/js/'+name+'.js','utf8'));
 const root=w.document.querySelector('#mathRushGame');await w.BrainiMathRush.mount(root);root.querySelector('[data-start]').click();await tick();
 const seen=new Set();
 for(let n=0;n<60;n++){
  const problem=root.querySelector('[data-problem]').textContent;assert.ok(!seen.has(problem));seen.add(problem);
  const [a,op,b]=problem.split(' '),answer=op==='+'?+a+ +b:op==='−'?a-b:op==='×'?a*b:a/b;
  const correct=mode==='perfect'||mode==='mixed'&&n<20||mode==='early-error'&&n===1;
  const wrong=mode==='wrong'||mode==='mixed'&&n>=20&&n<25||mode==='early-error'&&n===0;
  if(correct||wrong){root.querySelector('[data-answer]').value=correct?String(answer):'-1';root.querySelector('[data-form]').dispatchEvent(new w.Event('submit',{cancelable:true}));}
  else root.querySelector('[data-skip]').click();
  await tick();
 }
 assert.equal(payload.score,expected,mode);assert.equal(payload.scoringVersion,'mathrush-v2');assert.equal(root.querySelector('.post-points strong').textContent,expected.toLocaleString('en-GB'));assert.equal(root.querySelector('.post-score').textContent,String(payload.correct));assert.equal(root.querySelector('[data-stage]').hidden,true);w.close();
}
const w=new JSDOM('',{url:'https://brainilabgames.com/',runScripts:'outside-only'}).window;
for(const file of ['daily-rules','data'])w.eval(readFileSync('assets/js/'+file+'.js','utf8'));
let mainDate,extraDate;for(let d=1;d<=20;d++){const date=`2026-10-${String(d).padStart(2,'0')}`,m=w.BrainiDailyRules.model(date);if(m.primary==='mathrush')mainDate=date;else if(m.choices.includes('mathrush'))extraDate=date;}
for(const [date,max]of [[mainDate,2500],[extraDate,1000]])for(const raw of [0,50,1750,3000,5850,6000]){
 const p={score:raw,scoringVersion:'mathrush-v2',dailyNumber:w.BrainiData.dailyNumberForDate(date)};
 assert.equal(w.BrainiData.dailyPointsForResult('mathrush',p),Math.round(Math.round(raw/6000*2500)*max/2500));
}
w.close();console.log('PASS Math Rush UI: 60 unique operations, perfect/mixed/all-wrong/early-error, zero floor, practice, result display and main/extra proportional scores.');
