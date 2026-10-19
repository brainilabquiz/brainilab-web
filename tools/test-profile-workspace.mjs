import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const source=name=>readFileSync('assets/js/'+name+'.js','utf8');
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
const html=readFileSync('profile/index.html','utf8');

// Every entry path selects the same section and uses the actual lazy loader.
const navigation=new JSDOM(html,{url:'https://brainilabgames.com/profile/?section=social',runScripts:'outside-only'});
const n=navigation.window,loads=[];let statsReads=0;
n.BrainiData={authState:()=>({status:'guest'}),player:()=>({}),daily:()=>({})};
n.BrainiPerf={loadFeature:name=>loads.push(name)};
n.BrainiStatsUI={render:()=>statsReads++};
n.eval(source('profile-sections'));await tick();
assert.equal(n.document.querySelector('[data-profile-section]:not([hidden])').dataset.profileSection,'social');
assert.deepEqual(loads,['profile-social.bundle.js']);
assert.equal(n.document.querySelector('[data-profile-tab=progress]').textContent,'My Avatar');
for(const name of ['progress','stats','profile','social','settings']){
 n.document.querySelector(`[data-profile-tab=${name}]`).click();
 assert.equal(n.document.querySelectorAll('[data-profile-section]:not([hidden])').length,1);
 assert.equal(n.document.querySelector('[data-profile-section]:not([hidden])').dataset.profileSection,name);
 assert.equal(new URL(n.location.href).searchParams.get('section'),name);
 assert.equal(n.document.querySelector('[aria-current=page][data-profile-tab]').dataset.profileTab,name);
}
assert.ok(statsReads>0);
n.history.replaceState({},'', '?section=social');n.dispatchEvent(new n.PopStateEvent('popstate'));
assert.equal(loads.length,3,'deep links, click activation and browser history all load social');
n.BrainiProfileSections.show('unknown');
assert.equal(n.document.querySelector('[data-profile-section]:not([hidden])').dataset.profileSection,'progress');
assert.equal(n.document.querySelector('[data-profile-activity]').open,false,'progress remains folded');
assert.ok(n.document.querySelector('[data-profile-activity] .academy-resume'));
n.close();

// The actual account view uses confirmed cosmetics, never the unsaved preview.
const dom=new JSDOM('<body class="profile-page"><div class="nav-right"><a class="avatar"></a></div><div data-profile-account-root></div><section data-profile-rewards></section></body>',{url:'https://brainilabgames.com/profile/',runScripts:'outside-only'});
const w=dom.window;
for(const file of ['player-personalities','avatar-design','data','progression-ui','profile-rewards-model','profile-rewards-store','avatar-studio-ui'])w.eval(source(file));
const D=w.BrainiData;
let meta={brainilab_avatar_mode_v1:'built',brainilab_avatar_prop_v1:'icepop',brainilab_avatar_frame_v1:'copper',brainilab_profile_title_v1:'explorer'},writes=[];
await D.api.syncExternalAuthUser({id:'sample-owner',email:'sample@example.test',user_metadata:meta});
await D.api.syncCloudProfile({user_id:'sample-owner',display_name:'Local sample',avatar_url:'https://example.test/photo.webp'});
await D.api.syncCloudProgression({progression:{xp:2700,level:12,total_games:9},today:{daily_brain_score:1234},recent_rewards:[]});
w.BrainiBackendAuth={isConfigured:()=>true,init:()=>new Promise(()=>{}),getClient:()=>({from:()=>({select:()=>({eq:async()=>({data:[]})})}),rpc:async()=>({data:{owner:'sample-owner',games:[],activeDays:0}}),auth:{
 getUser:async()=>({data:{user:{id:'sample-owner',user_metadata:meta}}}),
 updateUser:async({data})=>{writes.push(data);meta={...meta,...data};return {data:{user:{id:'sample-owner',user_metadata:meta}}};}
}})};
w.eval(source('auth'));w.eval(source('profile-rewards'));await tick();await tick();
await w.BrainiAuth.hydrateProfilePage();
const account=w.document.querySelector('[data-profile-account-root]');
assert.ok(account.querySelector('[data-profile-account-avatar] svg'));
assert.equal(account.querySelector('[data-profile-account-avatar]').dataset.profileFrame,'copper');
assert.equal(account.querySelector('[data-profile-account-title]').textContent,'Explorer');
assert.equal(account.querySelector('[data-profile-account-title]').hidden,false);
assert.equal(account.querySelector('.profile-photo-preview img').src,'https://example.test/photo.webp','photo upload preview retains the original photo');
assert.equal(account.querySelector('label[for=profile-display-name]').control,account.querySelector('[name=displayName]'));
assert.equal(account.querySelector('label[for=profile-country]').control,account.querySelector('[name=countryCode]'));
const savedAvatar=account.querySelector('[data-profile-account-avatar]').innerHTML;
const before=JSON.parse(w.localStorage.getItem('brainilab.mock.v1'));
w.document.querySelector('[data-reward-kind=prop][data-reward-id=cookie]').click();
assert.equal(account.querySelector('[data-profile-account-avatar]').innerHTML,savedAvatar);
assert.equal(writes.length,0,'navigation and previews perform no metadata writes');
w.document.querySelector('[data-style-save]').click();await tick();await tick();
assert.notEqual(account.querySelector('[data-profile-account-avatar]').innerHTML,savedAvatar);
const after=JSON.parse(w.localStorage.getItem('brainilab.mock.v1'));
delete before.player.avatarDesign;delete after.player.avatarDesign;
assert.deepEqual(after,before,'cosmetic confirmation preserves XP, scores, history and privacy');
w.document.querySelector('[data-reward-kind=title][data-reward-id=none]').click();
w.document.querySelector('[data-style-save]').click();await tick();await tick();
assert.equal(account.querySelector('[data-profile-account-title]').hidden,true,'unequipped titles have no empty badge');
dom.window.close();
console.log('PASS profile section routes/history/lazy loading, folded learning/history, saved appearance across account views, draft isolation, original photo, labelled inputs, unequipping and unchanged gameplay/privacy.');
