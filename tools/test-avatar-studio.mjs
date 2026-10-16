import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const tick=()=>new Promise(r=>setTimeout(r,0));
const source=f=>readFileSync('assets/js/'+f+'.js','utf8');
function setup(){
 const dom=new JSDOM('<body class="profile-page"><div class="nav-right"><a class="avatar"></a></div><div data-profile-rank-hero><span class="rank-avatar"></span><div class="profile-rank-main"><h2></h2></div></div><section data-profile-rewards></section></body>',{url:'https://brainilabgames.com/profile/',runScripts:'outside-only'});
 const w=dom.window;
 for(const f of ['player-personalities','avatar-design','data','progression-ui','profile-rewards-model','profile-rewards-store','avatar-studio-ui','profile-rewards'])w.eval(source(f));
 return {w,dom};
}
const {w,dom}=setup();await tick();
const A=w.BrainiAvatarDesign,C=w.BrainiRewardCatalog,S=w.BrainiRewardStore,D=w.BrainiData,root=w.document.querySelector('[data-profile-rewards]');
const option=(kind,id)=>root.querySelector(`[data-reward-kind="${kind}"][data-reward-id="${id}"]`);
const savedState=()=>JSON.parse(w.localStorage.getItem('brainilab.mock.v1'));
const omitDesign=state=>{delete state.player.avatarDesign;return state;};
// Every cosmetic threshold is retroactive, without granting or spending XP.
for(const [kind,list] of Object.entries(C.groups))for(const item of list){
 if(item.xp)assert.notEqual(C.available({[kind]:item.id},item.xp-1)[kind],item.id);
 assert.equal(C.available({[kind]:item.id},item.xp)[kind],item.id);
}
assert.equal(A.options.prop.find(p=>p.id==='icepop').xp,800);
assert.equal(A.options.prop.find(p=>p.id==='icepop').name,'Brain freeze');
assert.equal(option('prop','icepop').disabled,true);
const photo='https://example.test/keep-my-picture.jpg';
await D.api.syncExternalAuthUser({id:'cosmetic-owner',email:'fixture@example.test',user_metadata:{}});
await D.api.syncCloudProfile({user_id:'cosmetic-owner',display_name:'Curious Player',avatar_url:photo});
await D.api.syncCloudProgression({progression:{xp:2700,level:12,total_games:9},today:{daily_brain_score:1234},recent_rewards:[]});
let meta={full_name:'Preserve this',custom_setting:'untouched'},writes=[];
w.BrainiBackendAuth={getClient:()=>({auth:{getUser:async()=>({data:{user:{id:'cosmetic-owner',user_metadata:meta}}}),updateUser:async({data})=>{
 writes.push({...data});meta={...meta,...data};return {data:{user:{id:'cosmetic-owner',user_metadata:meta}}};
}}})};
await S.load();
const before=omitDesign(savedState());
option('mode','built').click();option('skin','cocoa').click();option('hair','curls').click();
root.querySelector('[data-avatar-tab=extras]').click();option('glasses','round').click();option('hat','cap').click();option('prop','icepop').click();
assert.ok(root.querySelector('[data-style-preview-avatar] svg'));
assert.ok(w.document.querySelector('.nav-right .avatar img'),'draft leaves the saved picture in the header');
assert.match(root.querySelector('[data-style-preview-label]').textContent,/not saved/);
root.querySelector('[data-style-cancel]').click();assert.ok(root.querySelector('[data-style-preview-avatar] img'));
option('prop','icepop').click();assert.equal(option('mode','built').getAttribute('aria-pressed'),'true','an accessory selects the illustrated mode');
option('glasses','round').click();option('hat','cap').click();
root.querySelector('[data-style-save]').click();await tick();await tick();
assert.equal(S.snapshot().style.prop,'icepop');assert.equal(S.snapshot().style.hat,'cap');
assert.equal(S.snapshot().style.mode,'built');assert.equal(D.player().avatarDesign.prop,'icepop');
assert.ok(w.document.querySelector('.nav-right .avatar svg'),'confirmed save updates the shared avatar');
assert.equal(meta.custom_setting,'untouched');assert.equal(meta.full_name,'Preserve this');
assert.ok(Object.keys(writes[0]).every(k=>k.startsWith('brainilab_avatar_')));
assert.deepEqual(omitDesign(savedState()),before,'only avatarDesign changes; all scores, XP, results, streaks and ranking settings stay identical');
assert.equal(D.player().avatarUrl,photo,'the original photo is retained');
await S.load();assert.equal(S.snapshot().style.prop,'icepop');
option('mode','picture').click();root.querySelector('[data-style-save]').click();await tick();await tick();
assert.match(w.document.querySelector('.nav-right .avatar img').src,/keep-my-picture/);
assert.equal(D.player().avatarUrl,photo);assert.equal(meta.brainilab_avatar_prop_v1,'icepop','restoring a picture retains the illustrated design');
assert.deepEqual(omitDesign(savedState()),before);
// Keyboard tabs follow the WAI-ARIA pattern without removing focus during render.
const look=root.querySelector('[data-avatar-tab=look]');look.focus();look.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
assert.equal(w.document.activeElement.dataset.avatarTab,'extras');assert.equal(root.querySelector('[data-avatar-pane=look]').hidden,true);
w.document.activeElement.dispatchEvent(new w.KeyboardEvent('keydown',{key:'End',bubbles:true}));assert.equal(w.document.activeElement.dataset.avatarTab,'rewards');
const pageHome=new w.KeyboardEvent('keydown',{key:'Home',ctrlKey:true,bubbles:true,cancelable:true});w.document.activeElement.dispatchEvent(pageHome);
assert.equal(pageHome.defaultPrevented,false);assert.equal(w.document.activeElement.dataset.avatarTab,'rewards','modified page-navigation keys are not captured');
w.document.activeElement.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Home',bubbles:true}));assert.equal(w.document.activeElement,look);
assert.equal(root.querySelectorAll('[role=tab][tabindex="0"]').length,1);
// All renderable options are fixed local artwork, including malicious metadata.
for(const [kind,list] of Object.entries(A.options))for(const item of list){
 const svg=A.markup({[kind]:item.id,mode:'built'},10000);
 assert.doesNotMatch(svg,/<script|<image|\bon\w+=|\bhref=/i);
 const parsed=new w.DOMParser().parseFromString(svg,'image/svg+xml');assert.equal(parsed.querySelector('parsererror'),null);
}
const unsafe=A.markup({skin:'<script>',hairColor:'url(https://evil.test)',prop:'<image href="x">'},10000);
assert.doesNotMatch(unsafe,/evil|<script|<image/);assert.deepEqual(JSON.parse(JSON.stringify(A.clean(null))),JSON.parse(JSON.stringify(A.clean())));
assert.equal(A.available({prop:'icepop',hat:'wizard'},799).prop,'none');
// Signed-in metadata restores the design outside /profile/; account changes reset it.
await D.api.syncExternalAuthUser({id:'cosmetic-owner',user_metadata:{...meta,brainilab_avatar_mode_v1:'built'}});
assert.match(w.BrainiProgressUI.avatarImageMarkup(D.player()),/braini-built-avatar/);
await D.api.syncExternalAuthUser({id:'other-owner',user_metadata:{}});
assert.equal(D.player().avatarDesign.mode,'picture');assert.equal(D.player().avatarDesign.prop,'none');
assert.equal(S.snapshot().style.mode,'picture');
dom.window.close();
// The folded panel contains only progress; other account sections stay separate.
const html=new JSDOM(readFileSync('profile/index.html','utf8')).window.document;
const activity=html.querySelector('[data-profile-activity]');assert.ok(activity);assert.equal(activity.open,false);
assert.ok(activity.querySelector('[data-profile-rank-hero]'));assert.ok(activity.querySelector('#recentResults'));
assert.equal(html.querySelector('[data-profile-rewards]').closest('details'),null);
assert.equal(html.querySelector('[data-profile-section=stats]').closest('details'),null);
assert.equal(html.querySelector('[data-profile-section=progress]').contains(html.querySelector('[data-profile-section=stats]')),false);
const lazy=new JSDOM('<details data-profile-activity><summary>Progress</summary><div data-profile-rank-hero></div><div id="recentResults"></div></details>',{url:'https://brainilabgames.com/profile/',runScripts:'outside-only'}).window;
let historyReads=0;
lazy.BrainiData={player:()=>({displayName:'Local sample',level:12,xp:2700}),authState:()=>({status:'guest',guestUserId:'sample'}),recentResults:()=>[],daily:()=>({})};
lazy.BrainiAnalytics={fetchStats:async()=>{historyReads++;return {recent_results:[]};}};
lazy.BrainiUI={renderRecentResults:root=>root.textContent='No games played yet.'};
lazy.BrainiDailyRules={model:()=>({version:'daily-choice-v1',choices:[]})};lazy.BrainiContinuity={render:()=>{}};
for(const f of ['player-personalities','icon-system','progression-ui','profile-sections'])lazy.eval(source(f));
await tick();assert.equal(historyReads,0,'closed progress does not request private game history');
lazy.document.querySelector('details').open=true;await tick();await tick();assert.ok(historyReads>0);
assert.match(lazy.document.querySelector('#recentResults').textContent,/No games/);lazy.close();
console.log('PASS avatar thresholds/artwork, preview/cancel/confirmed save, picture restoration, independent metadata, full-state score/XP/ranking preservation, keyboard tabs, safe SVG, account isolation, folded structure and lazy history.');
