import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

if (!process.env.JSDOM_MODULE) throw new Error('Set JSDOM_MODULE to the existing jsdom entry point.');
const {JSDOM, VirtualConsole} = await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const sources = ['player-personalities', 'icon-system', 'progression-ui'].map(name =>
  readFileSync(`assets/js/${name}.js`, 'utf8'));
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
let passed = 0;
const failed=[];

// These explicit boundary examples are independent fixtures, not a copy of the
// implementation's level formula: 300 XP is level 4; 340 is level 5; 500 is 6.
const reward = (id, overrides = {}) => ({client_result_id:id, verified:true, xp:40, ...overrides});

async function harness({owner='account-A', anonymous=false, sharedStorage=new Map(),
  storageDenied=false, reducedMotion=false}={}) {
  const failures=[], calls=[], writes=[], timers=new Map();
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => failures.push(error.message));
  const dom = new JSDOM('<main><button id="play" type="button">Play</button><p id="result">Result</p></main>', {
    url:'https://brainilabgames.com/games/math-rush/', runScripts:'outside-only', virtualConsole
  });
  const w=dom.window;
  let hidden=false, cached=null, nextTimer=0, recent=[];
  let auth=owner ? anonymous ? {status:'guest', guestUserId:owner} :
    {status:'authenticated', user:{id:owner}} : {status:'guest'};
  const player={displayName:'Curious Curie', level:1, xp:0};
  const state={auth, player};
  let expectedState=JSON.stringify(state);
  const protectedKey='brainilab.mock.v1', protectedValue=JSON.stringify({player:{xp:300,level:4}});
  if (!sharedStorage.has(protectedKey)) sharedStorage.set(protectedKey,protectedValue);
  const initialProtectedValue=sharedStorage.get(protectedKey);
  const storage={
    getItem(key) { if(storageDenied) throw new Error('Storage blocked'); return sharedStorage.get(String(key))??null; },
    setItem(key,value) { if(storageDenied) throw new Error('Storage blocked'); writes.push(String(key)); sharedStorage.set(String(key),String(value)); },
    removeItem(key) { if(storageDenied) throw new Error('Storage blocked'); writes.push(String(key)); sharedStorage.delete(String(key)); },
    clear() { throw new Error('The celebration must not clear storage.'); },
    key(index) { return [...sharedStorage.keys()][index]??null; },
    get length() { return sharedStorage.size; }
  };
  Object.defineProperty(w,'localStorage',{configurable:true,value:storage});
  Object.defineProperty(w.document,'hidden',{configurable:true,get:()=>hidden});
  Object.defineProperty(w.document,'visibilityState',{configurable:true,get:()=>hidden?'hidden':'visible'});
  w.matchMedia=query=>({matches:query.includes('prefers-reduced-motion')&&reducedMotion,media:query,
    addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}});
  w.requestAnimationFrame=callback=>{ callback(0); return 1; };
  w.cancelAnimationFrame=()=>{};
  w.setTimeout=(callback,delay,...args)=>{const id=++nextTimer;timers.set(id,{callback,delay:Number(delay)||0,args});return id;};
  w.clearTimeout=id=>timers.delete(id);
  const forbidden=name=>(...args)=>{calls.push({name,args});throw new Error(`Unexpected side effect: ${name}`);};
  w.fetch=forbidden('fetch');
  w.XMLHttpRequest.prototype.send=forbidden('XMLHttpRequest.send');
  w.navigator.sendBeacon=forbidden('sendBeacon');
  w.HTMLMediaElement.prototype.play=forbidden('media.play');
  w.BrainiData={
    player:()=>player,authState:()=>auth,getState:()=>state,recentResults:()=>recent,
    api:new Proxy({}, {get:(_target,key)=>forbidden(`BrainiData.api.${String(key)}`)})
  };
  w.BrainiProgression={getCached:()=>cached,sync:forbidden('progression.sync')};
  w.BrainiBackendAuth={getClient:()=>({rpc:forbidden('rpc')})};
  for(const source of sources) w.eval(source);
  await tick(); // Allow the actual DOMContentLoaded event to register the watcher.
  const ownerId=()=>auth.user?.id||auth.guestUserId;
  function emit(type,detail) {w.dispatchEvent(new w.CustomEvent(type,{detail}));}
  function publish(xp,rewards=[],{userId=ownerId(),level=99}={}) {
    cached={progression:{user_id:userId,xp,level},recent_rewards:rewards,generated_at:new Date().toISOString()};
    if(userId===ownerId()) Object.assign(player,{xp,level});
    expectedState=JSON.stringify(state);
    emit('brainilab:progressionchange',{summary:cached});
  }
  function game(id,overrides={}) {
    const result={clientResultId:id,gameId:'mathrush',ownerUserId:ownerId(),
      playedAt:new Date().toISOString(),score:600,correct:6,total:10,...overrides};
    recent.unshift(result);
    emit('brainilab:datachange',{type:'game_result',gameId:result.gameId,result});
    return result;
  }
  function lesson(overrides={}) {
    emit('brainilab:lessonreward',{userId:ownerId(),slug:'example-lesson',version:'v1',xpAwarded:40,...overrides});
  }
  function changeOwner(id,{guest=false}={}) {
    auth=id ? guest ? {status:'guest',guestUserId:id} : {status:'authenticated',user:{id}} : {status:'guest'};
    state.auth=auth;cached=null;recent=[];
    Object.assign(player,{xp:0,level:1});expectedState=JSON.stringify(state);
    emit('brainilab:authchange',{status:auth.status});
  }
  function setHidden(value) {hidden=value;w.document.dispatchEvent(new w.Event('visibilitychange'));}
  function pure() {
    assert.deepEqual(failures,[],'Event listeners must not throw, including for invalid inputs.');
    assert.deepEqual(calls,[],'The cosmetic observer must not request a network service or mutate game data.');
    assert.equal(JSON.stringify(state),expectedState,'The cosmetic observer must not change account, XP or level state.');
    assert.equal(sharedStorage.get(protectedKey),initialProtectedValue,'Do not rewrite persisted game/progression data.');
    assert.ok(!writes.includes(protectedKey),'Do not write the local game-state key, even with unchanged bytes.');
    assert.equal(w.document.querySelectorAll('.rank-up-toast').length,0,'The old generic rank toast must not run alongside the new one.');
  }
  function absent(message='No celebration is warranted.') {
    assert.equal(w.document.querySelectorAll('.level-up-toast').length,0,message);pure();
  }
  function shown(level,rank) {
    const nodes=w.document.querySelectorAll('.level-up-toast');
    assert.equal(nodes.length,1,'Exactly one level celebration should be visible.');
    const toast=nodes[0];
    assert.match(toast.textContent,/Level up!/i);
    assert.equal(toast.querySelector('strong')?.textContent.trim(),`Level ${level}`,'Use the level derived from confirmed XP, not the supplied level field.');
    if(rank)assert.match(toast.textContent,new RegExp(rank));
    assert.ok(toast.matches('[role="status"]')||toast.querySelector('[role="status"]'),'Announce a nonblocking status.');
    assert.ok(!toast.matches('[role="dialog"]'),'A level gain must not open a blocking dialog.');
    const close=toast.querySelector('.level-up-close');
    assert.equal(close?.tagName,'BUTTON');assert.equal(close.type,'button');
    assert.ok(close.getAttribute('aria-label')?.trim(),'Dismissal needs an accessible name.');
    pure();return toast;
  }
  function expireTimers() {
    for(let round=0;timers.size&&round<20;round++){
      const batch=[...timers.values()];timers.clear();
      for(const timer of batch)timer.callback(...timer.args);
    }
    assert.equal(timers.size,0,'Dismissal must not create a recurring timer.');
  }
  return {w,publish,game,lesson,emit,changeOwner,setHidden,pure,absent,shown,expireTimers,
    close:()=>dom.window.close()};
}

async function test(name,run,options) {
  const h=await harness(options);
  try {await run(h);h.pure();passed++;console.log(`PASS ${name}`);}
  catch(error){failed.push({name,error});console.error(`FAIL ${name}: ${error.message}`);}
  finally {h.close();}
}

await test('initial cloud hydration and passive later XP never celebrate',h=>{
  h.publish(500,[reward('historical')]);h.absent();
  h.publish(720,[reward('elsewhere'),reward('historical')]);h.absent();
});

await test('a game before the first authoritative baseline does not invent a prior level',h=>{
  h.game('first');h.publish(340,[reward('first')]);h.absent();
});

await test('one verified active game crosses a level without stealing focus',h=>{
  h.publish(300);const play=h.w.document.querySelector('#play');play.focus();
  h.game('live');h.absent();h.publish(340,[reward('live')]);h.shown(5,'Elementary');
  assert.equal(h.w.document.activeElement,play,'Do not steal focus from the result or next action.');
  h.w.document.querySelector('.level-up-close').click();h.absent();
  assert.equal(h.w.document.activeElement,play);
});

await test('a gain inside one level is silent',h=>{
  h.publish(340);h.game('within');h.publish(380,[reward('within')]);h.absent();
});

await test('ordinary level gains work without a rank-tier change',h=>{
  h.publish(340);h.game('ordinary');h.publish(500,[reward('ordinary',{xp:160})]);h.shown(6,'Elementary');
});

await test('a multi-level gain produces one final-level announcement',h=>{
  h.publish(0);h.game('large');h.publish(500,[reward('large',{xp:250})]);h.shown(6,'Elementary');
});

await test('unverified, unrelated and merely saved results are silent',h=>{
  h.publish(300);h.game('pending');
  h.emit('brainilab:datachange',{type:'cloud_result_synced',result:{clientResultId:'pending'}});h.absent();
  h.publish(300,[reward('pending',{verified:false})]);h.absent();
  h.publish(340,[reward('other')]);h.absent();
});

await test('the active result may celebrate when its verification finally arrives',h=>{
  h.publish(300);h.game('delayed');
  h.publish(300,[reward('delayed',{verified:false})]);h.absent();
  h.publish(340,[reward('delayed')]);h.shown(5);
});

for(const flag of ['practice','tryFirst','dailyReplayBlocked']){
  await test(`${flag} cannot register an eligible game`,h=>{
    h.publish(300);h.game(flag,{[flag]:true});h.publish(340,[reward(flag)]);h.absent();
  });
}

await test('refreshes, duplicate events and replayed historical IDs do not replay the effect',h=>{
  h.publish(300,[reward('old')]);h.game('old');h.publish(300,[reward('old')]);h.absent();
  h.game('new');h.publish(340,[reward('new'),reward('old')]);h.shown(5);
  h.w.document.querySelector('.level-up-close').click();h.absent();
  h.publish(340,[reward('new'),reward('old')]);h.game('new');
  h.publish(500,[reward('other'),reward('new'),reward('old')]);h.absent();
});

await test('a reward already present in the baseline cannot explain an unrelated later XP gain',h=>{
  h.publish(300,[reward('already-earned')]);h.game('already-earned');
  h.publish(340,[reward('elsewhere'),reward('already-earned')]);h.absent();
});

await test('Daily completion can cross a level with zero ordinary game XP',h=>{
  h.publish(300);h.game('daily-bonus',{dailyNumber:40});
  h.publish(550,[reward('daily-bonus',{xp:0,daily_limit_reached:true})]);h.shown(6);
});

await test('anonymous server players use their own owner identity',h=>{
  h.publish(300);h.game('guest-live');h.publish(340,[reward('guest-live')]);h.shown(5);
},{owner:'guest-A',anonymous:true});

await test('a result belonging to another owner is rejected',h=>{
  h.publish(300);h.game('wrong-owner',{ownerUserId:'account-B'});
  h.publish(340,[reward('wrong-owner')]);h.absent();
});

await test('a summary belonging to another account is rejected',h=>{
  h.publish(300);h.game('wrong-summary');
  h.publish(340,[reward('wrong-summary')],{userId:'account-B'});h.absent();
});

await test('sign-out and account switching cancel pending and visible effects',h=>{
  h.publish(300);h.game('old-request');h.changeOwner('account-B');
  h.publish(340,[reward('old-request')],{userId:'account-A'});h.absent();
  h.publish(300);h.game('new-account');h.publish(340,[reward('new-account')]);h.shown(5);
  h.changeOwner(null);h.absent();h.publish(500,[reward('new-account')],{userId:'account-B'});h.absent();
});

await test('hidden tabs cancel pending and visible celebrations without replay on return',h=>{
  h.publish(300);h.game('hidden-pending');h.setHidden(true);
  h.publish(340,[reward('hidden-pending')]);h.absent();h.setHidden(false);
  h.publish(340,[reward('hidden-pending')]);h.absent();
  h.game('visible');h.publish(500,[reward('visible'),reward('hidden-pending')]);h.shown(6);
  h.setHidden(true);h.absent();h.setHidden(false);h.publish(500,[reward('visible')]);h.absent();
});

await test('actions arriving while hidden are not deferred celebrations',h=>{
  h.publish(300);h.setHidden(true);h.game('background');h.publish(340,[reward('background')]);h.absent();
  h.setHidden(false);h.publish(340,[reward('background')]);h.absent();
});

for(const xp of [undefined,null,NaN,Infinity,-1,'invalid']){
  await test(`invalid canonical XP ${String(xp)} cannot create a level`,h=>{
    h.publish(300);h.game('bad-xp');h.publish(xp,[reward('bad-xp')],{level:999});h.absent();
  });
}

for(const id of [undefined,null,'',42,{}]){
  await test(`invalid result identifier ${String(id)} is ignored`,h=>{
    h.publish(300);h.game(id);h.publish(340,[reward(id)]);h.absent();
  });
}

await test('malformed event payloads are harmless',h=>{
  h.publish(300);
  for(const detail of [undefined,null,{}, {type:'game_result'}, {type:'game_result',result:null}])h.emit('brainilab:datachange',detail);
  for(const detail of [undefined,null,{}, {summary:null}, {summary:{progression:null}}])h.emit('brainilab:progressionchange',detail);
  h.emit('brainilab:lessonreward',null);h.absent();
});

await test('a confirmed Academy award waits for authoritative XP and celebrates once',h=>{
  h.publish(300);h.lesson();h.absent();h.publish(340);h.shown(5);
  h.w.document.querySelector('.level-up-close').click();h.publish(340);h.absent();
  h.lesson({xpAwarded:0});h.publish(500);h.absent();
});

await test('an intermediate stale Academy read cannot move the fixed award target',h=>{
  h.publish(300);h.lesson({xpAwarded:40});
  h.publish(320);h.absent('A partial stale increment does not confirm the complete 40-XP award.');
  h.publish(340);h.shown(5);
  h.w.document.querySelector('.level-up-close').click();
  h.publish(500);h.absent('The confirmed Academy award must be consumed, not remain pending for later XP.');
});

await test('Academy awards cannot invent a baseline or cross owner boundaries',h=>{
  h.lesson();h.publish(340);h.absent();
  h.lesson({userId:'account-B'});h.publish(500);h.absent();
});

for(const xpAwarded of [0,-40,NaN,Infinity,undefined]){
  await test(`invalid or repeated Academy award ${String(xpAwarded)} is silent`,h=>{
    h.publish(300);h.lesson({xpAwarded});h.publish(340);h.absent();
  });
}

await test('Escape dismisses the notice and it expires without a recurring loop',h=>{
  h.publish(300);h.game('escape');h.publish(340,[reward('escape')]);h.shown(5);
  h.w.document.dispatchEvent(new h.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));h.absent();
  h.game('expires');h.publish(500,[reward('expires'),reward('escape')]);h.shown(6);
  h.expireTimers();h.absent('The transient notice should dismiss automatically.');
});

await test('reduced-motion users receive the same immediate, usable level information',h=>{
  h.publish(300);h.game('reduced');h.publish(340,[reward('reduced')]);h.shown(5);
  assert.equal(h.w.document.querySelector('#play').disabled,false);
  h.w.document.querySelector('.level-up-close').click();h.absent();
},{reducedMotion:true});

await test('blocked storage does not break gameplay or throw',h=>{
  h.publish(300);h.game('blocked-storage');h.publish(340,[reward('blocked-storage')]);h.pure();
  assert.equal(h.w.document.querySelector('#play').disabled,false);
  assert.ok(h.w.document.querySelectorAll('.level-up-toast').length<=1);
},{storageDenied:true});

// Two page contexts share only cosmetic storage; no backend or account fixture
// is shared. A repeated delivery for one owner/result must not celebrate twice.
{
  const sharedStorage=new Map(),a=await harness({sharedStorage}),b=await harness({sharedStorage});
  try{
    a.publish(300);b.publish(300);a.game('same-tab-result');b.game('same-tab-result');
    a.publish(340,[reward('same-tab-result')]);a.shown(5);
    b.publish(340,[reward('same-tab-result')]);b.absent('The second tab must observe the first tab’s cosmetic claim.');
    a.pure();b.pure();passed++;console.log('PASS shared-storage cross-tab duplicate suppression');
  }catch(error){failed.push({name:'shared-storage cross-tab duplicate suppression',error});console.error(`FAIL shared-storage cross-tab duplicate suppression: ${error.message}`);}
  finally{a.close();b.close();}
}

if(failed.length)throw new AggregateError(failed.map(({name,error})=>new Error(name,{cause:error})),`${failed.length} failed; ${passed} passed. No assertions were bypassed.`);
console.log(`PASS ${passed} level-celebration cases. CSS timing, actual reduced motion and mobile geometry require native-browser verification.`);
