import assert from 'node:assert/strict';
import {readFileSync,readdirSync,statSync} from 'node:fs';
import {join} from 'node:path';

// Page transitions (Nov 2026): cross-document view transitions as a progressive enhancement. Both pages opt in through
// the shared stylesheet, nothing moves with reduced motion, and the header and phone tab bar keep their place.
const css=readFileSync('assets/css/visual-system.css','utf8').replace(/\r\n/g,'\n');
const start=css.indexOf('/* ===== Page transitions');
assert.ok(start>0,'the page transitions block exists');
const next=css.indexOf('/* =====',start+10),block=css.slice(start,next>0?next:undefined);
const allowed=block.match(/@media \(prefers-reduced-motion:no-preference\)\{\n([\s\S]*?)\n\}/);
assert.ok(allowed,'the opt-in sits inside a no-preference media query');
assert.match(allowed[1],/@view-transition\{navigation:auto\}/);
assert.match(block,/@media \(prefers-reduced-motion:reduce\)\{\n\s*@view-transition\{navigation:none\}/,'reduced motion turns transitions off explicitly');
assert.equal((css.match(/@view-transition\{navigation:auto\}/g)||[]).length,1,'one opt-in rule');

// Names are unique per page: one for the header, one for the tab bar, and only inside the motion guard.
for(const name of ['braini-topbar','braini-tabbar']){
  assert.equal((css.match(new RegExp('view-transition-name:'+name,'g'))||[]).length,1,name+' is assigned once');
  assert.ok(allowed[1].includes('view-transition-name:'+name),name+' is only named when motion is allowed');
}
// Every animation in the block runs only when motion is allowed (keyframes may sit outside).
const outside=block.replace(allowed[0],'').replace(/@keyframes[^\n]*\n/g,'');
assert.doesNotMatch(outside,/animation/,'no animation outside the motion guard');

// Duplicate names would skip the whole transition: each page has at most one header, and the tab bar is built once.
function* htmlFiles(dir){for(const name of readdirSync(dir)){if(['node_modules','.git','tools','docs','dist','.agents'].includes(name))continue;const path=join(dir,name),info=statSync(path);if(info.isDirectory())yield* htmlFiles(path);else if(name.endsWith('.html'))yield path;}}
let pages=0;
for(const file of htmlFiles('.')){
  const count=(readFileSync(file,'utf8').match(/class="topbar[" ]/g)||[]).length;
  assert.ok(count<=1,`${file} has ${count} headers`);if(count)pages++;
}
assert.ok(pages>50,`checked ${pages} pages with a header`);
const tabBar=readFileSync('assets/js/tab-bar.js','utf8');
assert.equal((tabBar.match(/className="braini-tabbar"/g)||[]).length,1,'the tab bar is created in one place');
assert.match(readFileSync('assets/js/shell.bundle.js','utf8'),/className="braini-tabbar"/,'the shell bundle carries the tab bar');

// Pages that use the shared shell also load the shared stylesheet, so source and destination both opt in.
for(const page of ['index.html','games/index.html','daily-quiz/index.html','games/odd-one-out/index.html','profile/index.html','rankings/index.html']){
  assert.match(readFileSync(page,'utf8'),/visual-system\.css/,page+' loads the shared stylesheet');
}
console.log('Page transition checks passed');
