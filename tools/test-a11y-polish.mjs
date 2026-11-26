import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Readable contrast and comfortable targets (Nov 2026): text on light cards inside the coloured game worlds stays
// dark, topic colours used as text pass 4.5:1, small standalone links reach 24 px and avatar choices show focus.
const read=f=>readFileSync(f,'utf8').replace(/\r\n/g,'\n');
const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const lum=c=>{const f=v=>{v/=255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4};return .2126*f(c[0])+.7152*f(c[1])+.0722*f(c[2])};
const ratio=(a,b)=>{const x=lum(hex(a)),y=lum(hex(b));return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
const mixWhite=(h,p)=>'#'+hex(h).map(v=>Math.round(v*p+255*(1-p)).toString(16).padStart(2,'0')).join('');

const css=read('assets/css/visual-system.css');
const block=css.slice(css.indexOf('/* ===== Readable contrast and comfortable targets'));
assert.ok(block.length>200,'the contrast and targets block exists');

// Practice examples and the Number Route demo: dark text on their light cards, beating the light world-intro rule.
assert.match(block,/body\.braini-visual\[data-world\] :is\(\.labgame-shell,\.connections-shell,\.daily-mechanic-shell\) :is\(\.labgame-intro,\.connections-intro\) \.entry-example :is\(p,li\)\{color:#514b5c\}/);
assert.match(block,/\.labgame-intro \.route-demo p\{color:#2d296e\}/);
assert.match(block,/\.labgame-intro \.route-demo \.route-demo-note\{color:#56506e\}/);
assert.ok(ratio('#514b5c','#fffdf8')>=4.5&&ratio('#2d296e','#f5f3fc')>=4.5&&ratio('#56506e','#f5f3fc')>=4.5);
assert.ok(css.indexOf('.entry-example :is(p,li){color:#514b5c}')>css.indexOf(':is(.labgame-top p,.connections-top p,.labgame-intro p'),'the dark example text comes after the light intro text');
assert.match(block,/\.braini-visual \.entry-example details>summary\{padding-left:14px\}/);

// All topics: the yellow button keeps navy text, and every topic colour reads as text on the cream section and its pill.
assert.match(block,/body\.braini-visual \.topic-index \.topic-index-header>a\{color:var\(--navy,#2d296e\)!important\}/);
const accents=[...css.matchAll(/:is\(\.topic-index-nav a,\.topic-index-section\):nth-of-type\(7n\+\d\)\{--ti-accent:(#[0-9a-f]{6})\}/g)].map(m=>m[1]);
assert.equal(accents.length,7,'seven topic colours');
for(const a of accents){
  assert.ok(ratio(a,'#f6f2e8')>=4.5,a+' on the cream section');
  assert.ok(ratio(a,mixWhite(a,.1))>=4.5,a+' on its reading-time pill');
  assert.ok(ratio('#ffffff',a)>=4.5,'white count on '+a);
}

// Muted labels that still carry information.
assert.match(read('assets/css/site.css'),/\.anytime-new\{color:#625f73\}/);
assert.ok(ratio('#625f73','#e9e6f6')>=4.5,'"Not played yet" on the card');
assert.match(read('assets/css/site.css'),/\.streak\{filter:grayscale\(1\);color:#6c6b76;background:#f6f5f2\}/);
assert.match(read('assets/css/profile-progress.css'),/\.profile-milestone\{[^}]*color:#5f5b69\}/);
assert.ok(ratio('#5f5b69','#f0eee8')>=4.5,'locked milestones');
assert.match(block,/body\.braini-visual\[data-world=math-rush\] \.labgame-eyebrow\{color:#ffe47a\}/);
assert.ok(ratio('#ffe47a','#a04a13')>=4.5,'Math Rush labels');
assert.match(block,/@media\(max-width:700px\)\{body\.braini-visual \.labgame-stats strong\{font-size:19px\}\}/);

// 24 px targets and the avatar focus ring.
assert.match(block,/:is\(\.footer-contact a,\.reason-header>a,\.section-heading>a,a\.path-continue\)\{padding-block:4px\}/);
assert.match(block,/:is\(\.home-section-head>a,\.daily-score-summary>a,\.section-head>a,\.breadcrumb a,a\.geo-text-link\),body\.profile-page\.braini-visual dt>a\{min-height:24px;align-content:center\}/);
assert.match(block,/body\.braini-visual \.reward-choice:focus-visible\{outline:3px solid #3fab34!important;outline-offset:3px!important\}/);
console.log('Accessibility polish checks passed');
