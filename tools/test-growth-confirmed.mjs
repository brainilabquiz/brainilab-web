import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {webcrypto} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {confirmationsHTML} from '../editor/growth-confirmations.js';
const {JSDOM}=createRequire(import.meta.url)(process.env.JSDOM_MODULE||'jsdom');
const source=readFileSync('assets/js/growth-conversions.js','utf8'),key='brainilab_registration_arrival_v1',ck='brainilab_statistics_consent_v1';
const authKey='sb-wvgcdlxebbybthyuajgb-auth-token';
const accountA='00000000-0000-4000-8000-000000000001',accountB='00000000-0000-4000-8000-000000000002';
const signedIn=id=>({user:{id,is_anonymous:false},access_token:'fixture-'+id});
function page(storage={},cloud=true){const d=new JSDOM('<title>Quiz</title>',{url:'https://brainilabgames.com/games/',runScripts:'outside-only'}),w=d.window;
 Object.defineProperty(w,'crypto',{value:webcrypto}); w.TextEncoder=TextEncoder;
 for(const [k,value] of Object.entries({[authKey]:JSON.stringify(signedIn(accountA)),...storage}))w.localStorage.setItem(k,value);
 w.calls=[];w.session=signedIn(accountA);w.response={data:{status:'recorded'}};
 w.BrainiData={authState:()=>({status:'authenticated',user:{id:w.session?.user?.id}})};
 w.BrainiBackendAuth={getSession:async()=>w.session,getClient:()=>({rpc:(name,args)=>({setHeader:async(header,value)=>{
  assert.equal(header,'Authorization');w.calls.push({name,args,authorization:value});return typeof w.response==='function'?w.response(name):w.response;
 }})})};
 w.eval(readFileSync('assets/js/growth-withdrawals.js','utf8'));
 w.eval(readFileSync('assets/js/site-analytics.js','utf8'));
 w.BrainiSiteAnalytics.registrationContext=()=>({channel:'organic_search',path:'/geography/',startedAt:Date.now()-10000});
 if(cloud)w.eval(source);return w;}
const flush=()=>new Promise(r=>setTimeout(r,0));
async function until(check){for(let i=0;i<100;i++){if(check())return;await delay(5);}assert.ok(check(),'Timed out waiting for the browser action');}
const markers=w=>Object.keys(w.localStorage).filter(k=>k.startsWith('brainilab_arrival_withdraw_v1:'));
function rejectStatistics(w){w.BrainiSiteAnalytics.setConsent(false);}
let w=page();await flush();w.BrainiGrowthConversions.prepare();await w.BrainiGrowthConversions.flush();assert.equal(w.calls.length,0);assert.equal(w.localStorage.getItem(key),null);
w.localStorage.setItem(ck,JSON.stringify({allowed:true,at:Date.now()}));w.BrainiGrowthConversions.prepare();let p=JSON.parse(w.localStorage.getItem(key));assert.equal(p.path,'/geography/');assert.deepEqual(Object.keys(p).sort(),['channel','path','requestedAt','startedAt']);
w.session.user.is_anonymous=true;await w.BrainiGrowthConversions.flush();assert.equal(w.calls.length,0);
w.session.user.is_anonymous=false;w.response={error:{message:'Offline'}};await w.BrainiGrowthConversions.flush();assert.ok(w.localStorage.getItem(key));
w.response={data:{status:'recorded'}};await w.BrainiGrowthConversions.flush();assert.equal(w.localStorage.getItem(key),null);const count=w.calls.length;await w.BrainiGrowthConversions.flush();assert.equal(w.calls.length,count);assert.ok(!JSON.stringify(w.calls).includes('email'));
w.BrainiGrowthConversions.prepare();w.response={data:{status:'ineligible'}};await w.BrainiGrowthConversions.flush();assert.equal(w.localStorage.getItem(key),null);
w.localStorage.setItem(key,JSON.stringify({...p,requestedAt:Date.now()-8*86400000}));await w.BrainiGrowthConversions.flush();assert.equal(w.localStorage.getItem(key),null);
w.BrainiGrowthConversions.prepare();let release;w.response=name=>name==='record_brainilab_account_arrival'?new Promise(r=>release=r):{data:null};const sending=w.BrainiGrowthConversions.flush();await flush();
rejectStatistics(w);release({data:{status:'recorded'}});await sending;await until(()=>markers(w).length===0);assert.equal(w.localStorage.getItem(key),null);assert.equal(w.calls.at(-1).name,'withdraw_brainilab_account_arrival');w.close();

// The SDK may resolve with an error instead of throwing. Retry only for the original signed-in account, even after reload.
w=page();await flush();w.response={error:{message:'Offline'}};rejectStatistics(w);
await until(()=>w.calls.length===1);assert.equal(markers(w).length,1);
const stored={...w.localStorage};const receipts=markers(w).map(k=>[k,stored[k]]);assert.ok(!JSON.stringify(receipts).includes(accountA));assert.ok(!JSON.stringify(receipts).includes('organic_search'));w.close();
w=page(stored);w.session=signedIn(accountB);await flush();await w.BrainiGrowthConversions.flush();assert.equal(w.calls.length,0);assert.equal(markers(w).length,1);
w.session=signedIn(accountA);w.response=()=>{throw Error('Disconnected');};await w.BrainiGrowthConversions.flush();assert.equal(markers(w).length,1);
w.response={data:null,error:null};w.dispatchEvent(new w.Event('online'));await until(()=>markers(w).length===0);
assert.equal(w.calls.at(-1).authorization,'Bearer fixture-'+accountA);const afterDelete=w.calls.length;
await w.BrainiGrowthConversions.flush();assert.equal(w.calls.length,afterDelete);w.close();

// A late acknowledgement must leave a later withdrawal pending, including when consent is granted again.
w=page();await flush();const first=Promise.withResolvers();let attempts=0;
w.response=()=>++attempts===1?first.promise:{error:{message:'Disconnected'}};
rejectStatistics(w);await until(()=>attempts===1);rejectStatistics(w);await until(()=>markers(w).length===2);
first.resolve({data:null,error:null});await until(()=>attempts===2&&markers(w).length===1);
w.localStorage.setItem(ck,JSON.stringify({allowed:true,at:Date.now()}));w.BrainiGrowthConversions.prepare();await w.BrainiGrowthConversions.flush();
assert.ok(w.localStorage.getItem(key));assert.ok(!w.calls.some(call=>call.name==='record_brainilab_account_arrival'));
w.response=name=>name.startsWith('withdraw_')?{data:null,error:null}:{data:{status:'recorded'}};
await w.BrainiGrowthConversions.flush();assert.equal(markers(w).length,0);assert.equal(w.localStorage.getItem(key),null);w.close();

// The initial privacy panel must capture the person who rejected before the optional cloud client is loaded.
w=page({[authKey]:JSON.stringify(signedIn(accountA))},false);rejectStatistics(w);
await until(()=>markers(w).length===1);assert.ok(!markers(w)[0].includes(accountA));
w.session=signedIn(accountB);w.localStorage.setItem(authKey,JSON.stringify(w.session));w.eval(source);await w.BrainiGrowthConversions.flush();
assert.equal(w.calls.length,0);w.dispatchEvent(new w.StorageEvent('storage',{key:ck,newValue:w.localStorage.getItem(ck)}));await flush();
assert.equal(markers(w).length,1);assert.equal(w.calls.length,0);
w.session=signedIn(accountA);await w.BrainiGrowthConversions.flush();assert.equal(markers(w).length,0);assert.equal(w.calls[0].authorization,'Bearer fixture-'+accountA);w.close();

// At bootstrap the projection can still describe A while B has already signed in and rejects statistics.
w=page({[authKey]:JSON.stringify(signedIn(accountB))});await flush();
w.BrainiData={authState:()=>({status:'authenticated',user:{id:accountA}})};
w.BrainiBackendAuth.currentScope=()=>({userId:null});w.BrainiBackendAuth.getSession=async()=>{throw Error('Offline during bootstrap');};
rejectStatistics(w);
await until(()=>markers(w).length===1);w.BrainiBackendAuth.getSession=async()=>w.session;
w.session=signedIn(accountB);await w.BrainiGrowthConversions.flush();assert.equal(w.calls.length,1);assert.equal(w.calls[0].authorization,'Bearer fixture-'+accountB);
w.session=signedIn(accountA);w.dispatchEvent(new w.Event('online'));await flush();assert.equal(w.calls.length,1);assert.equal(markers(w).length,0);w.close();

// A signed-out rejection must never authorize a future account, even if its SDK session arrives late.
w=page();await flush();w.localStorage.removeItem(authKey);const login=Promise.withResolvers();
let sessionReads=0;w.BrainiBackendAuth.getSession=()=>{sessionReads++;return login.promise;};
rejectStatistics(w);w.dispatchEvent(new w.Event('brainilab:statistics-consent'));
w.session=signedIn(accountB);w.localStorage.setItem(authKey,JSON.stringify(w.session));login.resolve(w.session);
w.dispatchEvent(new w.Event('brainilab:backend-auth'));w.dispatchEvent(new w.Event('online'));await flush();
assert.equal(sessionReads,0);assert.equal(w.calls.length,0);assert.equal(markers(w).length,0);w.close();

// If recording committed but the reply was lost, an acknowledged deletion must still follow that record attempt.
w=page();await flush();w.localStorage.setItem(ck,JSON.stringify({allowed:true,at:Date.now()}));w.BrainiGrowthConversions.prepare();
const record=Promise.withResolvers();w.response=name=>name.startsWith('record_')?record.promise:{data:null,error:null};
const recording=w.BrainiGrowthConversions.flush();await until(()=>w.calls.length===1);rejectStatistics(w);
await until(()=>markers(w).length===1);record.reject(Error('Response lost'));await recording;
assert.equal(w.calls.at(-1).authorization,'Bearer fixture-'+accountA);assert.equal(w.calls.at(-1).name,'withdraw_brainilab_account_arrival');assert.equal(markers(w).length,0);w.close();

assert.match(confirmationsHTML(null),/Missing data is not zero/);
const report={source:'Supabase Auth confirmation ledger',currentConfirmed:4,newConfirmed:0,attributed:0,unattributed:0,baselineAccounts:4,channels:[],landings:[],captureStartedAt:'2026-10-02',coverageGaps:0};
assert.match(confirmationsHTML(report),/4 retained accounts/);assert.match(confirmationsHTML(report),/not new acquisitions/);
assert.ok(!confirmationsHTML({...report,landings:[{path:'<script>alert(1)</script>',accounts:1}]}).includes('<script>'));
assert.match(confirmationsHTML({...report,coverageGaps:1}),/Investigate capture/);
console.log('PASS confirmed accounts: consent, private pending context, expiry, offline withdrawal and reconnect, stale sessions, pre-cloud decisions, concurrent receipts, ambiguous writes and aggregate rendering.');
