import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

// Simpler phone header (Nov 2026): with the bottom tab bar on screen, the header keeps the logo, streak and menu.
// The menu gains Suggestions (the header's "?" is hidden there) and drops what the tab bar already offers.
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const read=p=>readFileSync(p,'utf8');
async function page(file,url){
  const dom=new JSDOM(read(file),{url,runScripts:'outside-only'});
  dom.window.eval(read('assets/js/tab-bar.js'));
  await new Promise(r=>setTimeout(r,0));
  return dom.window;
}

// A listing page gets the tab bar and one Suggestions entry in the menu.
let w=await page('games/index.html','https://brainilabgames.com/games/');
const d=w.document;
assert.ok(d.documentElement.classList.contains('has-tabbar'));
let extras=d.querySelectorAll('#mainNav a.menu-extra');
assert.equal(extras.length,1);
assert.equal(extras[0].getAttribute('href'),'/suggestions/');
assert.equal(extras[0].textContent.trim(),'Suggestions');
assert.equal(extras[0].querySelector('svg').getAttribute('aria-hidden'),'true');
w.BrainiTabBar.boot();
assert.equal(d.querySelectorAll('#mainNav a.menu-extra').length,1,'booting again adds nothing');
assert.ok(d.querySelector('.topbar .help-dot')&&d.querySelector('.topbar .avatar'),'the header markup itself is untouched');

// Game pages keep the full header: no tab bar, no extra menu entry.
w=await page('games/odd-one-out/index.html','https://brainilabgames.com/games/odd-one-out/');
assert.equal(w.document.documentElement.classList.contains('has-tabbar'),false);
assert.equal(w.document.querySelector('#mainNav a.menu-extra'),null);

// Styles: the extra entry only shows in the phone layout with the tab bar; the header "?" hides there, the avatar stays.
const css=read('assets/css/visual-system.css').replace(/\r\n/g,'\n');
const block=css.slice(css.indexOf('/* ===== Simpler phone header'));
assert.ok(block.length>300,'the phone header block exists');
assert.match(block,/^body\.braini-visual \.topbar \.links>a\.menu-extra\{display:none\}/m,'hidden outside the phone layout');
const phone=block.match(/@media\(max-width:760px\)\{\n([\s\S]*?)\n\}/);
assert.ok(phone,'a 760 px phone block, the same breakpoint as the tab bar');
assert.match(phone[1],/html\.has-tabbar body\.braini-visual \.topbar \.nav-right>\.help-dot\{display:none!important\}/);
assert.doesNotMatch(block,/\.avatar\)?\{display:none/,'the avatar stays: it opens the account menu');
assert.match(phone[1],/html\.has-tabbar body\.braini-visual \.topbar \.links>a:is\(\[href\*="games\/"\],\[href\*="daily-quiz"\],\[href\*="learn"\]\):not\(\.news-nav-link\)\{display:none\}/);
assert.match(phone[1],/html\.has-tabbar body\.braini-visual \.topbar \.links>a\.menu-extra\{display:flex/);
assert.match(css,/\.braini-tabbar\{display:none\}\n@media\(max-width:760px\)\{/,'the tab bar uses the same breakpoint');

// Both shell bundles carry the new menu entry.
for(const bundle of ['assets/js/shell.bundle.js','assets/js/home-shell.bundle.js'])assert.match(read(bundle),/function menuExtra\(\)/,bundle);
console.log('Phone header checks passed');
