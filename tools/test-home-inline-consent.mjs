import assert from 'node:assert/strict';
import{readFileSync}from'node:fs';
import{pathToFileURL}from'node:url';
import{homeConsent}from'../lib/home-consent.js';
import{homeConsentFirstResponse}from'../lib/home-first-paint.js';
const{JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const meta=readFileSync('assets/js/meta-pixel.js','utf8'),stats=readFileSync('assets/js/site-analytics.js','utf8');
const base='<html><head><script defer src="/assets/js/consent.bundle.js?v=abc"></script><script defer src="/slow-account.js"></script></head><body class="home-page braini-visual"><main>Unchanged game entry</main></body></html>';
const now=Date.now(),saved=allowed=>({allowed,at:now}),expired={allowed:true,at:now-181*86400000},future={allowed:false,at:now+86400000};
for(const[m,s,prompt]of[[null,null,true],[saved(false),saved(false),false],[saved(true),saved(true),false],[saved(false),null,true],[null,saved(false),true],[expired,saved(false),true],[saved(false),expired,true],[future,saved(false),true],['bad',saved(false),true]]){
 let html=homeConsentFirstResponse(homeConsent(base,meta),'index.html',stats+'\n'+meta);
 html=html.replace('<main>','<script>window.beforeMain={ready:document.readyState,activeButtons:[...document.querySelectorAll(".marketing-consent button")].every(b=>!b.disabled),prompts:document.querySelectorAll(".marketing-consent").length,statistics:window.BrainiSiteAnalytics.isAllowed()};</script><main>');
 const dom=new JSDOM(html,{url:'https://brainilabgames.com/',runScripts:'dangerously',beforeParse(w){for(const[key,value]of[['marketing',m],['statistics',s]])if(value!==null)w.localStorage.setItem('brainilab_'+key+'_consent_v1',value==='bad'?'invalid json':JSON.stringify(value));}}),w=dom.window;
 assert.equal(w.beforeMain.ready,'loading','controller is ready before main markup and deferred SDKs');
 assert.equal(w.beforeMain.prompts,prompt?1:0);assert.ok(w.beforeMain.activeButtons);
 assert.equal(w.document.querySelectorAll('[data-home-consent-controller]').length,1);
 assert.ok(!w.document.querySelector('script[src*="consent.bundle"]'));
 assert.ok(w.document.querySelector('script[src="/slow-account.js"]'),'unrelated account loading is unchanged');
 if(!m||m==='bad'||m.allowed===false||m===expired)assert.ok(!w.document.querySelector('script[data-brainilab-meta]'));
 if(!s||s.allowed===false||s===expired)assert.ok(!w.document.querySelector('script[data-brainilab-analytics]'));
 if(prompt){w.document.querySelector('[data-marketing-reject]').click();assert.equal(w.BrainiSiteAnalytics.isAllowed(),false);assert.equal(JSON.parse(w.localStorage.getItem('brainilab_marketing_consent_v1')).allowed,false);assert.equal(w.document.querySelector('.marketing-consent'),null);}
 assert.equal(w.document.querySelector('main').textContent,'Unchanged game entry');w.close();
}
assert.equal(homeConsentFirstResponse(base,'learn/index.html','ignored'),base);
assert.throws(()=>homeConsentFirstResponse(base,'index.html','ignored'),/Missing initial/);
const escaped=homeConsentFirstResponse(homeConsent(base,meta),'index.html','window.example="</script>";');
assert.ok(escaped.includes('window.example="<\\/script>";'));
console.log('PASS inline home consent: nine real states, working controls before main/deferred SDK, no pre-consent Google/Meta requests, stored rejection/expiry/future states, exact original logic and unchanged account/game entry.');
