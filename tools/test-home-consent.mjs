import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {homeConsent} from '../lib/home-consent.js';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const meta=readFileSync(process.env.CONSENT_TEST_SOURCE||'assets/js/meta-pixel.js','utf8'),stats=readFileSync('assets/js/site-analytics.js','utf8');
const now=Date.now(),stored=allowed=>({allowed,at:now}),old={allowed:true,at:now-181*86400000},future={allowed:false,at:now+86400000};
const html='<!doctype html><html><head><title>Home</title></head><body class="home-page braini-visual"><main>Play unchanged</main></body></html>';
for(const [marketing,statistics,visible] of [[null,null,true],[stored(false),stored(false),false],[stored(true),stored(true),false],[stored(false),null,true],[null,stored(false),true],[old,stored(false),true],[stored(false),old,true],[future,stored(false),true],['bad',stored(false),true]]){
 const dom=new JSDOM(homeConsent(html,meta),{url:'https://brainilabgames.com/',runScripts:'dangerously',beforeParse(w){
  for(const [key,value] of [['marketing',marketing],['statistics',statistics]])if(value!==null)w.localStorage.setItem('brainilab_'+key+'_consent_v1',value==='bad'?'invalid json':JSON.stringify(value));
 }}),w=dom.window;
 const initial=w.document.querySelector('[data-static-cookie-prompt]');
 const paragraph=initial.querySelector('p'),next=initial.nextSibling,details=initial.querySelector('details'),summary=details.querySelector('summary');
 if(visible){details.open=true;summary.focus();}
 assert.equal(initial.hidden,!visible,'first HTML respects both stored choices and expiry');
 assert.ok([...initial.querySelectorAll('button')].every(b=>b.disabled),'controls wait for the existing controller');
 assert.equal(w.document.querySelectorAll('script[src]').length,0,'initial rendering never sends tracking requests');
 w.eval(stats);w.eval(meta);
 const prompts=w.document.querySelectorAll('.marketing-consent');assert.equal(prompts.length,visible?1:0,'hydrate once or remove the unused placeholder');
 if(visible){assert.equal(prompts[0],initial);assert.equal(initial.hidden,false);assert.ok([...initial.querySelectorAll('button')].every(b=>!b.disabled));
  assert.equal(initial.querySelector('p'),paragraph,'Keep the first-painted consent text instead of creating a late LCP candidate');
  assert.equal(initial.nextSibling,next,'Do not move the initial prompt in the document');
  assert.equal(initial.querySelector('details'),details);assert.equal(details.open,true);assert.equal(w.document.activeElement,summary,'Keep a reader’s open settings and keyboard focus');
  initial.querySelector('[data-marketing-reject]').click();assert.equal(w.document.querySelector('.marketing-consent'),null);assert.equal(w.BrainiSiteAnalytics.isAllowed(),false);}
 assert.equal(w.document.querySelector('main').textContent,'Play unchanged');
 w.close();
}
assert.throws(()=>homeConsent(html,'changed controller'),/must match/,'fail the build if the shared prompt literal cannot be extracted');
console.log('PASS first-paint home prompt: shared exact copy, consent/expiry/malformed/future states, no premature tracking, disabled-before-hydration, single controller and unchanged content.');
