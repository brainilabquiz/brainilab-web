import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const read=path=>JSON.parse(readFileSync(path,'utf8'));
const articles=readdirSync('content/articles').map(file=>read('content/articles/'+file)).filter(article=>article.status==='published');
const paths=readdirSync('content/paths').map(file=>read('content/paths/'+file));
const lesson=articles.find(article=>article.slug===paths[0].lessons[0].slug);
assert.ok(lesson?.quiz,'Use an existing published Academy lesson and its real quiz');
const quiz=lesson.quiz;
// Use the generated public lesson, not a hand-built form or a replacement quiz engine.
const html=readFileSync('learn/'+lesson.slug+'/index.html','utf8');
const bundle=readFileSync('assets/js/learning-paths.bundle.js','utf8');
const accountA='learning-test-account-a',accountB='learning-test-account-b';
const session=id=>id?{user:{id,is_anonymous:false}}:null;
const settle=()=>new Promise(resolve=>setImmediate(resolve));
async function until(predicate,message){
 for(let attempt=0;attempt<30;attempt++){
  if(predicate())return;
  await settle();
 }
 assert.fail(message);
}
function deferred(){
 let resolve;
 const promise=new Promise(done=>{resolve=done;});
 return {promise,resolve};
}

let passed=0;
async function scenario(name,run,{user=accountA,initialSession,cloudReady}={}){
 const dom=new JSDOM(html,{url:'https://brainilabgames.com/learn/'+lesson.slug+'/',runScripts:'outside-only'}),w=dom.window;
 const rpcCalls=[],rewards=[],syncCalls=[],responses=[];
 let activeSession=session(user);
 w.structuredClone=structuredClone;
 // No resources are enabled in JSDOM; fail if the bundle attempts a fetch anyway.
 w.fetch=()=>{throw Error('This test must not make network requests');};
 const client={
  auth:{getSession:()=>initialSession||Promise.resolve({data:{session:activeSession}})},
  from:table=>{
   assert.equal(table,'learn_progress');
   return {select:()=>({eq:async(column,id)=>{
    assert.equal(column,'user_id');
    assert.equal(id,activeSession?.user.id);
    return {data:[]};
   }})};
  },
  rpc:(name,args)=>{
   assert.equal(name,'complete_learn_lesson');
   rpcCalls.push({name,args:JSON.parse(JSON.stringify(args)),userId:activeSession?.user.id});
   assert.ok(responses.length,'Every local RPC must have an explicit test response');
   const response=responses.shift();
   return typeof response==='function'?response():Promise.resolve(response);
  }
 };
 if(cloudReady)w.BrainiPerf={ensureCloud:()=>cloudReady};
 w.BrainiBackendAuth={getClient:()=>client};
 w.BrainiProgression={sync:options=>{
  syncCalls.push(JSON.parse(JSON.stringify(options)));
  return Promise.resolve();
 }};
 w.addEventListener('brainilab:lessonreward',event=>rewards.push(JSON.parse(JSON.stringify(event.detail))));
 const find=selector=>w.document.querySelector(selector);
 const stored=id=>JSON.parse(w.localStorage.getItem('brainilab_learning_v1:'+(id||'guest'))||'{}');
 const expectedReward=id=>({userId:id,slug:lesson.slug,version:quiz.version,xpAwarded:40});
 async function switchAccount(id){
  activeSession=session(id);
  w.dispatchEvent(new w.CustomEvent('brainilab:backend-auth',{detail:{session:activeSession}}));
  await settle();
 }
 async function finishRound(){
  for(const [index,question] of quiz.questions.entries()){
   const input=find(`[name="question-${index}"][value="${question.answer}"]`);
   assert.ok(input&&!input.disabled,'The real current question must accept a click');
   input.click();
   find('[data-lesson-quiz] [type=submit]').click();
   await until(()=>!find('[data-quiz-next]').hidden,'Checking an answer must expose the next-step button');
   find('[data-quiz-next]').click();
   await settle();
  }
  assert.match(find('[data-quiz-result]').textContent,new RegExp(`${quiz.questions.length} of ${quiz.questions.length} correct`));
 }
 try{
  w.eval(bundle);
  await settle();
  await run({w,find,rpcCalls,rewards,syncCalls,responses,stored,expectedReward,switchAccount,finishRound});
  for(const options of syncCalls)assert.deepEqual(options,{fresh:true},'Successful lesson saves must request fresh progression');
  passed++;
  console.log('PASS learning award: '+name);
 }finally{w.close();}
}

await scenario('first award waits for server confirmation and carries account/lesson/version',async app=>{
 const pending=deferred();app.responses.push(()=>pending.promise);
 await app.finishRound();
 assert.equal(app.rpcCalls.length,1);
 assert.deepEqual(app.rpcCalls[0].args,{p_slug:lesson.slug,p_version:quiz.version,p_answers:quiz.questions.map(question=>question.answer)});
 assert.deepEqual(app.rewards,[],'Completing the local round alone must not invent an XP award');
 assert.deepEqual(app.syncCalls,[],'Do not refresh progression before the save succeeds');
 assert.equal(app.find('[data-completion-xp]').dataset.state,'pending');
 pending.resolve({data:{xp_awarded:40}});
 await until(()=>app.rewards.length===1,'A confirmed positive XP award must emit its reward');
 assert.deepEqual(app.rewards,[app.expectedReward(accountA)]);
 assert.deepEqual(app.syncCalls,[{fresh:true}]);
 assert.match(app.find('[data-completion-xp]').textContent,/\+40 XP/);
 assert.equal(app.stored(accountA)[lesson.slug].score,quiz.questions.length);
});

await scenario('XP-zero replay saves progress without another reward',async app=>{
 app.responses.push({data:{xp_awarded:40}},{data:{xp_awarded:0}});
 await app.finishRound();
 app.find('[data-quiz-retry]').click();
 await app.finishRound();
 assert.equal(app.rpcCalls.length,2);
 assert.deepEqual(app.rewards,[app.expectedReward(accountA)]);
 assert.deepEqual(app.syncCalls,[{fresh:true},{fresh:true}]);
 assert.match(app.find('[data-completion-xp]').textContent,/already earned/);
});

for(const [name,failure] of [
 ['returned RPC error',{error:new Error('Temporary local test failure')}],
 ['rejected RPC',()=>Promise.reject(new Error('Temporary local test failure'))]
])await scenario(name+' retains local completion and rewards only after retry succeeds',async app=>{
 app.responses.push(failure);
 await app.finishRound();
 assert.deepEqual(app.rewards,[]);
 assert.deepEqual(app.syncCalls,[]);
 assert.equal(app.stored(accountA)[lesson.slug].version,quiz.version);
 assert.equal(app.find('[data-completion-xp]').dataset.state,'error');
 const retry=app.find('[data-sync-retry]');
 assert.equal(retry.hidden,false);
 const pending=deferred();app.responses.push(()=>pending.promise);
 retry.click();await settle();
 assert.equal(retry.disabled,true,'A retry in flight must disable its button');
 assert.deepEqual(app.rewards,[]);
 pending.resolve({data:{xp_awarded:40}});
 await until(()=>app.rewards.length===1,'Successful retry must emit one confirmed reward');
 assert.equal(app.rpcCalls.length,2);
 assert.deepEqual(app.rpcCalls[1].args,app.rpcCalls[0].args,'Retry preserves the submitted answers and quiz version');
 assert.deepEqual(app.rewards,[app.expectedReward(accountA)]);
 assert.deepEqual(app.syncCalls,[{fresh:true}]);
 assert.equal(retry.hidden,true);
 assert.equal(retry.disabled,false);
});

await scenario('obsolete account response cannot reward or refresh the new account',async app=>{
 const pending=deferred();app.responses.push(()=>pending.promise);
 await app.finishRound();
 await app.switchAccount(accountB);
 assert.equal(app.find('[data-completion-panel]').hidden,true);
 pending.resolve({data:{xp_awarded:40}});await settle();
 assert.deepEqual(app.rewards,[]);
 assert.deepEqual(app.syncCalls,[]);
 assert.equal(app.stored(accountB)[lesson.slug],undefined);
 app.responses.push({data:{xp_awarded:40}});
 await app.finishRound();
 assert.deepEqual(app.rewards,[app.expectedReward(accountB)]);
 assert.deepEqual(app.syncCalls,[{fresh:true}]);
 assert.deepEqual(app.rpcCalls.map(call=>call.userId),[accountA,accountB]);
});

for(const boundary of ['getSession','ensureCloud']){
 const initial=deferred();
 await scenario('late initial '+boundary+' cannot replace a newer account identity',async app=>{
  await app.switchAccount(accountB);
  initial.resolve(boundary==='getSession'?{data:{session:session(accountA)}}:undefined);
  await settle();
  app.responses.push({data:{xp_awarded:40}});
  await app.finishRound();
  assert.deepEqual(app.rewards,[app.expectedReward(accountB)],'Reward belongs to the newer authenticated account');
  assert.deepEqual(app.syncCalls,[{fresh:true}]);
  assert.equal(app.stored(accountB)[lesson.slug]?.version,quiz.version);
  assert.equal(app.stored(accountA)[lesson.slug],undefined,'An obsolete initial session must not receive the new completion');
 },boundary==='getSession'?{initialSession:initial.promise}:{cloudReady:initial.promise,initialSession:Promise.resolve({data:{session:session(accountA)}})});
}

await scenario('sign-out invalidates an in-flight award and guest completion stays local',async app=>{
 const pending=deferred();app.responses.push(()=>pending.promise);
 await app.finishRound();await app.switchAccount(null);
 pending.resolve({data:{xp_awarded:40}});await settle();
 await app.finishRound();
 assert.equal(app.rpcCalls.length,1,'The guest round must not call the completion RPC');
 assert.deepEqual(app.rewards,[]);
 assert.deepEqual(app.syncCalls,[]);
 assert.equal(app.stored(null)[lesson.slug].version,quiz.version);
});

for(const [name,lateResponse] of [
 ['success',{data:{xp_awarded:40}}],
 ['error',{error:new Error('Obsolete local test failure')}]
])await scenario('old round '+name+' cannot overwrite a newer completion',async app=>{
 const pending=deferred();app.responses.push(()=>pending.promise);
 await app.finishRound();
 app.find('[data-quiz-retry]').click();
 assert.deepEqual(app.rewards,[]);
 assert.deepEqual(app.syncCalls,[]);
 assert.equal(app.find('[data-completion-panel]').hidden,true);
 app.responses.push({data:{xp_awarded:40}});
 await app.finishRound();
 assert.deepEqual(app.rewards,[app.expectedReward(accountA)]);
 assert.deepEqual(app.syncCalls,[{fresh:true}]);
 pending.resolve(lateResponse);await settle();
 assert.deepEqual(app.rewards,[app.expectedReward(accountA)]);
 assert.deepEqual(app.syncCalls,[{fresh:true}]);
 assert.equal(app.find('[data-completion-xp]').dataset.state,'awarded');
 assert.equal(app.find('[data-sync-retry]').hidden,true);
});

await scenario('initial guest completes the real quiz without account RPC or reward',async app=>{
 await app.finishRound();
 assert.deepEqual(app.rpcCalls,[]);
 assert.deepEqual(app.rewards,[]);
 assert.deepEqual(app.syncCalls,[]);
 assert.equal(app.stored(null)[lesson.slug].score,quiz.questions.length);
 assert.equal(app.find('[data-completion-xp]').dataset.state,'guest');
},{user:null});

for(const xp of ['40',1.5,-40])await scenario('invalid XP payload '+JSON.stringify(xp)+' cannot announce an integer award',async app=>{
 app.responses.push({data:{xp_awarded:xp}});
 await app.finishRound();
 assert.deepEqual(app.rewards,[]);
 assert.deepEqual(app.syncCalls,[{fresh:true}],'A successful progress save still refreshes progression');
});

console.log(`PASS: ${passed} real-quiz lesson-award scenarios; local JSDOM/RPC only, confirmed XP events, replay/error/race isolation and fresh progression.`);
