import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {homeFacts,homeMoreReads,replaceHomeSections} from '../lib/home-sections.js';

const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE||'jsdom').href);
const lf=text=>text.replace(/\r\n/g,'\n');
const home=lf(readFileSync('index.html','utf8'));

// Live sections: real counts and the three reads after the featured latest article.
const cover={src:'/assets/images/learn/a.webp',thumbnail:'/assets/images/learn/a-thumb.webp',small:'/assets/images/learn/a-small.webp',position:30,alt:''};
const articles=Array.from({length:342},(_,i)=>({slug:`a${i}`,title:`Article ${i} <b>`,topic:'Science & nature',minutes:3,publishedAt:new Date(Date.UTC(2026,0,1)+i*864e5).toISOString(),cover}));
const facts=homeFacts(articles,[]);
assert.match(facts,/<strong>19<\/strong><span>games and quizzes<\/span>/,'counts the 19 games and quizzes, not the Daily entry');
assert.match(facts,/<strong>340\+<\/strong><span>curious reads<\/span>/,'reads are rounded down to the nearest ten');
assert.doesNotMatch(facts,/course/,'no course count without ready courses');
const reads=homeMoreReads(articles);
assert.equal((reads.match(/class="home-read-row"/g)||[]).length,3,'three reads');
assert.match(reads,/href="\/learn\/a340\/"/,'starts after the newest article (a341 is featured)');
assert.doesNotMatch(reads,/href="\/learn\/a341\/"/);
assert.match(reads,/Article 340 &lt;b&gt;/,'titles are escaped');
assert.equal(homeMoreReads([]),'');
const replaced=replaceHomeSections(home,articles,[]);
assert.match(replaced,/<!-- home-facts:start --><ul class="home-facts"[^]*340\+[^]*<!-- home-facts:end -->/);
assert.match(replaced,/<!-- learn-more:start --><a class="home-read-row"[^]*<!-- learn-more:end -->/);

// Page structure: one main action, the Daily card, quick routes, worlds, reads, watch, topics, community, FAQ.
const order=['class="home-intro"','id="homeQuiz"','class="home-streak"','class="home-jump"','class="section home-featured"','class="section home-learn"','class="section home-topics"','class="section home-avatar-band"','class="section home-faq"'];
let last=-1;for(const marker of order){const at=home.indexOf(marker);assert.ok(at>last,`${marker} follows the previous section`);last=at;}
assert.equal((home.match(/<h1\b/g)||[]).length,1,'one h1');
assert.match(home,/<h1 id="home-title">Think you know it all\?<br\/><span>Try BrainiLab\.<\/span><\/h1>/,'the owner\'s headline is kept');
for(const href of ['/games/?topic=words','/games/?topic=numbers','/general-knowledge/','/geography/','/learn/','/daily-quiz/'])assert.ok(home.includes(`href="${href}"`),href);
for(const topic of ['geography','general-knowledge','science','history','sports'])assert.match(home,new RegExp(`class="home-topic" data-topic="${topic}"`),topic);
assert.doesNotMatch(home,/Explore by topic/,'the old mixed games-and-topics list is gone');
assert.match(home,/<aside class="home-reading" aria-label="Latest from Learn"><!-- learn-preview:start --><a class="home-article"/,'the Worker-filled latest article stays');

// Pick your world: eight games without JavaScript, filters with it.
const dom=new JSDOM(home,{runScripts:'outside-only',url:'https://brainilabgames.com/'});
const {window}=dom,doc=window.document;
const cards=[...doc.querySelectorAll('[data-world-grid] .home-game-card')];
assert.ok(cards.length>=13,'every game has a world card');
assert.ok(cards.every(card=>card.dataset.world&&card.dataset.tags),'each card has a world and tags');
assert.ok(doc.querySelector('[data-world-filter]').hidden,'the filter waits for JavaScript');
window.eval(readFileSync('assets/js/home-worlds.js','utf8'));
await new Promise(resolve=>setTimeout(resolve,20));
const filter=doc.querySelector('[data-world-filter]');
assert.equal(filter.hidden,false);
const visible=()=>cards.filter(card=>!card.hidden);
assert.equal(visible().length,8,'All shows eight');
filter.querySelector('[data-filter="numbers"]').click();
assert.deepEqual(visible().map(card=>card.dataset.world),['math-rush','number-route','sequence']);
assert.equal(filter.querySelector('[data-filter="numbers"]').getAttribute('aria-pressed'),'true');
assert.equal(filter.querySelector('[data-filter="all"]').getAttribute('aria-pressed'),'false');
filter.querySelector('[data-filter="words"]').click();
assert.ok(visible().every(card=>card.dataset.tags.split(' ').includes('words')));
dom.window.close();

// Phone bottom navigation: on the home page and hubs, never on game pages.
async function tabbar(html,url){
  const page=new JSDOM(html,{runScripts:'outside-only',url});
  page.window.eval(readFileSync('assets/js/tab-bar.js','utf8'));
  await new Promise(resolve=>setTimeout(resolve,20));
  const nav=page.window.document.querySelector('.braini-tabbar');
  const result=nav?{links:[...nav.querySelectorAll('a')].map(a=>a.getAttribute('href')),current:nav.querySelector('[aria-current="page"]')?.textContent}:null;
  page.window.close();return result;
}
const onHome=await tabbar(home,'https://brainilabgames.com/');
assert.deepEqual(onHome.links,['/','/daily-quiz/','/games/','/learn/','/profile/']);
assert.equal(onHome.current,'Home');
assert.equal((await tabbar(lf(readFileSync('games/index.html','utf8')),'https://brainilabgames.com/games/')).current,'Games');
assert.equal(await tabbar(lf(readFileSync('games/connections/index.html','utf8')),'https://brainilabgames.com/games/connections/'),null,'no bar on a game page');
assert.equal(await tabbar(lf(readFileSync('geography/world-flags-quiz/index.html','utf8')),'https://brainilabgames.com/geography/world-flags-quiz/'),null,'no bar on a quiz page');

// Bundles carry the new modules; the CSS keeps the bar to phones.
for(const [bundle,file] of [['assets/js/shell.bundle.js','tab-bar.js'],['assets/js/home-shell.bundle.js','tab-bar.js'],['assets/js/home-shell.bundle.js','home-worlds.js']]){
  assert.ok(lf(readFileSync(bundle,'utf8')).includes(lf(readFileSync(`assets/js/${file}`,'utf8')).trim()),`${bundle} includes ${file}`);
}
const css=readFileSync('assets/css/visual-system.css','utf8');
assert.match(css,/\.braini-tabbar\{display:none\}\s*@media\(max-width:760px\)\{\s*\.braini-tabbar\{position:fixed/);

console.log('PASS home v2: live counts and reads, section order, quick routes, real topics, world filter (8 / words / numbers), phone tab bar only off game pages, modules in bundles.');
