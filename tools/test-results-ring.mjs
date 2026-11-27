import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';

// Results screen (Nov 2026): the game's clay art, the score inside a ring that shows how much of the
// round went right, and a celebration class from 80 %. The score text and its heading never change.
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const dom=new JSDOM('<main id="result"></main>',{url:'https://brainilabgames.com/',runScripts:'outside-only'}),w=dom.window;
w.eval(readFileSync('assets/js/icon-system.js','utf8'));
w.eval(readFileSync('assets/js/post-game.js','utf8'));
w.BrainiData={dateForDailyNumber:()=>new Date().toISOString().slice(0,10)};
const el=w.document.querySelector('main');
const panel=()=>el.querySelector('.post-score-panel');
const mount=(result,extra={})=>w.BrainiPostGame.mount(el,{result,gameId:'oddoneout',name:'Odd One Out',focus:false,...extra});

// A perfect round: full ring, both celebration classes, text unchanged.
mount({correct:10,total:10,score:1000});
assert.equal(el.querySelector('.post-score').textContent,'10 / 10');
assert.equal(panel().dataset.ringPercent,'100');
assert.ok(panel().classList.contains('has-ring')&&panel().classList.contains('is-great')&&panel().classList.contains('is-perfect'));
assert.equal(el.querySelector('.post-ring-fill').getAttribute('stroke-dashoffset'),'0');
assert.equal(el.querySelector('.post-ring').getAttribute('aria-hidden'),'true');
assert.equal(el.querySelector('.post-burst').getAttribute('aria-hidden'),'true');
assert.ok(el.querySelector('.post-ring-wrap .post-score')&&el.querySelector('.post-ring-wrap .post-score-label'),'score and label sit inside the ring');
assert.match(el.querySelector('.post-art img').getAttribute('src'),/\/assets\/illustrations\/worlds\/odd-one-out-256\.webp$/,'the game shows its clay art');
assert.match(el.querySelector('.post-art img').getAttribute('srcset'),/odd-one-out\.webp 512w$/,'large screens still get the full art');
assert.equal(el.querySelector('.post-art img').getAttribute('sizes'),'184px');
assert.equal(el.querySelector('.post-art img').getAttribute('alt'),'');

// A middling round: partial ring, no celebration.
mount({correct:6,total:10,score:600},{gameId:'sequence',name:'Sequence'});
assert.equal(panel().dataset.ringPercent,'60');
assert.equal(el.querySelector('.post-ring-fill').getAttribute('stroke-dashoffset'),'40');
assert.ok(!panel().classList.contains('is-great'));assert.equal(el.querySelector('.post-burst'),null);

// Nothing right: an empty track only, so no stray round cap.
mount({correct:0,total:10,score:0});
assert.equal(panel().dataset.ringPercent,'0');assert.equal(el.querySelector('.post-ring-fill'),null);assert.ok(el.querySelector('.post-ring-track'));

// Timed games use answered questions; a percentage headline fills the ring with that value.
mount({correct:12,total:15,score:1430,timeSec:60,accuracy:80},{gameId:'mathrush',name:'Math Rush',timed:true});
assert.equal(el.querySelector('.post-score').textContent,'12');assert.equal(panel().dataset.ringPercent,'80');assert.ok(panel().classList.contains('is-great'));
mount({correct:13,total:20,score:1666,practice:true},{gameId:'orderup',name:'Order Up',headline:'67%',scoreLabel:'order accuracy'});
assert.equal(panel().dataset.ringPercent,'67');assert.equal(el.querySelector('.post-score').textContent,'67%');

// Word results keep their plain heading with no ring.
mount({correct:1,total:1,score:2100},{gameId:'brainiword',name:'BrainiWord',headline:'Solved in 3'});
assert.equal(el.querySelector('.post-ring'),null);assert.ok(!panel().classList.contains('has-ring'));assert.equal(panel().dataset.ringPercent,undefined);
assert.equal(el.querySelector('.post-score').textContent,'Solved in 3');
assert.match(el.querySelector('.post-art img').getAttribute('src'),/brainiword-256\.webp$/);

// Unknown games keep the old icon path (here: none, since the icon mock has no art for it).
mount({correct:3,total:5,score:300},{gameId:'mystery-game',name:'Mystery'});
assert.equal(el.querySelector('.post-art img[src*="/worlds/"]'),null);
assert.equal(panel().dataset.ringPercent,'60');

// A verified result updates the ring in place without remounting the heading.
const result={correct:5,total:10,score:500,clientResultId:'r1'};
mount(result);
const heading=el.querySelector('.post-score');
assert.equal(panel().dataset.ringPercent,'50');
w.BrainiPostGame.confirm(el,{correct:9,total:10,score:900});
assert.equal(el.querySelector('.post-score'),heading,'the heading is not remounted');
assert.equal(panel().dataset.ringPercent,'90');assert.ok(panel().classList.contains('is-great'));
assert.equal(el.querySelector('.post-ring-fill').getAttribute('stroke-dashoffset'),'10');

// Styles: shared prefix, the game's colour, phone sizes and motion only when the reader allows it.
const css=readFileSync('assets/css/visual-system.css','utf8');
const block=css.slice(css.indexOf('/* ===== Results screen'));
assert.ok(block.length>500,'the results block exists');
assert.match(block,/body\.braini-visual \.post-game \.post-score-panel\{[^}]*var\(--world-deep,#2d296e\)/);
assert.match(block,/@media\(max-width:600px\)/);
const motion=block.indexOf('@media(prefers-reduced-motion:no-preference)');
assert.ok(motion>0);assert.equal(block.slice(0,motion).includes('animation'),false,'no animation outside the reduced-motion guard');
assert.doesNotMatch(block.slice(block.indexOf('@keyframes bl-score-pop')),/bl-score-pop\{from\{[^}]*opacity/,'the score never starts invisible');

// Both bundles that carry post-game.js have the ring.
for(const bundle of ['assets/js/shell.bundle.js','assets/js/home-legacy.bundle.js'])assert.match(readFileSync(bundle,'utf8'),/function ringPercent\(result,headline,timed\)/,bundle);
console.log('Results ring checks passed');
