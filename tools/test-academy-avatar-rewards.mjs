import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const rootPath=process.env.AVATAR_SOURCE_ROOT||'.';
const source=f=>readFileSync(rootPath+'/assets/js/'+f+'.js','utf8');
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
const settle=async()=>{for(let n=0;n<5;n++)await tick();};
const plain=value=>JSON.parse(JSON.stringify(value));
async function setup({xp=0,guest=false}={}){
 const dom=new JSDOM('<body class="profile-page"><div class="nav-right"><span class="avatar"></span></div><section data-profile-rewards></section></body>',{url:'https://brainilabgames.com/profile/',runScripts:'outside-only'}),w=dom.window;
 for(const f of ['player-personalities','avatar-design','data','progression-ui'])w.eval(source(f));
 const D=w.BrainiData,accounts=new Map([['owner-a',{custom_setting:'preserve'}],['owner-b',{}]]),earned=new Map([['owner-a',[]],['owner-b',[]]]);
 let uid='owner-a',offline=false,hold=null;const writes=[],queries=[];
 if(!guest){await D.api.syncExternalAuthUser({id:uid,email:'fixture@example.test',user_metadata:accounts.get(uid)});await D.api.syncCloudProgression({progression:{xp,level:1,total_games:9},today:{daily_brain_score:1234},recent_rewards:[]});}
 w.BrainiBackendAuth={getClient:()=>({
  rpc:async()=>({data:{owner:uid,games:[]},error:null}),
  from:table=>({select:columns=>({eq:async(key,id)=>{queries.push({table,columns,key,id});const result={data:(earned.get(id)||[]).map(reward_id=>({reward_id})),error:offline?Error('offline'):null};if(hold)await hold;return result;}})}),
  auth:{getUser:async()=>({data:{user:{id:uid,user_metadata:plain(accounts.get(uid))}},error:null}),updateUser:async({data})=>{writes.push(plain(data));accounts.set(uid,{...accounts.get(uid),...plain(data)});return {data:{user:{id:uid,user_metadata:plain(accounts.get(uid))}},error:null};}}
 })};
 for(const f of ['profile-rewards-model','profile-rewards-store','avatar-studio-ui','profile-rewards'])w.eval(source(f));
 await settle();
 return {dom,w,D,accounts,earned,writes,queries,S:w.BrainiRewardStore,C:w.BrainiRewardCatalog,root:w.document.querySelector('[data-profile-rewards]'),
  offline:value=>offline=value,hold:value=>hold=value,
  state:()=>JSON.parse(w.localStorage.getItem('brainilab.mock.v1')),
  async switchOwner(id){uid=id;await D.api.syncExternalAuthUser({id,email:'fixture@example.test',user_metadata:accounts.get(id)});await settle();}
 };
}
const fixtures=[];const make=async options=>{const f=await setup(options);fixtures.push(f);return f;};
try{
 const f=await make({xp:100000}),{C,S,root,w}=f,A=w.BrainiAvatarDesign;
 assert.equal(C.academyRewards.length,8);assert.equal(new Set(C.academyRewards.map(r=>r.course)).size,8);
 const migration=readFileSync('supabase/migrations/20261017144853_academy_avatar_rewards.sql','utf8');
 const serverCatalog=JSON.parse(migration.match(/v_catalog constant jsonb := '(.*?)'::jsonb;/s)[1]);
 for(const [kind,list]of Object.entries(A.options))assert.deepEqual(serverCatalog[kind],plain(list.filter(i=>!i.challenge).map(i=>[i.id,i.xp])),'client and server artwork/XP catalogs agree');
 for(const item of C.academyRewards)assert.ok(migration.includes(`('${item.id}','${item.course}')`),'course mapping agrees with the grant helper');
 const fixture=readFileSync('supabase/tests/academy_avatar_rewards.sql','utf8');
 const normal=s=>s.replaceAll('pg_temp.','public.').replace('public.users','auth.users');
 const grantBody=s=>s.match(/as \$grant\$([\s\S]*?)\$grant\$/)[1];
 assert.equal(normal(grantBody(fixture)),normal(grantBody(migration)),'SQL fixture runs the exact grant body with only isolated relations');
 const avatarBody=s=>s.match(/AS \$function\$([\s\S]*?)\$function\$/)[1];
 assert.equal(normal(avatarBody(fixture)),normal(avatarBody(migration)),'SQL fixture runs the exact public appearance gate');
 assert.equal(root.querySelectorAll('[data-academy-card]').length,8);
 assert.equal(root.querySelectorAll('[data-avatar-pane=extras] details').length,0,'XP extras stay expanded');
 const drawings=new Set();
 for(const item of C.academyRewards){
  assert.equal(C.available({[item.kind]:item.id},100000)[item.kind],'none','XP alone never unlocks a course extra');
  assert.equal(C.available({[item.kind]:item.id},0,[item.id])[item.kind],item.id,'canonical completion needs no XP threshold');
  const button=root.querySelector(`[data-reward-id="${item.id}"]`);assert.equal(button.disabled,true);
  assert.match(button.getAttribute('aria-label'),/complete .* to unlock/);
  assert.equal(button.closest('[data-academy-card]').querySelector('a').getAttribute('href'),'/learn/paths/'+item.course+'/');
  const svg=A.markup({mode:'built',[item.kind]:item.id},0);drawings.add(svg);assert.ok(svg.includes('<svg'));assert.equal(svg.includes('undefined'),false);
 }
 assert.equal(drawings.size,8,'all eight extras have distinct original artwork');
 assert.equal(C.next(100000),null,'course rewards are not mislabelled as XP milestones');
 const state=plain(f.state());delete state.player.avatarDesign;
 assert.deepEqual(f.writes,[],'loading never equips or grants anything');
 assert.ok(f.queries.every(q=>q.table==='learn_avatar_unlocks'&&q.columns==='reward_id'&&q.key==='user_id'&&q.id==='owner-a'));
 f.accounts.set('owner-a',{custom_setting:'preserve',brainilab_avatar_prop_v1:'academy_pie',brainilab_avatar_mode_v1:'built',academyRewards:['academy_pie']});
 await S.load();assert.equal(S.snapshot().style.prop,'none','user metadata cannot prove completion');
 assert.equal(await S.save({...S.snapshot().style,prop:'academy_pie'}),false);assert.equal(f.writes.length,0);
 f.accounts.set('owner-a',{custom_setting:'preserve'});f.earned.set('owner-a',['academy_pie','unknown','academy_pie']);await S.load();
 assert.deepEqual(plain(S.snapshot().academy),['academy_pie']);assert.equal(S.snapshot().style.prop,'none','retroactive unlocks do not auto-equip');
 root.querySelector('[data-avatar-tab=academy]').click();const pie=root.querySelector('[data-reward-id=academy_pie]');
 assert.equal(pie.disabled,false);assert.match(root.querySelector('[data-academy-count]').textContent,/1 of 8/);
 pie.click();assert.equal(root.querySelector('[data-style-preview-label]').textContent,'Preview · not saved');assert.equal(f.writes.length,0);
 root.querySelector('[data-style-cancel]').click();assert.equal(S.snapshot().style.prop,'none');
 pie.click();root.querySelector('[data-style-save]').click();await settle();
 assert.equal(S.snapshot().style.prop,'academy_pie');assert.equal(f.D.player().avatarDesign.prop,'academy_pie');
 assert.deepEqual(f.writes,[{brainilab_avatar_mode_v1:'built',brainilab_avatar_prop_v1:'academy_pie'}]);
 assert.equal(f.accounts.get('owner-a').custom_setting,'preserve');
 const after=plain(f.state());delete after.player.avatarDesign;assert.deepEqual(after,state,'scores, XP, results, streaks, rankings and all other player data stay byte-equivalent');
 await S.load();assert.equal(S.snapshot().style.prop,'academy_pie','earned choice survives a fresh account read');
 const publicStyle=A.fromPublicStyle({design:A.clean({mode:'built',prop:'academy_pie'}),render_xp:0});
 assert.equal(publicStyle.avatarDesign.prop,'academy_pie');assert.ok(A.markup(publicStyle.avatarDesign,publicStyle.avatarRenderXp).includes('#c85d78'));
 for(let n=0;n<25;n++)for(const kind of ['hat','glasses','prop'])assert.equal(C.groups[kind].find(i=>i.id===C.surprise({},100000,()=>n/25)[kind]).course,undefined,'Surprise cannot select an unearned course reward');
 assert.equal(C.surprise({},0,()=>.999,['academy_pie']).prop,'academy_pie');
 // Eligibility is checked again immediately before saving a new course item.
 f.earned.set('owner-a',['academy_pie','academy_moon']);await S.load();f.earned.set('owner-a',['academy_pie']);
 assert.equal(await S.save({...S.snapshot().style,prop:'academy_moon'}),false);assert.equal(f.writes.length,1);
 await S.load();f.offline(true);await S.load();assert.match(S.snapshot().error,/could not be checked/);assert.equal(await S.save({...S.snapshot().style,hat:'cap'}),false);assert.equal(f.writes.length,1);
 f.offline(false);await S.load();assert.equal(S.snapshot().error,'');assert.equal(S.snapshot().style.prop,'academy_pie');
 // A pending former-owner result must never unlock or equip for a new owner.
 let release;f.hold(new Promise(resolve=>release=resolve));const pending=S.load();await tick();await tick();
 f.hold(null);await f.switchOwner('owner-b');release();await pending;await settle();
 assert.deepEqual(plain(S.snapshot().academy),[]);assert.equal(S.snapshot().style.prop,'none');assert.equal(root.querySelector('[data-reward-id=academy_pie]').disabled,true);assert.equal(f.writes.length,1);
 const g=await make({guest:true});assert.equal(g.queries.length,0);assert.deepEqual(plain(g.S.snapshot().academy),[]);
 assert.equal(await g.S.save({...g.S.snapshot().style,mode:'built',hat:'academy_rainbow'}),false);assert.equal(g.writes.length,0);
 console.log('Academy avatar collection: 8 course contracts, artwork, retroactivity, forged metadata, fresh eligibility, owner isolation, offline retry, explicit Save/Cancel, social parsing and no XP/score writes passed.');
}finally{for(const f of fixtures)f.dom.window.close();}
