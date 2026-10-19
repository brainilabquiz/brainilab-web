import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {halloweenBody} from '../lib/halloween-render.js';
const {JSDOM,VirtualConsole}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const source=name=>readFileSync('assets/js/'+name+'.js','utf8'),tick=()=>new Promise(r=>setTimeout(r,0));
const items=[['hat','pumpkin-thinker','Complete one Halloween game'],['frame','midnight','Complete both Halloween games'],['prop','little-bat','Play on three different days']];
async function profile({earned=[],reward='',delayed=false,xp=0}={}){
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM('<main><section data-profile-section="progress"><section data-profile-rewards></section></section><section data-profile-section="stats"></section></main>',{url:'https://brainilabgames.com/profile/?section=progress'+(reward?'&reward='+encodeURIComponent(reward):''),runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc}),w=dom.window;
 let metadata={},writes=[],release;const pending=delayed?new Promise(r=>release=r):Promise.resolve();
 const player={displayName:'Sample player',level:1,xp,score:1234,currentStreak:4};
 w.BrainiData={authState:()=>({status:'authenticated',user:{id:'fixture-owner'}}),player:()=>structuredClone(player),api:{setAvatarDesign:()=>{}}};
 w.BrainiLabHalloween={availability:()=>({allowed:true})};
 w.BrainiHalloweenEntitlements={snapshot:()=>({visible:true,entitlements:earned}),load:async()=>pending};
 w.HTMLElement.prototype.scrollIntoView=function(){this.dataset.scrolled='true';};
 w.BrainiBackendAuth={getClient:()=>({
  from:()=>({select:()=>({eq:async()=>({data:[],error:null})})}),rpc:async()=>({data:{owner:'fixture-owner',games:[],activeDays:0},error:null}),
  auth:{getUser:async()=>({data:{user:{id:'fixture-owner',user_metadata:metadata}},error:null}),updateUser:async({data})=>{writes.push(structuredClone(data));metadata={...metadata,...data};return {data:{user:{id:'fixture-owner',user_metadata:metadata}},error:null};}}
 })};
 for(const name of ['player-personalities','avatar-design','profile-rewards-model','profile-rewards-store','progression-ui','reward-journey','avatar-wardrobe-ui','avatar-studio-ui','profile-rewards','profile-sections'])w.eval(source(name));
 await tick();await tick();
 return {dom,w,root:w.document.querySelector('[data-profile-rewards]'),writes,player,errors,release:async()=>{release();await tick();await tick();},close:()=>dom.window.close()};
}
let checks=0;
for(const earned of [[],['pumpkin-thinker'],['pumpkin-thinker','midnight'],items.map(i=>i[1])]){
 const f=await profile({earned});const {w,root}=f,C=w.BrainiRewardCatalog;
 for(const [kind,id,requirement]of items){
  const b=root.querySelector(`[data-reward-kind="${kind}"][data-reward-id="${id}"]`);assert.ok(b,'All three seasonal choices remain in the active catalogue');
  assert.equal(b.disabled,!earned.includes(id));
  const ordinary=C.groups[kind].filter(i=>!i.course&&!i.challenge&&!i.days&&!i.event&&i.xp===0).length;
  const total=C.groups[kind].filter(i=>!i.course&&!i.challenge&&!i.days).length;
  assert.equal(root.querySelector(`[data-style-collection="${kind}"]`).textContent,`${ordinary+Number(earned.includes(id))} of ${total} unlocked`);
  if(!earned.includes(id)){assert.ok(b.textContent.includes(requirement));assert.ok(b.getAttribute('aria-label').includes(requirement));assert.doesNotMatch(b.textContent+b.getAttribute('aria-label'),/0 XP/);}
  const resolved=w.BrainiRewardJourney.fromLink(kind+':'+id);assert.equal(resolved.id,id);assert.equal(resolved.event,'halloween-2026');
 }
 assert.equal(w.BrainiRewardJourney.crossed(0,1).some(x=>x.event),false,'Seasonal rewards never become XP milestones');
 assert.equal(f.writes.length,0);assert.equal(f.player.xp,0);assert.equal(f.player.score,1234);assert.deepEqual(f.errors,[]);checks++;f.close();
}
for(const [kind,id,requirement] of items){
 const f=await profile({reward:kind+':'+id,earned:[id],delayed:true});
 assert.equal(f.root.querySelector('[data-style-save]').disabled,true);assert.equal(f.writes.length,0);
 await f.release();
 const button=f.root.querySelector(`[data-reward-kind="${kind}"][data-reward-id="${id}"]`);
 assert.equal(f.w.BrainiAvatarStudioUI.activePane(),kind==='frame'?'rewards':'extras');
 assert.equal(f.w.document.activeElement,button,'A reward link waits for ownership and then focuses its actual choice');
 assert.match(f.root.querySelector('#linked-reward-note').textContent,/Ready to try on/);
 assert.equal(button.getAttribute('aria-pressed'),'false');assert.equal(f.writes.length,0,'Opening a link never equips or writes preferences');
 button.click();assert.equal(button.getAttribute('aria-pressed'),'true');assert.equal(f.writes.length,0,'Trying is still an unsaved preview');
 f.root.querySelector('[data-style-save]').click();await tick();await tick();
 assert.equal(f.writes.length,1);assert.equal(f.writes[0]['brainilab_avatar_'+kind+'_v1'],id);
 const focus=f.w.document.activeElement;f.w.dispatchEvent(new f.w.Event('brainilab:stylechange'));assert.equal(f.w.document.activeElement,focus,'A later refresh never steals focus');
 assert.equal(f.player.score,1234);assert.equal(f.player.xp,0);assert.deepEqual(f.errors,[]);checks++;f.close();
 const locked=await profile({reward:kind+':'+id,xp:999999});
 const b=locked.root.querySelector(`[data-reward-kind="${kind}"][data-reward-id="${id}"]`);assert.equal(b.disabled,true);
 assert.equal(locked.root.querySelector('#linked-reward-note').textContent,requirement+'.');b.click();assert.equal(locked.writes.length,0,'Neither a URL nor abundant XP grants Halloween ownership');assert.equal(locked.root.querySelector('[data-style-save]').disabled,true);checks++;locked.close();
}
const invalid=await profile({reward:'hat:pumpkin-thinker"><script>alert(1)</script>'});assert.equal(invalid.root.querySelector('.is-reward-target'),null);assert.equal(invalid.w.BrainiRewardJourney.fromLink('frame:admin'),null);assert.equal(invalid.writes.length,0);checks++;invalid.close();
for(const owned of [[],items.map(x=>x[1])]){
 const dom=new JSDOM(halloweenBody(),{url:'https://brainilabgames.com/halloween/',runScripts:'outside-only'}),w=dom.window;
 let state={cloud:true,entitlements:owned,progress:{games_completed:3,distinct_games:2,days_played:3}};
 w.BrainiLabHalloween={snapshot:()=>state,availability:()=>({allowed:true})};w.eval(source('halloween-hub'));await tick();
 assert.equal(w.document.querySelectorAll('[data-halloween-try]:not([hidden])').length,owned.length);
 for(const [kind,id]of items){const a=w.document.querySelector(`[data-halloween-reward="${id}"] [data-halloween-try]`);if(!owned.includes(id))assert.equal(a,null);else{const url=new URL(a.href);assert.equal(url.origin,'https://brainilabgames.com');assert.equal(url.searchParams.get('reward'),kind+':'+id);assert.equal(url.hash,'#my-avatar');}}
 state={loading:true,entitlements:owned};w.dispatchEvent(new w.Event('brainilab:halloween-entitlements'));assert.equal(w.document.querySelectorAll('[data-halloween-try]:not([hidden])').length,0,'Unverified choices never present an equip invitation');
 state={cloud:true,entitlements:[],progress:{}};w.dispatchEvent(new w.Event('brainilab:authchange'));assert.equal(w.document.querySelectorAll('[data-halloween-try]:not([hidden])').length,0,'Another owner never inherits a reward action');checks++;dom.window.close();
}
console.log(`PASS Halloween cosmetics: ${checks} ownership/count/requirement/deep-link/hydration/preview/save/focus/hub/invalid-URL cases; no automatic grants or score/XP changes.`);
