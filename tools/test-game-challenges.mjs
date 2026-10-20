import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const source=n=>readFileSync('assets/js/'+n+'.js','utf8');
const day=new Date().toISOString().slice(0,10),previous=new Date(Date.now()-86400000).toISOString().slice(0,10);
const tick=()=>new Promise(r=>setTimeout(r,0));
function fixture(url='https://brainilabgames.com/games/sequence/',html='<main><div class="labgame-shell"></div><div id="result"></div></main>'){
 const dom=new JSDOM(html,{url,runScripts:'outside-only'}),w=dom.window;w.HTMLElement.prototype.scrollIntoView=()=>{};
 let user='one';w.BrainiData={authState:()=>({status:'authenticated',user:{id:user}}),dateForDailyNumber:n=>n===53?day:previous};
 w.BrainiReplay={packId:()=> '11111111-1111-4111-8111-111111111111',publish:async()=> '11111111-1111-4111-8111-111111111111',storageSuffix:()=>'',run:(_g,base)=>base()};
 for(const n of ['game-challenge-model','game-challenge','post-game'])w.eval(source(n));
 return {dom,w,M:w.BrainiGameChallengeModel,root:w.document.querySelector('#result'),user:v=>{user=v;w.dispatchEvent(new w.Event('brainilab:authchange'));}};
}
let scenarios=0;
const f=fixture(),{M}=f;
for(const [id,g] of Object.entries(M.games)){
 for(const daily of [false,true]){
  if(g.quiz&&daily||g.daily&&!daily||['survival','reasoning'].includes(id)&&daily)continue;
  const n=daily&&['connections','numberroute'].includes(id)?3:g.n||15;
  const result={score:Math.min(750,g.max),total:n,challengeDate:daily?day:null,contentSource:'local',roundDetails:[{puzzleId:'one'}],difficulty:'medium',challengeVersion:'one'};
  const own=M.describe(id,result),link=M.url(own);assert.ok(link,id+' creates link');
  assert.ok(link.includes('?try=1'));assert.equal(new URL(link).pathname,g.path);
  const parsed=M.parse(new URL(link).hash);assert.equal(parsed.g,id);assert.equal(parsed.s,result.score);
  assert.equal(parsed.d,daily?day:null);assert.equal(parsed.n,n);
  if(g.quiz)assert.equal(new URL(link).searchParams.get('difficulty'),'medium');
  assert.equal(M.compare(own,parsed).kind,'tie');
  assert.equal(M.compare({...own,s:own.s+1},parsed)?.kind,own.s<g.max?'win':undefined);
  const text=M.invitation(own,parsed).text;assert.match(text,/Fancy a rematch/);assert.ok(text.endsWith(link));
  assert.ok(!/puzzleId|contentSource|email|SECRET/.test(JSON.stringify(parsed)));
  const incoming=fixture(link);assert.equal(incoming.M.incoming().s,result.score);incoming.dom.window.close();scenarios++;
  const page=fixture(link,readFileSync(g.path.slice(1)+'index.html','utf8'));page.w.document.dispatchEvent(new page.w.Event('DOMContentLoaded'));assert.equal(page.w.document.querySelectorAll('[data-game-friend-entry]').length,1,id+' actual entry banner');assert.equal(page.w.document.querySelector('[data-game-friend-entry]').hidden,false);assert.ok(page.w.document.querySelector('link[href*="post-game.css"]'),id+' shared challenge styles');page.dom.window.close();
 }
}
const target=M.describe('sequence',{score:1000,total:10}),link=M.url(target);
for(const score of [0,250,1000,1500,2500]){
 const own=M.describe('sequence',{score,total:10});assert.equal(M.compare(own,target).kind,score<1000?'loss':score===1000?'tie':'win');
 const invite=M.invitation(own,target);assert.equal(M.parse(new URL(invite.url).hash).s,score,'reply carries own score');
}
for(const bad of ['#friend=x','#friend='+btoa('{"v":1}'),'#friend='+btoa('<script>'),link.split('#')[1]+'junk'])assert.equal(M.parse(bad),null);
for(const change of [{s:-1},{s:1.5},{s:2501},{g:'maphunt'},{n:3},{d:'2026-02-31'},{d:'9999-99-99'},{l:'<img>'},{k:'<svg>'},{v:3}])assert.equal(M.parse('#friend='+btoa(JSON.stringify({...target,...change}))),null);
assert.equal(M.describe('sequence',{score:100,total:9}),null);
assert.equal(M.compare({...target,d:previous},target),null);
assert.equal(M.compare({...target,p:'22222222-2222-4222-8222-222222222222'},target),null);
const order={score:1250,total:20,challengeDate:day,contentSource:'supabase',orderUpRounds:[{round_id:'round-a'},{round_id:'round-b'}]};
assert.equal(M.describe('orderup',order).k,M.describe('orderup',{...order,answerDetails:[]}).k,'canonical empty quiz details do not mask the Order Up set');
assert.notEqual(M.describe('orderup',order).k,M.describe('orderup',{...order,orderUpRounds:[{round_id:'other'}]}).k,'changed dated sets never declare a winner');
assert.equal(M.invitation({...target,s:2500}).text.includes('Can you match that?'),true);
assert.match(M.invitation({...target,s:0}).text,/Fancy giving it a go/);
const wrongRoute=fixture(link.replace('/games/sequence/','/games/odd-one-out/'));assert.equal(wrongRoute.M.incoming(),null);wrongRoute.dom.window.close();
const scoredLink=fixture(link.replace('try=1','try=0'));assert.equal(scoredLink.M.incoming(),null);scoredLink.dom.window.close();
f.dom.window.close();

const u=fixture(link),{w,root}=u;let copied='',sends=0;
Object.defineProperty(w.navigator,'clipboard',{configurable:true,value:{writeText:async text=>{copied=text;}}});
w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
assert.match(w.document.querySelector('[data-game-friend-entry]').textContent,/1,000 points/);
const options={gameId:'sequence',name:'Sequence',result:{score:1500,correct:6,total:10,practice:true}};
w.BrainiPostGame.mount(root,options);
assert.match(root.querySelector('.game-friend-comparison').textContent,/You beat your friend/);
assert.match(root.querySelector('.post-primary').textContent,/Send a rematch/);
assert.equal(root.querySelector('[data-challenge-composer]').hidden,true);
assert.equal(w.document.querySelector('[data-game-friend-entry]').hidden,true);
root.querySelector('.post-primary').click();assert.equal(root.querySelector('[data-challenge-composer]').hidden,false);
const field=root.querySelector('textarea');assert.equal(w.document.activeElement,field);
field.value='Hey Sam! Your turn 😄\n'+root.querySelector('textarea').value.split('\n').at(-1);field.dispatchEvent(new w.Event('input'));
const wa=root.querySelector('[data-challenge-whatsapp]');assert.equal(new URL(wa.href).searchParams.get('text'),field.value);
root.querySelector('[data-challenge-copy]').click();await tick();assert.equal(copied,field.value);
assert.match(root.querySelector('[data-challenge-status]').textContent,/Copied/);
root.querySelector('[data-challenge-close]').click();assert.equal(w.document.activeElement,root.querySelector('.post-primary'));
root.querySelector('.post-primary').click();assert.equal(field.value,copied,'draft retained');
field.value=' ';field.dispatchEvent(new w.Event('input'));assert.equal(root.querySelector('[data-challenge-copy]').disabled,true);assert.equal(wa.hasAttribute('href'),false);
field.value='<script>alert("x")</script> & hi';field.dispatchEvent(new w.Event('input'));assert.equal(root.querySelectorAll('script,img').length,0);
Object.defineProperty(w.navigator,'share',{configurable:true,value:async()=>{sends++;throw Object.assign(Error('Cancel'),{name:'AbortError'});}});
w.BrainiPostGame.refresh();root.querySelector('[data-challenge-native]').click();await tick();assert.equal(sends,1);assert.equal(root.querySelector('[data-challenge-status]').textContent,'');
Object.defineProperty(w.navigator,'share',{configurable:true,value:async()=>{throw Error('Failed');}});root.querySelector('[data-challenge-native]').click();await tick();assert.match(root.querySelector('[data-challenge-status]').textContent,/Try Copy/);
Object.defineProperty(w.navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('Denied');}}});root.querySelector('[data-challenge-copy]').click();await tick();assert.equal(field.selectionStart,0);assert.equal(field.selectionEnd,field.value.length);
// Same-document targets update comparison, not a save or replay.
w.history.replaceState(null,'',w.location.pathname+w.location.search+'#friend='+btoa(JSON.stringify({...target,s:2000})).replace(/=+$/,''));w.dispatchEvent(new w.Event('hashchange'));
assert.match(root.querySelector('.game-friend-comparison').textContent,/Your friend wins/);
w.history.replaceState(null,'',w.location.pathname+w.location.search+'#main');w.dispatchEvent(new w.Event('hashchange'));w.BrainiPostGame.refresh();assert.match(root.querySelector('.game-friend-comparison').textContent,/Your friend wins/,'skip link retains invitation');
u.user('two');assert.equal(root.querySelector('.post-primary').disabled,true);root.querySelector('.post-primary').click();assert.equal(root.querySelector('[data-challenge-copy]').disabled,true);
u.dom.window.close();

// Pending/failed saves do not enable sharing, including a changed target mid-flight.
const held=fixture(link);let resolveSave;
const promise=held.w.BrainiPostGame.complete(held.root,{...options,result:{...options.result}},{save:()=>new Promise(r=>resolveSave=r)});
assert.equal(held.root.querySelector('.post-primary').disabled,true);
resolveSave({...options.result,clientResultId:'local-result'});await promise;assert.equal(held.root.querySelector('.post-primary').disabled,false);
assert.equal(held.root.querySelectorAll('.game-friend-comparison').length,1);
held.dom.window.close();
const failed=fixture(link);await failed.w.BrainiPostGame.complete(failed.root,{...options,result:{...options.result}},{save:async()=>{throw Error('Offline');}});assert.equal(failed.root.querySelector('.post-primary').disabled,true);failed.dom.window.close();
const guest=fixture(link);let guestId='guest-one';guest.w.BrainiData.authState=()=>({status:'guest',guestUserId:guestId});guest.w.BrainiPostGame.mount(guest.root,options);guestId='guest-two';guest.w.dispatchEvent(new guest.w.Event('brainilab:authchange'));assert.equal(guest.root.querySelector('.post-primary').disabled,true,'different guest identities cannot share each other’s results');guest.dom.window.close();
// Exercise the actual data boundary, rather than trusting a mocked practice response.
const safety=new JSDOM('',{url:'https://brainilabgames.com/games/sequence/?try=1',runScripts:'outside-only'}).window;
for(const n of ['daily-rules','data','game-challenge-model'])safety.eval(source(n));
const before=JSON.stringify(safety.BrainiData.getState());let cloudWrites=0;
safety.BrainiCloudGames={saveCompletedResult:async()=>{cloudWrites++;throw Error('Unexpected write');}};
for(const id of Object.keys(safety.BrainiGameChallengeModel.games).filter(g=>g!=='reasoning')){
 const result=await safety.BrainiData.api.submitGameResult(id,{score:1000,correct:1,total:10,practice:false,tryFirst:false,clientResultId:'must-not-persist',dailyNumber:safety.BrainiData.daily().number});
 assert.equal(result.practice,true);assert.equal(result.tryFirst,true);assert.equal(result.clientResultId,null);assert.equal(result.cloudSyncStatus,'disabled');
}
assert.equal(cloudWrites,0);assert.equal(JSON.stringify(safety.BrainiData.getState()),before,'friend practice changes no results, XP, streaks or Daily state');safety.close();
console.log(`PASS: ${scenarios} game/mode links; limits, reply scores, invalid dates/routes, source mismatch, personal edits, copy/WhatsApp/native/cancel/failure, no injection, draft/focus, account isolation and pending/failed saves.`);
