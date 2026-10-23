import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {entryConsent} from '../lib/entry-consent.js';
import {homeConsent} from '../lib/home-consent.js';
import {homeConsentFirstResponse} from '../lib/home-first-paint.js';
const controller=readFileSync('assets/js/meta-pixel.js','utf8');
const base='<html><head><script defer src="/assets/js/consent.bundle.js?v=abc"></script><script defer src="/slow-account.js"></script></head><body class="game-entry-page"><main>Same game, article and progress</main></body></html>';
const bundle='window.example="</script>";';
for(const file of ['games/math-rush/index.html','games/sequence/index.html','learn/index.html']){
 const html=entryConsent(base,file,controller,bundle);
 assert.equal((html.match(/data-static-cookie-prompt/g)||[]).length,1);assert.equal((html.match(/data-home-consent-controller/g)||[]).length,1);
 assert.ok(!/src="\/assets\/js\/consent\.bundle/.test(html),'remove the external copy to prevent a second controller');
 assert.ok(html.includes('<script defer src="/slow-account.js"></script>'),'keep unrelated deferred account scripts unchanged');
 assert.ok(html.indexOf('data-home-consent-controller')<html.indexOf('<main>'));
 assert.ok(html.includes('window.example="<\\/script>";'),'inline closing script strings safely');
 assert.equal(html.match(/<main>[\s\S]*?<\/main>/)[0],base.match(/<main>[\s\S]*?<\/main>/)[0]);
 assert.ok(html.includes('data-marketing-reject')&&html.includes('data-marketing-accept')&&html.includes('data-statistics-choice'));
 assert.equal(entryConsent(html,file,controller,bundle),html,'a repeated transform must not duplicate the prompt or controller');
}
for(const file of ['profile/index.html','games/number-route/index.html','index.html','cookies/index.html'])assert.equal(entryConsent(base,file,controller,bundle),base,'leave unmeasured and private routes on their existing behavior');
assert.equal(homeConsent(base,controller),base);assert.equal(homeConsentFirstResponse(base,'learn/index.html',bundle),base,'existing home-only wrappers retain their public contracts');
console.log('PASS entry consent delivery: one exact existing prompt/controller before main, unchanged game/account scripts, safe escaping, idempotence and measured-route boundaries.');
