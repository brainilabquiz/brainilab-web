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
 const D=w.BrainiData,meta=new Map([['owner-a',{keep:'unchanged'}],['owner-b',{}]]),played=new Map([['owner-a',[]],['owner-b',[]]]),writes=[],reads=[];
 let uid='owner-a',failed=false,wrongOwner=false,hold=null;
 if(!guest){await D.api.syncExternalAuthUser({id:uid,email:'fictional@example.test',user_metadata:meta.get(uid)});await D.api.syncCloudProgression({progression:{xp:100000,level:71,total_games:10},today:{daily_brain_score:1234},recent_rewards:[]});}
 w.BrainiBackendAuth={getClient:()=>({
  from:()=>({select:()=>({eq:async()=>({data:[],error:null})})}),
  rpc:async name=>{reads.push({name,owner:uid});const value={data:{owner:wrongOwner?'wrong-owner':uid,games:plain(played.get(uid)),activeDays:0},error:failed?Error('offline'):null};if(hold)await hold;return value;},
  auth:{getUser:async()=>({data:{user:{id:uid,user_metadata:plain(meta.get(uid))}},error:null}),updateUser:async({data})=>{writes.push(plain(data));meta.set(uid,{...meta.get(uid),...plain(data)});return {data:{user:{id:uid,user_metadata:plain(meta.get(uid))}},error:null};}}
 })};
 for(const name of ['profile-rewards-model','profile-rewards-store','avatar-studio-ui','profile-rewards'])w.eval(source(name));await settle();
 return {dom,w,D,meta,played,writes,reads,S:w.BrainiRewardStore,C:w.BrainiRewardCatalog,root:w.document.querySelector('[data-profile-rewards]'),state:()=>JSON.parse(w.localStorage.getItem('brainilab.mock.v1')),
  fail:v=>failed=v,wrong:v=>wrongOwner=v,hold:v=>hold=v,
  async switchOwner(next){uid=next;await D.api.syncExternalAuthUser({id:uid,email:'fictional@example.test',user_metadata:meta.get(uid)});await settle();}
 };
}
const fixtures=[],make=async options=>{const f=await setup(options);fixtures.push(f);return f;};
try{
 const f=await make(),{C,S,root,w}=f,A=w.BrainiAvatarDesign;
 assert.equal(C.discoveryGames.length,17);assert.equal(C.discoveryRewards.length,5);
 assert.equal(new Set(C.discoveryGames.map(g=>g.id)).size,17);
 assert.equal(root.querySelectorAll('[data-discovery-card]').length,5);
 assert.equal(root.querySelectorAll('[data-avatar-pane=extras] details').length,0);
 const sql=readFileSync('supabase/migrations/20261017152832_discovery_avatar_challenges.sql','utf8');
 const fixture=readFileSync('supabase/tests/discovery_avatar_challenges.sql','utf8');
 const rpcBody=sql.split('$discovery$')[1].replaceAll('public.game_sessions','pg_temp.game_sessions').replaceAll('public.game_results','pg_temp.game_results');
 assert.ok(fixture.includes(rpcBody),'SQL tests exercise the exact invoker RPC predicate');
 const serverOptions=JSON.parse(sql.match(/v_catalog constant jsonb := '(.*?)'::jsonb;/s)[1]);
 for(const [kind,list]of Object.entries(A.options))assert.deepEqual(serverOptions[kind],plain(list.filter(i=>!i.days).map(i=>[i.id,i.xp])));
 const rules=JSON.parse(sql.match(/v_discovery_catalog constant jsonb := '(.*?)'::jsonb;/s)[1]);
 const drawings=new Set();
 for(const item of C.discoveryRewards){
  assert.deepEqual(rules[item.id],plain(item.target?{target:item.target}:{games:item.games}));
  const required=item.games||C.discoveryGames.slice(0,item.target).map(g=>g.id),almost=required.slice(0,-1);
  assert.equal(C.discoveryProgress(item,almost).earned,false);
  assert.equal(C.discoveryProgress(item,[...almost,...almost,'unknown']).earned,false,'duplicates and unknown IDs cannot finish a challenge');
  assert.equal(C.discoveryProgress(item,required).earned,true);
  assert.equal(C.available({[item.kind]:item.id},100000)[item.kind],'none','XP never grants a challenge item');
  assert.equal(C.available({[item.kind]:item.id},0,[],required)[item.kind],item.id);
  assert.equal(root.querySelector(`[data-reward-id="${item.id}"]`).disabled,true);
  const art=A.markup({mode:'built',[item.kind]:item.id},0);assert.equal(art.includes('undefined'),false);drawings.add(art);
 }
 assert.equal(drawings.size,5);assert.equal(C.next(100000),null);
 for(const g of C.discoveryGames)assert.ok(existsSync(g.path.slice(1)+'index.html'),g.path);
 assert.deepEqual(plain(C.gameIds(['mathrush','mathrush','<script>','flagdash',12])),['mathrush']);
 const before=plain(f.state());delete before.player.avatarDesign;
 assert.equal(f.writes.length,0);
 f.meta.set('owner-a',{keep:'unchanged',brainilab_avatar_mode_v1:'built',brainilab_avatar_prop_v1:'discovery_trailmix',discovery:['brainmix','science','history']});
 await S.load();assert.equal(S.snapshot().style.prop,'none','metadata is not evidence');
 assert.equal(await S.save({...S.snapshot().style,prop:'discovery_trailmix'}),false);assert.equal(f.writes.length,0);
 f.meta.set('owner-a',{keep:'unchanged'});f.played.set('owner-a',['brainiword','connections','brainmix']);await S.load();
 assert.equal(S.snapshot().style.prop,'none','earlier completion unlocks never auto-equip');
 root.querySelector('[data-avatar-tab=challenges]').click();
 const item=root.querySelector('[data-reward-id=discovery_trailmix]');assert.equal(item.disabled,false);
 assert.match(root.querySelector('[data-discovery-card=discovery_trailmix] [data-challenge-status]').textContent,/3 of 3/);
 assert.match(root.querySelector('[data-discovery-card=discovery_gameface] [data-challenge-status]').textContent,/3 of 8/);
 assert.equal(root.querySelector('[data-discovery-card=discovery_crunch] a').getAttribute('href'),'/games/number-route/');
 item.click();assert.match(root.querySelector('[data-style-preview-label]').textContent,/not saved/);assert.equal(f.writes.length,0);
 root.querySelector('[data-style-cancel]').click();assert.equal(S.snapshot().style.prop,'none');
 item.click();root.querySelector('[data-style-save]').click();await settle();
 assert.equal(S.snapshot().style.prop,'discovery_trailmix');assert.deepEqual(f.writes,[{brainilab_avatar_mode_v1:'built',brainilab_avatar_prop_v1:'discovery_trailmix'}]);
 const after=plain(f.state());delete after.player.avatarDesign;assert.deepEqual(after,before,'all XP, scores, games, levels and ranking settings stay identical');
 assert.equal(f.meta.get('owner-a').keep,'unchanged');
 await S.load();assert.equal(S.snapshot().style.prop,'discovery_trailmix');
 const parsed=A.fromPublicStyle({design:A.clean({mode:'built',prop:'discovery_trailmix'}),render_xp:0});assert.equal(parsed.avatarDesign.prop,'discovery_trailmix');
 for(let n=0;n<25;n++)for(const kind of ['hat','glasses','prop'])assert.equal(C.groups[kind].find(i=>i.id===C.surprise({},100000,()=>n/25)[kind]).challenge,undefined);
 f.played.set('owner-a',['brainiword','connections','brainmix','worldflags','worldcapitals']);await S.load();f.played.set('owner-a',['brainiword','connections','brainmix']);
 assert.equal(await S.save({...S.snapshot().style,prop:'discovery_globe'}),false,'save rechecks canonical discovery evidence');assert.equal(f.writes.length,1);
 await S.load();f.wrong(true);await S.load();assert.match(S.snapshot().error,/could not be checked/);assert.equal(f.writes.length,1);f.wrong(false);
 await S.load();f.fail(true);await S.load();assert.equal(await S.save({...S.snapshot().style,hat:'cap'}),false);assert.equal(f.writes.length,1);f.fail(false);await S.load();
 let release;f.hold(new Promise(r=>release=r));const pending=S.load();await tick();await tick();f.hold(null);await f.switchOwner('owner-b');release();await pending;await settle();
 assert.deepEqual(plain(S.snapshot().discovery),[]);assert.equal(S.snapshot().style.prop,'none');assert.equal(item.disabled,true);assert.equal(f.writes.length,1);
 const guest=await make({guest:true});assert.equal(guest.reads.length,0);assert.equal(await guest.S.save({...guest.S.snapshot().style,prop:'discovery_trailmix'}),false);
 console.log('PASS discovery challenges: five exact client/server rules, seventeen destinations, distinct artwork, thresholds, duplicate/unknown IDs, retroactive progress, next-game links, metadata forgery, zero-XP unlocks, Save/Cancel, fresh evidence, owner isolation, retry and unchanged XP/scores.');
}finally{for(const f of fixtures)f.dom.window.close();}
