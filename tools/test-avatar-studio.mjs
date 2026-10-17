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
assert.equal(option('mode','built').querySelector('strong').textContent,'My avatar');
assert.match(option('mode','built').getAttribute('aria-label'),/^My avatar,/);
const savedState=()=>JSON.parse(w.localStorage.getItem('brainilab.mock.v1'));
const omitDesign=state=>{delete state.player.avatarDesign;return state;};
// Every cosmetic threshold is retroactive, without granting or spending XP.
for(const [kind,list] of Object.entries(C.groups))for(const item of list){
 if(item.course||item.challenge||item.days)continue;
 if(item.xp)assert.notEqual(C.available({[kind]:item.id},item.xp-1)[kind],item.id);
 assert.equal(C.available({[kind]:item.id},item.xp)[kind],item.id);
}
assert.equal(A.options.prop.find(p=>p.id==='icepop').xp,800);
assert.equal(A.options.prop.find(p=>p.id==='icepop').name,'Brain freeze');
assert.equal(option('prop','icepop').disabled,true);
const photo='https://example.test/keep-my-picture.jpg';
await D.api.syncExternalAuthUser({id:'cosmetic-owner',email:'fixture@example.test',user_metadata:{}});
await D.api.syncCloudProfile({user_id:'cosmetic-owner',display_name:'Curious Player',avatar_url:photo});
await D.api.syncCloudProgression({progression:{xp:2700,level:99,total_games:9},today:{daily_brain_score:1234},recent_rewards:[]});
 let meta={full_name:'Preserve this',custom_setting:'untouched'},writes=[],readError=false,writeError=false,currentUserId='cosmetic-owner';
 w.BrainiBackendAuth={getClient:()=>({rpc:async()=>({data:{owner:currentUserId,games:[],activeDays:0},error:null}),from:()=>({select:()=>({eq:async()=>({data:[],error:null})})}),auth:{getUser:async()=>({data:{user:{id:currentUserId,user_metadata:meta}},error:readError?Error('offline'):null}),updateUser:async({data})=>{
  writes.push({...data});if(writeError)return {data:null,error:Error('offline')};
  meta={...meta,...data};return {data:{user:{id:currentUserId,user_metadata:meta}}};
}}})};
await S.load();
const before=omitDesign(savedState());
// A suggested look is a reversible draft using current unlocks, never an automatic save.
const surpriseButton=root.querySelector('[data-avatar-surprise]'),writesBeforeSurprise=writes.length,portraitBeforeSurprise=w.document.querySelector('.nav-right .avatar').innerHTML;
const savedBeforeSurprise=JSON.parse(JSON.stringify(S.snapshot().style));
surpriseButton.click();
assert.equal(writes.length,writesBeforeSurprise);assert.equal(option('mode','built').getAttribute('aria-pressed'),'true');
assert.equal(option('skin',savedBeforeSurprise.skin).getAttribute('aria-pressed'),'true');
assert.equal(option('frame',savedBeforeSurprise.frame).getAttribute('aria-pressed'),'true');assert.equal(option('title',savedBeforeSurprise.title).getAttribute('aria-pressed'),'true');
assert.equal(w.document.querySelector('.nav-right .avatar').innerHTML,portraitBeforeSurprise);assert.match(root.querySelector('[data-style-preview-label]').textContent,/not saved/);
for(const [kind,list]of Object.entries(C.groups)){const selected=list.find(item=>option(kind,item.id).getAttribute('aria-pressed')==='true');assert.ok(selected.xp<=D.player().xp);}
assert.deepEqual(omitDesign(savedState()),before);
root.querySelector('[data-style-cancel]').click();
assert.equal(writes.length,writesBeforeSurprise);assert.equal(root.querySelector('[data-style-save]').disabled,true);
for(const [kind,id]of Object.entries(savedBeforeSurprise))assert.equal(option(kind,id).getAttribute('aria-pressed'),'true');
option('mode','built').click();option('skin','cocoa').click();option('hair','curls').click();
root.querySelector('[data-avatar-tab=extras]').click();option('glasses','round').click();option('hat','cap').click();option('prop','icepop').click();
 option('frame','copper').click();
assert.ok(root.querySelector('[data-style-preview-avatar] svg'));
 const mini=root.querySelector('[data-avatar-mini]'),savedHeader=w.document.querySelector('.nav-right .avatar'),savedHero=w.document.querySelector('[data-profile-rank-hero] .rank-avatar');
  assert.equal(mini.className,'rank-avatar avatar-mobile-portrait '+w.BrainiProgressUI.avatarClass(12));
  for(const portrait of [mini,root.querySelector('[data-style-preview-avatar]')]){
   assert.equal(portrait.classList.contains('rank-highschool'),true,'creator frames match the existing XP-derived diploma level despite a stale supplied level');
   assert.equal(portrait.classList.contains('rank-nobel'),false);
  }
  assert.equal(root.querySelector('.avatar-stage-identity').dataset.diplomaTier,'highschool');
  assert.equal(root.querySelector('[data-avatar-level]').textContent,'Level 12 · 2,700 XP');
  assert.equal(D.player().level,99,'display consistency does not rewrite the supplied player level');
 assert.equal(mini.innerHTML,root.querySelector('[data-style-preview-avatar]').innerHTML);
 assert.equal(mini.dataset.profileFrame,'copper','the sticky miniature previews the chosen frame');
 assert.equal(savedHeader.dataset.profileFrame,undefined);assert.equal(savedHero.dataset.profileFrame,undefined,'draft frames do not change the saved identity');
assert.ok(w.document.querySelector('.nav-right .avatar img'),'draft leaves the saved picture in the header');
assert.match(root.querySelector('[data-style-preview-label]').textContent,/not saved/);
root.querySelector('[data-style-cancel]').click();assert.ok(root.querySelector('[data-style-preview-avatar] img'));
 assert.equal(mini.dataset.profileFrame,undefined,'cancel restores the saved level frame in the miniature');
option('prop','icepop').click();assert.equal(option('mode','built').getAttribute('aria-pressed'),'true','an accessory selects the illustrated mode');
option('glasses','round').click();option('hat','cap').click();
 option('frame','copper').click();
root.querySelector('[data-style-save]').click();await tick();await tick();
assert.equal(S.snapshot().style.prop,'icepop');assert.equal(S.snapshot().style.hat,'cap');
assert.equal(S.snapshot().style.mode,'built');assert.equal(D.player().avatarDesign.prop,'icepop');
assert.ok(w.document.querySelector('.nav-right .avatar svg'),'confirmed save updates the shared avatar');
 assert.equal(savedHeader.dataset.profileFrame,'copper');assert.equal(savedHero.dataset.profileFrame,'copper');assert.equal(mini.dataset.profileFrame,'copper');
 option('frame','level').click();assert.equal(mini.dataset.profileFrame,undefined,'choosing the level frame clears the miniature custom frame');
 assert.equal(savedHeader.dataset.profileFrame,'copper','returning to the level frame remains a preview until saved');
 root.querySelector('[data-style-cancel]').click();assert.equal(mini.dataset.profileFrame,'copper');
assert.equal(meta.custom_setting,'untouched');assert.equal(meta.full_name,'Preserve this');
assert.ok(Object.keys(writes[0]).every(k=>k.startsWith('brainilab_avatar_')));
assert.deepEqual(omitDesign(savedState()),before,'only avatarDesign changes; all scores, XP, results, streaks and ranking settings stay identical');
assert.equal(D.player().avatarUrl,photo,'the original photo is retained');
await S.load();assert.equal(S.snapshot().style.prop,'icepop');
option('mode','picture').click();root.querySelector('[data-style-save]').click();await tick();await tick();
assert.match(w.document.querySelector('.nav-right .avatar img').src,/keep-my-picture/);
assert.equal(D.player().avatarUrl,photo);assert.equal(meta.brainilab_avatar_prop_v1,'icepop','restoring a picture retains the illustrated design');
assert.deepEqual(omitDesign(savedState()),before);
// Expanded collection: every new item draws something distinct and obeys its XP boundary.
const added=[['prop','cookie',300],['glasses','square',600],['hat','egg',1200],['prop','peas',1800],['hat','cloud',4000],['glasses','visor',5000],['prop','rocket',7000],['hat','graduate',8000],['prop','book',9000]];
for(const [kind,id,xp] of added){
 assert.equal(C.groups[kind].find(x=>x.id===id).xp,xp);
 assert.equal(A.markup({[kind]:id},xp-1),A.markup({},xp-1),'locked artwork falls back to the base avatar');
 assert.notEqual(A.markup({[kind]:id},xp),A.markup({},xp),'unlocked artwork is visible');
 assert.equal(C.fromMetadata({[C.metadataKeys[kind]]:id})[kind],id);
}
for(const hair of ['ponytail','waves','braids']){
 assert.equal(A.available({hair},0).hair,hair);assert.notEqual(A.markup({hair},0),A.markup({},0));
}
for(const kind of ['glasses','hat','prop'])assert.equal(new Set(C.groups[kind].map(x=>x.id)).size,C.groups[kind].length);
const original=[['glasses','round',150],['glasses','sun',1000],['glasses','star',3500],['hat','beanie',500],['hat','cap',1500],['hat','wizard',6000],['prop','icepop',800],['prop','bulb',2500],['prop','pencil',4500]];
for(const [kind,id,xp] of original)assert.equal(C.groups[kind].find(x=>x.id===id).xp,xp,'existing unlocks keep their IDs and thresholds');
root.querySelector('[data-avatar-tab=extras]').click();option('prop','cookie').click();option('glasses','square').click();option('hat','egg').click();
assert.match(root.querySelector('[data-avatar-note=prop]').textContent,/Smart cookie.*clever little snack/);
assert.equal(root.querySelector('[data-avatar-note=prop]').hidden,false);
root.querySelector('[data-style-save]').click();await tick();await tick();await S.load();
assert.equal(S.snapshot().style.prop,'cookie');assert.equal(S.snapshot().style.glasses,'square');assert.equal(S.snapshot().style.hat,'egg');
assert.deepEqual(omitDesign(savedState()),before,'new collection saves still preserve every gameplay and ranking field');
 // Connection retries retain the in-progress creation until a save is confirmed.
 option('frame','blue').click();option('prop','peas').click();
 writeError=true;root.querySelector('[data-style-save]').click();await tick();await tick();
 assert.match(S.snapshot().error,/could not be confirmed/);
 assert.equal(S.snapshot().style.frame,'copper');assert.equal(S.snapshot().style.prop,'cookie');
 assert.equal(mini.dataset.profileFrame,'blue');assert.equal(savedHeader.dataset.profileFrame,'copper');
 const writesAfterFailure=writes.length;
 readError=true;writeError=false;root.querySelector('[data-style-retry]').click();await tick();await tick();
 assert.match(S.snapshot().error,/could not be checked/,'retry exercises a failed store reload');
 assert.equal(option('frame','blue').getAttribute('aria-pressed'),'true');assert.equal(option('prop','peas').getAttribute('aria-pressed'),'true');
 assert.equal(mini.dataset.profileFrame,'blue');assert.match(root.querySelector('[data-style-preview-label]').textContent,/not saved/);
 assert.equal(root.querySelector('[data-style-save]').disabled,true);
  meta={...meta,brainilab_profile_title_v1:'curious',brainilab_avatar_hair_v1:'braids'};
  readError=false;root.querySelector('[data-style-retry]').click();await tick();await tick();
 assert.equal(S.snapshot().error,'');assert.equal(writes.length,writesAfterFailure,'reconnecting does not silently save the draft');
 assert.equal(option('frame','blue').getAttribute('aria-pressed'),'true');assert.equal(option('prop','peas').getAttribute('aria-pressed'),'true');
  assert.equal(option('title','curious').getAttribute('aria-pressed'),'true');assert.equal(option('hair','braids').getAttribute('aria-pressed'),'true','untouched appearance fields adopt another tab’s refreshed choices');
  assert.equal(root.querySelector('[data-style-preview-title]').textContent,'Curious Mind');
 assert.equal(mini.dataset.profileFrame,'blue');assert.equal(savedHeader.dataset.profileFrame,'copper');
 assert.equal(root.querySelector('[data-style-save]').disabled,false,'the retained creation can be saved after reconnecting');
 root.querySelector('[data-style-save]').click();await tick();await tick();
 assert.equal(S.snapshot().style.frame,'blue');assert.equal(S.snapshot().style.prop,'peas');assert.equal(savedHeader.dataset.profileFrame,'blue');
  assert.deepEqual(writes.at(-1),{brainilab_avatar_frame_v1:'blue',brainilab_avatar_prop_v1:'peas'},'the retry saves only local edits and never writes stale untouched title or hair fields');
  assert.equal(meta.brainilab_profile_title_v1,'curious');assert.equal(meta.brainilab_avatar_hair_v1,'braids');
 assert.deepEqual(omitDesign(savedState()),before,'failed saves, failed reloads and successful retries preserve all gameplay and ranking state');
 // Automatic reconnects use the same rebase, including fields changed locally then restored.
 option('frame','green').click();option('hair','curls').click();option('hair','braids').click();
 meta={...meta,brainilab_profile_title_v1:'explorer',brainilab_avatar_hair_v1:'waves'};
 const writesBeforeOnline=writes.length;
 w.dispatchEvent(new w.Event('online'));await tick();await tick();
 assert.equal(writes.length,writesBeforeOnline);assert.equal(option('frame','green').getAttribute('aria-pressed'),'true');
 assert.equal(option('hair','waves').getAttribute('aria-pressed'),'true','a restored local field follows the refreshed saved value');
 assert.equal(root.querySelector('[data-style-preview-title]').textContent,'Explorer');
 root.querySelector('[data-style-save]').click();await tick();await tick();
 assert.deepEqual(writes.at(-1),{brainilab_avatar_frame_v1:'green'},'reconnect saves only the remaining local frame edit');
 assert.equal(meta.brainilab_profile_title_v1,'explorer');assert.equal(meta.brainilab_avatar_hair_v1,'waves');
 assert.deepEqual(omitDesign(savedState()),before,'rebasing and saving leaves all gameplay and ranking state unchanged');
// Keyboard tabs follow the WAI-ARIA pattern without removing focus during render.
const look=root.querySelector('[data-avatar-tab=look]');look.focus();look.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
assert.equal(w.document.activeElement.dataset.avatarTab,'extras');assert.equal(root.querySelector('[data-avatar-pane=look]').hidden,true);
w.document.activeElement.dispatchEvent(new w.KeyboardEvent('keydown',{key:'End',bubbles:true}));assert.equal(w.document.activeElement.dataset.avatarTab,'academy');
const pageHome=new w.KeyboardEvent('keydown',{key:'Home',ctrlKey:true,bubbles:true,cancelable:true});w.document.activeElement.dispatchEvent(pageHome);
assert.equal(pageHome.defaultPrevented,false);assert.equal(w.document.activeElement.dataset.avatarTab,'academy','modified page-navigation keys are not captured');
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
  option('frame','copper').click();option('hair','braids').click();
  assert.equal(mini.dataset.profileFrame,'copper');assert.match(root.querySelector('[data-style-preview-label]').textContent,/not saved/);
 currentUserId='other-owner';meta={};
await D.api.syncExternalAuthUser({id:'other-owner',user_metadata:{}});
 await tick();await tick();
assert.equal(D.player().avatarDesign.mode,'picture');assert.equal(D.player().avatarDesign.prop,'none');
assert.equal(S.snapshot().style.mode,'picture');
 assert.equal(S.snapshot().owner,'account:other-owner');assert.equal(mini.dataset.profileFrame,undefined,'an owner switch discards the previous account’s unsaved frame');
 assert.equal(option('hair',C.clean().hair).getAttribute('aria-pressed'),'true');assert.equal(root.querySelector('[data-style-preview-label]').textContent,'Your avatar');
 assert.equal(root.querySelector('[data-style-save]').disabled,true,'the new account does not inherit a dirty creation');
dom.window.close();
// The folded panel contains only progress; other account sections stay separate.
const html=new JSDOM(readFileSync('profile/index.html','utf8')).window.document;
const activity=html.querySelector('[data-profile-activity]');assert.ok(activity);assert.equal(activity.open,false);
assert.ok(html.querySelector('[data-profile-rank-hero]'));assert.equal(html.querySelector('[data-profile-rank-hero]').closest('details'),null,'XP clarity keeps the level visible outside folded history');assert.ok(activity.querySelector('#recentResults'));
assert.equal(html.querySelector('[data-profile-rewards]').closest('details'),null);
assert.equal(html.querySelector('[data-profile-section=stats]').closest('details'),null);
assert.equal(html.querySelector('[data-profile-section=progress]').contains(html.querySelector('[data-profile-section=stats]')),false);
const lazy=new JSDOM('<details data-profile-activity><summary>Progress</summary><div data-profile-rank-hero></div><div id="recentResults"></div></details>',{url:'https://brainilabgames.com/profile/',runScripts:'outside-only'}).window;
let historyReads=0;
lazy.BrainiData={player:()=>({displayName:'Local sample',level:12,xp:2700}),authState:()=>({status:'guest',guestUserId:'sample'}),recentResults:()=>[],daily:()=>({})};
lazy.BrainiAnalytics={fetchStats:async()=>{historyReads++;return {recent_results:[]};}};
lazy.BrainiUI={renderRecentResults:root=>root.textContent='No games played yet.'};
lazy.BrainiDailyRules={model:()=>({version:'daily-choice-v1',choices:[]})};lazy.BrainiContinuity={render:()=>{}};
for(const f of ['player-personalities','icon-system','avatar-design','profile-rewards-model','progression-ui','reward-journey','profile-sections'])lazy.eval(source(f));
await tick();assert.equal(historyReads,0,'closed progress does not request private game history');
lazy.document.querySelector('details').open=true;await tick();await tick();assert.ok(historyReads>0);
assert.match(lazy.document.querySelector('#recentResults').textContent,/No games/);lazy.close();
  console.log('PASS avatar thresholds/artwork, full and mobile frame preview/cancel/confirmed save, picture restoration, locally edited fields retained across save/load failures and reconnects, concurrent untouched-field preservation, independent metadata, full-state score/XP/ranking preservation, keyboard tabs, safe SVG, unsaved-draft account isolation, folded structure and lazy history.');
