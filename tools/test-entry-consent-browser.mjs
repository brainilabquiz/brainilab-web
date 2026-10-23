import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {entryConsent} from '../lib/entry-consent.js';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const meta=readFileSync('assets/js/meta-pixel.js','utf8'),stats=readFileSync('assets/js/site-analytics.js','utf8');
const base='<html><head><script defer src="/assets/js/consent.bundle.js?v=abc"></script><script defer src="/slow-account.js"></script></head><body class="game-entry-page"><main>Same game, article and progress</main></body></html>';
const now=Date.now(),saved=allowed=>({allowed,at:now}),expired={allowed:true,at:now-181*86400000},future={allowed:false,at:now+86400000};let count=0;
for(const file of ['games/math-rush/index.html','games/sequence/index.html','learn/index.html']){
 for(const [m,s,prompt,account] of [[null,null,true],[saved(false),saved(false),false],[saved(true),saved(true),false],[saved(false),null,true],[null,saved(false),true],[expired,saved(false),true],[saved(false),expired,true],[future,saved(false),true],['bad',saved(false),true],[saved(false),saved(true),false,true]]){
  let html=entryConsent(base,file,meta,stats+'\n'+meta);
  html=html.replace('<main>','<script>window.beforeMain={ready:document.readyState,activeButtons:[...document.querySelectorAll(".marketing-consent button")].every(b=>!b.disabled),prompts:document.querySelectorAll(".marketing-consent").length,statistics:window.BrainiSiteAnalytics.isAllowed()};</script><main>');
  const dom=new JSDOM(html,{url:'https://brainilabgames.com/'+file.replace('index.html',''),runScripts:'dangerously',beforeParse(w){for(const [key,value]of[['marketing',m],['statistics',s]])if(value!==null)w.localStorage.setItem('brainilab_'+key+'_consent_v1',value==='bad'?'invalid json':JSON.stringify(value));if(account)w.localStorage.setItem('sb-wvgcdlxebbybthyuajgb-auth-token',JSON.stringify({user:{id:'signed-in-test-fixture',is_anonymous:false}}));}}),w=dom.window;
  assert.equal(w.beforeMain.ready,'loading');assert.equal(w.beforeMain.prompts,prompt?1:0);assert.ok(w.beforeMain.activeButtons);
  if(!m||m==='bad'||m.allowed===false||m===expired)assert.ok(!w.document.querySelector('script[data-brainilab-meta]'));
  if(!s||s.allowed===false||s===expired||account)assert.ok(!w.document.querySelector('script[data-brainilab-analytics]'),'no Analytics before explicit consent and a confirmed included account');
  if(account){assert.equal(w.beforeMain.statistics,false);w.BrainiSiteAnalytics.setAccountState('excluded');assert.ok(!w.document.querySelector('script[data-brainilab-analytics]'));}
  if(prompt){w.document.querySelector('[data-marketing-reject]').click();assert.equal(w.BrainiSiteAnalytics.isAllowed(),false);assert.equal(JSON.parse(w.localStorage.getItem('brainilab_marketing_consent_v1')).allowed,false);assert.equal(w.document.querySelector('.marketing-consent'),null);}
  assert.equal(w.document.querySelector('main').textContent,'Same game, article and progress');assert.ok(w.document.querySelector('script[src="/slow-account.js"]'));w.close();count++;
 }
}
console.log('PASS '+count+' entry privacy browser states: first-response controls, no pre-consent tags, saved rejection, expiry/future/invalid choices, pending/excluded accounts and unchanged game content.');
