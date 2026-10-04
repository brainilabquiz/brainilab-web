import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const tick=()=>new Promise(r=>setTimeout(r,0));
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
function setup(){
 const w=new JSDOM('<main></main>',{url:'https://brainilabgames.com/',runScripts:'outside-only'}).window;
 let owner='me';const requests=[],applied=[];w.console.warn=()=>{};
 w.BrainiData={getState:()=>({auth:{status:'authenticated',user:{id:owner}}}),player:()=>({}),recentResults:()=>[],api:{syncCloudProgression:async s=>{applied.push(s);}}};
 w.BrainiBackendAuth={isConfigured:()=>true,getSession:async()=>({user:{id:owner}}),getClient:()=>({rpc:name=>{assert.equal(name,'get_my_brainilab_progression');const q=deferred();requests.push(q);return q.promise;}})};
 w.BrainiIcons={product:()=>''};
 for(const file of ['supabase-progression','progression-ui','continuity','post-game'])w.eval(readFileSync(`assets/js/${file}.js`,'utf8'));
 const emit=type=>w.dispatchEvent(new w.CustomEvent('brainilab:datachange',{detail:{type}}));
 const change=id=>{owner=id;w.dispatchEvent(new w.Event('brainilab:authchange'));};
 return {w,requests,applied,emit,change};
}
const summary=(xp=100,user='me')=>({progression:{user_id:user,xp,level:2,current_streak:4},today:{daily_brain_score:600},recent_rewards:[{client_result_id:'round',verified:true,xp:80}]});
// Coalesce callers, but a verification arriving during an old read requires a fresh read.
{
 const {w,requests,applied,emit}=setup(),p=w.BrainiProgression;
 const result={gameId:'oddoneout',clientResultId:'round',cloudSyncStatus:'synced',correct:6,total:10,score:600};
 w.BrainiPostGame.mount(w.document.querySelector('main'),{gameId:'oddoneout',result});
 assert.match(w.document.body.textContent,/awaiting verification/);
 const first=p.sync();assert.equal(p.sync(),first);await tick();assert.equal(requests.length,1);
 for(const type of ['answer_verification','daily_answer_verification','daily_game_verification'])emit(type);
 requests[0].resolve({data:summary(20)});await tick();assert.equal(applied.length,0,'Discard pre-verification summary');assert.equal(requests.length,2);
 requests[1].resolve({data:summary(180)});await first;
 assert.equal(applied.length,1);assert.equal(p.getCached().progression.xp,180);assert.equal(p.getCached().progression.current_streak,4);assert.equal(p.getCached().today.daily_brain_score,600);
 assert.match(w.document.body.textContent,/\+80 XP/);assert.doesNotMatch(w.document.body.textContent,/awaiting verification/);assert.equal(p.isSyncing(),false);
 emit('profile');emit('progression');await tick();assert.equal(requests.length,2,'No sync loop');w.close();
}
// Each canonical verifier event works even when there is no request already running.
for(const type of ['answer_verification','daily_answer_verification','daily_game_verification']){
 const {w,requests,emit}=setup();emit(type);await tick();assert.equal(requests.length,1);requests[0].resolve({data:summary()});await tick();assert.equal(w.BrainiProgression.getCached().progression.xp,100);w.close();
}
// Failure exposes a retry that only reads progress, and success replaces the pending state.
{
 const {w,requests}=setup(),p=w.BrainiProgression;
 w.BrainiPostGame.mount(w.document.querySelector('main'),{gameId:'oddoneout',result:{clientResultId:'round',correct:6,total:10,score:600}});
 const work=p.sync();await tick();requests[0].resolve({error:Error('offline')});await work;
 assert.match(w.document.body.textContent,/temporarily unavailable/);
 const retry=w.document.querySelector('[data-refresh-progress]');assert.ok(retry);retry.focus();retry.click();retry.click();await tick();assert.equal(requests.length,2);
 requests[1].resolve({data:summary(180)});await tick();await tick();assert.match(w.document.body.textContent,/\+80 XP/);assert.equal(w.document.querySelector('[data-refresh-progress]'),null);assert.equal(w.document.activeElement,w.document.querySelector('.post-reward'));assert.equal(p.getLastError(),null);w.close();
}
// An obsolete failed read must not swallow a queued post-verification refresh.
{
 const {w,requests,emit}=setup(),work=w.BrainiProgression.sync();await tick();emit('answer_verification');requests[0].reject(Error('offline'));await tick();assert.equal(requests.length,2);requests[1].resolve({data:summary()});await work;assert.equal(w.BrainiProgression.getCached().progression.xp,100);w.close();
}
// A stalled or late response cannot hold the queue or overwrite newer data.
{
 const {w,requests,applied}=setup();let expire;
 const original=w.setTimeout.bind(w);w.setTimeout=(fn,ms)=>ms===12000?(expire=fn,1):original(fn,ms);w.clearTimeout=()=>{};
 const work=w.BrainiProgression.sync();await tick();expire();await work;assert.equal(w.BrainiProgression.isSyncing(),false);assert.ok(w.BrainiProgression.getLastError());
 const next=w.BrainiProgression.sync();await tick();requests[1].resolve({data:summary(200)});await next;requests[0].resolve({data:summary(20)});await tick();assert.equal(applied.length,1);assert.equal(w.BrainiProgression.getCached().progression.xp,200);w.close();
}
// Account switches invalidate both the cached reward and any in-flight result.
{
 const {w,requests,applied,change}=setup(),p=w.BrainiProgression;
 const first=p.sync();await tick();change('other');assert.equal(p.getCached(),null);const second=p.sync();await tick();requests[1].resolve({data:summary(50,'other')});await second;requests[0].resolve({data:summary(999)});await first;assert.equal(applied.length,1);assert.equal(p.getCached().progression.user_id,'other');assert.equal(p.getCached().progression.xp,50);w.close();
}
{
 const {w,requests,applied}=setup(),work=w.BrainiProgression.sync();await tick();requests[0].resolve({data:summary(999,'wrong-account')});await work;assert.equal(applied.length,0);assert.equal(w.BrainiProgression.getCached(),null);w.close();
}
{
 const {w,requests}=setup();w.dispatchEvent(new w.Event('online'));await tick();assert.equal(requests.length,1);requests[0].resolve({data:summary()});await tick();w.close();
}
console.log('PASS progression sync: verification events, coalesced/fresh reads, canonical XP/score/streak, timeout, retry, offline recovery and account isolation.');
