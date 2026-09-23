import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const source=readFileSync('assets/js/site-analytics.js','utf8'),meta=readFileSync('assets/js/meta-pixel.js','utf8');
function page(url='https://brainilabgames.com/learn/moon/?email=private@example.com',saved=null){const d=new JSDOM('<title>Moon</title><article class="article-body"></article><aside class="article-practice"><a href="/science/science-quiz/">Play</a></aside><a href="https://www.youtube.com/watch?v=123">YouTube</a>',{url,runScripts:'outside-only'});if(saved)d.window.localStorage.setItem('brainilab_statistics_consent_v1',JSON.stringify(saved));d.window.eval(source);return d.window;}
let w=page('https://brainilabgames.com/learn/moon/');
assert.equal(w.document.scripts.length,0);assert.equal(w.gtag,undefined);assert.equal(w.BrainiSiteAnalytics.needsConsent(),true);
w.BrainiSiteAnalytics.setConsent(false);assert.equal(w.document.scripts.length,0);
w.BrainiSiteAnalytics.setConsent(true);assert.equal(w.document.scripts.length,1);assert.ok(w.document.scripts[0].src.includes('G-97WN37VLHV'));
let events=()=>w.dataLayer.filter(x=>x[0]==='event');assert.deepEqual(Array.from(events(),x=>x[1]),['page_view','article_view']);
w.document.querySelector('.article-practice a').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));assert.equal(events().at(-1)[1],'article_game_click');
const result={clientResultId:'dedupe-local-only',score:999,email:'secret@example.com',dailyNumber:1};
w.dispatchEvent(new w.CustomEvent('brainilab:datachange',{detail:{type:'game_result',gameId:'brainmix',result}}));
w.dispatchEvent(new w.CustomEvent('brainilab:datachange',{detail:{type:'game_result',gameId:'brainmix',result}}));
assert.equal(events().filter(x=>x[1]==='game_complete').length,1);assert.ok(!JSON.stringify(w.dataLayer).includes('secret@example.com'));assert.ok(!JSON.stringify(w.dataLayer).includes('dedupe-local-only'));
w.BrainiSiteAnalytics.setConsent(false);assert.equal(w['ga-disable-G-97WN37VLHV'],true);const n=events().length;w.document.querySelector('a').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));assert.equal(events().length,n);w.close();
for(const url of ['https://brainilabgames.com/admin/','https://brainilabgames.com/auth/','https://brainilabgames.com/?code=secret','http://localhost:8000/']){w=page(url,{allowed:true,at:Date.now()});assert.equal(w.document.scripts.length,0);w.close();}
w=page('https://brainilabgames.com/');w.eval(meta);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));assert.ok(w.document.querySelector('[data-statistics-choice]'));w.document.querySelector('[data-statistics-choice]').checked=true;w.document.querySelector('[data-ad-choice]').checked=false;w.document.querySelector('[data-save-cookie-choices]').click();assert.equal(w.BrainiSiteAnalytics.isAllowed(),true);assert.equal(w.fbq,undefined);w.close();
console.log('GA4 consent, no preconsent SDK, account/auth exclusion, sanitized events, result deduplication, withdrawal and independent Meta/statistics preferences passed.');
