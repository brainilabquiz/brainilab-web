import assert from 'node:assert/strict';
import {readFileSync,existsSync,statSync} from 'node:fs';

// Soft-clay world art (Nov 2026): every referenced illustration exists, is light, and the
// icon system maps game ids to it with the old icons as the fallback.
const window={};globalThis.document={currentScript:null};
new Function('window','document',readFileSync('assets/js/icon-system.js','utf8'))(window,globalThis.document);
const icons=window.BrainiIcons;
const files=new Set(Object.values(icons.WORLD_ART));
assert.equal(files.size,18,'13 game worlds plus geography, science, history, sports and general knowledge');
for(const file of files){
  const path=`assets/illustrations/worlds/${file}.webp`;
  assert.ok(existsSync(path),path);
  const size=statSync(path).size;
  assert.ok(size>2000&&size<80000,`${path} stays light (${size} bytes)`);
}
assert.equal(icons.worldPath('mathrush'),'/assets/illustrations/worlds/math-rush.webp');
assert.match(icons.world('connections','x'),/<img class="x" src="\/assets\/illustrations\/worlds\/connections-256\.webp" srcset="\/assets\/illustrations\/worlds\/connections-256\.webp 256w, \/assets\/illustrations\/worlds\/connections\.webp 512w" sizes="112px" alt="" aria-hidden="true">/);
assert.equal(icons.world('worldcapitals'),'','no world art means the caller keeps its old icon');

const lf=s=>s.replace(/\r\n/g,'\n');
const refs=page=>[...lf(readFileSync(page,'utf8')).matchAll(/illustrations\/worlds\/([a-z-]+)\.webp/g)].map(m=>m[1]);
const home=refs('index.html');
assert.equal(home.length,19,'14 world cards and 5 topic tiles on the home page');
assert.equal(refs('games/index.html').length,16,'every game and topic quiz card in the library that has a world');
for(const page of ['connections','number-route','math-rush','cryptic','brain-mix','odd-one-out','higher-lower','sequence','survival','brainiword','order-up','topic-rush']){
  assert.deepEqual(refs(`games/${page}/index.html`),[page],`${page} page header`);
}
for(const name of [...home,...refs('games/index.html')])assert.ok(files.has(name),`${name} is a known world`);

// The renderers ask for the world art first and keep the old icon when it is missing.
for(const [file,pattern] of [['assets/js/home-entry.js',/BrainiIcons\.world\?\.\(ids\[0\],"home-daily-icon is-world-art"\)\|\|BrainiIcons\.game\(/],['assets/js/daily-journey.js',/BrainiIcons\.world\?\.\(id,'braini-game-mini is-world-art'\)\|\|BrainiIcons\.game\(/],['assets/js/anytime-browser.js',/BrainiIcons\.world\?\.\(game\.id,"braini-category-icon is-world-art"\)\|\|BrainiIcons\.category\(/]]){
  assert.match(readFileSync(file,'utf8'),pattern,file);
}
console.log('PASS world art: 18 clay illustrations exist and stay light, icon system maps ids with fallback, home/library/game pages reference only known worlds.');
