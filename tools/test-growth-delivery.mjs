import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const {JSDOM}=createRequire(import.meta.url)(process.env.JSDOM_MODULE||'jsdom');
const source=readFileSync('assets/js/site-analytics.js','utf8');
const key='brainilab_growth_entry_v1',consent='brainilab_statistics_consent_v1';
function analytics(referrer='',stored=null){const d=new JSDOM('<title>Flags</title>',{url:'https://brainilabgames.com/geography/flags/',...(referrer?{referrer}:{}),runScripts:'outside-only'});if(stored){d.window.localStorage.setItem(key,JSON.stringify(stored));d.window.localStorage.setItem(consent,JSON.stringify({allowed:true,at:Date.now()}));}d.window.eval(source);return d.window;}
let w=analytics('https://www.google.com/search?q=secret');
assert.equal(w.localStorage.getItem(key),null);w.BrainiSiteAnalytics.setConsent(true);
let params=w.dataLayer.find(x=>x[0]==='event')[2];assert.equal(params.growth_entry_channel,'organic_search');assert.equal(params.growth_entry_path,'/geography/flags/');assert.ok(!JSON.stringify(w.dataLayer).includes('secret'));
const round={};w.BrainiSiteAnalytics.gameStart('europeflags',round,'practice');w.BrainiSiteAnalytics.gameStart('europeflags',round,'practice');w.BrainiSiteAnalytics.practiceComplete('europeflags',round);w.BrainiSiteAnalytics.practiceComplete('europeflags',round);w.BrainiSiteAnalytics.registrationRequest('email');
assert.deepEqual(Array.from(w.dataLayer.filter(x=>x[0]==='event'),x=>x[1]),['page_view','practice_start','practice_complete','registration_request']);
const saved=JSON.parse(w.localStorage.getItem(key));w.BrainiSiteAnalytics.setConsent(false);assert.equal(w.localStorage.getItem(key),null);w.close();
w=analytics('https://brainilabgames.com/learn/',saved);w.BrainiSiteAnalytics.setConsent(true);assert.equal(JSON.parse(w.localStorage.getItem(key)).channel,'organic_search');w.close();
w=analytics('',{...saved,lastAt:Date.now()-1800001});w.BrainiSiteAnalytics.setConsent(true);assert.equal(JSON.parse(w.localStorage.getItem(key)).channel,'direct');w.close();

const flags=JSON.parse(readFileSync('assets/data/europe-flags.json','utf8'));
assert.equal(new Set(flags.map(f=>f.code)).size,20);
for(const flag of flags)assert.ok(readFileSync(`assets/flags/emoji/${flag.code}.png`).length>0);
const d=new JSDOM(readFileSync('geography/europe-flags-quiz/index.html','utf8'),{url:'https://brainilabgames.com/geography/europe-flags-quiz/',runScripts:'outside-only'});w=d.window;
let calls=0,starts=0,ends=0,bank,options;
w.fetch=async()=>{calls++;return {ok:calls>1,json:async()=>flags};};
w.BrainiSiteAnalytics={gameStart:()=>starts++,practiceComplete:()=>ends++};
w.BrainiQuiz={mount:(root,questions,opts)=>{bank=questions;options=opts;}};
w.eval(readFileSync('assets/js/europe-flags.js','utf8'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
const flush=()=>new Promise(r=>setTimeout(r,0));
w.document.querySelector('[data-europe-start]').click();await flush();assert.equal(w.document.querySelector('[data-europe-error]').hidden,false);assert.equal(starts,0);
w.document.querySelector('[data-europe-start]').click();await flush();assert.equal(starts,1);assert.equal(options.practice,true);assert.equal(bank.length,20);
for(const q of bank){assert.equal(new Set(q.a).size,4);assert.ok(q.c>=0&&q.c<4);assert.ok(flags.some(f=>f.name===q.a[q.c]&&f.clue===q.f));}
options.onComplete({correct:19,total:20,answerDetails:[{isCorrect:false,correctAnswer:'France',selectedAnswer:'Netherlands',explanation:'Vertical stripes.'}]});
assert.equal(ends,1);assert.match(w.document.querySelector('[data-europe-result]').textContent,/19 of 20/);assert.match(w.document.querySelector('.europe-review').textContent,/France.*Netherlands/);
assert.ok([...w.document.querySelectorAll('[data-europe-result] a')].every(a=>a.target==='_blank'));w.close();
const {measurementHTML}=await import('../editor/growth-measurement.js');
assert.match(measurementHTML({}),/No dated GA4 observation/);assert.doesNotMatch(measurementHTML({}),/0 sessions/);
assert.match(measurementHTML({measurement:{mode:'manual_snapshot',source:'GA4 traffic acquisition UI',sessions:43,directSessions:43,period:{start:'<script>',end:'2026-09-30'}}}),/&lt;script&gt;/);
console.log('PASS: consent, cross-page attribution, expiry, practice deduplication, retry, 20 valid questions, review, safe measurement rendering.');
