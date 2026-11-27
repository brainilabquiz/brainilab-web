import fs from 'node:fs';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href),src=f=>fs.readFileSync('assets/js/'+f,'utf8');

// Guests and the Daily extra (Nov 2026). The server only accepts an extra after a verified main Daily
// ("Complete the main Daily first", HTTP 400). Opening an extra directly used to create a guest account just to be
// refused. Without a session, or as a guest who has not finished the main game in this browser, the guard now
// answers itself; signed-in players (who may have finished on another device) still ask the server.
const DAY='2026-11-02';
function page(sessionMode,{mainDone=false}={}){
  const dom=new JSDOM('<main><div class="labgame-shell"></div></main>',{url:'https://brainilabgames.com/games/order-up/',runScripts:'outside-only'}),w=dom.window;
  w.Date=class extends Date{constructor(...args){super(...(args.length?args:[DAY+'T12:00:00Z']));}static now(){return Date.parse(DAY+'T12:00:00Z');}};
  w.eval(src('daily-rules.js'));w.eval(src('data.js'));
  const ids=w.BrainiDailyRules.lineup(DAY);
  assert.deepEqual(Array.from(ids),['mathrush','orderup','brainmix'],'Order Up is an extra on this day');
  if(mainDone){const real=w.BrainiData.daily;w.BrainiData.daily=()=>({...real(),completedGames:['mathrush']});}
  const calls={choose:0,ensure:0,lineup:0};
  const session=sessionMode==='none'?null:sessionMode==='guest'?{user:{id:'guest',is_anonymous:true}}:sessionMode==='member'?{user:{id:'member',is_anonymous:false}}:undefined;
  w.BrainiBackendAuth={
    getClient:()=>({rpc:async name=>{
      if(name==='get_brainilab_daily_lineup'){calls.lineup++;return {data:{rules_version:'daily-choice-v1',games:Array.from(ids),max_score:3500,extra_max:1000}};}
      calls.choose++;return mainDone?{data:{game_id:'orderup'}}:{error:{message:'Complete the main Daily first'}};
    }}),
    ensurePlayerSession:async()=>{calls.ensure++;return session||{user:{id:'new-guest',is_anonymous:true}};},
    ...(sessionMode==='unknown'?{}:{getSession:async()=>session})
  };
  w.eval(src('daily-choice-guard.js'));
  return {w,calls};
}
async function run(mode,opts){const p=page(mode,opts);const blocked=await p.w.BrainiDailyChoiceGuard.check(p.w.document.querySelector('.labgame-shell'));return {...p,blocked,text:p.w.document.querySelector('.labgame-shell').textContent};}

// No session yet: no guest is created and no extra is requested.
let r=await run('none');
assert.equal(r.blocked,true);assert.equal(r.calls.ensure,0,'no guest account is created');assert.equal(r.calls.choose,0,'no request the server must refuse');
assert.match(r.text,/Complete the main Daily first, then come back for your extra\./);assert.match(r.text,/Today’s Daily/);
// A guest who has not finished the main game in this browser: same answer, no request.
r=await run('guest');assert.equal(r.blocked,true);assert.equal(r.calls.choose,0);assert.equal(r.calls.ensure,0);
// A guest who has finished it here: the server confirms the extra.
r=await run('guest',{mainDone:true});assert.equal(r.blocked,false);assert.equal(r.calls.choose,1);
// Signed-in players may have finished on another device: the server decides.
r=await run('member');assert.equal(r.calls.choose,1);assert.equal(r.blocked,true);assert.match(r.text,/Complete the main Daily first/);
r=await run('member',{mainDone:true});assert.equal(r.blocked,false);assert.equal(r.calls.choose,1);
// When the session cannot be read, the previous behaviour stays (the server decides).
r=await run('unknown');assert.equal(r.calls.ensure,1);assert.equal(r.calls.choose,1);

// The guard ships in the shell bundle used by every game page.
assert.ok(fs.readFileSync('assets/js/shell.bundle.js','utf8').includes("existing===null||existing?.user?.is_anonymous"),'shell bundle rebuilt');
console.log('Guest Daily extra checks passed');
