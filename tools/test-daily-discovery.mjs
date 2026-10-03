import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const read=p=>readFileSync(p,'utf8');
const source=read('daily-quiz/index.html');
const dom=new JSDOM(source,{url:'https://brainilabgames.com/daily-quiz/',runScripts:'outside-only'}),w=dom.window,d=w.document;
let day='2026-09-30',status;
w.BrainiData={dateForDailyNumber:()=>day,todayKey:()=>day,dailyGameIdsForNumber:()=>status.dailyIds,dailyGameIdsForDate:()=>['brainmix','connections','mathrush','brainiword'],recentResults:()=>[],personalBest:()=>null};
w.BrainiIcons={game:(id)=>`<img src="/assets/icons/games/standard/${id}.svg" alt=""/>`,product:()=>'<span aria-hidden="true">✓</span>',category:()=>''};
w.BrainiContinuity={markup:()=>'<section class="continuity-card">Your streak</section>'};
w.BrainiFriendChallenge={mount:el=>el.insertAdjacentHTML('beforeend','<button data-friend-challenge>Challenge a friend</button>')};
w.BrainiDailyHub={resolve:async()=>status};
w.eval(read('assets/js/daily-rules.js'));w.eval(read('assets/js/daily-journey.js'));
const legacy=()=>({dailyNumber:33,dailyIds:['brainmix','connections','mathrush','brainiword'],completedCount:0,brainScore:0,games:{},model:w.BrainiDailyRules.model(day)});
status=legacy();w.eval(read('assets/js/daily-overview.js'));await new Promise(r=>setTimeout(r,0));
await w.BrainiDailyOverview.render();assert.equal(d.querySelectorAll('h1').length,1);assert.equal(d.querySelectorAll('[data-daily-game]').length,4);assert.equal(d.querySelectorAll('.daily-game-description').length,4);assert.equal(d.querySelectorAll('.daily-journey-play').length,4);assert.match(d.querySelector('.daily-score-value').textContent,/10,000/);assert.equal(d.querySelectorAll('[data-friend-challenge]').length,1);
const brainmix=d.querySelector('[data-daily-game=brainmix]');assert.equal(new URL(brainmix.querySelector('.daily-journey-play').href).pathname,'/games/brain-mix/');assert.equal(new URL(brainmix.querySelector('.daily-journey-try').href).searchParams.get('try'),'1');
status={...status,completedCount:1,brainScore:1500,games:{brainmix:{completed:true,points:1500}}};await w.BrainiDailyOverview.render();assert.equal(d.querySelectorAll('.daily-journey-play').length,3);assert.match(d.querySelector('.daily-completion').textContent,/1 of 4/);
status={...status,completedCount:4,brainScore:8000,games:Object.fromEntries(status.dailyIds.map(id=>[id,{completed:true,points:2000}]))};await w.BrainiDailyOverview.render();assert.equal(d.querySelectorAll('.daily-journey-play').length,0);assert.match(d.querySelector('h1').textContent,/done/);assert.match(d.querySelector('.daily-score-value').textContent,/8,000/);
day='2026-10-01';const model=w.BrainiDailyRules.model(day),[first,second]=model.choices;status={dailyNumber:34,model,dailyIds:[model.primary,...model.choices],completedCount:0,brainScore:0,games:{},bonusChoice:null};
await w.BrainiDailyOverview.render();assert.equal(d.querySelectorAll('.daily-choice-card').length,3);assert.equal(d.querySelectorAll('.daily-choice-card a').length,1);assert.equal(d.querySelectorAll('.daily-choice-extras .is-unavailable').length,2);assert.match(d.querySelector('.daily-score-value').textContent,/3,500/);assert.ok(!d.querySelector('[data-daily-guide]').textContent.includes('10,000'));
status={...status,brainScore:1800,games:{[model.primary]:{completed:true,points:1800}}};await w.BrainiDailyOverview.render();assert.equal(d.querySelectorAll('.daily-choice-card a').length,2);assert.match(d.querySelector('.daily-completion').textContent,/Daily complete/);
status={...status,bonusChoice:first};await w.BrainiDailyOverview.render();assert.equal(d.querySelectorAll('.daily-choice-card a').length,1);assert.equal(d.querySelector(`[data-daily-game=${second}] a`),null);assert.match(d.querySelector(`[data-daily-game=${first}] a`).textContent,/Continue extra/);
status={...status,brainScore:2500,games:{...status.games,[first]:{completed:true,points:700}}};await w.BrainiDailyOverview.render();assert.equal(d.querySelectorAll('.daily-choice-card a').length,0);assert.match(d.querySelector('.daily-choice-extra-heading').textContent,/All done/);
w.eval(read('assets/js/anytime-browser.js'));w.BrainiAnytimeBrowser.render();assert.equal(d.querySelectorAll('.anytime-game-card').length,3);assert.equal(d.querySelector('.single-action a').textContent,'Play');
const resolve=w.BrainiDailyHub.resolve;w.console.error=()=>{};w.BrainiDailyHub.resolve=async()=>{throw Error('offline')};await w.BrainiDailyOverview.render();assert.ok(d.querySelector('[data-daily-retry]'));assert.equal(d.querySelector('[data-daily-overview]').hasAttribute('aria-busy'),false);w.BrainiDailyHub.resolve=resolve;d.querySelector('[data-daily-retry]').click();await new Promise(r=>setTimeout(r,0));assert.ok(d.querySelector('.daily-dashboard'));
// A slower refresh must never replace a newer account/day state.
let release;w.BrainiDailyHub.resolve=()=>new Promise(r=>{release=r});const pending=w.BrainiDailyOverview.render();w.BrainiDailyHub.resolve=resolve;await w.BrainiDailyOverview.render();release({...status,brainScore:999});await pending;assert.match(d.querySelector('.daily-score-value').textContent,/2,500/);
// Optional local fixture, outside public build inputs, for tomorrow's layout checks.
let scrolls=0;w.HTMLElement.prototype.scrollIntoView=function(){scrolls++;};
w.history.replaceState(null,'','#daily-extras');await w.BrainiDailyOverview.render();
assert.equal(scrolls,1);assert.equal(d.activeElement.id,'daily-extras');
await w.BrainiDailyOverview.render();assert.equal(scrolls,1,'background refresh must not keep scrolling the page');
w.history.replaceState(null,'','/daily-quiz/');w.dispatchEvent(new w.Event('hashchange'));
w.history.replaceState(null,'','#daily-extras');w.dispatchEvent(new w.Event('hashchange'));assert.equal(scrolls,2);
if(process.argv.includes('--fixture')){
 const initial={...status,brainScore:0,games:{},bonusChoice:null};
 const setup=`window.BrainiDailyHub={resolve:async()=>(${JSON.stringify(initial)})};window.BrainiData={dateForDailyNumber:()=>"2026-10-01",todayKey:()=>"2026-10-01",dailyGameIdsForNumber:()=>[],dailyGameIdsForDate:()=>[],recentResults:()=>[],personalBest:()=>null};window.BrainiContinuity={markup:()=>''};`;
 const html=source.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replaceAll('../assets/','/assets/').replace('</body>',`<script>${setup}</script><script src="/assets/js/icon-system.js"></script><script src="/assets/js/daily-rules.js"></script><script src="/assets/js/daily-journey.js"></script><script src="/assets/js/daily-overview.js"></script><script src="/assets/js/anytime-browser.js"></script></body>`);
 writeFileSync('tools/.daily-preview.html',html);
}
dom.window.close();console.log('PASS Daily discovery: legacy 0/1/4, main/extra gates and choice lock, scores, practice URLs, 3 suggestions, error/retry and refresh race.');
