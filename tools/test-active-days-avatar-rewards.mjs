import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const sourceRoot=process.env.AVATAR_SOURCE_ROOT||'.',plain=x=>JSON.parse(JSON.stringify(x));
const tick=()=>new Promise(r=>setTimeout(r,0)),settle=async()=>{for(let n=0;n<5;n++)await tick();};
async function setup({guest=false}={}){
 const dom=new JSDOM('<body class="profile-page"><div class="nav-right"><span class="avatar"></span></div><section data-profile-rewards></section></body>',{url:'https://brainilabgames.com/profile/',runScripts:'outside-only'}),w=dom.window;
 const source=name=>readFileSync(sourceRoot+'/assets/js/'+name+'.js','utf8');
 for(const name of ['player-personalities','avatar-design','data','progression-ui'])w.eval(source(name));
 const D=w.BrainiData,meta=new Map([['owner-a',{keep:'unchanged'}],['owner-b',{}]]),played=new Map([['owner-a',[]],['owner-b',[]]]),writes=[],reads=[],calendar=new Map([['owner-a',0],['owner-b',0]]);
 let uid='owner-a',failed=false,wrongOwner=false,hold=null;
 if(!guest){await D.api.syncExternalAuthUser({id:uid,email:'fictional@example.test',user_metadata:meta.get(uid)});await D.api.syncCloudProgression({progression:{xp:100000,level:71,total_games:10},today:{daily_brain_score:1234},recent_rewards:[]});}
 w.BrainiBackendAuth={getClient:()=>({
  from:()=>({select:()=>({eq:async()=>({data:[],error:null})})}),
  rpc:async name=>{reads.push({name,owner:uid});const value={data:{owner:wrongOwner?'wrong-owner':uid,games:plain(played.get(uid)),activeDays:calendar.get(uid)},error:failed?Error('offline'):null};if(hold)await hold;return value;},
  auth:{getUser:async()=>({data:{user:{id:uid,user_metadata:plain(meta.get(uid))}},error:null}),updateUser:async({data})=>{writes.push(plain(data));meta.set(uid,{...meta.get(uid),...plain(data)});return {data:{user:{id:uid,user_metadata:plain(meta.get(uid))}},error:null};}}
 })};
 for(const name of ['profile-rewards-model','profile-rewards-store','avatar-studio-ui','avatar-wardrobe-ui','profile-rewards'])w.eval(source(name));await settle();
 return {dom,w,D,meta,played,calendar,writes,reads,S:w.BrainiRewardStore,C:w.BrainiRewardCatalog,root:w.document.querySelector('[data-profile-rewards]'),state:()=>JSON.parse(w.localStorage.getItem('brainilab.mock.v1')),
  fail:v=>failed=v,wrong:v=>wrongOwner=v,hold:v=>hold=v,
  async switchOwner(next){uid=next;await D.api.syncExternalAuthUser({id:uid,email:'fictional@example.test',user_metadata:meta.get(uid)});await settle();}
 };
}
const fixtures=[];
try{
 const f=await setup();fixtures.push(f);const {C,S,root,w}=f,A=w.BrainiAvatarDesign;
 assert.equal(C.dayRewards.length,4);assert.deepEqual(C.dayRewards.map(r=>r.days).join(','),'3,10,30,100');
 const sql=readFileSync('supabase/migrations/20261017160240_active_days_avatar_rewards.sql','utf8');
 const fixture=readFileSync('supabase/tests/active_days_avatar_rewards.sql','utf8');
 const rpcBody=sql.split('$days$')[1].replaceAll('public.game_sessions','pg_temp.game_sessions').replaceAll('public.game_results','pg_temp.game_results');
 assert.ok(fixture.includes(rpcBody),'SQL fixture executes the exact UTC and eligibility predicate');
 const server=JSON.parse(sql.match(/v_catalog constant jsonb := '(.*?)'::jsonb;/s)[1]);
 for(const [kind,list]of Object.entries(A.options))assert.deepEqual(server[kind],plain(list.map(i=>[i.id,i.xp])));
 const rules=JSON.parse(sql.match(/v_day_catalog constant jsonb := '(.*?)'::jsonb;/s)[1]);
 assert.deepEqual(rules,Object.fromEntries(C.dayRewards.map(r=>[r.id,r.days])));
 assert.equal(root.querySelectorAll('[data-day-card]').length,4);assert.equal(root.querySelectorAll('[data-discovery-card]').length,5);
 assert.equal(root.querySelectorAll('[data-avatar-pane=extras] details').length,0);
 assert.match(root.querySelector('.avatar-day-collection').textContent,/Breaks never reset/);assert.match(root.textContent,/using UTC/);
 const art=new Set();
 for(const item of C.dayRewards){
  assert.equal(C.available({[item.kind]:item.id},100000)[item.kind],'none','XP alone cannot grant a day extra');
  assert.equal(C.available({[item.kind]:item.id},0,[],[],item.days-1)[item.kind],'none');
  assert.equal(C.available({[item.kind]:item.id},0,[],[],item.days)[item.kind],item.id,'No XP requirement for earned days');
  for(const value of [-1,1.5,'100',null,NaN,Infinity])assert.equal(C.available({[item.kind]:item.id},100000,[],[],value)[item.kind],'none');
  const svg=A.markup({mode:'built',[item.kind]:item.id},0);assert.ok(!svg.includes('undefined'));assert.ok(!svg.includes('<script'));art.add(svg);
 }
 assert.equal(art.size,4);assert.ok(!C.next(100000));
 f.meta.set('owner-a',{keep:'unchanged',brainilab_avatar_hat_v1:'days_daydreamer',activeDays:1000000});
 await S.load();assert.equal(S.snapshot().style.hat,'none','Metadata cannot assert play days');
 f.meta.set('owner-a',{keep:'unchanged'});f.calendar.set('owner-a',10);await S.load();
 assert.equal(S.snapshot().activeDays,10);assert.equal(S.snapshot().style.hat,'none','Retroactive recognition never auto-equips');
 root.querySelector('[data-avatar-tab=challenges]').click();
 assert.match(root.querySelector('[data-active-days-count]').textContent,/10 days played/);
 assert.equal(root.querySelector('[data-reward-id=days_daydreamer]').disabled,false);
 assert.equal(root.querySelector('[data-reward-id=days_sunday]').disabled,true);
 assert.equal(root.querySelector('[data-day-card=days_smore] a').getAttribute('href'),'/games/');
 const before=plain(f.state());delete before.player.avatarDesign;
 const button=root.querySelector('[data-reward-id=days_daydreamer]');button.click();assert.equal(f.writes.length,0);
 root.querySelector('[data-style-cancel]').click();assert.equal(S.snapshot().style.hat,'none');
 button.click();root.querySelector('[data-style-save]').click();await settle();
 assert.deepEqual(f.writes,[{brainilab_avatar_mode_v1:'built',brainilab_avatar_hat_v1:'days_daydreamer'}]);
 assert.equal(f.meta.get('owner-a').keep,'unchanged');
 const after=plain(f.state());delete after.player.avatarDesign;assert.deepEqual(after,before,'Scores, XP, rounds, levels, rankings and other saved choices stay identical');
 f.calendar.set('owner-a',100);await S.load();f.calendar.set('owner-a',99);
 assert.equal(await S.save({...S.snapshot().style,prop:'days_smore'}),false,'Fresh days are checked before Save');assert.equal(f.writes.length,1);
 await S.load();f.calendar.set('owner-a','100');await S.load();assert.match(S.snapshot().error,/could not be checked/);f.calendar.set('owner-a',100);await S.load();
 f.wrong(true);await S.load();assert.match(S.snapshot().error,/could not be checked/);f.wrong(false);await S.load();
 let release;f.hold(new Promise(r=>release=r));const pending=S.load();await tick();await tick();f.hold(null);await f.switchOwner('owner-b');release();await pending;await settle();
 assert.equal(S.snapshot().activeDays,0);assert.equal(S.snapshot().style.hat,'none');assert.equal(button.disabled,true);
 for(let n=0;n<50;n++)for(const kind of ['hat','glasses','prop'])assert.ok(!C.groups[kind].find(i=>i.id===C.surprise({},100000,()=>n/50)[kind]).days,'Surprise cannot choose unearned days');
 const guest=await setup({guest:true});fixtures.push(guest);assert.equal(guest.reads.length,0);assert.equal(await guest.S.save({...guest.S.snapshot().style,hat:'days_daydreamer'}),false);
 console.log('PASS active-day extras: four exact rules and drawings, zero-XP boundaries, malformed/forged evidence, retroactivity, no auto-equip, Save/Cancel, fresh owner-bound proof, late account responses, old collections and unchanged XP/scores.');
}finally{for(const f of fixtures)f.dom.window.close();}
