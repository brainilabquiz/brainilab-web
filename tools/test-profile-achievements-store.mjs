import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const {JSDOM}=createRequire(import.meta.url)(process.env.JSDOM_MODULE||'jsdom');
const model=readFileSync('assets/js/profile-achievements-model.js','utf8');
const store=readFileSync('assets/js/profile-achievements-store.js','utf8');
const key='brainilab_featured_achievements_v1';
const copy=value=>JSON.parse(JSON.stringify(value));
const plain=value=>copy(value);
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
const deferred=()=>{let resolve;const promise=new Promise(done=>resolve=done);return {promise,resolve};};
const canonical=(uid='account-a')=>({progression:{user_id:uid,total_games:12,best_streak:3,full_daily_count:1,xp:999999},
  personal_bests:['brainmix','numberroute','brainiword'].map((game_id,n)=>({game_id,result_id:`12345678-1234-4123-8123-${String(n+1).padStart(12,'0')}`}))});

function fixture({guest=false,meta={},summary=canonical(),fastTimeout=false,clientReady=true}={}){
 const dom=new JSDOM('<main></main>',{url:'https://brainilabgames.com/profile/',runScripts:'outside-only'}),w=dom.window;
 let uid=guest?null:'account-a',cached=summary,read=null,write=null,sync=null;
 const metadata=new Map([['account-a',copy(meta)],['account-b',{}]]),calls={read:0,sync:0,writes:[],playerReads:0};
 const untouched={xp:3015,score:1237,level:13,rankings:{total:4321}};
 if(fastTimeout){const timer=w.setTimeout.bind(w);w.setTimeout=(fn,ms,...args)=>timer(fn,ms===12000?15:ms,...args);}
 const response=(owner=uid)=>({data:{user:{id:owner,user_metadata:copy(metadata.get(owner)||{})}},error:null});
 w.BrainiData={authState:()=>uid?{status:'authenticated',user:{id:uid,is_anonymous:false}}:{status:'guest',guestUserId:'guest-only'},
  player:()=>{calls.playerReads++;throw Error('Local player progress is not authoritative');}};
 w.BrainiProgression={getCached:()=>cached?copy(cached):null,sync:async()=>{calls.sync++;return sync?sync():null;}};
 w.BrainiBackendAuth={getClient:()=>clientReady?({auth:{
  getUser:()=>{calls.read++;return read?read():Promise.resolve(response());},
  updateUser:async patch=>{calls.writes.push(copy(patch));if(write)return write(patch);metadata.set(uid,{...metadata.get(uid),...copy(patch.data)});return response();}
 }}):null};
 w.eval(model);w.eval(store);
 return {dom,w,C:w.BrainiAchievementCatalog,S:w.BrainiAchievementStore,calls,untouched,response,
  setRead:fn=>read=fn,setWrite:fn=>write=fn,setSync:fn=>sync=fn,setSummary:value=>cached=value,
  setClientReady:value=>clientReady=value,progress:()=>w.dispatchEvent(new w.Event('brainilab:progressionchange')),
  meta:(owner=uid)=>metadata.get(owner),setMeta:(value,owner=uid)=>metadata.set(owner,copy(value)),
  setOwner:owner=>{uid=owner;cached=owner?canonical(owner):null;w.dispatchEvent(new w.Event('brainilab:authchange'));},
  close:()=>w.close()};
}

{
 const f=fixture();try{
  assert.equal(f.C.badges.length,8);
  assert.deepEqual(plain(f.C.earned(canonical(),'account-a').ids),['first_game','ten_games','personal_bests_three','daily_first','streak_three']);
  assert.equal(f.C.earned(canonical(),'other-account').available,false);
  for(const value of [-1,true,'12',null,Infinity]){const s=canonical();s.progression.total_games=value;assert.equal(f.C.earned(s,'account-a').available,false);}
  const noBests=canonical();delete noBests.personal_bests;assert.equal(f.C.earned(noBests,'account-a').available,false);
  const duplicates=canonical();duplicates.personal_bests.push({...duplicates.personal_bests[0]},
   {game_id:'unknown',result_id:'12345678-1234-4123-8123-123456789123'},
   {game_id:'science',result_id:'not-a-result'},
   {game_id:'history',result_id:duplicates.personal_bests[0].result_id.toUpperCase()});
  assert.equal(f.C.earned(duplicates,'account-a').metrics.personalBestGames,3);
  assert.deepEqual(plain(f.C.clean(null)),[]);
  assert.deepEqual(plain(f.C.clean(['first_game','unknown','first_game','ten_games','fifty_games','streak_seven'])),['first_game','ten_games','fifty_games']);
  assert.deepEqual(plain(f.C.clean(['first_game','fifty_games'],['first_game'])),['first_game']);
 }finally{f.close();}
}

{
 const f=fixture({guest:true});try{
  assert.equal(await f.S.load(),false);assert.equal(await f.S.save(['first_game']),false);
  const state=f.S.snapshot();assert.equal(state.cloud,false);assert.equal(state.available,false);assert.deepEqual(plain(state.earned),[]);
  assert.equal(f.calls.read,0);assert.equal(f.calls.sync,0);assert.equal(f.calls.writes.length,0);
 }finally{f.close();}
}

{
 const f=fixture({meta:{[key]:['first_game','unknown','fifty_games','first_game','ten_games','daily_first','streak_three'],avatar:'keep'}});try{
  assert.equal(await f.S.load(),true);
  const state=f.S.snapshot();assert.equal(state.owner,'account:account-a');assert.equal(state.available,true);
  assert.deepEqual(plain(state.selected),['first_game','ten_games','daily_first']);assert.equal(state.earned.length,5);
  assert.equal(f.calls.writes.length,0,'read sanitization never rewrites metadata');
  for(const ids of [['unknown'],['first_game','first_game'],['first_game','ten_games','daily_first','streak_three'],['fifty_games'],null]){
   assert.equal(await f.S.save(ids),false);assert.equal(f.calls.writes.length,0);assert.match(f.S.snapshot().error,/unlocked badges/);await f.S.load();
  }
  assert.equal(await f.S.save(['first_game','personal_bests_three']),true);
  assert.deepEqual(f.calls.writes,[{data:{[key]:['first_game','personal_bests_three']}}]);
  assert.equal(f.meta().avatar,'keep');assert.match(f.S.snapshot().notice,/saved to your account/);
  assert.equal(await f.S.save([]),true);assert.deepEqual(f.calls.writes.at(-1),{data:{[key]:[]}});
  assert.deepEqual(plain(f.S.snapshot().selected),[],'removing every featured badge is a confirmed preference');
  assert.deepEqual(f.untouched,{xp:3015,score:1237,level:13,rankings:{total:4321}});assert.equal(f.calls.playerReads,0);
 }finally{f.close();}
}

{
 const f=fixture({meta:{[key]:['first_game']}});try{
  await f.S.load();f.setMeta({[key]:['ten_games'],newAvatar:'preserve'});
  assert.equal(await f.S.save(['daily_first']),false);assert.match(f.S.snapshot().error,/another device/);assert.equal(f.calls.writes.length,0);
  assert.deepEqual(plain(f.S.snapshot().selected),['first_game']);await f.S.load();
  assert.deepEqual(plain(f.S.snapshot().selected),['ten_games']);
  f.setMeta({...f.meta(),newTitle:'also preserve'});
  assert.equal(await f.S.save(['daily_first']),true);
  assert.equal(f.meta().newAvatar,'preserve');assert.equal(f.meta().newTitle,'also preserve');
 }finally{f.close();}
}

{
 const f=fixture({meta:{[key]:['first_game']}});try{
  await f.S.load();const wait=deferred();f.setWrite(()=>wait.promise);
  const saving=f.S.save(['ten_games']);await tick();
  assert.equal(f.S.snapshot().saving,true);assert.equal(f.S.snapshot().notice,'');
  assert.deepEqual(plain(f.S.snapshot().selected),['first_game']);assert.equal(await f.S.save(['daily_first']),false);
  wait.resolve({data:{user:{id:'account-a',user_metadata:{[key]:['ten_games']}}},error:null});
  assert.equal(await saving,true);assert.deepEqual(plain(f.S.snapshot().selected),['ten_games']);assert.equal(f.calls.writes.length,1);
 }finally{f.close();}
}

{
 const f=fixture({meta:{[key]:['first_game']}});try{
  await f.S.load();f.setRead(async()=>({error:Error('Offline')}));
  assert.equal(await f.S.load(),false);assert.deepEqual(plain(f.S.snapshot().selected),['first_game']);assert.equal(f.S.snapshot().available,true);
  f.setSummary(null);assert.equal(await f.S.load(),false);assert.equal(f.S.snapshot().available,false);assert.deepEqual(plain(f.S.snapshot().earned),[]);
  f.setSummary(canonical());assert.deepEqual(plain(f.S.snapshot().selected),['first_game'],'confirmed choices recover only with authoritative evidence');
  f.setRead(null);await f.S.load();
  f.setWrite(async()=>({data:{user:{id:'account-a',user_metadata:{[key]:['first_game']}}},error:null}));
  assert.equal(await f.S.save(['ten_games']),false);assert.deepEqual(plain(f.S.snapshot().selected),['first_game']);assert.equal(f.S.snapshot().notice,'');
 }finally{f.close();}
}

{
 const f=fixture();try{
  const old=deferred();f.setRead(()=>f.calls.read===1?old.promise:Promise.resolve(f.response()));
  const loading=f.S.load();f.setMeta({[key]:['daily_first']},'account-b');f.setOwner('account-b');await tick();
  old.resolve({data:{user:{id:'account-a',user_metadata:{[key]:['ten_games']}}},error:null});await loading;
  assert.equal(f.S.snapshot().owner,'account:account-b');assert.deepEqual(plain(f.S.snapshot().selected),['daily_first']);
 }finally{f.close();}
}

{
 const f=fixture({meta:{[key]:['first_game']}});try{
  await f.S.load();const old=deferred();f.setWrite(()=>old.promise);
  const saving=f.S.save(['ten_games']);await tick();f.setOwner('account-b');await tick();
  old.resolve({data:{user:{id:'account-a',user_metadata:{[key]:['ten_games']}}},error:null});assert.equal(await saving,false);
  assert.equal(f.S.snapshot().owner,'account:account-b');assert.deepEqual(plain(f.S.snapshot().selected),[]);
  f.setOwner(null);assert.equal(f.S.snapshot().owner,null);assert.equal(f.S.snapshot().available,false);
 }finally{f.close();}
}

{
 const f=fixture({summary:null});try{
  assert.equal(await f.S.load(),false);assert.equal(f.calls.sync,1);assert.equal(f.calls.read,0);assert.equal(f.S.snapshot().available,false);
  f.setSync(()=>{f.setSummary(canonical());return canonical();});assert.equal(await f.S.load(),true);assert.equal(f.calls.sync,2);
 }finally{f.close();}
}

{
 const f=fixture({fastTimeout:true});try{
  f.setRead(()=>new Promise(()=>{}));assert.equal(await f.S.load(),false);assert.equal(f.S.snapshot().available,false);assert.match(f.S.snapshot().error,/could not be loaded/);
 }finally{f.close();}
}

{
 const f=fixture({meta:{[key]:['first_game']}});try{
  const wait=deferred();f.setRead(()=>wait.promise);
  const first=f.S.load(),second=f.S.load();assert.equal(first,second);assert.equal(f.calls.read,1);
  wait.resolve(f.response());await first;
  f.setRead(async()=>f.response('account-b'));assert.equal(await f.S.load(),false);
  assert.equal(f.S.snapshot().available,false);assert.deepEqual(plain(f.S.snapshot().selected),[],'contradictory provider owner hides prior account presentation');
 }finally{f.close();}
}

{
 const f=fixture({meta:{[key]:['first_game']}});try{
  await f.S.load();f.setRead(async()=>{const changed=canonical();changed.progression.best_streak=0;f.setSummary(changed);return f.response();});
  assert.equal(await f.S.save(['streak_three']),false);assert.equal(f.calls.writes.length,0);
  assert.match(f.S.snapshot().error,/progress changed/);assert.deepEqual(plain(f.S.snapshot().selected),['first_game']);
 }finally{f.close();}
}


{
 const f=fixture({summary:null,clientReady:false,meta:{[key]:['first_game']}});try{
  assert.equal(await f.S.load(),false);assert.equal(f.calls.sync,1);assert.equal(f.calls.read,0);
  f.progress();f.setSummary(canonical('account-b'));f.progress();await tick();
  assert.equal(f.calls.read,0,'missing or other-account progress cannot start a metadata read');
  const ready=deferred();f.setRead(()=>ready.promise);f.setClientReady(true);f.setSummary(canonical());
  f.progress();f.progress();f.progress();await tick();
  assert.equal(f.calls.read,1,'late canonical readiness resumes a single shared metadata read');
  assert.equal(f.calls.sync,1,'canonical readiness never repeats the progression RPC');
  assert.equal(f.S.snapshot().loading,true);assert.equal(f.S.snapshot().available,false);
  ready.resolve(f.response());await tick();
  assert.equal(f.S.snapshot().available,true);assert.deepEqual(plain(f.S.snapshot().selected),['first_game']);
  assert.equal(f.S.snapshot().error,'');f.progress();await tick();assert.equal(f.calls.read,1);
  assert.equal(f.calls.writes.length,0);assert.equal(f.calls.playerReads,0);
 }finally{f.close();}
}

{
 const f=fixture({summary:null});try{
  await f.S.load();f.setRead(async()=>({error:Error('Offline')}));f.setSummary(canonical());f.progress();await tick();
  assert.equal(f.calls.read,1);assert.match(f.S.snapshot().error,/could not be loaded/);
  f.progress();f.setSummary(null);f.progress();f.setSummary(canonical());f.progress();await tick();
  assert.equal(f.calls.read,1,'a metadata failure after bootstrap readiness needs an explicit retry');
  f.setRead(null);assert.equal(await f.S.load(),true);assert.equal(f.calls.read,2);
 }finally{f.close();}
}

{
 const f=fixture();try{
  f.setRead(async()=>({error:Error('Offline')}));assert.equal(await f.S.load(),false);
  f.progress();f.progress();await tick();assert.equal(f.calls.read,1,'ordinary metadata errors are never auto-retried');
  f.setRead(null);assert.equal(await f.S.load(),true);
  f.setSummary(null);assert.equal(await f.S.load(),false);f.setSummary(canonical());f.progress();await tick();
  assert.equal(f.calls.read,2,'a previously confirmed owner keeps the explicit refresh behavior');
 }finally{f.close();}
}

{
 const f=fixture({summary:null});try{
  await f.S.load();const old=deferred();f.setRead(()=>f.calls.read===1?old.promise:Promise.resolve(f.response()));
  f.setSummary(canonical());f.progress();await tick();assert.equal(f.calls.read,1);
  f.setMeta({[key]:['daily_first']},'account-b');f.setOwner('account-b');await tick();
  old.resolve({data:{user:{id:'account-a',user_metadata:{[key]:['ten_games']}}},error:null});await tick();
  assert.equal(f.S.snapshot().owner,'account:account-b');assert.deepEqual(plain(f.S.snapshot().selected),['daily_first']);
  f.setOwner(null);f.progress();await tick();assert.equal(f.S.snapshot().cloud,false);assert.equal(f.calls.read,2);
  assert.equal(f.calls.writes.length,0);
 }finally{f.close();}
}

{
 const f=fixture({meta:{[key]:['first_game','daily_first','streak_three'],achievement_tiers:{first_game:10}}});try{
  await f.S.load();assert.equal(f.C.state('first_game',f.S.snapshot().evidence).level,3,'forged tier metadata cannot upgrade canonical progress');
  const upgraded=canonical();Object.assign(upgraded.progression,{total_games:400,full_daily_count:400,best_streak:400});f.setSummary(upgraded);f.progress();
  assert.deepEqual(plain(f.S.snapshot().selected),['first_game','daily_first','streak_three'],'selected legacy IDs automatically keep their places when tiers evolve');
  for(const id of f.S.snapshot().selected)assert.equal(f.C.state(id,f.S.snapshot().evidence).level,10);
  assert.equal(f.calls.writes.length,0,'tier evolution never writes the selection or any player field');assert.equal(f.calls.playerReads,0);
  assert.deepEqual(f.untouched,{xp:3015,score:1237,level:13,rankings:{total:4321}});
  assert.equal(await f.S.save([{id:'first_game',tier:10}]),false,'preferences cannot manufacture tier claims');assert.equal(f.calls.writes.length,0);
 }finally{f.close();}
}

console.log('PASS achievements: owner-canonical eight milestones, strict max3, read sanitization, one-key confirmed saves, unchanged XP/scores, same-field conflict detection, failed-load recovery, stale-account reads/writes, unavailable evidence, one-shot late canonical readiness, explicit metadata retries, automatic canonical tier evolution and bounded timeout.');
