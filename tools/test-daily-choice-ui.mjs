import fs from 'node:fs';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href),src=f=>fs.readFileSync('assets/js/'+f,'utf8');
function page(url='https://brainilabgames.com/daily-quiz/'){
 const dom=new JSDOM('<main></main>',{url,runScripts:'outside-only'}),w=dom.window;
 w.Date=class extends Date{constructor(...args){super(...(args.length?args:['2026-10-01T12:00:00Z']));}static now(){return Date.parse('2026-10-01T12:00:00Z');}};
 w.eval(src('daily-rules.js'));w.eval(src('data.js'));w.BrainiIcons={game:()=>'<svg></svg>',product:()=>''};w.eval(src('daily-journey.js'));return dom;
}
let dom=page(),w=dom.window,ids=w.BrainiDailyRules.lineup('2026-10-01'),model=w.BrainiDailyRules.model('2026-10-01');
let status={dailyNumber:w.BrainiData.daily().number,model,dailyIds:ids,completedCount:0,brainScore:0,bonusChoice:null,games:Object.fromEntries(ids.map(id=>[id,{completed:false,points:0}]))};
const main=w.document.querySelector('main');await w.BrainiDailyJourney.render(main,{status});assert.equal(main.querySelectorAll('a.btn').length,1);assert.match(main.textContent,/2,500/);assert.match(main.textContent,/1,000/);assert.ok(!main.textContent.includes('four'));
status.games[ids[0]]={completed:true,points:2000};status.completedCount=1;status.brainScore=2000;await w.BrainiDailyJourney.render(main,{status});assert.equal(main.querySelectorAll('a.btn').length,2);
status.bonusChoice=ids[1];await w.BrainiDailyJourney.render(main,{status});assert.equal(main.querySelectorAll('a.btn').length,1);assert.match(main.textContent,/You chose the other extra/);
w.eval(src('friend-challenge.js'));const invite=w.BrainiFriendChallenge.buildInvite(status,'2026-10-01');assert.match(invite.text,/2,000/);status.brainScore=3000;assert.equal(w.BrainiFriendChallenge.buildInvite(status,'2026-10-01').text,invite.text,'bonus cannot inflate the friend challenge');
status.games[ids[1]]={completed:true,points:1000};await w.BrainiDailyJourney.render(main,{status});assert.equal(main.querySelectorAll('a.btn').length,0);w.close();
// Two-device selection and mismatch handling use real guard code with a controlled RPC.
for(const mode of ['allowed','claimed','unverified','mismatch','offline']){
 dom=page('https://brainilabgames.com/games/brainiword/');w=dom.window;let claims=0;
 w.BrainiBackendAuth={getClient:()=>({rpc:async name=>{
  if(mode==='offline')throw Error('offline');
  if(name==='get_brainilab_daily_lineup')return {data:{rules_version:mode==='mismatch'?'old':'daily-choice-v1',games:Array.from(ids),max_score:3500,extra_max:1000}};
  claims++;return mode==='claimed'?{error:{message:'Your extra is already chosen'}}:mode==='unverified'?{error:{message:'Complete the main Daily first'}}:{data:{game_id:'brainiword'}};
 }}),ensurePlayerSession:async()=>({user:{id:'fixture'}})};
 w.eval(src('daily-choice-guard.js'));const blocked=await w.BrainiDailyChoiceGuard.check(w.document.querySelector('main'));assert.equal(blocked,mode!=='allowed');assert.equal(claims,['offline','mismatch'].includes(mode)?0:1);if(!blocked)assert.equal(w.BrainiData.daily().bonusChoice,'brainiword');w.close();
}
// Fallback and archive English validation fail closed; malformed server replies are not accepted.
dom=page();w=dom.window;let answer=true,fail=false;w.BrainiBackendAuth={isConfigured:()=>true,getClient:()=>({rpc:async()=>{if(fail)throw Error('offline');return {data:answer};}})};w.eval(src('daily-games.js'));
const content={source:'local',fallbackAnswer:'APPLE'};let r=await w.BrainiDailyGames.checkBrainiWordGuess(content,'APPLE',1);assert.equal(r.validWord,true);assert.equal(r.won,true);
answer=false;r=await w.BrainiDailyGames.checkBrainiWordGuess(content,'ZZZZZ',1);assert.equal(r.validWord,false);assert.equal(r.finished,false);assert.equal(r.states.length,0);
fail=true;await assert.rejects(()=>w.BrainiDailyGames.checkBrainiWordGuess(content,'APPLE',1));fail=false;answer={states:['absent'],won:false};r=await w.BrainiDailyGames.checkBrainiWordGuess({source:'supabase',dailyChallengeId:'fixture'},'APPLE',1);assert.equal(r.validWord,false);w.close();
console.log('PASS Daily UI: main/locked/choice/completed states, friend main-only score, choice conflicts, version mismatch, offline and dictionary validation.');
