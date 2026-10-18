import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const sourceRoot=process.env.AVATAR_SOURCE_ROOT||'.';
const dom=new JSDOM('<body class="profile-page"><div class="nav-right"><span class="avatar"></span></div><section data-profile-rewards></section></body>',{url:'https://brainilabgames.com/profile/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,plain=value=>JSON.parse(JSON.stringify(value));
w.fetch=()=>{throw Error('Real network forbidden');};
for(const name of ['player-personalities','icon-system','avatar-design','data','progression-ui'])w.eval(readFileSync(sourceRoot+'/assets/js/'+name+'.js','utf8'));
const D=w.BrainiData,metadata={custom:'keep',brainilab_avatar_mode_v1:'built',brainilab_avatar_glasses_v1:'sun',brainilab_avatar_frame_v1:'blue',brainilab_profile_title_v1:'explorer'},writes=[];
let owner='frames-owner',readError=false;
await D.api.syncExternalAuthUser({id:owner,user_metadata:metadata});
await D.api.syncCloudProfile({user_id:owner,display_name:'<img src=x onerror=alert(1)>',avatar_url:'https://example.test/portrait.jpg'});
await D.api.syncCloudProgression({progression:{xp:3430,level:99,total_games:9},today:{daily_brain_score:1234},recent_rewards:[]});
w.BrainiBackendAuth={getClient:()=>({rpc:async()=>({data:{owner,games:[],activeDays:0},error:readError?Error('offline'):null}),from:()=>({select:()=>({eq:async()=>({data:[],error:readError?Error('offline'):null})})}),auth:{getUser:async()=>({data:{user:{id:owner,user_metadata:plain(metadata)}},error:readError?Error('offline'):null}),updateUser:async({data})=>{writes.push(plain(data));Object.assign(metadata,data);return {data:{user:{id:owner,user_metadata:plain(metadata)}},error:null};}}})};
for(const name of ['profile-rewards-model','profile-rewards-store','avatar-studio-ui','avatar-wardrobe-ui','profile-rewards'])w.eval(readFileSync(sourceRoot+'/assets/js/'+name+'.js','utf8'));
const settle=async()=>{for(let n=0;n<5;n++)await new Promise(resolve=>setTimeout(resolve,0));};
await settle();
const root=w.document.querySelector('[data-profile-rewards]'),S=w.BrainiRewardStore,C=w.BrainiRewardCatalog;
const item=(kind,id)=>root.querySelector(`[data-reward-kind="${kind}"][data-reward-id="${id}"]`);
const summary=kind=>root.querySelector(`[data-style-collection="${kind}"]`).textContent;
root.querySelector('[data-avatar-tab=rewards]').click();
assert.equal(summary('frame'),'5 of 6 unlocked');
assert.equal(summary('title'),'4 of 6 unlocked');
for(const reward of C.frames){
 const portrait=item('frame',reward.id).querySelector('.reward-frame-sample');
 assert.ok(portrait.querySelector('svg'),'each frame shows the actual illustrated look');
 assert.ok(portrait.classList.contains('rank-highschool'),'default ring uses XP-derived level, not stale supplied level');
 assert.equal(portrait.dataset.profileFrame,reward.id==='level'?undefined:reward.id);
 assert.equal(item('frame',reward.id).hidden,false);
}
for(const reward of C.titles){
 const button=item('title',reward.id),name=button.querySelector('.reward-title-name');
 assert.equal(name.textContent,D.player().displayName);assert.equal(name.querySelector('img'),null,'display names stay escaped text');
 assert.equal(button.hidden,false);
}
const frameNode=item('frame','gold'),portraitNode=frameNode.querySelector('.reward-frame-sample');frameNode.focus();
w.BrainiProfileRewards.render();
assert.equal(w.document.activeElement,frameNode);assert.equal(frameNode.querySelector('.reward-frame-sample'),portraitNode,'identical refresh retains decoded portrait');
const stateBefore=plain(D.getState());delete stateBefore.player.avatarDesign;
item('frame','gold').click();item('title','detective').click();
assert.equal(writes.length,0,'trying on is local only');assert.equal(S.snapshot().style.frame,'blue');assert.equal(S.snapshot().style.title,'explorer');
assert.equal(root.querySelector('[data-style-preview-avatar]').dataset.profileFrame,'gold');
assert.equal(w.document.querySelector('.nav-right .avatar').dataset.profileFrame,'blue','shared identity changes only after save');
root.querySelector('[data-style-cancel]').click();assert.equal(item('frame','blue').getAttribute('aria-pressed'),'true');
item('mode','picture').click();
for(const reward of C.frames)assert.match(item('frame',reward.id).querySelector('.reward-frame-sample img').src,/portrait\.jpg$/);
item('frame','gold').click();item('title','detective').click();
assert.equal(item('mode','picture').getAttribute('aria-pressed'),'true','frames and titles never force illustrated mode');
root.querySelector('[data-style-save]').click();await settle();
assert.deepEqual(writes,[{brainilab_avatar_frame_v1:'gold',brainilab_profile_title_v1:'detective',brainilab_avatar_mode_v1:'picture'}]);
assert.equal(metadata.custom,'keep');assert.equal(item('title','detective').querySelector('small').textContent,'In use');
const after=plain(D.getState());delete after.player.avatarDesign;assert.deepEqual(after,stateBefore,'XP, rankings, scores, level, streak and results remain identical');
const levels=[0,99,100,249,250,499,500,749,750,1499,1500,1999,2000,2999,3000,4499,4500,5999,6000,9999,10000];
for(const xp of levels){
 await D.api.syncCloudProgression({progression:{xp,level:99,total_games:9},today:{daily_brain_score:1234},recent_rewards:[]});
 for(const kind of ['frame','title'])for(const reward of C.groups[kind])assert.equal(item(kind,reward.id).disabled,reward.xp>xp,`${kind}/${reward.id} obeys unchanged XP threshold ${reward.xp}`);
}
assert.equal(summary('frame'),'6 of 6 unlocked');assert.equal(summary('title'),'6 of 6 unlocked');
readError=true;await S.load();assert.equal(summary('frame'),'Unavailable');assert.equal(summary('title'),'Unavailable');assert.equal(root.querySelector('[data-style-retry]').hidden,false);
readError=false;root.querySelector('[data-style-retry]').click();await settle();assert.equal(summary('frame'),'6 of 6 unlocked');assert.equal(writes.length,1);
for(const key of Object.keys(metadata))if(key.startsWith('brainilab_'))delete metadata[key];
owner='frames-other';await D.api.syncExternalAuthUser({id:owner,user_metadata:{}});await settle();
assert.equal(S.snapshot().style.frame,'level');assert.equal(S.snapshot().style.title,'none');
assert.equal(root.querySelector('[data-avatar-pane=rewards]').querySelectorAll('.avatar-option-group').length,3,'frame, title and background choices stay expanded');
assert.equal(root.querySelectorAll('[data-style-save]').length,1);assert.equal(root.querySelectorAll('[data-style-cancel]').length,1);
assert.equal(writes.length,1);dom.window.close();
console.log('PASS frames/titles: actual portrait/photo, XP-derived level ring, escaped names, boundary locks, visible collection, stable DOM/focus, preview/cancel/save, minimal metadata, protected scores/XP, read-error recovery and owner isolation.');
