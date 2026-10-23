import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../assets/js/home-entry.js',import.meta.url),'utf8');
async function scenario({completed=false,failure=false,timeout=false,detached=false}={}) {
  let init,click,timer,mounts=0,renders=0,focused=false,reloads=0;
  const button={disabled:true,textContent:'',addEventListener:(name,fn)=>{click=fn;}};
  const node={textContent:'',focus:()=>{focused=true;},addEventListener:(name,fn)=>{click=fn;}};
  const stage={isConnected:!detached,innerHTML:'',querySelector:s=>s==='[data-home-start]'?button:node,replaceChildren:()=>{}};
  let loading=true; const root={dataset:{},querySelector:()=>stage,removeAttribute:()=>{loading=false;},setAttribute:()=>{}};
  const status={games:{brainmix:{completed}}};
  const daily={questions:[{q:'Test'}],dailyNumber:26,source:'local'};
  const window={addEventListener:()=>{}};
  const context={window,document:{addEventListener:(_,fn)=>{init=fn;},getElementById:id=>id==='homeQuiz'?root:{content:{cloneNode:()=>({})}}},
    BrainiDaily:{loadToday:async()=>{if(failure)throw Error('offline'); if(timeout)return new Promise(()=>{});return daily;},validDaily:()=>true},
    BrainiData:{daily:()=>({number:26})},BrainiDailyHub:{resolve:async()=>status},BrainiHomeDaily:{render:async(container,value,options)=>{assert.equal(options.compact,true);renders++;}},
    BrainiQuiz:{mount:()=>{mounts++;}},setTimeout:fn=>{timer=fn;return 1;},clearTimeout:()=>{},console:{error:()=>{}},location:{reload:()=>{reloads++;}}};
  vm.runInNewContext(source,context);
  const pending=init();
  if(timeout)timer();
  await pending;
  assert.equal(mounts,0,'No timer/mount before explicit start');
  assert.equal(loading,detached,'Loading state is released for success, completion and errors');
  if(completed){assert.equal(renders,1);assert.equal(click,undefined);}
  else if(detached){assert.equal(click,undefined);}
  else if(failure||timeout){assert.match(stage.innerHTML,/Retry Daily/);click();assert.equal(reloads,1);}
  else{assert.equal(button.disabled,false);click();assert.equal(mounts,1);assert.equal(focused,true);}
}
await scenario();await scenario({completed:true});await scenario({failure:true});await scenario({timeout:true});await scenario({detached:true});
console.log('Home lifecycle: ready, explicit start, completed, failed, timed out and replaced stage passed.');
for(const id of ['brainmix','brainiword','orderup','topicrush','connections','oddoneout','higherlower','mathrush','numberroute','sequence']){
  for(const completed of [false,true]){
    let init;
    const stage={innerHTML:'',isConnected:true};
    const root={querySelector:()=>stage,removeAttribute:()=>{},setAttribute:()=>{}};
    const rules={active:()=>true,lineup:()=>[id]};
    const context={window:{BrainiDailyRules:rules,addEventListener:()=>{}},document:{addEventListener:(_,fn)=>{init=fn;},getElementById:key=>key==='homeQuiz'?root:{}},
      BrainiDailyRules:rules,BrainiData:{todayKey:()=> '2026-10-01'},BrainiDailyJourney:{META:{[id]:{name:id}},gameHref:()=>'/game/?mode=daily'},
      BrainiIcons:{game:key=>`<img data-game="${key}" class="home-daily-icon">`},BrainiDailyHub:{resolve:async()=>({games:{[id]:{completed,points:2000}},bonusChoice:null})},console,setTimeout,clearTimeout};
    vm.runInNewContext(source,context);await init();
    if(completed){assert.match(stage.innerHTML,/Daily complete/);assert.match(stage.innerHTML,/2[,.]?000/);}
    else{assert.match(stage.innerHTML,new RegExp(`data-game="${id}"`));assert.match(stage.innerHTML,/Play today/);assert.ok(!stage.innerHTML.includes('undefined'));assert.match(stage.innerHTML,/href="\/game\/\?mode=daily"/);}
  }
}
console.log('All ten modern Daily introductions and completion states passed.');

// A delayed response must never first paint a returning player as unplayed.
function delayedHome(){
  let init,owner='account-a',day='2026-10-23',connected=true,markup='Server fallback',writes=0;
  const events={},queries=[],timers=new Map(),attributes=new Map([['data-home-loading',''],['aria-busy','true']]);
  const stage={get isConnected(){return connected;},get innerHTML(){return markup;},set innerHTML(value){markup=value;writes++;},contains:()=>false};
  const root={querySelector:()=>stage,setAttribute:(key,value)=>attributes.set(key,value),removeAttribute:key=>attributes.delete(key)};
  const data={todayKey:()=>day,authState:()=>({user:{id:owner}})},rules={active:()=>true,lineup:()=>['mathrush']};
  const window={BrainiData:data,BrainiDailyRules:rules,addEventListener:(event,callback)=>{events[event]=callback;}};
  const context={window,document:{activeElement:null,hidden:false,addEventListener:(event,callback)=>{if(event==='DOMContentLoaded')init=callback;else events[event]=callback;},getElementById:key=>key==='homeQuiz'?root:{}},
    BrainiData:data,BrainiDailyRules:rules,BrainiDailyJourney:{META:{mathrush:{name:'Math Rush'}},gameHref:()=>'/games/math-rush/?daily='+day},BrainiIcons:{game:()=>'<img alt="">'},
    BrainiDailyHub:{resolve:()=>new Promise((resolve,reject)=>queries.push({resolve,reject}))},
    setTimeout:fn=>{const id=Symbol();timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id),console:{warn:()=>{}}};
  vm.runInNewContext(source,context);
  return {init:()=>init(),events,queries,timers,attributes,get markup(){return markup;},get writes(){return writes;},owner:value=>{owner=value;},day:value=>{day=value;},detach:()=>{connected=false;}};
}
const completed={games:{mathrush:{completed:true,points:688}},bonusChoice:'sequence'},unplayed={games:{mathrush:{completed:false}}};
let delayed=delayedHome(),pending=delayed.init();
assert.equal(delayed.writes,0);assert.ok(delayed.attributes.has('data-home-loading'));assert.equal(delayed.attributes.get('aria-busy'),'true');
delayed.queries[0].resolve(completed);await pending;assert.match(delayed.markup,/Daily complete/);assert.ok(!delayed.markup.includes('Play today'));assert.equal(delayed.attributes.get('aria-busy'),'false');assert.equal(delayed.timers.size,0);
// A background refresh or a failing connection keeps the already checked card.
const original=delayed.markup,writeCount=delayed.writes;pending=delayed.events['brainilab:progressionchange']();assert.equal(delayed.markup,original);assert.ok(!delayed.attributes.has('data-home-loading'));
delayed.queries[1].reject(Error('offline'));await new Promise(setImmediate);assert.equal(delayed.markup,original);assert.equal(delayed.writes,writeCount);
delayed=delayedHome();pending=delayed.init();delayed.queries[0].resolve(unplayed);await pending;assert.match(delayed.markup,/Play today/);
delayed=delayedHome();pending=delayed.init();delayed.queries[0].reject(Error('offline'));await pending;assert.match(delayed.markup,/Open today’s Daily/);assert.ok(!delayed.markup.includes('Daily complete'));assert.ok(!delayed.attributes.has('data-home-loading'));
// Bounded neutral fallback remains usable; a later successful check can finish.
delayed=delayedHome();pending=delayed.init();for(const callback of [...delayed.timers.values()])callback();assert.match(delayed.markup,/Open today’s Daily/);assert.ok(!delayed.markup.includes('Play today'));delayed.queries[0].resolve(completed);await pending;assert.match(delayed.markup,/Daily complete/);
// An old account or UTC day's response cannot replace the current context.
for(const change of ['owner','day']){
 delayed=delayedHome();const old=delayed.init();delayed[change](change==='owner'?'account-b':'2026-10-24');pending=delayed.events[change==='owner'?'brainilab:authchange':'brainilab:daychange']();
 delayed.queries[0].resolve(completed);await old;assert.equal(delayed.writes,0);assert.ok(delayed.attributes.has('data-home-loading'));
 delayed.queries[1].resolve(unplayed);await new Promise(setImmediate);assert.match(delayed.markup,/Play today/);assert.ok(!delayed.markup.includes('688'));assert.equal(delayed.timers.size,0);
}
delayed=delayedHome();pending=delayed.init();delayed.detach();delayed.queries[0].resolve(completed);await pending;assert.equal(delayed.writes,0);
console.log('PASS modern homepage: neutral first paint, delayed completion, confirmed unplayed, offline/timeout fallback, late recovery, stable background refresh, account/day isolation and detached stage.');
