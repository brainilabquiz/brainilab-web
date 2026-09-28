import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const source=readFileSync('assets/js/ads.js','utf8');
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
function page({url='https://brainilabgames.com/',enabled=true,plus=false,slot='2201740000',queued=false}={}){
  const dom=new JSDOM('<div id="homeQuiz"></div><div class="brainilab-ad-slot" data-ad-slot="home_after_play" hidden></div><footer></footer>',{url,runScripts:'outside-only'});
  const w=dom.window;
  w.BRAINI_MONETIZATION_CONFIG={ads:{publisherId:'ca-pub-5613536700850101',slots:{home_after_play:slot}}};
  w.BrainiMonetization={canDecideAds:()=>true,adsEnabled:()=>enabled,adsFree:()=>plus};
  w.BrainiRuntime={has:()=>true,get:()=>({enabled:true})};
  w.BrainiData={track:()=>{}};
  if(queued) w.adsbygoogle=[];
  w.eval(source);
  return w;
}
for(const options of [{enabled:false},{plus:true},{slot:''},{url:'https://preview.workers.dev/'},{url:'https://brainilabgames.com/admin/'},{url:'https://brainilabgames.com/games/math-rush/'}]){
  const w=page(options);await tick();assert.equal(w.document.scripts.length,0);assert.equal(w.document.querySelector('[data-ad-slot]').hidden,true);w.close();
}
const w=page({queued:true});await tick();
const script=w.document.querySelector('script[data-brainilab-adsense]');
assert.ok(script);assert.equal(script.async,true);assert.equal(script.crossOrigin,'anonymous');
assert.ok(script.src.endsWith('client=ca-pub-5613536700850101'));
script.dispatchEvent(new w.Event('load'));await tick();
const slot=w.document.querySelector('[data-ad-slot]'),ins=slot.querySelector('ins');
assert.equal(ins.hidden,false);assert.equal(ins.dataset.adSlot,'2201740000');assert.equal(w.adsbygoogle.length,1);
ins.setAttribute('data-ad-status','unfilled');await tick();assert.equal(slot.hidden,true);
w.BrainiAds.reconcile();await tick();assert.equal(slot.hidden,true);assert.equal(w.adsbygoogle.length,1);
let revoked=0;w.googlefc.showRevocationMessage=()=>revoked++;
w.googlefc.callbackQueue[0].CONSENT_API_READY();
w.document.querySelector('[data-google-ad-choices]').click();w.googlefc.callbackQueue.at(-1).CONSENT_API_READY();assert.equal(revoked,1);
w.document.querySelector('#homeQuiz').innerHTML='<div data-answers></div>';await tick();
assert.equal(slot.hidden,true);assert.equal(slot.querySelector('ins'),null);w.close();
console.log('Ad launch: disabled/Plus/unconfigured/preview/game exclusions, async SDK, pre-existing queue, one request, unfilled collapse, privacy choices and home gameplay suppression passed.');
