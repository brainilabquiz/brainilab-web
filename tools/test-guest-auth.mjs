import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../assets/js');
const scripts=await Promise.all(['data.js','supabase-auth.js','supabase-games.js'].map(f=>readFile(path.join(root,f),'utf8')));
let checks=0;
function check(value,name){assert.ok(value,name);checks++;console.log('PASS',name);}
function harness(){
  const storage=new Map(),events=[],calls=[];
  let session=null,authCallback=null,anonymousCount=0,failSave=false,failAnonymous=false,failClaim=false;
  const guest={id:'20000000-0000-4000-8000-000000000002',is_anonymous:true};
  const account={id:'30000000-0000-4000-8000-000000000003',is_anonymous:false,email:'private@example.test'};
  const store={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
  const client={auth:{
    getSession:async()=>({data:{session}}),
    onAuthStateChange:fn=>{authCallback=fn;return {data:{subscription:{unsubscribe(){}}}};},
    signInAnonymously:async()=>{calls.push('anonymous');anonymousCount++;if(failAnonymous)return {error:new Error('Offline')};await Promise.resolve();session={user:guest};return {data:{session}};},
    signInWithPassword:async()=>{calls.push('sign-in');session={user:account};return {data:{session}};},
    signInWithOAuth:async()=>{calls.push('oauth');return {data:{url:'https://accounts.google.com/'}};},
    signUp:async()=>({data:{user:account,session:null}}),
    signOut:async()=>{session=null;return {};}
  },rpc:async(name,args)=>{
    calls.push(name);
    if(name==='submit_brainilab_game_result'){
      if(failSave)return {error:new Error('Offline')};
      return {data:{session_id:'session-1',result_id:'result-1'}};
    }
    if(name==='claim_brainilab_guest_results'){
      if(failClaim)return {error:new Error('Claim unavailable')};
      return {data:{claimed:true,transferred:1,skipped_client_result_ids:[]}};
    }
    return {data:{prepared:true}};
  }};
  const context=vm.createContext({console:{warn(){},error(){}},crypto:webcrypto,URL,URLSearchParams,Date,Math,JSON,Uint8Array,
    localStorage:store,sessionStorage:store,setTimeout,clearTimeout,
    location:{search:'',origin:'https://brainilab.example',href:'https://brainilab.example/',hostname:'brainilab.example',protocol:'https:',host:'brainilab.example'},
    document:{querySelector:()=>null},navigator:{},CustomEvent:class{constructor(type,opts){this.type=type;this.detail=opts?.detail;}},
    dispatchEvent:e=>events.push(e),BRAINI_SUPABASE:{url:'https://example.supabase.co',publishableKey:'public-test-key-long-enough'},
    supabase:{createClient:()=>client}
  });
  context.window=context;
  scripts.forEach(s=>vm.runInContext(s,context));
  return {context,storage,calls,events,guest,account,
    get count(){return anonymousCount;},set failSave(v){failSave=v;},set failAnonymous(v){failAnonymous=v;},set failClaim(v){failClaim=v;},
    reloadAuth:()=>{context.BrainiBackendAuth.destroy();return context.BrainiBackendAuth.init();}};
}
{
  const h=harness(),c=h.context;
  await c.BrainiBackendAuth.init();
  check(h.count===0,'visiting a page does not create a guest account');
  await c.BrainiData.api.submitGameResult('survival',{score:50,practice:true,dailyNumber:null});
  check(h.count===0,'practice never creates a session or sends a result');
  c.location.search='?try=1';
  await c.BrainiData.api.submitGameResult('brainmix',{score:99});
  check(h.count===0 && h.calls.length===0,'Try First never submits ranked data');
  c.location.search='';
  const [a,b]=await Promise.all([c.BrainiBackendAuth.ensurePlayerSession(),c.BrainiBackendAuth.ensurePlayerSession()]);
  check(h.count===1 && a.user.id===b.user.id,'concurrent first completions share one guest session');
  check(!c.BrainiData.isAuthenticated() && c.BrainiData.authState().guestUserId===h.guest.id,'guest session keeps guest account UI');
  await h.reloadAuth();
  check(h.count===1 && c.BrainiBackendAuth.hasPlayerSession(),'reload reuses the persistent guest session');
  const result=c.BrainiData.recordGameResult('survival',{score:50,dailyNumber:null});
  await Promise.all([c.BrainiCloudGames.saveCompletedResult('survival',result),c.BrainiCloudGames.saveCompletedResult('survival',result)]);
  check(h.calls.filter(x=>x==='submit_brainilab_game_result').length===1,'auth refresh and direct save share one in-flight submission');
  check(c.BrainiData.recentResults().find(r=>r.clientResultId===result.clientResultId).cloudSyncStatus==='synced','guest result is marked synced');
  await c.BrainiBackendAuth.signInWithEmail('private@example.test','test-placeholder');
  const prepare=h.calls.indexOf('prepare_brainilab_guest_claim'),login=h.calls.indexOf('sign-in'),claim=h.calls.indexOf('claim_brainilab_guest_results');
  check(prepare<login && login<claim,'claim is prepared before login and consumed after authentication');
  check(!h.storage.has('brainilab_guest_claim_v1') && c.BrainiData.isAuthenticated(),'successful merge clears claim and enables registered account UI');
  check(c.BrainiData.recentResults().some(r=>r.clientResultId===result.clientResultId),'unique guest progress survives login');
  await c.BrainiBackendAuth.signOut();
  check(c.BrainiData.recentResults().length===0 && !c.BrainiBackendAuth.hasPlayerSession(),'sign-out isolates previous account progress from a new guest');
}
{
  const h=harness(),c=h.context;
  h.failAnonymous=true;
  const result=await c.BrainiData.api.submitGameResult('survival',{score:50,dailyNumber:null});
  check(result.cloudSyncStatus==='pending' && c.BrainiData.recentResults().length===1,'network/auth failure preserves completed result locally');
  h.failAnonymous=false;
  const sync=await c.BrainiCloudGames.syncPendingResults();
  check(sync.synced===1 && c.BrainiData.recentResults()[0].cloudSyncStatus==='synced','pending guest game retries successfully');
  h.failClaim=true;
  await assert.rejects(()=>c.BrainiBackendAuth.signInWithEmail('private@example.test','test-placeholder'));
  check(h.storage.has('brainilab_guest_claim_v1'),'failed merge keeps its secure retry token');
  h.failClaim=false;
  await h.reloadAuth();
  check(!h.storage.has('brainilab_guest_claim_v1') && c.BrainiData.isAuthenticated(),'reload recovers an interrupted guest-to-account merge');
}
console.log(`\n${checks} browser-state checks passed.`);
