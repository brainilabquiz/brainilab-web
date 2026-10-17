import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const {JSDOM,VirtualConsole}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const sourceRoot=process.env.DAILY_SOURCE_ROOT||'.',read=p=>readFileSync(sourceRoot+'/'+p,'utf8');
const errors=[],vc=new VirtualConsole();vc.on('jsdomError',error=>errors.push(error.message));
const dom=new JSDOM('<main data-daily-overview></main><section data-daily-guide></section>',{url:'https://brainilabgames.com/daily-quiz/',runScripts:'outside-only',virtualConsole:vc});
const w=dom.window,d=w.document,tick=()=>new Promise(resolve=>setTimeout(resolve,0));
let day='2026-10-17',auth={status:'authenticated',user:{id:'owner-a'}},held=false,failure=false,jobs=[];
w.BrainiData={authState:()=>auth,dateForDailyNumber:()=>day,todayKey:()=>day,dailyGameIdsForDate:()=>[],dailyGameIdsForNumber:()=>[]};
w.BrainiIcons={game:id=>'<svg aria-label="'+id+'"></svg>',product:()=>'<span>✓</span>'};
w.BrainiContinuity={markup:()=>'<section class="continuity-card">Your streak</section>'};
let mounts=0;
w.BrainiFriendChallenge={mount:el=>{mounts++;el.insertAdjacentHTML('beforeend','<button data-friend-challenge>Challenge a friend</button>');}};
w.eval(read('assets/js/daily-rules.js'));w.eval(read('assets/js/daily-journey.js'));
const model=w.BrainiDailyRules.model(day);
let status={dailyNumber:50,model,dailyIds:[model.primary,...model.choices],completedCount:1,brainScore:1800,games:{[model.primary]:{completed:true,points:1800}},bonusChoice:null};
const clone=value=>JSON.parse(JSON.stringify(value));
w.BrainiDailyHub={resolve:async()=>{if(held)return new Promise((resolve,reject)=>jobs.push({resolve,reject}));if(failure)throw Error('offline');return clone(status);}};
w.eval(read('assets/js/daily-overview.js'));await tick();await w.BrainiDailyOverview.render();
const root=d.querySelector('[data-daily-overview]'),guide=d.querySelector('[data-daily-guide]');
try{
 const board=root.querySelector('.daily-dashboard'),card=root.querySelector('.daily-choice-card'),details=root.querySelector('.daily-points-guide'),faq=guide.querySelector('details');
 assert.ok(board&&card&&details&&faq);details.open=true;faq.open=true;const focus=faq.querySelector('summary');focus.focus();const mounted=mounts;
 held=true;w.dispatchEvent(new w.Event('brainilab:progressionchange'));
 assert.equal(root.querySelector('.daily-dashboard'),board,'Confirmed results remain visible during a background read');
 jobs.shift().resolve(clone(status));await tick();
 assert.equal(root.querySelector('.daily-dashboard'),board,'Identical Daily refresh retains the actual dashboard DOM');
 assert.equal(root.querySelector('.daily-choice-card'),card);assert.equal(details.open,true);assert.equal(faq.open,true);assert.equal(d.activeElement,focus);assert.equal(mounts,mounted);
 assert.equal(root.hasAttribute('aria-busy'),false);
 // A transient failure keeps honest last-loaded data and a single working retry.
 held=false;failure=true;await w.BrainiDailyOverview.render();
 assert.equal(root.querySelector('.daily-dashboard'),board);assert.match(root.querySelector('[data-daily-refresh-error]').textContent,/last loaded result/);
 assert.equal(root.querySelectorAll('[data-daily-retry]').length,1);assert.equal(root.hasAttribute('aria-busy'),false);
 failure=false;root.querySelector('[data-daily-retry]').click();await tick();
 assert.equal(root.querySelector('[data-daily-refresh-error]'),null);assert.equal(root.querySelector('.daily-dashboard'),board);
 // A genuine newly saved result renders normally, without modifying its value.
 status={...status,brainScore:2300,bonusChoice:model.choices[0],games:{...status.games,[model.choices[0]]:{completed:true,points:500}}};
 await w.BrainiDailyOverview.render();assert.match(root.querySelector('.daily-score-value').textContent,/2,300/);assert.notEqual(root.querySelector('.daily-dashboard'),board);
 const changed=root.querySelector('.daily-dashboard');await w.BrainiDailyOverview.render();assert.equal(root.querySelector('.daily-dashboard'),changed);
 // Async HTML generation cannot publish an obsolete account's result.
 held=true;const older=w.BrainiDailyOverview.render(),late=jobs.shift();auth={status:'authenticated',user:{id:'owner-b'}};
 const newer=w.BrainiDailyOverview.render(),fresh=jobs.shift();assert.equal(root.querySelector('.daily-dashboard'),null,'Old account is removed before awaiting the new account');
 late.resolve(clone(status));await older;assert.equal(root.querySelector('.daily-dashboard'),null);
 fresh.resolve({...clone(status),brainScore:0,games:{},bonusChoice:null});await newer;assert.match(root.querySelector('.daily-score-value').textContent,/^0/);
 // Failed first read for another owner must not retain an earlier owner's data.
 held=false;failure=true;auth={status:'guest',guestUserId:'guest-c'};await w.BrainiDailyOverview.render();
 assert.equal(root.querySelector('.daily-dashboard'),null);assert.ok(root.querySelector('.daily-load-error'));assert.ok(root.querySelector('[data-daily-retry]'));
 failure=false;await w.BrainiDailyOverview.render();assert.ok(root.querySelector('.daily-dashboard'));
 // Day change clears the old day immediately; a late response cannot restore it.
 held=true;const beforeDay=w.BrainiDailyOverview.render(),previousDay=jobs.shift();day='2026-10-18';const afterDay=w.BrainiDailyOverview.render(),nextDay=jobs.shift();
 assert.equal(root.querySelector('.daily-dashboard'),null);previousDay.resolve(clone(status));await beforeDay;assert.equal(root.querySelector('.daily-dashboard'),null);
 nextDay.resolve({...clone(status),dailyNumber:51,brainScore:0,games:{},bonusChoice:null});await afterDay;assert.match(root.querySelector('time').dateTime,/2026-10-18/);
 held=false;const originalMarkup=w.BrainiDailyJourney.markup;let resumeMarkup;
 w.BrainiDailyJourney.markup=()=>new Promise(resolve=>{resumeMarkup=resolve;});
 const staleMarkup=w.BrainiDailyOverview.render();await tick();auth={status:'authenticated',user:{id:'owner-d'}};w.BrainiDailyJourney.markup=originalMarkup;
 await w.BrainiDailyOverview.render();const freshBoard=root.querySelector('.daily-dashboard');resumeMarkup('<p>Obsolete owner content</p>');await staleMarkup;
 assert.equal(root.querySelector('.daily-dashboard'),freshBoard);assert.ok(!root.textContent.includes('Obsolete owner content'));
 assert.deepEqual(errors,[]);assert.equal(status.brainScore,2300);assert.equal(status.games[model.primary].points,1800);
 console.log('PASS Daily refresh: same DOM/cards/focus/details, no duplicate invitation, honest retained-result retry, real updates, owner/day isolation, stale reads and unchanged scores.');
}finally{dom.window.close();}
