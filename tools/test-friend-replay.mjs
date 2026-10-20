import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href),tick=()=>new Promise(r=>setTimeout(r,0));
const source=n=>readFileSync('assets/js/'+n+'.js','utf8'),packs=new Map(),day=new Date().toISOString().slice(0,10),uuid=n=>'11111111-1111-4111-8111-'+String(n).padStart(12,'0');
function fixture(path,query='?try=1',serverPack=null){
 const w=new JSDOM(readFileSync(path.slice(1)+'index.html','utf8'),{url:'https://brainilabgames.com'+path+query,runScripts:'outside-only'}).window;
 w.HTMLElement.prototype.scrollIntoView=()=>{};let configured=!!serverPack,calls=[],captured=null,fail=false,user='one';
 w.BrainiData={authState:()=>({user:{id:user}}),dailyNumberForDate:()=>53,dateForDailyNumber:()=>day,pastDailyDate:d=>d,anytimeHistory:()=>({}),getState:()=>({}),daily:()=>({number:53})};
 const sb={rpc:async(name,args)=>{calls.push(name);if(fail)throw Error('Offline');if(name==='create_brainilab_friend_pack'){assert.deepEqual(JSON.parse(JSON.stringify(args.p_spec)),JSON.parse(JSON.stringify(w.BrainiReplayContract.spec(args.p_game_id,captured,args.p_spec.settings))));const pack={id:uuid(packs.size+1),gameId:args.p_game_id,payload:{...JSON.parse(JSON.stringify(captured)),replayRules:'friend-replay-v1',friendSettings:args.p_spec.settings}};packs.set(pack.id,pack);return {data:pack};}if(name==='get_brainilab_friend_pack'){const p=packs.get(args.p_pack_id);return p?{data:JSON.parse(JSON.stringify(p))}:{error:{message:'unavailable'}};}if(name==='check_brainilab_friend_pack')return {data:{correct:true,answer:12}};throw Error('Unexpected random or write RPC: '+name);}};
 w.BrainiBackendAuth={isConfigured:()=>configured,ensurePlayerSession:async()=>({user:{id:user}}),getClient:()=>sb};
 const load=n=>w.eval(source(n));for(const n of ['friend-replay-contract','game-challenge-model','friend-replay','game-challenge','post-game'])load(n);
 const run=w.BrainiReplay.run;w.BrainiReplay.run=async(g,base)=>{const p=await run(g,base);captured=JSON.parse(JSON.stringify(p));return p;};
 return {w,load,calls,capture:()=>captured,enable:()=>configured=true,fail:v=>fail=v,user:v=>{user=v;w.dispatchEvent(new w.Event('brainilab:authchange'));},sb};
}
const slugs={connections:['connections','BrainiConnections','connections-puzzles','[data-connections-start]'],sequence:['sequence','BrainiSequence','sequence-puzzles','[data-start]'],oddoneout:['odd-one-out','BrainiOddOneOut','odd-one-out-puzzles','[data-start]'],higherlower:['higher-lower','BrainiHigherLower','higher-lower-pairs','[data-start]'],numberroute:['number-route','BrainiNumberRoute','number-route-puzzles','[data-start]'],mathrush:['math-rush','BrainiMathRush',null,'[data-start]'],survival:['survival','BrainiSurvival','quiz-packs','[data-start]']};
async function loadGame(t,g){
 const {w,load}=t;
 if(slugs[g]){
  const [slug,module,pack,start]=slugs[g];if(pack)load(pack);load(slug);
  if(g==='mathrush'){w.setInterval=()=>1;w.clearInterval=()=>{};}
  const root=w.document.querySelector(start).closest('[id]');await w[module].mount(root);root.querySelector(start).click();for(let i=0;i<20&&!t.capture();i++)await tick();return t.capture();
 }
 if(w.BrainiReplayContract.quizzes.has(g)){
  load('quiz-packs');
  if(g==='brainmix'){load('supabase-daily');return w.BrainiDaily.loadToday();}
  load('supabase-content');return w.BrainiContent.loadQuizPack(g,new URLSearchParams(w.location.search).get('difficulty')||'easy',1);
 }
 if(g==='reasoning'){
  load('reasoning.bundle');for(let i=0;i<20&&!t.capture();i++)await tick();return t.capture();
 }
 load('daily-games');return w.BrainiDailyGames[{orderup:'loadOrderUp',topicrush:'loadTopicRush',brainiword:'loadBrainiWord'}[g]]();
}
const discovery=fixture('/games/sequence/'),games=discovery.w.BrainiGameChallengeModel.games;discovery.w.close();
let count=0;
const scenarios=Object.entries(games).flatMap(([g,config])=>[[g,config,'?try=1'],...(config.quiz?[[g,config,'?try=1&difficulty=hard']]:[]),...(['connections','sequence','oddoneout','higherlower','numberroute','mathrush'].includes(g)?[[g,config,'?try=1&archive='+day]]:[])]);
for(const [g,config,query]of scenarios){
 const sender=fixture(config.path,query),original=await loadGame(sender,g);assert.ok(original,g+' captured from real loader');sender.enable();const packId=await sender.w.BrainiReplay.publish(g);
 const dated=query.includes('archive='),result={score:0,total:dated&&['connections','numberroute'].includes(g)?3:config.n||original.targetCount,difficulty:query.includes('hard')?'hard':'easy',...(config.daily?{challengeDate:original.challengeDate,dailyNumber:53}:{})};
 const descriptor=sender.w.BrainiGameChallengeModel.describe(g,result),link=sender.w.BrainiGameChallengeModel.url(descriptor);assert.ok(link,g+' compact exact link');assert.equal(descriptor.p,packId);assert.ok(link.length<600);assert.ok(!link.includes('prompt'));
 const url=new URL(link),receiver=fixture(config.path,url.search+url.hash,packs.get(packId));
 const replay=await loadGame(receiver,g);assert.ok(replay,g+' replay loaded');
 const C=sender.w.BrainiReplayContract;assert.equal(C.canonical(C.project(g,replay)),C.canonical(C.project(g,original)),g+' exact question and option order across browsers');
 assert.deepEqual(receiver.calls,['get_brainilab_friend_pack'],g+' no random selector or normal Daily cache');
 assert.equal(await receiver.w.BrainiReplay.publish(g),packId,g+' replies retain exact set');
 const own=receiver.w.BrainiGameChallengeModel.describe(g,result);assert.equal(receiver.w.BrainiGameChallengeModel.compare(own,descriptor).kind,'tie');assert.match(receiver.w.BrainiGameChallengeModel.invitation(own,descriptor).text,/Same questions\. Same rules/);
 sender.w.close();receiver.w.close();count++;
}
// Offline first fetch must stay pending. Retry resolves the original loader; never random fallback.
const target=[...packs.values()].find(p=>p.gameId==='sequence'),seed=fixture('/games/sequence/');seed.w.BrainiReplay.packId=()=>target.id;const d=seed.w.BrainiGameChallengeModel.describe('sequence',{score:1000,total:10}),link=seed.w.BrainiGameChallengeModel.url(d);seed.w.close();
const u=new URL(link),retry=fixture(u.pathname,u.search+u.hash,target);retry.fail(true);let fallback=0,resolved=false;
const held=retry.w.BrainiReplay.run('sequence',()=>{fallback++;throw Error('Must not randomly replace set');}).then(()=>resolved=true);await tick();assert.equal(resolved,false);assert.equal(fallback,0);assert.match(retry.w.BrainiReplay.status().error,/Couldn’t load/);assert.ok(retry.w.document.querySelector('[data-game-friend-entry] button'));
retry.fail(false);retry.w.document.querySelector('[data-game-friend-entry] button').click();await held;assert.equal(resolved,true);assert.equal(fallback,0);assert.equal(retry.w.BrainiReplay.storageSuffix(),':friend:'+target.id);
const checked=await retry.w.BrainiReplay.client(retry.sb).rpc('check_brainilab_sequence_answer',{p_puzzle_id:target.payload.rounds[0].id,p_answer:12});assert.equal(checked.data.correct,true);assert.equal(retry.calls.at(-1),'check_brainilab_friend_pack');
// Save and preparation gates remain compact; personal draft and copy/native/WhatsApp work after preparation.
const original=fixture('/games/sequence/');await loadGame(original,'sequence');original.enable();const root=original.w.document.createElement('div');original.w.document.querySelector('main').append(root);
const options={gameId:'sequence',name:'Sequence',result:{score:1000,total:10,correct:4,practice:true}};original.w.BrainiPostGame.mount(root,options);
assert.equal(root.querySelector('[data-challenge-composer]').hidden,true);root.querySelector('.post-share').click();assert.equal(root.querySelector('[data-challenge-copy]').disabled,true);for(let i=0;i<10&&root.querySelector('[data-challenge-copy]').disabled;i++)await tick();assert.equal(root.querySelector('[data-challenge-copy]').disabled,false);assert.match(root.querySelector('textarea').value,/Same questions/);
original.user('two');assert.equal(root.querySelector('[data-challenge-copy]').disabled,true);original.w.close();retry.w.close();
const legacy=fixture('/games/sequence/','?try=1#friend='+btoa(JSON.stringify({v:1,g:'sequence',s:1000,d:null,l:null,n:10,k:null})).replace(/=+$/,''),target);legacy.w.document.dispatchEvent(new legacy.w.Event('DOMContentLoaded'));assert.match(legacy.w.document.querySelector('[data-game-friend-entry]').textContent,/needs an update/);assert.equal(legacy.w.BrainiGameChallengeModel.compare({...d,v:1},d),null);legacy.w.close();
console.log(`PASS: ${count} real game/mode loaders capture/replay the exact ordered set; short links, immutable rematches, isolated practice, offline retry, legacy links, preparation and owner guards.`);
