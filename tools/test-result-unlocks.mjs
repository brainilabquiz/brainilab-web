import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const {JSDOM,VirtualConsole}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const source=name=>readFileSync('assets/js/'+name+'.js','utf8');
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
function setup(){
 const errors=[],console=new VirtualConsole();console.on('jsdomError',e=>errors.push(e.message));
 const d=new JSDOM('<main></main>',{url:'https://brainilabgames.com/games/math-rush/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:console}),w=d.window;
 let uid='one',summary=null,person={displayName:'Curious Curie',xp:90,level:3},hidden=false;
 Object.defineProperty(w.document,'hidden',{get:()=>hidden});
 w.BrainiData={authState:()=>({status:'authenticated',user:{id:uid}}),getState:()=>({auth:{status:'authenticated',user:{id:uid}}}),player:()=>person};
 w.BrainiProgression={getCached:()=>summary};
 for(const name of ['player-personalities','icon-system','avatar-design','profile-rewards-model','progression-ui','reward-journey','continuity'])w.eval(source(name));
 const emit=(xp,rewards=[])=>{person.xp=xp;summary={progression:{user_id:uid,xp,level:1},recent_rewards:rewards};w.dispatchEvent(new w.CustomEvent('brainilab:progressionchange',{detail:{summary}}));};
 const play=(id,extra={})=>w.dispatchEvent(new w.CustomEvent('brainilab:datachange',{detail:{type:'game_result',result:{clientResultId:id,ownerUserId:uid,...extra}}}));
 const receipt=(id,xp=50)=>({client_result_id:id,verified:true,xp});
 const card=id=>{const root=w.document.querySelector('main');root.innerHTML=w.BrainiContinuity.rewardMarkup({clientResultId:id});return root;};
 return {w,d,emit,play,receipt,card,errors,person,hide:()=>{hidden=true;w.document.dispatchEvent(new w.Event('visibilitychange'));},switch:()=>{uid='two';w.dispatchEvent(new w.Event('brainilab:authchange'));}};
}
let h=setup(),{w}=h,J=w.BrainiRewardJourney;
assert.equal(J.next(0).name,'Blue sky');assert.equal(J.next(100).name,'Fresh eyes');
assert.equal(J.next(3800).name,'College');assert.equal(J.next(69620),null);
for(const value of [-1,NaN,Infinity,1.5,'100']){assert.equal(J.next(value),null);assert.equal(J.markup({},value), '');}
assert.equal(J.crossed(100,100).length,0);assert.equal(J.crossed(140,90).length,0);
assert.deepEqual(Array.from(J.crossed(90,140),r=>r.name),['Blue sky']);
assert.equal(J.fromLink('frame:blue').name,'Blue sky');assert.equal(J.fromLink('frame:blue<script>'),null);
assert.equal(J.fromLink('hat:academy_calendar'),null,'a game never claims a course completion reward from XP');
assert.equal(J.next(10000).name,'PhD');
assert.match(J.markup({},1600,{before:1450,after:1600}),/Unlocked!/);assert.match(J.markup({},1600,{before:1450,after:1600}),/Copper glow/);assert.match(J.moreMarkup({},1600,{before:1450,after:1600}),/2 more unlocked/);
assert.match(J.art({kind:'scene',id:'library'},{}),/src="\/assets\/profile-scenes\/library.svg"/);
assert.match(J.art({kind:'frame',id:'gold'},{}),/data-social-frame="gold"/);
h.emit(90);h.play('new');h.emit(140,[h.receipt('new')]);
assert.match(h.card('new').textContent,/Unlocked!Blue sky/);assert.equal(h.card('new').querySelectorAll('.post-unlock').length,1);
assert.match(h.card('new').querySelector('.post-reward').getAttribute('href'),/reward=frame%3Ablue#my-avatar/);
assert.ok(Object.isFrozen(w.BrainiProgressUI.resultProgress('new')));
const stable=h.card('new').textContent;h.emit(140,[h.receipt('new')]);assert.equal(h.card('new').textContent,stable);
h.play('new');h.emit(150,[h.receipt('new')]);assert.doesNotMatch(h.card('new').textContent,/Unlocked!/,'repeated receipt cannot be claimed for new XP');
assert.match(h.card('new').textContent,/Next avatar extra/);
assert.deepEqual(h.errors,[]);h.d.window.close();

for(const variant of ['initial','passive','practice','tryFirst','dailyReplayBlocked','wrong-owner','unverified','unchanged-xp','hidden','batch','lesson']){
 h=setup();w=h.w;
 if(variant!=='initial')h.emit(90);
 if(!['initial','passive'].includes(variant))h.play('r',variant==='wrong-owner'?{ownerUserId:'other'}:['practice','tryFirst','dailyReplayBlocked'].includes(variant)?{[variant]:true}:{});
 if(variant==='hidden')h.hide();
 if(variant==='batch')h.play('second');
 if(variant==='lesson')w.dispatchEvent(new w.CustomEvent('brainilab:lessonreward',{detail:{userId:'one',slug:'test',version:'v1',xpAwarded:40}}));
 h.emit(variant==='unchanged-xp'?90:140,[{...h.receipt('r'),verified:variant!=='unverified'},...(variant==='batch'?[h.receipt('second')]:[])]);
 assert.doesNotMatch(h.card('r').textContent,/Unlocked!/,variant+' must not claim a new unlock');
 assert.equal(w.BrainiProgressUI.resultProgress('r'),null,variant+' must not create a receipt');
 assert.deepEqual(h.errors,[]);h.d.window.close();
}
h=setup();h.emit(90);h.play('bonus');h.emit(340,[h.receipt('bonus',0)]);
assert.match(h.card('bonus').textContent,/Unlocked!/,'the confirmed Daily bonus can cross an unlock when base XP is capped');
h.switch();assert.equal(h.w.BrainiProgressUI.resultProgress('bonus'),null);assert.doesNotMatch(h.card('bonus').textContent,/Unlocked!/);h.d.window.close();

async function linked(value,xp){
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 const d=new JSDOM('<body><div data-profile-rank-hero></div><section data-profile-rewards></section></body>',{url:'https://brainilabgames.com/profile/?section=progress&reward='+encodeURIComponent(value)+'#my-avatar',runScripts:'outside-only',virtualConsole:vc}),v=d.window;
 const person={displayName:'Test player',xp,avatarDesign:{mode:'picture'}};
 v.BrainiData={player:()=>person,authState:()=>({status:'guest',guestUserId:'test'}),recentResults:()=>[]};
 for(const name of ['player-personalities','icon-system','avatar-design','profile-rewards-model','progression-ui','reward-journey','avatar-studio-ui','profile-sections'])v.eval(source(name));
 const root=v.document.querySelector('[data-profile-rewards]');
 v.document.addEventListener('DOMContentLoaded',()=>{v.BrainiAvatarStudioUI.mount(root);v.BrainiAvatarStudioUI.choices(root,v.BrainiRewardCatalog.clean(),xp,false);});
 await tick();assert.deepEqual(errors,[]);return {d,v,root,person};
}
let p=await linked('frame:blue',140);
assert.equal(p.v.BrainiAvatarStudioUI.activePane(),'rewards');assert.equal(p.root.querySelectorAll('.is-reward-target').length,1);assert.match(p.root.querySelector('#linked-reward-note').textContent,/Ready to try on/);
assert.equal(p.person.avatarDesign.mode,'picture','deep links do not equip or save a reward');
p.v.BrainiAvatarStudioUI.showPane(p.root,'look');p.v.dispatchEvent(new p.v.Event('brainilab:stylechange'));
assert.equal(p.v.BrainiAvatarStudioUI.activePane(),'look','background refresh must not switch the player’s chosen tab');assert.equal(p.root.querySelectorAll('#linked-reward-note').length,1);p.d.window.close();
p=await linked('glasses:heart',2700);assert.equal(p.v.BrainiAvatarStudioUI.activePane(),'extras');assert.match(p.root.querySelector('#linked-reward-note').textContent,/50 XP to unlock Specs appeal/);
p.person.xp=2800;p.v.dispatchEvent(new p.v.Event('brainilab:progressionchange'));assert.match(p.root.querySelector('#linked-reward-note').textContent,/Ready to try on/);p.d.window.close();
p=await linked('frame:blue<script>',1000);assert.equal(p.root.querySelectorAll('.is-reward-target').length,0);assert.equal(p.v.BrainiAvatarStudioUI.activePane(),'look');p.d.window.close();
console.log('PASS result unlocks: real thresholds/ties, one reward slot, verified active receipts, hydration/replay/owner/hidden/batch/lesson guards, capped-game bonus, course exclusion, shared art, safe deep links and refresh without tab/equipment changes.');
