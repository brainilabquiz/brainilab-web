import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const source=name=>readFileSync('assets/js/'+name,'utf8');
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
const accountKey='sb-wvgcdlxebbybthyuajgb-auth-token',consentKey='brainilab_statistics_consent_v1';
const owner={id:'account-a',is_anonymous:false,app_metadata:{provider:'google'}};
function harness(user=owner){
  const w=new JSDOM('<title>Practice</title><main>Play unchanged</main><a data-manage-privacy href="/cookies/">Manage privacy</a>',{url:'https://brainilabgames.com/games/',runScripts:'outside-only'}).window;
  const requests=[],syncs=[];let callback;
  w.localStorage.setItem(consentKey,JSON.stringify({allowed:true,at:Date.now()}));
  w.localStorage.setItem('brainilab_marketing_consent_v1',JSON.stringify({allowed:false,at:Date.now()}));
  w.localStorage.setItem('unchanged-player-progress',JSON.stringify({xp:1234,score:91,avatar:'owl',results:[{score:91}]}));
  w.localStorage.setItem('brainilab_growth_entry_v1',JSON.stringify({channel:'referral',path:'/games/',startedAt:Date.now(),lastAt:Date.now()}));
  if(user)w.localStorage.setItem(accountKey,JSON.stringify({user}));
  w.document.cookie='_ga=existing-statistics-cookie; Path=/';
  const client={auth:{getSession:async()=>({data:{session:user?{user}:null}}),getUser:()=>new Promise((resolve,reject)=>requests.push({resolve,reject})),onAuthStateChange:fn=>{callback=fn;return {data:{subscription:{unsubscribe(){}}}};}}};
  w.BRAINI_SUPABASE={url:'https://example.supabase.co',publishableKey:'public-test-key-long-enough'};
  w.supabase={createClient:()=>client};
  w.BrainiData={authState:()=>({status:'guest'}),api:{syncExternalAuthUser:async u=>syncs.push(u.id),syncExternalGuestUser:async u=>syncs.push(u.id),clearExternalAuthUser:async()=>{}}};
  for(const f of ['site-analytics.js','meta-pixel.js','supabase-auth.js'])w.eval(source(f));
  return {w,requests,syncs,emit:(event,user)=>callback(event,user?{user}:null)};
}
{
  const {w,requests,syncs}=harness();
  const progress=w.localStorage.getItem('unchanged-player-progress'),entry=w.localStorage.getItem('brainilab_growth_entry_v1');
  assert.equal(w.BrainiSiteAnalytics.accountStatus(),'pending');
  assert.equal(w.document.querySelector('[data-brainilab-analytics]'),null,'a cached signed-in session cannot leak a first page view');
  await w.BrainiBackendAuth.init();
  assert.deepEqual(syncs,['account-a'],'profile sync completes independently of a pending privacy request');
  assert.equal(w.document.cookie,'_ga=existing-statistics-cookie','a pending read must not reset sessions for ordinary signed-in readers');
  assert.equal(w.localStorage.getItem('brainilab_growth_entry_v1'),entry,'a pending read preserves attribution');
  requests[0].resolve({data:{user:{...owner,app_metadata:{provider:'google',analytics_excluded:true}}}});await tick();
  const api=w.BrainiSiteAnalytics;
  assert.equal(api.accountStatus(),'excluded');assert.equal(api.isAllowed(),false);
  assert.equal(w['ga-disable-G-97WN37VLHV'],true);assert.equal(w.dataLayer,undefined);
  api.setConsent(true);api.gameStart('brainmix',{},'anytime');api.registrationRequest('email');
  w.dispatchEvent(new w.CustomEvent('brainilab:datachange',{detail:{type:'game_result',gameId:'brainmix',result:{score:91,clientResultId:'test-result'}}}));
  assert.equal(w.dataLayer,undefined);assert.equal(api.registrationContext(),null);
  assert.equal(w.document.querySelector('[data-brainilab-analytics]'),null,'accepting optional cookies cannot override an account exclusion');
  assert.ok(!w.document.cookie.includes('_ga='));
  w.BrainiMarketing.showPreferences();
  assert.equal(w.document.querySelector('[data-statistics-choice]').disabled,true);
  assert.match(w.document.querySelector('[data-account-statistics-status]').textContent,/off.*every device/);
  w.document.querySelector('[data-save-cookie-choices]').click();
  assert.equal(JSON.parse(w.localStorage.getItem(consentKey)).allowed,true,'saving another purpose does not rewrite the saved statistics choice');
  assert.equal(w.localStorage.getItem('unchanged-player-progress'),progress,'exclusion never changes XP, scores, avatar or saved results');
  w.close();
}
{
  const {w,requests}=harness();await w.BrainiBackendAuth.init();
  requests[0].resolve({data:{user:owner}});await tick();
  assert.equal(w.BrainiSiteAnalytics.accountStatus(),'included');
  assert.equal(w.document.querySelectorAll('[data-brainilab-analytics]').length,1);
  assert.equal(w.dataLayer.filter(x=>x[0]==='event'&&x[1]==='page_view').length,1);
  assert.equal(w.document.cookie,'_ga=existing-statistics-cookie');w.close();
}
{
  const {w,requests,syncs}=harness();await w.BrainiBackendAuth.init();
  requests[0].reject(Error('offline'));await tick();
  assert.equal(w.BrainiSiteAnalytics.accountStatus(),'pending');assert.equal(w.dataLayer,undefined);
  assert.deepEqual(syncs,['account-a'],'a privacy lookup failure cannot stop account/progress sync');w.close();
}
{
  const {w,requests,emit}=harness();await w.BrainiBackendAuth.init();
  const other={id:'account-b',is_anonymous:false,app_metadata:{}};
  emit('SIGNED_IN',other);await tick();
  assert.equal(requests.length,2);
  requests[1].resolve({data:{user:other}});await tick();
  requests[0].resolve({data:{user:{...owner,app_metadata:{analytics_excluded:true}}}});await tick();
  assert.equal(w.BrainiSiteAnalytics.accountStatus(),'included','an obsolete account response cannot overwrite the current account');
  w.BrainiSiteAnalytics.setAccountState('pending');
  assert.equal(w['ga-disable-G-97WN37VLHV'],true);const count=w.dataLayer.length;
  w.BrainiSiteAnalytics.gameStart('brainmix',{});assert.equal(w.dataLayer.length,count);
  w.close();
}
for(const user of [null,{id:'guest',is_anonymous:true}]){
  const {w,requests}=harness(user);await w.BrainiBackendAuth.init();
  assert.equal(requests.length,0,'anonymous visitors need no extra account privacy request');
  assert.equal(w.BrainiSiteAnalytics.isAllowed(),true);assert.equal(w.document.querySelectorAll('[data-brainilab-analytics]').length,1);w.close();
}
console.log('PASS account exclusions: no first-page leak, fresh metadata on existing sessions, failures pause statistics only, account-switch races, consent independence, ordinary visitor cookies/attribution, and unchanged progress.');
