// Real data/save/recovery modules, independent browser stores and a synthetic server.
// Runs in every build without browser packages, network or real player records.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import vm from 'node:vm';
const uid='10000000-0000-4000-8000-000000000001',other='20000000-0000-4000-8000-000000000002';
const id=n=>`30000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const copy=x=>JSON.parse(JSON.stringify(x));
const rows=n=>Array.from({length:n},(_,i)=>({puzzleId:id(i+1),pairId:id(i+1),questionId:id(i+1),questionVersionId:id(i+1),selectedOptionId:id(100+i),selectedIndex:1,answer:12,choice:'higher',operators:['+','-','*'],attempts:1,attemptedChoiceIds:[id(100+i)],responseTimeMs:500}));
const cases=[
 ['connections','connections',{roundDetails:rows(20)},'Connections'],
 ['oddoneout','odd_one_out',{roundDetails:rows(10)},'Odd One Out'],
 ['higherlower','higher_lower',{roundDetails:rows(10)},'Higher or Lower'],
 ['sequence','sequence',{roundDetails:rows(10)},'Sequence'],
 ['numberroute','number_route',{roundDetails:rows(3)},'Number Route'],
 ['survival','survival',{survivalAnswers:rows(30)},'Survival'],
 ['mathrush','math_rush',{seed:'v2:anytime:fixture',mathAnswers:[{position:1,answer:12}]},'Math Rush'],
 ['orderup','order_up',{dailyChallengeId:id(900),orderUpRounds:rows(2)},'Order Up'],
 ['topicrush','topic_rush',{dailyChallengeId:id(900),topicRushAnswers:[]},'Topic Rush'],
 ['brainiword','brainiword',{dailyChallengeId:id(900),brainiwordGuesses:['CRANE','STONE']},'BrainiWord'],
 ['brainmix','daily',{dailyChallengeId:id(900),answerDetails:rows(10)},null],
 ...['worldflags','worldcapitals','generalknowledge','science','history','sports'].map(g=>[g,'anytime_quiz',{answerDetails:rows(20),difficulty:'easy'},null]),
 ['science','quiz',{quizPackId:id(901),answerDetails:rows(20)},null]
];
function server(){return {rows:[],calls:[],queries:[],readError:null,hold:null,missing:null,afterRead:null};}
function device(s){
 let current=uid,clock=Date.now(),progress=0;const events=new Map(),docEvents=new Map(),storage=new Map();
 class Clock extends Date{static now(){return clock;}}
 const listen=(map,name,fn)=>{if(!map.has(name))map.set(name,new Set());map.get(name).add(fn);};
 const emit=(map,e)=>{for(const fn of [...map.get(e.type)||[]])fn(e);return true;};
 const c={console:{warn(){}},Date:Clock,URLSearchParams,AbortController,setTimeout,clearTimeout,crypto:webcrypto,navigator:{onLine:true},location:{origin:'https://brainilabgames.com',pathname:'/rankings/',search:''},
  CustomEvent:class{constructor(type,init){this.type=type;this.detail=init?.detail;}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},
  addEventListener:(n,f)=>listen(events,n,f),removeEventListener:(n,f)=>events.get(n)?.delete(f),dispatchEvent:e=>emit(events,e),
  document:{visibilityState:'visible',addEventListener:(n,f)=>listen(docEvents,n,f)}};c.window=c;
 const api={rpc:async(name,args)=>{
  s.calls.push({name,args:copy(args)});
  if(name==='submit_brainilab_game_result'){
   let row=s.rows.find(r=>r.user_id===current&&r.client_result_id===args.p_client_result_id);
   if(!row){row={id:id(800+s.rows.length),user_id:current,client_result_id:args.p_client_result_id,game_id:args.p_game_id,daily_number:args.p_daily_number,daily_challenge_id:args.p_result_payload.dailyChallengeId,quiz_pack_id:args.p_result_payload.quizPackId,completed_at:args.p_played_at,game_results:{id:id(700+s.rows.length),answers_verified:false,result_payload:copy(args.p_result_payload)}};s.rows.push(row);}
   return {data:{session_id:row.id,result_id:row.game_results.id}};
  }
  if(name.startsWith('verify_brainilab_')){
   const row=s.rows.find(r=>r.user_id===current&&r.client_result_id===args.p_client_result_id);
   if(!row)return {error:{message:s.missing||'Game result not found'}};
   row.game_results.answers_verified=true;
   return {data:{answers_verified:true,score:200,correct:2,total:10,correct_answers:2,total_questions:10,accuracy:20,daily_number:54}};
  }
  return {data:{}};
 },from(table){
  const query={table,filters:[]};s.queries.push(query);
  const q={select(value){query.select=value;return q;},eq(k,v){query.filters.push([k,v]);return q;},gte(k,v){query.since=[k,v];return q;},order(k,v){query.order=[k,v];return q;},limit(n){query.limit=n;return q;},abortSignal(signal){query.signal=signal;return q;},then(resolve,reject){
   const ownerAtRead=current;
   return Promise.resolve(s.hold).then(()=>{
    s.afterRead?.();
    if(s.readError)return {error:Error(s.readError)};
    return {data:copy(s.rows.filter(r=>r.user_id===ownerAtRead&&!r.game_results.answers_verified))};
   }).then(resolve,reject);
  }};return q;
 }};
 c.BrainiBackendAuth={isConfigured:()=>true,getSession:async()=>({user:{id:current}}),ensurePlayerSession:async()=>({user:{id:current}}),getClient:()=>api};
 c.BrainiProgression={sync:async()=>{progress++;}};
 vm.createContext(c);
 for(const file of ['daily-rules','data','supabase-games','result-recovery'])vm.runInContext(readFileSync(new URL('../assets/js/'+file+'.js',import.meta.url),'utf8'),c,{filename:file+'.js'});
 c.BrainiData.syncExternalAuthUser({id:uid});
 return {c,get progress(){return progress;},advance(){clock+=6000;},emit(name,extra={}){return emit(events,{type:name,...extra});},visible(value){c.document.visibilityState=value;emit(docEvents,{type:'visibilitychange'});},switch(){current=other;c.BrainiData.syncExternalAuthUser({id:other});}};
}
const checked=r=>r.answersVerified||[r.answerVerificationStatus,r.dailyAnswerVerificationStatus,r.dailyGameVerificationStatus].includes('verified');
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
for(const game of [...new Set(cases.map(x=>x[0]))]){
 const s=server(),d=device(s);
 const result=await d.c.BrainiData.api.submitGameResult(game,{contentSource:'local',score:9999,correct:9,total:10});
 assert.equal(result.practice,true,game+' fallback is practice');assert.equal(s.calls.length,0,'Local fallback never claims ranking points or a streak');
}
for(const [game,rpc,evidence,label] of cases){
 const s=server(),phone=device(s);
 const original=await phone.c.BrainiData.api.submitGameResult(game,{dailyNumber:null,contentSource:'supabase',score:9999,correct:9,total:10,...evidence});
 assert.equal(s.rows.length,1);assert.equal(s.rows[0].game_results.answers_verified,false,'Phone closes after save, before verification');
 const pc=device(s);assert.equal(pc.c.BrainiData.recentResults().length,0);
 const out=await pc.c.BrainiCloudGames.syncPendingResults();assert.equal(out.verified,1,game);
 const recovered=pc.c.BrainiData.recentResults()[0];assert.equal(recovered.clientResultId,original.clientResultId);assert.equal(recovered.ownerUserId,uid);assert.ok(checked(recovered),game);assert.equal(recovered.correct,2,'Server correctness replaces local claim');
 assert.equal(s.calls.filter(x=>x.name==='submit_brainilab_game_result').length,1,'PC verifies saved proof without another game or submission');
 const proof=s.calls.find(x=>x.name===`verify_brainilab_${rpc}_result`);assert.ok(proof,game);assert.equal(proof.args.p_client_result_id,original.clientResultId);
 if(evidence.answerDetails){assert.equal(proof.args.p_answers.length,evidence.answerDetails.length);assert.deepEqual(Object.keys(s.rows[0].game_results.result_payload.answerDetails[0]).sort(),['questionVersionId','responseTimeMs','selectedOptionId'],'Only minimal quiz proof is retained');}
 const query=s.queries[0];assert.deepEqual(query.filters,[['user_id',uid],['game_results.answers_verified',false]]);assert.equal(query.limit,20);assert.ok(query.select.includes('game_results!inner'));
 await pc.c.BrainiCloudGames.syncPendingResults();assert.equal(s.calls.filter(x=>x.name===proof.name).length,1,'A second sync never awards twice');
 // Test the exact missing-result message used by this game's production verifier.
 s.rows=[];s.calls=[];s.missing=label?label+' result not found':'Game result not found';
 const repair=await phone.c.BrainiCloudGames.syncPendingResults();assert.equal(repair.verified,1,game+' missing receipt');
 assert.equal(s.calls.filter(x=>x.name===proof.name).length,2);assert.equal(s.calls.filter(x=>x.name==='submit_brainilab_game_result').length,1);
}
{
 const s=server(),d=device(s);s.missing='Sequence puzzle not found';
 const r=await d.c.BrainiData.api.submitGameResult('sequence',{dailyNumber:null,contentSource:'supabase',roundDetails:rows(10)});s.rows=[];s.calls=[];
 const out=await d.c.BrainiCloudGames.syncPendingResults();assert.equal(out.verified,0);assert.equal(out.failed,1);assert.equal(s.calls.filter(x=>x.name==='submit_brainilab_game_result').length,0,'A missing puzzle is not a missing receipt');assert.ok(!checked(d.c.BrainiData.recentResults()[0]));
}
{
 const s=server(),phone=device(s);await phone.c.BrainiData.api.submitGameResult('sequence',{dailyNumber:null,roundDetails:rows(10)});
 const pc=device(s);s.rows[0].game_results.result_payload.answerVerificationStatus='verified';
 let release;s.hold=new Promise(r=>release=r);const task=pc.c.BrainiCloudGames.syncPendingResults();await tick();pc.switch();release();await task;
 assert.equal(pc.c.BrainiData.recentResults().length,0);assert.equal(s.calls.filter(x=>x.name.startsWith('verify_')).length,0,'Account switch discards old remote proof');
}
{
 const s=server(),d=device(s),row={user_id:uid,client_result_id:'forged',game_id:'sequence',game_results:{id:id(80),answers_verified:false,result_payload:{roundDetails:rows(10),answerVerificationStatus:'verified'}}};
 assert.equal(await d.c.BrainiData.api.restorePendingCloudResult({...row,user_id:other}),null);
 assert.equal(await d.c.BrainiData.api.restorePendingCloudResult({...row,game_results:{...row.game_results,result_payload:{practice:true}}}),null);
 const restored=await d.c.BrainiData.api.restorePendingCloudResult(row);assert.equal(restored.answerVerificationStatus,'pending');assert.ok(!checked(restored),'Payload cannot self-certify');
 assert.equal(await d.c.BrainiData.api.restorePendingCloudResult(row),null,'No duplicate imports');
}
{
 const s=server(),d=device(s);d.visible('hidden');d.emit('focus');await tick();assert.equal(s.queries.length,0);
 d.visible('visible');d.emit('focus');d.emit('pageshow',{persisted:true});await tick();await tick();assert.equal(s.queries.length,1);assert.equal(d.progress,1,'Resume events coalesce and refresh confirmed progress');
 d.emit('focus');await tick();assert.equal(s.queries.length,1,'Rapid events are throttled');d.advance();d.emit('pageshow',{persisted:true});await tick();await tick();assert.equal(d.progress,2);
 d.advance();d.c.navigator.onLine=false;d.emit('focus');await tick();assert.equal(d.progress,2,'Offline resume does not send requests');
}
{
 const s=server(),phone=device(s);const r=await phone.c.BrainiData.api.submitGameResult('sequence',{dailyNumber:null,roundDetails:rows(10)});s.readError='offline lookup';
 const out=await phone.c.BrainiCloudGames.syncPendingResults();assert.equal(out.verified,1,'Remote lookup failure never blocks local proof');assert.ok(checked(phone.c.BrainiData.recentResults()[0]));
}
assert.doesNotMatch(readFileSync(new URL('../assets/js/europe-flags.js',import.meta.url),'utf8'),/submitGameResult/,'Europe Flags remains explicitly practice-only');
console.log('PASS cross-device: 18 game/quiz routes, independent phone/PC stores, all production missing-receipt messages, original proof, one award, account isolation, untrusted payload, bounded query, local recovery despite read failure and mobile/desktop resume.');
