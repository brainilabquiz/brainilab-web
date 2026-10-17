import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const {JSDOM,VirtualConsole}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const sourceRoot=process.env.AVATAR_SOURCE_ROOT||'.';
const source=name=>readFileSync(path.join(sourceRoot,'assets/js',name+'.js'),'utf8');
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
const settle=async()=>{for(let i=0;i<5;i++)await tick();};
const clone=value=>JSON.parse(JSON.stringify(value));
const key='brainilab_featured_achievements_v1';
const ids=['first_game','ten_games','personal_bests_three','daily_first','streak_three'];
const summaryFor=(uid,counters={})=>({progression:{user_id:uid,xp:3015,level:13,total_games:12,best_streak:3,full_daily_count:1,...counters},personal_bests:['science','history','numberroute'].map((game_id,i)=>({game_id,result_id:`00000000-0000-4000-8000-00000000000${i+1}`}))});
const fixtures=[],runtimeErrors=[];
async function setup({signed=true,selected=[],summary,metadata={}}={}){
 const virtualConsole=new VirtualConsole();virtualConsole.on('jsdomError',error=>runtimeErrors.push(String(error)));
 const dom=new JSDOM('<body class="profile-page"><div class="nav-right"><a class="avatar"></a></div><section data-profile-rewards></section></body>',{url:'https://brainilabgames.com/profile/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole});
 fixtures.push(dom);const w=dom.window;
 let uid='owner-a',proof=summary===undefined?summaryFor(uid):summary,readError=false,writeError=false,readUID=null,writeUID=null,holdRead=null,holdWrite=null;
 let syncs=0,network=0,reads=0;const writes=[];
 const accounts=new Map([[uid,{full_name:'Fictional player',brainilab_avatar_frame_v1:'copper',brainilab_profile_title_v1:'explorer',[key]:selected,...metadata}]]);
 w.fetch=()=>{network++;throw Error('Real network forbidden in fixture');};
 for(const name of ['icon-system','profile-achievements-model','player-personalities','avatar-design','achievement-display','data','progression-ui'])w.eval(source(name));
 const D=w.BrainiData;
 if(signed){await D.api.syncExternalAuthUser({id:uid,email:'fixture@example.test',user_metadata:accounts.get(uid)});await D.api.syncCloudProfile({user_id:uid,display_name:'Fictional player'});await D.api.syncCloudProgression(summaryFor(uid));}
 w.BrainiProgression={getCached:()=>clone(proof),sync:async()=>{syncs++;return clone(proof);}};
 w.BrainiBackendAuth={getClient:()=>({rpc:async()=>({data:{owner:uid,games:[],activeDays:0},error:null}),from:()=>({select:()=>({eq:async()=>({data:[],error:null})})}),auth:{
  getUser:async()=>{reads++;const requested=uid,result={data:{user:{id:readUID||requested,user_metadata:clone(accounts.get(requested)||{})}},error:readError?Error('offline'):null};if(holdRead)await holdRead;return result;},
  updateUser:async payload=>{const requested=uid;writes.push(clone(payload));if(holdWrite)await holdWrite;if(writeError)return {data:null,error:Error('offline')};accounts.set(requested,{...accounts.get(requested),...clone(payload.data)});return {data:{user:{id:writeUID||requested,user_metadata:clone(accounts.get(requested))}},error:null};}
 }})};
 if(process.env.ACHIEVEMENTS_BUNDLE==='1')w.eval(source('profile-rewards.bundle'));
 else for(const name of ['profile-rewards-model','profile-rewards-store','profile-achievements-store','profile-achievements-ui','avatar-studio-ui','profile-rewards','profile-achievements'])w.eval(source(name));
 await settle();
 const root=w.document.querySelector('[data-profile-rewards]'),S=w.BrainiAchievementStore;
 const state=()=>JSON.parse(w.localStorage.getItem('brainilab.mock.v1'));
 return {w,dom,root,S,D,writes,state,accounts,get uid(){return uid;},get network(){return network;},get syncs(){return syncs;},get reads(){return reads;},
  get meta(){return accounts.get(uid);},setProof(value){proof=value;w.dispatchEvent(new w.CustomEvent('brainilab:progressionchange'));},
  setMeta(value){accounts.set(uid,{...accounts.get(uid),...clone(value)});},readError(value){readError=value;},writeError(value){writeError=value;},readUID(value){readUID=value;},writeUID(value){writeUID=value;},holdRead(value){holdRead=value;},holdWrite(value){holdWrite=value;},
  async switchOwner(next){uid=next;proof=summaryFor(next);if(!accounts.has(next))accounts.set(next,{[key]:[]});await D.api.syncExternalAuthUser({id:next,email:'fixture@example.test',user_metadata:accounts.get(next)});await settle();},
  async logout(){uid='guest';proof=null;await D.api.clearExternalAuthUser();await settle();}
 };
}
const plain=value=>JSON.parse(JSON.stringify(value));
const click=(f,selector)=>{const element=f.root.querySelector(selector);assert.ok(element,selector);element.click();return element;};
const selectedIn=(f,selector)=>[...f.root.querySelectorAll(selector+' .achievement-slot-art[data-badge]')].map(el=>el.dataset.badge).filter(Boolean);
try{
 const f=await setup(),{w,root,S}=f,C=w.BrainiAchievementCatalog;
 assert.equal(root.querySelectorAll('[data-avatar-tab]').length,6);
 assert.equal(root.querySelectorAll('[data-achievement-id]').length,8);
 assert.equal(root.querySelectorAll('.achievement-level-guide li').length,10,'the material guide exposes all ten levels');
 assert.match(root.querySelector('[data-achievement-id=personal_bests_three] [data-achievement-progress]').textContent,/12 of 25 saved games/);
 assert.match(root.querySelector('[data-achievement-id=personal_bests_three] [data-achievement-progress]').textContent,/3 of 4 games with a personal best/,'variety tiers explain both conditions');
 assert.deepEqual(plain(S.snapshot().earned),ids,'earned facts come from the canonical owner summary');
 assert.equal(S.snapshot().selected.length,0);
 assert.equal(f.writes.length,0,'loading and mounting never write metadata');
 const unchanged=JSON.stringify(f.state());
 assert.equal(C.earned(summaryFor('wrong-owner'),'owner-a').available,false);
 for(const bad of [-1,Infinity,'12',null])assert.equal(C.earned(summaryFor('owner-a',{total_games:bad}),'owner-a').available,false);
 assert.equal(C.earned({...summaryFor('owner-a'),personal_bests:undefined},'owner-a').available,false);
 const invalidPB=summaryFor('owner-a');invalidPB.personal_bests=[...invalidPB.personal_bests,{game_id:'unknown',result_id:'00000000-0000-4000-8000-000000000004'},invalidPB.personal_bests[0],{game_id:'topicrush',result_id:'not-a-uuid'}];
 assert.equal(C.earned(invalidPB,'owner-a').metrics.personalBestGames,3);
 for(const badge of C.badges){
  const counter={totalGames:'total_games',fullDailyCount:'full_daily_count',bestStreak:'best_streak'}[badge.metric];
  if(counter){assert.equal(C.earned(summaryFor('owner-a',{[counter]:badge.target-1}),'owner-a').ids.includes(badge.id),false);assert.equal(C.earned(summaryFor('owner-a',{[counter]:badge.target}),'owner-a').ids.includes(badge.id),true);}
 }
 click(f,'[data-achievement-choose]');assert.equal(w.document.activeElement.dataset.avatarTab,'badges');assert.equal(root.dataset.studioPane,'badges');
 assert.equal(root.querySelector('.profile-style-actions').hidden,true);
 const first=click(f,'[data-achievement-id=first_game]');first.focus();w.BrainiProfileAchievements.render();
 assert.equal(w.document.activeElement,first,'live render retains the actual focused choice node');
 assert.equal(root.querySelector('[data-achievement-id=first_game]'),first);
 assert.deepEqual(selectedIn(f,'[data-featured-achievements]'),[],'unsaved badges never leak into the saved diploma row');
 assert.deepEqual(selectedIn(f,'[data-achievement-draft-preview]'),['first_game']);
 click(f,'[data-achievement-id=ten_games]');click(f,'[data-achievement-id=personal_bests_three]');
 assert.equal(root.querySelector('[data-achievement-id=daily_first]').disabled,true,'fourth selection requires removing one');
 click(f,'[data-avatar-tab=look]');assert.equal(root.querySelector('.profile-style-actions').hidden,false);
 click(f,'[data-reward-kind=prop][data-reward-id=bulb]');
 click(f,'[data-avatar-tab=badges]');assert.equal(root.querySelectorAll('[data-achievement-id][aria-pressed=true]').length,3,'badge draft survives another pane');
 click(f,'[data-achievement-save]');await settle();
 assert.deepEqual(f.writes,[{data:{[key]:['first_game','ten_games','personal_bests_three']}}]);
 assert.deepEqual(selectedIn(f,'[data-featured-achievements]'),['first_game','ten_games','personal_bests_three']);
 await S.load();assert.deepEqual(plain(S.snapshot().selected),['first_game','ten_games','personal_bests_three'],'a fresh metadata read restores the confirmed saved preference');
 assert.equal(f.meta.brainilab_avatar_frame_v1,'copper');assert.equal(f.meta.full_name,'Fictional player');
 assert.equal(JSON.stringify(f.state()),unchanged,'badge saves leave local scores, XP, rankings, privacy and avatar state unchanged');
 click(f,'[data-avatar-tab=look]');assert.equal(root.querySelector('[data-reward-kind=prop][data-reward-id=bulb]').getAttribute('aria-pressed'),'true','independent avatar draft survives badge save');
 click(f,'[data-style-cancel]');click(f,'[data-avatar-tab=badges]');
 click(f,'[data-achievement-id=first_game]');click(f,'[data-achievement-cancel]');assert.equal(root.querySelector('[data-achievement-id=first_game]').getAttribute('aria-pressed'),'true');assert.equal(f.writes.length,1);
 for(const id of ['first_game','ten_games','personal_bests_three'])click(f,`[data-achievement-id=${id}]`);
 click(f,'[data-achievement-save]');await settle();assert.deepEqual(f.writes[1],{data:{[key]:[]}},'explicit clearing persists the empty array');
 await S.load();assert.deepEqual(plain(S.snapshot().selected),[]);
 // A new pending save must announce its busy state even after a prior success.
 click(f,'[data-achievement-choose]');click(f,'[data-achievement-id=first_game]');
 let confirmSave;f.holdWrite(new Promise(resolve=>confirmSave=resolve));click(f,'[data-achievement-save]');await tick();
 assert.match(root.querySelector('[data-achievement-status]').textContent,/Saving/);
 assert.equal(root.querySelector('[data-achievement-save]').disabled,true);
 assert.deepEqual(selectedIn(f,'[data-featured-achievements]'),[],'saved row does not advance until confirmation');
 confirmSave();await settle();f.holdWrite(null);
 const tabs=[...root.querySelectorAll('[data-avatar-tab]')];tabs[0].focus();
 for(const [keyName,expected] of [['End','badges'],['ArrowRight','look'],['ArrowLeft','badges'],['Home','look']]){w.document.activeElement.dispatchEvent(new w.KeyboardEvent('keydown',{key:keyName,bubbles:true}));assert.equal(w.document.activeElement.dataset.avatarTab,expected);assert.equal(root.querySelectorAll('[data-avatar-tab][tabindex="0"]').length,1);}

 const invalid=await setup({selected:['first_game','fifty_games','unknown','first_game'],metadata:{xp:999999,earnedAchievements:['streak_seven']}});
 assert.deepEqual(plain(invalid.S.snapshot().selected),['first_game'],'metadata cannot claim locked or unknown achievements');
 for(const request of [['first_game','first_game'],['unknown'],['first_game','ten_games','daily_first','streak_three'],['fifty_games'],null]){assert.equal(await invalid.S.save(request),false);assert.equal(invalid.writes.length,0);await invalid.S.load();}

 const concurrent=await setup({selected:['first_game']});concurrent.setMeta({full_name:'Changed elsewhere',brainilab_profile_title_v1:'curious'});
 assert.equal(await concurrent.S.save(['ten_games']),true);assert.equal(concurrent.meta.full_name,'Changed elsewhere');assert.equal(concurrent.meta.brainilab_profile_title_v1,'curious');
 concurrent.setMeta({[key]:['daily_first']});assert.equal(await concurrent.S.save(['first_game']),false);assert.equal(concurrent.writes.length,1,'same-key conflict is detected before write');
 await concurrent.S.load();assert.deepEqual(plain(concurrent.S.snapshot().selected),['daily_first']);
 concurrent.readError(true);await concurrent.S.load();assert.deepEqual(plain(concurrent.S.snapshot().selected),['daily_first'],'failed same-owner reload retains confirmed selection');
 assert.ok(concurrent.S.snapshot().error);assert.equal(await concurrent.S.save(['ten_games']),false);assert.equal(concurrent.writes.length,1);
 concurrent.readError(false);await concurrent.S.load();concurrent.writeError(true);assert.equal(await concurrent.S.save(['ten_games']),false);assert.deepEqual(plain(concurrent.S.snapshot().selected),['daily_first']);
 concurrent.writeError(false);await concurrent.S.load();concurrent.writeUID('wrong-owner');assert.equal(await concurrent.S.save(['ten_games']),false);assert.deepEqual(plain(concurrent.S.snapshot().selected),[],'contradictory SDK owner makes the view unavailable rather than showing another owner');assert.equal(concurrent.S.snapshot().available,false);

 const pending=await setup({selected:['first_game']});let release;pending.holdRead(new Promise(resolve=>release=resolve));
 const request=pending.S.save(['ten_games']);await tick();assert.equal(await pending.S.save(['daily_first']),false,'concurrent saves share a single active attempt');
 const switching=pending.switchOwner('owner-b');release();await switching;await request;await settle();
 assert.equal(pending.writes.length,0,'late previous-owner read never writes metadata');assert.equal(pending.S.snapshot().owner,'account:owner-b');assert.deepEqual(plain(pending.S.snapshot().selected),[]);
 const late=await setup({selected:['first_game']});let releaseWrite;late.holdWrite(new Promise(resolve=>releaseWrite=resolve));const saving=late.S.save(['ten_games']);await tick();await late.switchOwner('owner-b');releaseWrite();assert.equal(await saving,false);await settle();assert.deepEqual(plain(late.S.snapshot().selected),[],'late previous-owner write response cannot paint the next owner');

 const recovering=await setup({selected:['first_game']});click(recovering,'[data-achievement-choose]');click(recovering,'[data-achievement-id=first_game]');click(recovering,'[data-achievement-id=ten_games]');
 recovering.setProof(null);await recovering.S.load();assert.equal(recovering.root.querySelector('[data-achievement-id=ten_games]').disabled,true);assert.deepEqual(selectedIn(recovering,'[data-achievement-draft-preview]'),[],'unavailable evidence cannot display an earned draft');
 recovering.setProof(summaryFor(recovering.uid));await recovering.S.load();assert.deepEqual(selectedIn(recovering,'[data-achievement-draft-preview]'),['ten_games'],'a same-owner evidence gap preserves the unsaved badge draft');
 assert.deepEqual(selectedIn(recovering,'[data-featured-achievements]'),['first_game'],'confirmed selection is separate from the restored draft');
 assert.doesNotMatch(recovering.root.querySelector('[data-achievement-status]').textContent,/changed elsewhere/,'temporary unavailable evidence is not an external preference edit');
 assert.equal(recovering.writes.length,0);await recovering.switchOwner('owner-b');assert.deepEqual(selectedIn(recovering,'[data-achievement-draft-preview]'),[],'the evidence-gap draft is still isolated from a new owner');

 const evolving=await setup({selected:['first_game','daily_first','streak_three']});click(evolving,'[data-achievement-choose]');
 const unchangedPlayer=JSON.stringify(evolving.state()),focusedBadge=evolving.root.querySelector('[data-achievement-id=first_game]');focusedBadge.focus();
 assert.equal(evolving.root.querySelector('[data-featured-achievements] .achievement-emblem').dataset.material,'silver');
 evolving.setProof(summaryFor(evolving.uid,{total_games:400,full_daily_count:400,best_streak:400}));
 const emblems=[...evolving.root.querySelectorAll('[data-featured-achievements] .achievement-emblem')];assert.equal(emblems.length,3);assert.ok(emblems.every(art=>art.dataset.material==='prismatic'&&art.dataset.tier==='10'),'all three confirmed choices evolve their displayed material automatically');
 assert.equal(evolving.w.document.activeElement,focusedBadge);assert.equal(evolving.root.querySelector('[data-achievement-id=first_game]'),focusedBadge,'tier paint preserves the focused choice node');
 assert.match(focusedBadge.querySelector('[data-achievement-material]').textContent,/Prismatic.*10 of 10/);assert.match(focusedBadge.querySelector('[data-achievement-progress]').textContent,/Highest level reached/);
 assert.equal(evolving.root.querySelector('[data-achievement-save]').disabled,true,'tier evolution does not create a cosmetic preference draft');assert.equal(evolving.writes.length,0);assert.equal(JSON.stringify(evolving.state()),unchangedPlayer,'tier rendering leaves local XP, score, privacy and results untouched');

 const unavailable=await setup({summary:null});assert.equal(unavailable.syncs,1);assert.equal(unavailable.S.snapshot().available,false);assert.equal(unavailable.root.querySelector('[data-achievement-id=first_game]').dataset.state,'unknown');assert.match(unavailable.root.querySelector('[data-achievement-status]').textContent,/Waiting for your saved progress/);assert.equal(unavailable.root.querySelector('[data-achievement-status]').classList.contains('is-error'),false);assert.equal(unavailable.root.querySelector('[data-achievements-panel]').getAttribute('aria-busy'),'false');assert.equal(unavailable.root.querySelector('[data-achievement-retry]').hidden,false);assert.equal(unavailable.writes.length,0);
 const cold=await setup({summary:null,selected:['first_game']});click(cold,'[data-achievement-choose]');const startupReads=cold.reads;
 assert.match(cold.root.querySelector('[data-achievement-counter]').textContent,/Waiting/);assert.doesNotMatch(cold.root.querySelector('[data-achievement-counter]').textContent,/could not be checked/);
 cold.setProof(summaryFor('another-owner',{best_streak:7}));await settle();assert.equal(cold.reads,startupReads,'other-owner progress cannot resume the initial metadata read');
 const lateCanonical=summaryFor(cold.uid,{best_streak:7});cold.setProof(lateCanonical);cold.setProof(lateCanonical);cold.setProof(lateCanonical);await settle();
 assert.equal(cold.S.snapshot().available,true,'late canonical progress automatically readies the Badges pane without Try again');assert.equal(cold.S.snapshot().earned.length,6);assert.match(cold.root.querySelector('[data-achievement-counter]').textContent,/^6 of 8 earned/);
 assert.equal(cold.S.snapshot().error,'');assert.equal(cold.S.snapshot().waitingForProgress,false);assert.equal(cold.root.querySelector('[data-achievement-retry]').hidden,true);assert.deepEqual(selectedIn(cold,'[data-featured-achievements]'),['first_game']);assert.equal(cold.syncs,1,'readiness does not repeat the progression RPC');assert.equal(cold.reads,startupReads+1,'duplicate readiness events share one badge metadata read');assert.equal(cold.writes.length,0);
 cold.readError(true);await cold.S.load();const failedMetadataReads=cold.reads;cold.readError(false);cold.setProof(lateCanonical);cold.setProof(lateCanonical);await settle();
 assert.equal(cold.reads,failedMetadataReads,'metadata errors still require an explicit retry');assert.ok(cold.S.snapshot().error);assert.equal(cold.root.querySelector('[data-achievement-status]').classList.contains('is-error'),true);assert.equal(cold.root.querySelector('[data-achievement-retry]').hidden,false);await cold.S.load();assert.equal(cold.S.snapshot().error,'');assert.equal(cold.writes.length,0);
 const zero=await setup({summary:{progression:{user_id:'owner-a',total_games:0,best_streak:0,full_daily_count:0},personal_bests:[]}});assert.equal(zero.S.snapshot().earned.length,0);assert.match(zero.root.querySelector('[data-achievement-status]').textContent,/No badges earned yet/);
 zero.setProof(summaryFor('owner-a'));assert.equal(zero.S.snapshot().earned.length,5);assert.deepEqual(plain(zero.S.snapshot().selected),[],'new milestones never auto-equip badges');assert.equal(zero.writes.length,0);
 const guest=await setup({signed:false});assert.equal(guest.S.snapshot().owner,null);assert.equal(guest.S.snapshot().available,false);assert.equal(guest.root.querySelector('[data-achievement-signin]').hidden,false);assert.equal(await guest.S.save(['first_game']),false);assert.equal(guest.writes.length,0);
 const timeout=await setup({selected:['first_game']});const timer=timeout.w.setTimeout.bind(timeout.w);timeout.w.setTimeout=(callback,ms)=>timer(callback,ms===12000?1:ms);timeout.holdRead(new Promise(()=>{}));await timeout.S.load();assert.equal(timeout.S.snapshot().loading,false);assert.ok(timeout.S.snapshot().error);
 for(const fixture of [f,invalid,concurrent,pending,late,recovering,evolving,unavailable,cold,zero,guest,timeout])assert.equal(fixture.network,0);
 assert.deepEqual(runtimeErrors,[],'actual UI handlers emit no uncaught runtime errors');
 console.log('PASS achievements: canonical owner evidence and exact thresholds; eight stable cards/six keyboard tabs; max-three preview/save/clear/cancel; separate avatar draft; one metadata field; conflicts, auth errors/timeouts and late-owner isolation; zero network/player/scoring/XP writes.');
}finally{for(const dom of fixtures)dom.window.close();}
