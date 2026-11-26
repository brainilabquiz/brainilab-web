import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execSync} from 'node:child_process';

// Navigation polish (Nov 2026): one footer link list everywhere with "Manage privacy" only once, topic hubs share the
// same breadcrumb, and topic hubs, quizzes and the Reasoning Challenge highlight their header section.
const files=execSync('git ls-files "*.html"').toString().split('\n').filter(f=>f&&!/^(tools|docs|dist)\//.test(f));
const EXPECTED=['/daily-quiz/','/games/','/learn/','/learn/paths/','/rankings/','/groups/','/profile/?section=progress','/about/','/privacy/','/cookies/'];
let footers=0;
for(const f of files){
  const s=readFileSync(f,'utf8');const block=s.match(/<div class="footer-links">([\s\S]*?)<\/div>/);
  if(!block)continue;footers++;
  const hrefs=[...block[1].matchAll(/href="([^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual(hrefs,EXPECTED,f+' footer links');
  const at=s.indexOf('<footer class="footer">'),footer=s.slice(at,s.indexOf('</footer>',at)+9);
  assert.equal((footer.match(/>Manage privacy<\/a>/g)||[]).length,1,f+' shows "Manage privacy" once');
  assert.match(footer,/class="wrap footer-contact"><a data-contact-link href="\/suggestions\/">Contact &amp; corrections<\/a> · <a href="\/cookies\/#privacy-choices" data-manage-privacy>Manage privacy<\/a>/,f+' keeps the contact line, opening the privacy choices');
}
assert.ok(footers>=119,`checked ${footers} footers`);

for(const hub of ['geography','science','history','sports','general-knowledge']){
  const s=readFileSync(hub+'/index.html','utf8');
  assert.match(s,/<nav aria-label="Breadcrumb" class="breadcrumb"><a href="[^"]*">Home<\/a><span[^>]*>›<\/span><a href="\/games\/\?type=quizzes">Quizzes<\/a><span[^>]*>›<\/span><span>/,hub+' breadcrumb');
}
assert.match(readFileSync('assets/js/game-discovery.js','utf8'),/\['all','games','quizzes'\]\.includes\(type\)/,'the library reads ?type=quizzes');

const current=f=>(readFileSync(f,'utf8').match(/<nav aria-label="Main navigation"[^>]*>([\s\S]*?)<\/nav>/)||[])[1]||'';
for(const f of files.filter(f=>/^(geography|science|history|sports|general-knowledge)\//.test(f))){
  const nav=current(f);assert.equal((nav.match(/aria-current=/g)||[]).length,1,f);assert.match(nav,/<a aria-current="page" href="[^"]*games\/(?:index\.html)?">Games<\/a>/,f);
}
assert.match(current('reasoning/index.html'),/<a aria-current="page" href="\/learn\/">Learn<\/a>/);
// Home quick routes: never cut off. From 601 px they wrap under their own title; phones scroll with a fade.
const css=readFileSync('assets/css/visual-system.css','utf8').replace(/\r\n/g,'\n');
const jump=css.slice(css.indexOf('/* ===== Home quick routes'));
assert.match(jump,/@media\(min-width:601px\)\{\n\s*body\.home-page\.braini-visual \.home-jump-bar\{flex-wrap:wrap;[^}]*overflow:visible\}/);
assert.match(jump,/\.home-jump-title\{flex-basis:100%/);
assert.match(jump,/@media\(max-width:600px\)\{[\s\S]*?\.home-jump-bar::after\{content:"";position:sticky;[^}]*pointer-events:none\}/);
console.log('Navigation polish checks passed');
