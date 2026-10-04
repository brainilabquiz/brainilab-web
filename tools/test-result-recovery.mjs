import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const tick=()=>new Promise(r=>setTimeout(r,0));
const uuid='10000000-0000-4000-8000-000000000001';
const other='20000000-0000-4000-8000-000000000002';
const rows=(n,extra={})=>Array.from({length:n},()=>({puzzleId:uuid,pairId:uuid,questionId:uuid,questionVersionId:uuid,selectedOptionId:uuid,selectedIndex:1,answer:12,choice:'higher',operators:['+','-','*'],attempts:1,attemptedChoiceIds:[uuid],responseTimeMs:500,...extra}));
function setup(saved){
  const w=new JSDOM('',{url:'https://brainilabgames.com/profile/',runScripts:'outside-only'}).window;
  if(saved)w.localStorage.setItem('brainilab.mock.v1',saved);
  w.console.warn=()=>{};const calls=[],server=new Map();let failSave=false,failVerify=false,hold=null,session={user:{id:uuid}};
  w.eval(readFileSync('assets/js/data.js','utf8'));
  if(!saved)w.BrainiData.api.syncExternalAuthUser(session.user);
  w.BrainiProfiles={sync:()=>new Promise(()=>{})}; // Profile loading must not hold game delivery.
  w.BrainiBackendAuth={isConfigured:()=>true,getSession:async()=>session,ensurePlayerSession:async()=>session,getClient:()=>({rpc:async(name,args)=>{
    calls.push({name,args});if(hold)return hold;
    if(name==='submit_brainilab_game_result'){
      if(failSave)return {error:new Error('Offline')};
      const existed=server.has(args.p_client_result_id);server.set(args.p_client_result_id,args);
      return {data:{session_id:'session',result_id:'result',already_existed:existed}};
    }
    if(name.startsWith('verify_')){
      if(failVerify)return {error:new Error('Connection failed')};
      return {data:{verified:true,answers_verified:true,correct_answers:2,total_questions:10,accuracy:20,score:200}};
    }
    return {data:{}};
  }})};
  for(const file of ['supabase-games','result-recovery'])w.eval(readFileSync(`assets/js/${file}.js`,'utf8'));
  return {w,calls,server,set failSave(v){failSave=v;},set failVerify(v){failVerify=v;},set hold(v){hold=v;},change(){session={user:{id:other}};w.BrainiData.api.syncExternalAuthUser(session.user);},snapshot:()=>w.localStorage.getItem('brainilab.mock.v1')};
}
const cases=[
 ['connections',{roundDetails:rows(20)},'connections','p_rounds',20],
 ['oddoneout',{roundDetails:rows(10)},'odd_one_out','p_rounds',10],
 ['higherlower',{roundDetails:rows(10)},'higher_lower','p_rounds',10],
 ['sequence',{roundDetails:rows(10)},'sequence','p_rounds',10],
 ['numberroute',{roundDetails:rows(3)},'number_route','p_rounds',3],
 ['survival',{survivalAnswers:rows(30)},'survival','p_answers',30],
 ['mathrush',{seed:'v2:anytime:saved',mathAnswers:Array.from({length:60},(_,i)=>({position:i+1,answer:i===1?null:12,skipped:i===1}))},'math_rush','p_answers',60],
 ['orderup',{dailyChallengeId:uuid,orderUpRounds:rows(2)},'order_up','p_rounds',2],
 ['topicrush',{dailyChallengeId:uuid,topicRushAnswers:[]},'topic_rush','p_answers',0],
 ['brainiword',{dailyChallengeId:uuid,brainiwordGuesses:['CRANE','STONE']},'brainiword','p_guesses',2],
 ['brainmix',{dailyChallengeId:uuid,answerDetails:rows(10)},'daily','p_answers',10],
 ...['worldflags','worldcapitals','generalknowledge','science','history','sports'].map(game=>[game,{answerDetails:rows(20),difficulty:'hard'},'anytime_quiz','p_answers',20]),
 ['science',{quizPackId:uuid,answerDetails:rows(20)},'quiz','p_answers',20]
];
for(const [game,evidence,rpc,arg,count] of cases){
 const h=setup();h.failSave=true;
 const result=await h.w.BrainiData.api.submitGameResult(game,{score:9999,correct:10,total:10,dailyNumber:null,contentSource:'supabase',...evidence});
 assert.equal(result.cloudSyncStatus,'pending');assert.equal(h.calls.filter(x=>x.name.startsWith('verify_')).length,0);
 const saved=h.snapshot();h.w.close();const next=setup(saved);
 const task=next.w.BrainiCloudGames.syncPendingResults();assert.equal(next.w.BrainiCloudGames.syncPendingResults(),task);await task;
 const submitted=next.calls.find(x=>x.name==='submit_brainilab_game_result');assert.equal(submitted.args.p_client_result_id,result.clientResultId);
 const checked=next.calls.find(x=>x.name===`verify_brainilab_${rpc}_result`);assert.ok(checked,game);assert.equal(checked.args[arg].length,count,game);
 const stored=next.w.BrainiData.recentResults()[0];assert.equal(stored.cloudSyncStatus,'synced');
 assert.ok([stored.answerVerificationStatus,stored.dailyGameVerificationStatus,stored.dailyAnswerVerificationStatus].includes('verified'));
 if(rpc!=='daily')assert.equal(stored.score,200,'Canonical score replaces client score');
 await next.w.BrainiCloudGames.syncPendingResults();assert.equal(next.calls.filter(x=>x.name==='submit_brainilab_game_result').length,1);assert.equal(next.calls.filter(x=>x.name===`verify_brainilab_${rpc}_result`).length,1);
 next.w.close();
}
// A saved-but-unverified result needs only verification after network recovery.
{
 const h=setup(),r=await h.w.BrainiData.api.submitGameResult('sequence',{roundDetails:rows(10),dailyNumber:null});h.failVerify=true;
 await h.w.BrainiCloudGames.syncPendingResults();assert.notEqual(h.w.BrainiData.recentResults()[0].answerVerificationStatus,'verified');
 h.failVerify=false;h.w.dispatchEvent(new h.w.Event('online'));await tick();await h.w.BrainiCloudGames.syncPendingResults();
 assert.equal(h.calls.filter(x=>x.name==='submit_brainilab_game_result').length,1);assert.equal(h.w.BrainiData.recentResults()[0].answerVerificationStatus,'verified');h.w.close();
}
// Missing evidence, local fallback and practice must not acquire verified status.
{
 const h=setup();for(const payload of [{roundDetails:rows(9)},{roundDetails:rows(10,{puzzleId:'local'})},{roundDetails:rows(10),practice:true}])await h.w.BrainiData.api.submitGameResult('sequence',{dailyNumber:null,...payload});
 await h.w.BrainiData.api.submitGameResult('mathrush',{dailyNumber:null,contentSource:'local',seed:'v2:local',mathAnswers:[{position:1,answer:12}]});
 await h.w.BrainiCloudGames.syncPendingResults();assert.equal(h.calls.filter(x=>x.name.startsWith('verify_')).length,0);h.w.close();
}
// A user switch during a delayed upload must not mark or retry the old user's result.
{
 const h=setup();let resolve;h.hold=new Promise(r=>resolve=r);
 const result=h.w.BrainiData.recordGameResult('sequence',{roundDetails:rows(10),dailyNumber:null});
 const work=h.w.BrainiCloudGames.saveCompletedResult('sequence',result);await tick();h.change();resolve({data:{session_id:'old',result_id:'old'}});await assert.rejects(work,/Player changed/);
 h.hold=null;assert.equal((await h.w.BrainiCloudGames.saveCompletedResult('sequence',result)).saved,false);assert.equal(h.w.BrainiData.recentResults().length,0);assert.equal(h.calls.length,1);h.w.close();
}
// Ambiguous timeout remains pending; retry uses the same ID and ignores a late response.
{
 const h=setup();let resolve,expire;h.hold=new Promise(r=>resolve=r);
 const original=h.w.setTimeout.bind(h.w);h.w.setTimeout=(fn,ms)=>ms===12000?(expire=fn,1):original(fn,ms);h.w.clearTimeout=()=>{};
 const result=h.w.BrainiData.recordGameResult('sequence',{roundDetails:rows(10),dailyNumber:null});
 const work=h.w.BrainiCloudGames.saveCompletedResult('sequence',result);await tick();expire();await assert.rejects(work,/timed out/);
 assert.equal(h.w.BrainiData.recentResults()[0].cloudSyncStatus,'pending');h.hold=null;
 await h.w.BrainiCloudGames.syncPendingResults();resolve({data:{session_id:'late',result_id:'late'}});await tick();
 const stored=h.w.BrainiData.recentResults()[0];assert.equal(stored.cloudSessionId,'session');assert.equal(stored.answerVerificationStatus,'verified');assert.equal(new Set(h.calls.filter(x=>x.name==='submit_brainilab_game_result').map(x=>x.args.p_client_result_id)).size,1);h.w.close();
}
// Evidence is retained at the engine's save point, not only in an in-memory verifier closure.
for(const [file,field] of [['math-rush','mathAnswers'],['survival','survivalAnswers'],['odd-one-out','roundDetails'],['higher-lower','roundDetails'],['number-route','roundDetails'],['sequence','roundDetails'],['connections','roundDetails']]){
 assert.match(readFileSync(`assets/js/${file}.js`,'utf8'),new RegExp(`const payload=\\{[\\s\\S]*?${field}`));
}
console.log('PASS: 18 game/quiz recovery paths, reload, online, canonical verification, deduplication, timeout, missing evidence, practice and account isolation.');
