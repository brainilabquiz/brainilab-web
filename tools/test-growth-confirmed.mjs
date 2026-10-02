import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {confirmationsHTML} from '../editor/growth-confirmations.js';
const {JSDOM}=createRequire(import.meta.url)(process.env.JSDOM_MODULE||'jsdom');
const source=readFileSync('assets/js/growth-conversions.js','utf8'),key='brainilab_registration_arrival_v1',ck='brainilab_statistics_consent_v1';
function page(){const d=new JSDOM('<title>Quiz</title>',{url:'https://brainilabgames.com/games/',runScripts:'outside-only'}),w=d.window;
 w.BrainiSiteAnalytics={registrationContext:()=>({channel:'organic_search',path:'/geography/',startedAt:Date.now()-10000})};
 w.calls=[];w.session={user:{is_anonymous:false}};w.response={data:{status:'recorded'}};
 w.BrainiBackendAuth={getSession:async()=>w.session,getClient:()=>({rpc:async(name,args)=>{w.calls.push({name,args});return typeof w.response==='function'?w.response(name):w.response;}})};
 w.eval(source);return w;}
const flush=()=>new Promise(r=>setTimeout(r,0));
let w=page();await flush();w.BrainiGrowthConversions.prepare();await w.BrainiGrowthConversions.flush();assert.equal(w.calls.length,0);assert.equal(w.localStorage.getItem(key),null);
w.localStorage.setItem(ck,JSON.stringify({allowed:true,at:Date.now()}));w.BrainiGrowthConversions.prepare();let p=JSON.parse(w.localStorage.getItem(key));assert.equal(p.path,'/geography/');assert.deepEqual(Object.keys(p).sort(),['channel','path','requestedAt','startedAt']);
w.session.user.is_anonymous=true;await w.BrainiGrowthConversions.flush();assert.equal(w.calls.length,0);
w.session.user.is_anonymous=false;w.response={error:{message:'Offline'}};await w.BrainiGrowthConversions.flush();assert.ok(w.localStorage.getItem(key));
w.response={data:{status:'recorded'}};await w.BrainiGrowthConversions.flush();assert.equal(w.localStorage.getItem(key),null);const count=w.calls.length;await w.BrainiGrowthConversions.flush();assert.equal(w.calls.length,count);assert.ok(!JSON.stringify(w.calls).includes('email'));
w.BrainiGrowthConversions.prepare();w.response={data:{status:'ineligible'}};await w.BrainiGrowthConversions.flush();assert.equal(w.localStorage.getItem(key),null);
w.localStorage.setItem(key,JSON.stringify({...p,requestedAt:Date.now()-8*86400000}));await w.BrainiGrowthConversions.flush();assert.equal(w.localStorage.getItem(key),null);
w.BrainiGrowthConversions.prepare();let release;w.response=name=>name==='record_brainilab_account_arrival'?new Promise(r=>release=r):{data:null};const sending=w.BrainiGrowthConversions.flush();await flush();
w.localStorage.setItem(ck,JSON.stringify({allowed:false,at:Date.now()}));w.dispatchEvent(new w.Event('brainilab:statistics-consent'));release({data:{status:'recorded'}});await sending;await flush();assert.equal(w.localStorage.getItem(key),null);assert.equal(w.calls.at(-1).name,'withdraw_brainilab_account_arrival');w.close();

assert.match(confirmationsHTML(null),/Missing data is not zero/);
const report={source:'Supabase Auth confirmation ledger',currentConfirmed:4,newConfirmed:0,attributed:0,unattributed:0,baselineAccounts:4,channels:[],landings:[],captureStartedAt:'2026-10-02',coverageGaps:0};
assert.match(confirmationsHTML(report),/4 retained accounts/);assert.match(confirmationsHTML(report),/not new acquisitions/);
assert.ok(!confirmationsHTML({...report,landings:[{path:'<script>alert(1)</script>',accounts:1}]}).includes('<script>'));
assert.match(confirmationsHTML({...report,coverageGaps:1}),/Investigate capture/);
console.log('PASS confirmed accounts: consent gating, anonymous suppression, private pending context, expiry, error/retry, consumption, revocation during flight, safe aggregate rendering.');
