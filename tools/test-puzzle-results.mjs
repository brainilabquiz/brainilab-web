import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const tick=()=>new Promise(r=>setTimeout(r,0));
function setup(game){
 const dom=new JSDOM(readFileSync(`games/${game}/index.html`,'utf8'),{url:`https://brainilabgames.com/games/${game}/?archive=2026-09-07`,runScripts:'outside-only'}),w=dom.window;
 let saves=0,resolveSave,rejectSave;
 w.BrainiData={dailyNumberForDate:()=>10,api:{submitGameResult:(_id,payload)=>{saves++;return new Promise((resolve,reject)=>{resolveSave=()=>resolve({...payload,clientResultId:'qa',cloudSyncStatus:'local_only'});rejectSave=reject;});}}};
 w.BrainiShare={open:()=>{}};w.BrainiContinuity={rewardMarkup:()=>'<p>Practice: no XP or streak change.</p>'};
 w.eval(readFileSync('assets/js/post-game.js','utf8'));w.eval(readFileSync('assets/js/puzzle-results.js','utf8'));
 return {w,dom,saves:()=>saves,resolve:()=>resolveSave(),reject:()=>rejectSave(new Error('offline'))};
}
// A network failure must not use an attempt; duplicate Next must never submit twice.
let t=setup('connections'),w=t.w,fail=true;
w.BrainiBackendAuth={isConfigured:()=>true,getSession:async()=>null,getClient:()=>({rpc:async name=>{
 if(name==='get_brainilab_daily_connections')return {data:{puzzles:Array.from({length:3},(_,i)=>({puzzle_id:'c'+i,clues:['Tea','Coffee','Cocoa','Cider'],choices:[{id:'yes',text:'Drinks'},{id:'no',text:'Planets'}]}))}};
 if(name==='check_brainilab_connections_guess'){if(fail){fail=false;return {error:new Error('offline')}}return {data:{correct:true,answer:'Drinks',explanation:'All four are drinks.'}};}
}})};
w.eval(readFileSync('assets/js/connections.js','utf8'));await w.BrainiConnections.mount(w.document.querySelector('#connectionsGame'));
w.document.querySelector('[data-connections-start]').click();await tick();
w.document.querySelector('[data-choice-id="yes"]').click();await tick();
assert.match(w.document.querySelector('[data-connections-feedback]').textContent,/Could not check/);
assert.match(w.document.querySelector('[data-connections-attempts]').textContent,/Attempt 1/);
for(let i=0;i<3;i++){
 w.document.querySelector('[data-choice-id="yes"]').click();await tick();
 assert.match(w.document.querySelector('[data-connections-attempts]').textContent,/Solved in 1 attempt/);
 w.document.querySelector('[data-connections-next]').click();
}
w.document.querySelector('[data-connections-next]').click();await tick();
assert.equal(t.saves(),1);assert.equal(w.document.querySelector('[data-connections-game]').hidden,true);
assert.ok(w.document.querySelector('.post-game'));assert.equal(w.document.querySelector('.post-metrics dd').textContent,'3');
assert.equal(w.document.querySelector('.puzzle-round-review').open,false);
assert.equal(w.document.querySelectorAll('.puzzle-round-review article').length,3);
assert.equal(w.document.activeElement,w.document.querySelector('.post-score'));
t.resolve();await tick();assert.match(w.document.querySelector('[data-result-reward]').textContent,/Practice/);w.close();
// Number Route exposes the last operation again after a checker error, without losing the route.
t=setup('number-route');w=t.w;fail=true;
w.BrainiBackendAuth={isConfigured:()=>true,getSession:async()=>null,getClient:()=>({rpc:async name=>{
 if(name==='get_brainilab_daily_number_route')return {data:{puzzles:Array.from({length:3},(_,i)=>({puzzle_id:'n'+i,numbers:[7,3,6,4],target:28}))}};
 if(name==='check_brainilab_number_route_answer'){if(fail){fail=false;return {error:new Error('offline')}}return {data:{correct:true}};}
}})};
w.eval(readFileSync('assets/js/number-route.js','utf8'));await w.BrainiNumberRoute.mount(w.document.querySelector('#numberRouteGame'));
w.document.querySelector('[data-start]').click();await tick();
const op=s=>[...w.document.querySelectorAll('.number-route-op')].find(b=>b.textContent===s).click();
op('−');op('×');op('+');await tick();
assert.equal(w.document.querySelector('[data-current]').textContent,'24');
assert.match(w.document.querySelector('[data-feedback]').textContent,/last operation/);
op('+');await tick();w.document.querySelector('[data-next]').click();
for(let i=0;i<2;i++){op('−');op('×');op('+');await tick();w.document.querySelector('[data-next]').click();}
w.document.querySelector('[data-next]').click();await tick();
assert.equal(t.saves(),1);assert.ok(w.document.querySelector('.post-game'));
assert.match(w.document.querySelector('.post-score').textContent,/3.*3/);
t.reject();await tick();assert.match(w.document.querySelector('[data-result-reward]').textContent,/could not be saved/);
assert.ok(w.document.querySelector('.post-primary'));w.close();
console.log('PASS: checker failures do not penalize attempts, retry restores route, instant results, duplicate finish, focus, collapsed review, save success/failure.');
