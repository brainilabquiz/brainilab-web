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
  const window={};
  const context={window,document:{addEventListener:(_,fn)=>{init=fn;},getElementById:id=>id==='homeQuiz'?root:{content:{cloneNode:()=>({})}}},
    BrainiDaily:{loadToday:async()=>{if(failure)throw Error('offline'); if(timeout)return new Promise(()=>{});return daily;},validDaily:()=>true},
    BrainiDailyHub:{resolve:async()=>status},BrainiHomeDaily:{render:async(container,value,options)=>{assert.equal(options.compact,true);renders++;}},
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
