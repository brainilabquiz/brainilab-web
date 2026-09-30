import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const source=f=>readFileSync('assets/js/'+f,'utf8');

// Starts require consent, valid game/mode and a unique round. No retroactive queue.
let dom=new JSDOM('<title>Quiz</title>',{url:'https://brainilabgames.com/',runScripts:'outside-only'}),w=dom.window;
w.eval(source('site-analytics.js'));const round={};w.BrainiSiteAnalytics.gameStart('mathrush',round);assert.equal(w.dataLayer,undefined);
w.BrainiSiteAnalytics.setConsent(true);w.BrainiSiteAnalytics.gameStart('mathrush',round);w.BrainiSiteAnalytics.gameStart('mathrush',round);
w.BrainiSiteAnalytics.gameStart('email@example.com',{});w.BrainiSiteAnalytics.gameStart('mathrush',{},'practice');
assert.equal(w.dataLayer.filter(e=>e[0]==='event'&&e[1]==='game_start').length,1);
w.BrainiSiteAnalytics.setConsent(false);w.BrainiSiteAnalytics.gameStart('mathrush',{});assert.equal(w.dataLayer.filter(e=>e[0]==='event').length,0);w.close();

// Null Daily number means Anytime, so repeated rounds must not reuse old results.
dom=new JSDOM('',{url:'https://brainilabgames.com/games/math-rush/',runScripts:'outside-only'});w=dom.window;w.eval(source('data.js'));
const first=w.BrainiData.recordGameResult('mathrush',{score:100,dailyNumber:null});
const second=w.BrainiData.recordGameResult('mathrush',{score:200,dailyNumber:null});
assert.notEqual(first.clientResultId,second.clientResultId);assert.equal(second.score,200);assert.ok(!second.dailyReplayBlocked);
const dailyNumber=w.BrainiData.daily().number;
const daily=w.BrainiData.recordGameResult('mathrush',{score:100,dailyNumber});
assert.equal(w.BrainiData.recordGameResult('mathrush',{score:999,dailyNumber}).clientResultId,daily.clientResultId);w.close();

// A double submit cannot score twice. The result is visible before a slow save completes.
dom=new JSDOM(readFileSync('games/math-rush/index.html','utf8'),{url:'https://brainilabgames.com/games/math-rush/',runScripts:'outside-only'});w=dom.window;
let now=0,tick,resolveSave,submissions=0,starts=0;
Object.defineProperty(w.performance,'now',{value:()=>now});w.setInterval=fn=>{tick=fn;return 1};w.clearInterval=()=>{};
w.BrainiBackendAuth={isConfigured:()=>false};w.BrainiSiteAnalytics={gameStart:()=>starts++};
w.BrainiData={api:{submitGameResult:async(_id,payload)=>{submissions++;return new Promise(resolve=>{resolveSave=()=>resolve({...payload,clientResultId:'test-result',cloudSyncStatus:'local_only'});});}}};
w.BrainiContinuity={rewardMarkup:r=>r.clientResultId?'<p>Saved</p>':''};w.BrainiShare={open:()=>{}};
w.eval(source('post-game.js'));w.eval(source('math-rush.js'));await w.BrainiMathRush.mount(w.document.querySelector('#mathRushGame'));
w.document.querySelector('[data-start]').click();await new Promise(r=>setTimeout(r,0));assert.equal(starts,1);
w.document.querySelector('[data-answer]').value='999';const form=w.document.querySelector('form');
form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
now=61000;tick();assert.equal(submissions,1);assert.ok(w.document.querySelector('.post-game'));assert.equal(w.document.querySelectorAll('.post-answer').length,1);
assert.match(w.document.querySelector('[data-result-reward]').textContent,/Saving/);
resolveSave();await new Promise(r=>setTimeout(r,0));assert.equal(w.document.querySelector('[data-result-reward]').textContent,'Saved');w.close();

// Inline scripts must parse and entry pages must expose one permanent title.
for(const path of ['geography/world-flags-quiz/index.html','general-knowledge/general-knowledge-quiz/index.html','games/math-rush/index.html']){
 const d=new JSDOM(readFileSync(path,'utf8'));assert.equal(d.window.document.querySelectorAll('h1').length,1,path);
 for(const s of d.window.document.querySelectorAll('script:not([src]):not([type="application/ld+json"])'))new Function(s.textContent);
 for(const a of d.window.document.querySelectorAll('[data-game-guides] a'))assert.ok(readFileSync('.'+a.getAttribute('href')+'index.html','utf8').length>0);
 d.window.close();
}
console.log('PASS: consent-gated starts, duplicate starts, repeated Anytime vs Daily, double submit, deadline, instant result before save, inline syntax and guide links.');
