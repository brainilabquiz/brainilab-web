import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

// Game navigation (Nov 2026): every game and topic quiz gets a "Play another game" row under the game, back links point
// back, and the Daily-only games are reached through Today's Daily.
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const read=p=>readFileSync(p,'utf8');
async function page(file,path){
  const dom=new JSDOM(read(file),{url:'https://brainilabgames.com'+path,runScripts:'outside-only'}),w=dom.window;
  w.eval(read('assets/js/icon-system.js'));w.eval(read('assets/js/game-hop.js'));
  await new Promise(r=>setTimeout(r,0));
  return w;
}
const hrefs=nav=>[...nav.querySelectorAll('.game-hop-list a')].map(a=>a.getAttribute('href'));

// An anytime game: the row sits right after the game band, leaves out the current game and starts with the Daily.
let w=await page('games/odd-one-out/index.html','/games/odd-one-out/'),d=w.document,nav=d.querySelector('nav.game-hop');
assert.ok(nav,'Odd One Out has the row');
assert.ok(nav.previousElementSibling.matches('section.labgame-page'),'right after the game');
assert.equal(nav.getAttribute('aria-labelledby'),'game-hop-title');assert.equal(d.getElementById('game-hop-title').textContent,'Play another game');
assert.equal(hrefs(nav)[0],'/daily-quiz/','Today’s Daily first');
assert.ok(!hrefs(nav).includes('/games/odd-one-out/'),'not the current game');
assert.equal(hrefs(nav).length,w.BrainiGameHop.GAMES.length,'all the other games plus the Daily');
for(const daily of ['/games/brain-mix/','/games/brainiword/','/games/order-up/','/games/topic-rush/'])assert.ok(!hrefs(nav).includes(daily),daily+' is reached through the Daily');
assert.ok([...nav.querySelectorAll('img.game-hop-art')].every(img=>img.getAttribute('loading')==='lazy'&&img.getAttribute('alt')===''),'lazy, decorative art');
w.BrainiGameHop.boot();assert.equal(d.querySelectorAll('nav.game-hop').length,1,'booting again adds nothing');

// Every linked page exists.
for(const href of hrefs(nav).concat(['/games/odd-one-out/']))assert.ok(read(href.slice(1)+'index.html').length>1000,href);

// Other shells: Cryptic after its links, a topic quiz after its challenge, a Daily mechanic after its band.
w=await page('games/cryptic/index.html','/games/cryptic/');
assert.ok(w.document.querySelector('nav.game-hop').previousElementSibling.matches('nav.cryptic-below'));
w=await page('geography/world-flags-quiz/index.html','/geography/world-flags-quiz/');
nav=w.document.querySelector('nav.game-hop');assert.ok(nav.previousElementSibling.matches('section.challenge-wrap'));assert.ok(!hrefs(nav).includes('/geography/world-flags-quiz/'));
w=await page('games/order-up/index.html','/games/order-up/');
assert.ok(w.document.querySelector('nav.game-hop').previousElementSibling.matches('section.daily-mechanic-page'));

// Pages that are not games stay as they are.
for(const [file,path] of [['index.html','/'],['daily-quiz/index.html','/daily-quiz/'],['games/index.html','/games/'],['profile/index.html','/profile/']]){
  w=await page(file,path);assert.equal(w.document.querySelector('nav.game-hop'),null,path);
}

// Back links point back, and Cryptic's breadcrumb starts at Home.
for(const file of ['games/higher-lower/index.html','games/odd-one-out/index.html','games/sequence/index.html','games/survival/index.html'])assert.match(read(file),/class="labgame-back" href="\.\.\/index\.html">← All games<\/a>/,file);
for(const file of ['games/order-up/index.html','games/topic-rush/index.html'])assert.match(read(file),/class="daily-mechanic-back" href="\.\.\/\.\.\/daily-quiz\/index\.html">← Daily<\/a>/,file);
for(const file of ['assets/js/order-up.js','assets/js/topic-rush.js'])assert.match(read(file),/back\.textContent="← All games";/,file);
assert.match(read('games/brainiword/index.html'),/class="brainiword-back" href="\.\.\/index\.html">← All games<\/a>/);
assert.match(read('games/cryptic/index.html'),/<nav class="breadcrumb" aria-label="Breadcrumb"><a href="\/">Home<\/a>/);
for(const file of ['games/higher-lower','games/odd-one-out','games/sequence','games/survival','games/order-up','games/topic-rush'])assert.doesNotMatch(read(file+'/index.html'),/(Games|Daily Hub) →<\/a>/,file);

// Styles and bundles.
const css=read('assets/css/visual-system.css').replace(/\r\n/g,'\n');
const start=css.indexOf('/* ===== Game navigation'),next=css.indexOf('/* =====',start+10),block=css.slice(start,next>0?next:undefined);
assert.ok(start>0);
assert.match(block,/\.labgame-top:has\(\.world-art\):has\(\.labgame-back\)\{display:grid/,'phone header grid only when there is a back link');
assert.match(block,/\.game-hop-list\{display:flex;[^}]*overflow-x:auto/);
const motion=block.indexOf('@media(prefers-reduced-motion:no-preference)');assert.ok(motion>0);
assert.equal(block.slice(0,motion).includes('transition')||block.slice(0,motion).includes('transform'),false,'motion only when allowed');
for(const bundle of ['assets/js/shell.bundle.js','assets/js/home-shell.bundle.js'])assert.match(read(bundle),/window\.BrainiGameHop=/,bundle);
assert.match(read('tools/rebuild-bundles.py'),/'tab-bar\.js','game-hop\.js'/);
console.log('Game navigation checks passed');
