import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const files=['avatar-design.js','profile-rewards-model.js','profile-rewards-store.js','avatar-studio-ui.js','profile-rewards.js'];
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
function setup({signed=false,xp=2700,metadata={},storage=true}={}){
  const dom=new JSDOM('<body class="profile-page"><div class="nav-right"><a class="avatar"></a></div><div data-profile-rank-hero><span class="rank-avatar"></span><div class="profile-rank-main"><h2>Level 12</h2></div></div><section data-profile-rewards></section></body>',{url:'https://brainilabgames.com/profile/',runScripts:'outside-only'});
  const w=dom.window;
  let auth=signed?{status:'authenticated',user:{id:'owner-a'}}:{status:'guest',anonymousPlayerId:'local-guest'};
  let player={displayName:'Curious Player',xp,level:12,score:1234};
  let meta={...metadata},readError=false,writeError=false,holdRead=null,writes=[];
  w.BrainiData={authState:()=>auth,player:()=>structuredClone(player)};
  w.BrainiProgressUI={avatarClass:()=> 'rank-highschool',avatarImageMarkup:()=>'<img src="/assets/avatars/knowledge/einstein.svg" alt="">'};
  w.BrainiBackendAuth={getClient:()=>({auth:{
    getUser:async()=>{
      if(holdRead)await holdRead;
      return {data:{user:{id:auth.user?.id,user_metadata:{...meta}}},error:readError?Error('offline'):null};
    },
    updateUser:async payload=>{
      writes.push(structuredClone(payload));
      if(writeError)return {data:null,error:Error('offline')};
      meta={...meta,...payload.data};
      return {data:{user:{id:auth.user?.id,user_metadata:{...meta}}},error:null};
    }
  }})};
  if(!storage)Object.defineProperty(w,'localStorage',{get(){throw Error('storage blocked');}});
  for(const file of files)w.eval(readFileSync('assets/js/'+file,'utf8'));
  return {w,dom,writes,get meta(){return meta;},get player(){return player;},setMeta:value=>meta={...meta,...value},setXP:value=>player.xp=value,
    setReadError:value=>readError=value,setWriteError:value=>writeError=value,hold:value=>holdRead=value,
    switchAccount(id){auth={status:'authenticated',user:{id}};w.dispatchEvent(new w.CustomEvent('brainilab:authchange'));}};
}
const fixtures=[];const make=options=>{const fixture=setup(options);fixtures.push(fixture);return fixture;};
const guest=make();await tick();
const {w}=guest,C=w.BrainiRewardCatalog,S=w.BrainiRewardStore,root=w.document.querySelector('[data-profile-rewards]');
for(const list of [C.frames,C.titles])for(const item of list){
 const kind=list===C.frames?'frame':'title';
 if(item.xp>0)assert.notEqual(C.available({[kind]:item.id},item.xp-1)[kind],item.id);
 assert.equal(C.available({[kind]:item.id},item.xp)[kind],item.id);
}
assert.equal(C.next(2700).xp,2750);assert.equal(C.next(2700).id,'heart');assert.equal(C.next(10000),null);
assert.equal(C.xp(Infinity),0);assert.equal(C.xp(-100),0);assert.equal(C.xp('oops'),0);assert.equal(C.xp('100.7'),100);
assert.equal(C.clean({frame:'<script>',title:'admin'}).frame,'level');assert.equal(C.clean(null).title,'none');
assert.match(root.querySelector('[data-next-reward]').textContent,/Specs appeal.*50 XP to go/s);
assert.equal(root.querySelector('[data-reward-id=gold]').disabled,true);
assert.equal(root.querySelector('[data-reward-id=copper]').disabled,false);
const before=JSON.stringify(guest.player);
root.querySelector('[data-reward-id=copper]').click();root.querySelector('[data-reward-id=detective]').click();
assert.equal(root.querySelector('[data-style-preview-avatar]').dataset.profileFrame,'copper');
assert.equal(w.document.querySelector('[data-profile-rank-hero] .rank-avatar').dataset.profileFrame,undefined,'selection is preview only');
root.querySelector('[data-style-save]').click();await tick();
assert.equal(S.snapshot().style.frame,'copper');assert.equal(S.snapshot().style.title,'detective');
assert.equal(w.document.querySelector('[data-equipped-title]').textContent,'Puzzle Detective');
assert.equal(JSON.stringify(guest.player),before,'no XP, score or level mutation');assert.equal(guest.writes.length,0);
await S.load();assert.equal(S.snapshot().style.frame,'copper','guest selection survives reload');
assert.equal(await S.save({frame:'orbit',title:'sage'}),false,'a forged locked selection cannot be equipped');
assert.equal(S.snapshot().style.frame,'copper');assert.equal(JSON.stringify(guest.player),before);
await S.load();guest.setXP(3000);w.BrainiProfileRewards.render();
assert.equal(root.querySelector('[data-reward-id=gold]').disabled,false);assert.equal(S.snapshot().style.frame,'copper','new reward is not auto-equipped');
guest.setXP(10000);w.BrainiProfileRewards.render();assert.match(root.querySelector('[data-next-reward]').textContent,/Every reward is unlocked/);
root.querySelector('[data-reward-kind=title][data-reward-id=none]').click();root.querySelector('[data-style-cancel]').click();assert.equal(root.querySelector('[data-style-preview-title]').textContent,'Puzzle Detective');
const blocked=make({storage:false});await tick();assert.equal(await blocked.w.BrainiRewardStore.save({frame:'blue'}),false);assert.equal(blocked.w.BrainiRewardStore.snapshot().style.frame,'level');assert.match(blocked.w.BrainiRewardStore.snapshot().error,/could not be confirmed/);
const account=make({signed:true,metadata:{full_name:'Keep me',brainilab_avatar_frame_v1:'green',brainilab_profile_title_v1:'explorer'}});await tick();
assert.equal(account.w.BrainiRewardStore.snapshot().style.frame,'green');
account.setMeta({brainilab_profile_title_v1:'curious'});
assert.equal(await account.w.BrainiRewardStore.save({frame:'copper',title:'explorer'}),true);
assert.deepEqual(account.writes[0],{data:{brainilab_avatar_frame_v1:'copper'}},'write only the changed cosmetic field');
assert.equal(account.meta.full_name,'Keep me');assert.equal(account.w.BrainiRewardStore.snapshot().style.title,'curious','concurrent other-field edit survives');
account.setWriteError(true);assert.equal(await account.w.BrainiRewardStore.save({frame:'blue',title:'curious'}),false);
assert.equal(account.w.BrainiRewardStore.snapshot().style.frame,'copper','failed save keeps previous appearance');
account.setWriteError(false);await account.w.BrainiRewardStore.load();assert.equal(account.w.BrainiRewardStore.snapshot().error,'');
account.setReadError(true);await account.w.BrainiRewardStore.load();assert.match(account.w.BrainiRewardStore.snapshot().error,/could not be checked/);
const count=account.writes.length;assert.equal(await account.w.BrainiRewardStore.save({frame:'blue'}),false);assert.equal(account.writes.length,count);
account.setReadError(false);await account.w.BrainiRewardStore.load();
account.setMeta({brainilab_avatar_frame_v1:'orbit',brainilab_profile_title_v1:'sage'});await account.w.BrainiRewardStore.load();
assert.equal(account.w.BrainiRewardStore.snapshot().style.frame,'level','metadata never overrides the XP threshold');
let release;account.hold(new Promise(resolve=>release=resolve));
const pending=account.w.BrainiRewardStore.save({frame:'blue',title:'none'});account.switchAccount('owner-b');release();await pending;await tick();
assert.equal(account.writes.length,count,'account switch while reading prevents the write');
const fakeName=make({xp:0});await tick();fakeName.player.displayName='<img src=x onerror=alert(1)>';fakeName.w.BrainiProfileRewards.render();
assert.equal(fakeName.w.document.querySelector('[data-style-preview-name] img'),null);
const timeout=make({signed:true});await tick();
const originalTimer=timeout.w.setTimeout.bind(timeout.w);timeout.w.setTimeout=(callback,ms)=>originalTimer(callback,ms===12000?1:ms);
timeout.hold(new Promise(()=>{}));await timeout.w.BrainiRewardStore.load();
assert.equal(timeout.w.BrainiRewardStore.snapshot().loading,false);assert.match(timeout.w.BrainiRewardStore.snapshot().error,/could not be checked/);
for(const item of fixtures)item.dom.window.close();
console.log('PASS reward thresholds, retroactive XP, next/all rewards, preview/save/cancel, guest reload/storage failure, owner isolation, concurrent metadata fields, offline retry, locked metadata and unchanged scores/XP/levels.');
