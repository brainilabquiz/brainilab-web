import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

// Daily page ring (Nov 2026): "Your day so far" shows the day's points as a ring, like the
// home Daily card. The number stays readable text; the ring is decorative and honest.
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const read=p=>readFileSync(p,'utf8');
const dom=new JSDOM(read('daily-quiz/index.html'),{url:'https://brainilabgames.com/daily-quiz/',runScripts:'outside-only'}),w=dom.window,d=w.document;
let day='2026-09-30',status;
w.BrainiData={dateForDailyNumber:()=>day,todayKey:()=>day,dailyGameIdsForNumber:()=>status.dailyIds,dailyGameIdsForDate:()=>['brainmix','connections','mathrush','brainiword'],recentResults:()=>[],personalBest:()=>null};
w.BrainiIcons={game:id=>`<img src="/assets/icons/games/standard/${id}.svg" alt=""/>`,product:()=>'<span aria-hidden="true">✓</span>',category:()=>''};
w.BrainiContinuity={markup:()=>'<section class="continuity-card">Your streak</section>'};
w.BrainiDailyHub={resolve:async()=>status};
w.eval(read('assets/js/daily-rules.js'));w.eval(read('assets/js/daily-journey.js'));
status={dailyNumber:33,dailyIds:['brainmix','connections','mathrush','brainiword'],completedCount:0,brainScore:0,games:{},model:w.BrainiDailyRules.model(day)};
w.eval(read('assets/js/daily-overview.js'));await new Promise(r=>setTimeout(r,0));

const ring=()=>d.querySelector('.daily-score-summary .daily-score-ring');
const fill=()=>ring().querySelector('.daily-ring-fill');
async function show(next){status=next;await w.BrainiDailyOverview.render();return ring();}

// Nothing played yet: an empty track, no stray round cap, and the number as text.
await show(status);
assert.ok(ring(),'the summary has a ring');
assert.equal(ring().dataset.ringPercent,'0');
assert.equal(fill(),null,'no fill at zero, so no dot from the round line cap');
assert.ok(ring().querySelector('.daily-ring-track'));
assert.equal(ring().querySelector('svg').getAttribute('aria-hidden'),'true','the ring itself is decorative');
assert.equal(ring().querySelector('.daily-score-value').textContent,'0 of 10,000');
assert.equal(d.querySelector('.daily-score-label').textContent,'Daily ranking points');

// Four-game Daily: 8,000 of 10,000 fills 80 %.
await show({...status,completedCount:4,brainScore:8000});
assert.equal(ring().dataset.ringPercent,'80');
assert.equal(fill().getAttribute('pathLength'),'100');
assert.equal(fill().getAttribute('stroke-dashoffset'),'20');
assert.equal(ring().querySelector('.daily-score-value').textContent,'8,000 of 10,000');

// Choice Daily: main game plus one extra, out of the model's own maximum.
day='2026-10-01';const model=w.BrainiDailyRules.model(day);
assert.equal(model.maxScore,3500);
const choice={dailyNumber:34,model,dailyIds:[model.primary,...model.choices],completedCount:1,brainScore:1800,games:{[model.primary]:{completed:true,points:1800}},bonusChoice:null};
await show(choice);
assert.equal(ring().dataset.ringPercent,'51','1,800 of 3,500 rounds to 51 %');
assert.equal(fill().getAttribute('stroke-dashoffset'),'49');
assert.equal(ring().querySelector('.daily-score-value').textContent,'1,800 of 3,500');
assert.match(d.querySelector('.daily-score-value').textContent,/^1,800/,'the existing score text checks still hold');

// Odd data never draws more than a full ring or a negative one.
await show({...choice,brainScore:9999});
assert.equal(ring().dataset.ringPercent,'100');assert.equal(fill().getAttribute('stroke-dashoffset'),'0');
await show({...choice,brainScore:-50});
assert.equal(ring().dataset.ringPercent,'0');assert.equal(fill(),null);
assert.equal(ring().querySelector('.daily-score-value').textContent,'0 of 3,500');
await show({...choice,brainScore:'oops',model:{...model,maxScore:undefined}});
assert.equal(ring().dataset.ringPercent,'0','an unknown maximum keeps the ring empty');

// Same markup rules as avatars and the home ring: no ids or inline styles that could clash.
assert.equal(ring().querySelector('[id],style,[style]'),null);

// Styles: shared prefix, phone layouts and motion only when the reader allows it.
const css=read('assets/css/visual-system.css');
const block=css.slice(css.indexOf('/* ===== Daily page ring'));
assert.ok(block.length>200,'the Daily ring block exists');
assert.match(block,/body\.braini-visual \.daily-score-ring\{/);
assert.match(block,/@media\(max-width:440px\)/);
const motion=block.indexOf('@media(prefers-reduced-motion:no-preference)');
assert.ok(motion>0,'the fill animates only without reduced motion');
assert.equal(block.slice(0,motion).includes('animation'),false,'no animation outside the reduced-motion guard');
assert.match(css,/@keyframes bl-ring\{/);

// The page loads the bundle, so it must carry the ring too.
assert.match(read('assets/js/daily-overview.bundle.js'),/function scoreRing\(score,max\)/);
console.log('Daily ring checks passed');
