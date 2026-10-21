// Dependency-free regression gate: no real accounts, network or production writes.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const owner='10000000-0000-4000-8000-000000000001',other='20000000-0000-4000-8000-000000000002';
const copy=x=>JSON.parse(JSON.stringify(x));
function setup({missing=true,conflict=false,offline=false,saveFails=false,practice=false,foreign=false,switchDuringVerify=false}={}){
 const result={gameId:'brainmix',clientResultId:'receipt-fixture-original',ownerUserId:foreign?other:owner,cloudSyncStatus:'synced',contentSource:'supabase',dailyNumber:54,dailyChallengeId:'30000000-0000-4000-8000-000000000003',score:9000,correct:9,total:10,practice,
  answerDetails:Array.from({length:10},(_,i)=>({questionVersionId:'40000000-0000-4000-8000-'+String(i+1).padStart(12,'0'),selectedOptionId:'50000000-0000-4000-8000-'+String(i+1).padStart(12,'0'),responseTimeMs:250}))};
 let currentOwner=owner,exists=!missing,marks=0;const calls=[];
 const c={console:{warn(){}},URLSearchParams,AbortController,setTimeout,clearTimeout,navigator:{onLine:true},location:{search:''},CustomEvent:class{constructor(type,init){this.type=type;this.detail=init?.detail;}},addEventListener(){},removeEventListener(){},dispatchEvent(){}};c.window=c;
 c.BrainiData={authState:()=>({status:'authenticated',user:{id:currentOwner}}),recentResults:()=>[copy(result)],api:{
  bindResultOwner:async(id,idOwner)=>id===result.clientResultId&&idOwner===result.ownerUserId?copy(result):null,
  markResultCloudSynced:async(_id,cloud)=>{result.cloudSyncStatus='synced';result.cloudSessionId=cloud.sessionId;},
  getPendingCloudResults:async()=>[],
  markResultDailyVerified:async(_id,data)=>{marks++;result.dailyAnswerVerificationStatus='verified';result.correct=data.correct_answers;}
 }};
 c.BrainiBackendAuth={isConfigured:()=>true,getSession:async()=>({user:{id:currentOwner}}),ensurePlayerSession:async()=>({user:{id:currentOwner}}),getClient:()=>({rpc:async(name,args)=>{
  calls.push({name,args:copy(args)});
  if(name==='submit_brainilab_game_result'){
   if(saveFails)return {error:{message:'Offline'}};
   if(!conflict)exists=true;
   return {data:{session_id:'fixture-session',result_id:'fixture-result',already_existed:conflict}};
  }
  if(name==='verify_brainilab_daily_result'){
   if(switchDuringVerify){currentOwner=other;return {error:{message:'Game result not found'}};}
   if(offline)return {error:{message:'Connection failed'}};
   if(!exists)return {error:{message:'Game result not found'}};
   return {data:{answers_verified:true,correct_answers:2,total_questions:10,accuracy:20,daily_number:54}};
  }
  return {data:{}};
 }})};
 vm.createContext(c);
 for(const name of ['supabase-games','result-recovery'])vm.runInContext(readFileSync(new URL('../assets/js/'+name+'.js',import.meta.url),'utf8'),c,{filename:name+'.js'});
 return {c,result,calls,get marks(){return marks;}};
}
const submits=h=>h.calls.filter(x=>x.name==='submit_brainilab_game_result'),checks=h=>h.calls.filter(x=>x.name==='verify_brainilab_daily_result');
{
 const h=setup();assert.equal(await h.c.BrainiResultRecovery.verify(h.result),true);
 assert.equal(submits(h).length,1);assert.equal(checks(h).length,2);assert.equal(h.marks,1);
 assert.equal(submits(h)[0].args.p_client_result_id,h.result.clientResultId);
 assert.equal(checks(h)[0].args.p_client_result_id,h.result.clientResultId);
 assert.deepEqual(checks(h)[0].args.p_answers,checks(h)[1].args.p_answers,'Replay the original proof, never a replacement answer');
 assert.equal(h.result.correct,2,'Use the server answer count, not the initial nine');
 await h.c.BrainiResultRecovery.verify(h.result);assert.equal(submits(h).length,1);assert.equal(checks(h).length,2,'A verified run stays confirmed');
}
{
 const h=setup({missing:false});assert.equal(await h.c.BrainiResultRecovery.verify(h.result),true);assert.equal(submits(h).length,0);assert.equal(checks(h).length,1);
}
{
 const h=setup({conflict:true});const out=await h.c.BrainiResultRecovery.sync();assert.equal(out.failed,1);assert.equal(submits(h).length,1);assert.equal(checks(h).length,2);assert.equal(h.marks,0,'A conflict cannot become a fake verified result');
}
for(const options of [{offline:true},{saveFails:true}]){
 const h=setup(options);await assert.rejects(()=>h.c.BrainiResultRecovery.verify(h.result));assert.equal(h.marks,0);assert.equal(checks(h).length,1);assert.equal(submits(h).length,options.saveFails?1:0);
}
for(const options of [{practice:true},{foreign:true}]){
 const h=setup(options);assert.equal(await h.c.BrainiResultRecovery.verify(h.result),false);assert.equal(h.calls.length,0);
}
{
 const h=setup({switchDuringVerify:true});await assert.rejects(()=>h.c.BrainiResultRecovery.verify(h.result),/Player changed/);assert.equal(submits(h).length,0);assert.equal(h.marks,0);
}
console.log('PASS result receipts: missing acknowledgement recovery, original proof and ID, authoritative answers, confirmed runs, bounded conflict, offline/save failure, practice and account isolation.');
