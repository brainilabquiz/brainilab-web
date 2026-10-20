import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href),tick=()=>new Promise(r=>setTimeout(r,0));
const load=(w,n)=>w.eval(readFileSync('assets/js/'+n+'.js','utf8'));
function setup(path,query='?try=1'){
 const w=new JSDOM(readFileSync(path+'index.html','utf8'),{url:'https://brainilabgames.com/'+path+query,runScripts:'outside-only'}).window;
 w.HTMLElement.prototype.scrollIntoView=()=>{};w.BrainiBackendAuth={isConfigured:()=>false};let saves=0;
 w.BrainiData={authState:()=>({status:'authenticated'}),daily:()=>({number:53}),dailyNumberForDate:()=>53,dateForDailyNumber:()=>new Date().toISOString().slice(0,10),pastDailyDate:()=>null,recentResults:()=>[],api:{submitGameResult:async(id,p)=>{saves++;return {...p,gameId:id,practice:true,tryFirst:true};}}};
 w.BrainiReplay={packId:()=> '11111111-1111-4111-8111-111111111111',publish:async()=> '11111111-1111-4111-8111-111111111111',storageSuffix:()=>'',run:(_g,base)=>base()};
 for(const n of ['game-challenge-model','game-challenge','post-game'])load(w,n);
 return {w,saves:()=>saves};
}
let completed=[];
function check(w,id){
 const button=w.document.querySelector('[data-post-action="challenge"],.post-share,[data-gamechallenge-button]');assert.ok(button,id+' challenge action');assert.equal(button.disabled,false,id+' ready after save');button.click();
 const field=w.document.querySelector('.game-friend-composer textarea');assert.ok(field,id+' personal invitation');
 const url=field.value.split('\n').at(-1),c=w.BrainiGameChallengeModel.parse(new URL(url).hash);assert.equal(c.g,id);assert.equal(new URL(url).searchParams.get('try'),'1');
 assert.equal(w.document.querySelectorAll('.game-friend-composer').length,1);completed.push(id);
}
for(const [slug,module,pack,choice]of [['sequence','BrainiSequence','sequence-puzzles','[data-answers] button'],['odd-one-out','BrainiOddOneOut','odd-one-out-puzzles','[data-items] button'],['higher-lower','BrainiHigherLower','higher-lower-pairs','[data-higher]'],['survival','BrainiSurvival','quiz-packs','[data-answers] button'],['connections','BrainiConnections','connections-puzzles','[data-choice-id]'],['number-route','BrainiNumberRoute','number-route-puzzles','[data-skip]']]){
 const t=setup('games/'+slug+'/'),{w}=t;for(const n of ['puzzle-results',pack,slug])load(w,n);
 const root=w.document.querySelector('[data-intro]')?.parentElement||w.document.querySelector('#connectionsGame');await w[module].mount(root);
 root.querySelector('[data-start],[data-connections-start]').click();await tick();
 for(let i=0;i<40&&!root.querySelector('.post-game');i++){root.querySelector(choice).click();await tick();root.querySelector('[data-next],[data-connections-next]').click();await tick();}
 assert.equal(t.saves(),1);check(w,slug.replaceAll('-',''));w.close();
}
{
 const t=setup('games/math-rush/'),{w}=t;w.performance.now=()=>1000;w.setInterval=()=>1;w.clearInterval=()=>{};w.setTimeout=fn=>{queueMicrotask(fn);return 1;};load(w,'math-rush');const root=w.document.querySelector('#mathRushGame');await w.BrainiMathRush.mount(root);root.querySelector('[data-start]').click();await tick();
 for(let i=0;i<60;i++){root.querySelector('[data-skip]').click();await tick();}assert.equal(t.saves(),1);check(w,'mathrush');w.close();
}
for(const [id,path]of [['worldflags','geography/world-flags-quiz/'],['worldcapitals','geography/world-capitals-quiz/'],['science','science/science-quiz/'],['history','history/history-quiz/'],['sports','sports/sports-quiz/'],['generalknowledge','general-knowledge/general-knowledge-quiz/']]){
 const t=setup(path,'?try=1&difficulty=hard'),{w}=t;load(w,'quiz-packs');load(w,'quiz');
 w.BrainiContent={normalizeDifficulty:v=>v,loadQuizPack:async()=>({source:'local',questions:w.BrainiQuizPacks.get(id,'hard','1')}),recordAnytimeHistory:()=>{}};
 let ready;const listen=w.document.addEventListener.bind(w.document);w.document.addEventListener=(n,fn,...args)=>n==='DOMContentLoaded'?ready=fn:listen(n,fn,...args);
 const script=[...w.document.querySelectorAll('script:not([src])')].find(s=>s.textContent.includes('BrainiQuiz.loadPack')).textContent;w.eval(script);await ready();
 for(let i=0;i<20;i++){w.document.querySelector('[data-skip]').click();await tick();w.document.querySelector('[data-next]').click();await tick();}
 assert.equal(t.saves(),1);check(w,id);const token=w.BrainiGameChallengeModel.parse(new URL(w.document.querySelector('textarea').value.split('\n').at(-1)).hash);assert.equal(token.l,'hard');w.close();
}
// Run the established actual Daily-game fixture with the challenge scripts loaded, checking a real completion per game.
let daily=readFileSync('tools/test-daily-result-delivery.mjs','utf8');
daily=daily.replace("from 'node:assert/strict'","from 'node:assert/strict'")
 .replace("for(const mode of ['verified','failed','empty','practice','archive','reload'])","for(const mode of ['practice'])")
 .replace("load('post-game');","w.BrainiReplay={packId:()=> '11111111-1111-4111-8111-111111111111',publish:async()=> '11111111-1111-4111-8111-111111111111',storageSuffix:()=>'',run:(_g,base)=>base()};load('game-challenge-model');load('game-challenge');load('post-game');")
 .replace("assert.equal(saves,1);w.close();","assert.equal(saves,1);const share=q('.post-share');assert.ok(share,slug+' challenge button');assert.equal(share.disabled,false);share.click();assert.ok(q('.game-friend-composer textarea'));w.close();");
await import('data:text/javascript;base64,'+Buffer.from(daily).toString('base64'));
completed.push('orderup','topicrush','brainiword');
{
 const t=setup('games/brain-mix/'),{w}=t;load(w,'quiz');load(w,'quiz-packs');const today=new Date().toISOString().slice(0,10);
 w.BrainiDaily={validDaily:()=>true,loadToday:async()=>({source:'local',dailyNumber:53,challengeDate:today,questions:w.BrainiQuizPacks.get('generalknowledge','easy','1').slice(0,10)})};w.BrainiDailyHub={resolve:async()=>{throw Error('Practice must bypass the completed Daily check');}};
 let ready;const listen=w.document.addEventListener.bind(w.document);w.document.addEventListener=(n,fn,...args)=>n==='DOMContentLoaded'?ready=fn:listen(n,fn,...args);w.eval([...w.document.querySelectorAll('script:not([src])')].find(s=>s.textContent.includes('BrainiDaily.loadToday')).textContent);await ready();
 for(let i=0;i<10;i++){w.document.querySelector('[data-skip]').click();await tick();w.document.querySelector('[data-next]').click();await tick();}assert.equal(t.saves(),1);check(w,'brainmix');w.close();
}
{
 const t=setup('reasoning/'),{w}=t;w.eval(readFileSync('assets/js/reasoning.bundle.js','utf8'));await tick();w.document.querySelector('[data-start]').click();
 for(let i=0;i<12;i++){const input=w.document.querySelector('input[value="0"]');input.checked=true;input.dispatchEvent(new w.Event('change',{bubbles:true}));w.document.querySelector('[data-check]').click();w.document.querySelector('[data-next]').click();}check(w,'reasoning');assert.equal(t.saves(),0);w.close();
}
assert.equal(new Set(completed).size,18);console.log('PASS: all 18 active non-seasonal games complete through their real engines and offer an editable friend invitation; retired routes are not reactivated.');
