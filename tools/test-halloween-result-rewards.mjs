import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const source=file=>readFileSync('assets/js/'+file,'utf8');
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
const plain=value=>JSON.parse(JSON.stringify(value));
let checked=0;
async function setup(game='trick-or-think',options={}){
 const dom=new JSDOM(`<section data-halloween-game="${game}"></section>`,{url:'http://localhost/halloween/'+game+'/',runScripts:'outside-only'}),w=dom.window;
 const calls={owner:'guest:result-test',saved:[],owned:options.before||[],loading:!!options.loading,error:'',release:null};
 w.fetch=()=>{throw Error('Unexpected network');};
 w.BrainiData={api:{submitGameResult(){throw Error('Daily must not be called');}}};
 if(options.scrollFails)w.HTMLElement.prototype.scrollIntoView=()=>{throw TypeError('Unsupported scroll option');};
 w.eval(source('halloween-game-model.js'));w.eval(source('avatar-design.js'));
 const model=w.BrainiHalloweenGameModel,preview=options.preview!==false;
 const response=payload=>{
  calls.owned=options.after||['pumpkin-thinker'];
  return {saved:true,state:{entitlements:calls.owned},unlocks:options.unlocks||['pumpkin-thinker'],verifiedSummary:{...plain(model.summary(game,payload.submission)),...(options.mismatch?{score:17}:{})},...(options.replayed?{replayed:true,result:{score:40}}:{})};
 };
 w.BrainiLabHalloween={
  identityKey:()=>calls.owner,
  availability:()=>({allowed:true,preview,day:'2026-10-19'}),
  snapshot:()=>({entitlements:[...calls.owned],loading:calls.loading,error:calls.error,cloud:!!options.cloud,status:options.unknown?'unavailable':'active'}),
  startGame:async()=>({session_id:'result-session',ownerKey:calls.owner,game,preview,guest:!options.cloud,day:'2026-10-19',pack:plain(model.publicPack(game)),completed:!!options.practice,result:options.practice?{score:40}:null}),
  completeGame:async payload=>{
   calls.saved.push(plain(payload));
   if(options.terminal)throw Object.assign(Error('Closed'),{code:options.terminal});
   if(options.fail&&calls.saved.length===1)throw Error('Offline');
   if(options.unconfirmed)return {saved:false};
   if(options.held)return new Promise(resolve=>{calls.release=()=>resolve(response(payload));});
   return response(payload);
  }
 };
 const key='brainilab_halloween_game_v1:'+(preview?'preview:':'live:')+encodeURIComponent(calls.owner)+':'+game;
 if(options.stored)w.localStorage.setItem(key,options.stored);
 w.eval(source('halloween-games.js'));await tick();
 return {dom,w,root:w.document.querySelector('section'),calls,model,key,game};
}
async function play(u,wrong=false){
 u.root.querySelector('[data-hg-start]').click();await tick();
 const pack=u.model.game(u.game);
 if(pack.questions){for(const q of pack.questions){u.root.querySelector(`[data-hg-answer="${wrong?q.options.find(o=>o.id!==q.answer).id:q.answer}"]`).click();u.root.querySelector('[data-hg-next]').click();}}
 else{
  const sets=wrong?[['w00','w01','w04','w08'],['w00','w02','w05','w09'],['w01','w03','w06','w10'],['w02','w03','w07','w11']]:pack.groups.map(g=>g.wordIds);
  for(const ids of sets){for(const id of ids)u.root.querySelector(`[data-hg-word="${id}"]`).click();u.root.querySelector('[data-hg-check]').click();}
 }
 await tick();
}
function receipt(u,ids,isNew){
 const box=u.root.querySelector('[data-hg-rewards]');assert.equal(box.hidden,false);
 assert.deepEqual([...box.querySelectorAll('[data-hg-treat]')].map(n=>n.dataset.hgTreat),ids);
 assert.equal(/You unlocked/.test(box.textContent),isNew);
 for(const item of box.querySelectorAll('[data-hg-treat]')){
  const id=item.dataset.hgTreat,a=item.querySelector('a'),url=new URL(a.href);
  const kind=id==='midnight'?'frame':id==='little-bat'?'prop':'hat';
  assert.equal(url.pathname,'/profile/');assert.equal(url.searchParams.get('section'),'progress');
  assert.equal(url.searchParams.get('reward'),kind+':'+id);assert.equal(url.hash,'#my-avatar');
  assert.match(a.getAttribute('aria-label'),/^Try on /);assert.equal(item.querySelectorAll('svg').length,1,'Use the existing actual cosmetic artwork');
 }
 assert.equal(u.root.querySelector('.halloween-result-options').open,false,'Secondary actions stay collapsed');
 assert.doesNotMatch(u.root.textContent,/Your Daily and XP stay/,'Do not repeat internal scoring mechanics');
 checked++;
}
const pending=await setup('trick-or-think',{held:true});await play(pending);
assert.equal(pending.root.querySelector('[data-hg-rewards]').hidden,true,'Never celebrate an unconfirmed save');
assert.equal(pending.root.querySelector('[data-hg-replay]').disabled,true);
pending.calls.release();await tick();receipt(pending,['pumpkin-thinker'],true);
assert.equal(pending.w.document.activeElement,pending.root.querySelector('[data-hg-heading]'),'Async prize update must not steal focus');
const stored=pending.w.localStorage.getItem(pending.key);pending.dom.window.close();
for(const game of ['trick-or-think','spooky-connections']){
 const u=await setup(game);await play(u,true);assert.equal(u.root.querySelector('.halloween-game-score strong').textContent,'0');receipt(u,['pumpkin-thinker'],true);assert.equal(u.calls.saved.length,1);u.dom.window.close();
}
const second=await setup('spooky-connections',{before:['pumpkin-thinker'],after:['pumpkin-thinker','midnight'],unlocks:['midnight']});await play(second);receipt(second,['midnight'],true);assert.equal(second.root.querySelectorAll('.halloween-result-answers .halloween-solved-group').length,4);second.dom.window.close();
const third=await setup('trick-or-think',{before:['pumpkin-thinker','midnight'],after:['pumpkin-thinker','midnight','little-bat'],unlocks:['little-bat']});await play(third);receipt(third,['little-bat'],true);third.dom.window.close();
const two=await setup('spooky-connections',{before:['pumpkin-thinker'],after:['pumpkin-thinker','midnight','little-bat'],unlocks:['midnight','little-bat','<script>bad</script>']});await play(two);receipt(two,['midnight','little-bat'],true);assert.equal(two.root.querySelectorAll('script').length,0);two.dom.window.close();
const retry=await setup('trick-or-think',{fail:true});await play(retry);assert.equal(retry.root.querySelector('[data-hg-rewards]').hidden,true);retry.root.querySelector('[data-hg-save]').click();retry.root.querySelector('[data-hg-save]').click();await tick();assert.equal(retry.calls.saved.length,2);assert.deepEqual(retry.calls.saved[0],retry.calls.saved[1]);receipt(retry,['pumpkin-thinker'],true);retry.dom.window.close();
for(const options of [{unconfirmed:true},{mismatch:true},{terminal:'HALLOWEEN_CLOSED'},{terminal:'HALLOWEEN_DAY_CHANGED'}]){
 const u=await setup('trick-or-think',options);await play(u);assert.equal(u.root.querySelector('[data-hg-rewards]').hidden,true,'Failed, mismatched or expired rounds cannot announce an award');assert.equal(u.calls.saved.length,1);checked++;u.dom.window.close();
}
const reload=await setup('trick-or-think',{stored,before:['pumpkin-thinker']});receipt(reload,['pumpkin-thinker'],false);assert.equal(reload.calls.saved.length,0);reload.dom.window.close();
const forged=JSON.parse(stored);forged.rewardIds=['little-bat','midnight','unknown'];
const stale=await setup('trick-or-think',{stored:JSON.stringify(forged),before:['pumpkin-thinker']});receipt(stale,['pumpkin-thinker'],false);assert.equal(stale.root.querySelector('[data-hg-treat="little-bat"]'),null);stale.dom.window.close();
const delayed=await setup('trick-or-think',{stored,before:['pumpkin-thinker'],loading:true});assert.equal(delayed.root.querySelector('[data-hg-rewards]').hidden,true);delayed.calls.loading=false;delayed.w.dispatchEvent(new delayed.w.Event('brainilab:halloween-entitlements'));receipt(delayed,['pumpkin-thinker'],false);const target=delayed.root.querySelector('[data-hg-treat] a');target.focus();delayed.w.dispatchEvent(new delayed.w.Event('brainilab:halloween-progress'));assert.equal(delayed.w.document.activeElement,target,'Repeat events preserve the focused link');delayed.calls.error='Unavailable';delayed.w.dispatchEvent(new delayed.w.Event('brainilab:halloween-progress'));assert.equal(delayed.root.querySelector('[data-hg-rewards]').hidden,true);delayed.dom.window.close();
const practice=await setup('trick-or-think',{practice:true,before:['pumpkin-thinker']});await play(practice);receipt(practice,['pumpkin-thinker'],false);assert.equal(practice.calls.saved.length,0);practice.dom.window.close();
const replay=await setup('trick-or-think',{before:['pumpkin-thinker'],replayed:true,after:['pumpkin-thinker']});await play(replay);receipt(replay,['pumpkin-thinker'],false);assert.match(replay.root.textContent,/saved result stays at 40/);replay.dom.window.close();
const duplicate=await setup('trick-or-think',{before:['pumpkin-thinker']});await play(duplicate);receipt(duplicate,['pumpkin-thinker'],false);duplicate.dom.window.close();
const unknown=await setup('trick-or-think',{cloud:true,unknown:true});await play(unknown);assert.equal(unknown.root.querySelector('[data-hg-rewards]').hidden,true);unknown.dom.window.close();
const badClaim=await setup('trick-or-think',{after:['pumpkin-thinker'],unlocks:['little-bat']});await play(badClaim);receipt(badClaim,['pumpkin-thinker'],false);badClaim.dom.window.close();
const scrollFallback=await setup('trick-or-think',{scrollFails:true});await play(scrollFallback);receipt(scrollFallback,['pumpkin-thinker'],true);assert.equal(scrollFallback.calls.saved.length,1,'A scroll failure must never prevent result saving');scrollFallback.dom.window.close();
const switched=await setup('trick-or-think',{stored,before:['pumpkin-thinker']});switched.calls.owner='account:another-person';switched.w.dispatchEvent(new switched.w.Event('brainilab:authchange'));assert.match(switched.root.textContent,/account has changed/);assert.equal(switched.root.querySelector('[data-hg-treat]'),null);assert.equal(switched.calls.saved.length,0);switched.dom.window.close();checked++;
console.log(`PASS Halloween result rewards: ${checked} scenarios; both games, zero-score completions, three existing artworks, two simultaneous treats, confirmation/retry, owner scoping, honest reload/practice, delayed state, exact profile links, focus stability and collapsed secondary actions. No external requests.`);
