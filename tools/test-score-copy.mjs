import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
const quiz=`<section id="quiz"><h2 data-q></h2><div data-answers></div><div data-feedback></div><div data-points></div><button data-next hidden>Next</button><button data-skip>Skip</button><span data-label></span><span data-count></span><span data-score></span><div data-bar></div><div class="quiz-tools"><span>Quiz Points · correct answers</span></div></section><section id="result"></section>`;
function setup(query='',game='brainmix'){
 const dom=new JSDOM(quiz,{url:'https://brainilabgames.com/games/brain-mix/'+query,runScripts:'outside-only'}),w=dom.window;
 for(const file of ['player-personalities','daily-rules','data','post-game','quiz'])w.eval(readFileSync('assets/js/'+file+'.js','utf8'));
 const root=w.document.querySelector('#quiz'),resultRoot=w.document.querySelector('#result');
 const questions=Array.from({length:10},(_,i)=>({q:'Local sample '+i,a:['Correct','Other'],c:0,f:'Local test question.'}));
 return {dom,w,root,resultRoot,questions,game};
}
for(const [day,expected] of [['2026-10-17',100],['2026-10-21',250]]){
 const t=setup(),{w,root,resultRoot,questions}=t;
 const dailyNumber=w.BrainiData.dailyNumberForDate(day),before=JSON.stringify(w.BrainiData.getState());
 let result;
 w.BrainiQuiz.mount(root,questions,{gameId:'brainmix',dailyScoreNumber:dailyNumber,onComplete:r=>{result=r;}});
 assert.match(root.querySelector('.quiz-score-context').textContent,new RegExp(`Each correct answer adds ${expected} Daily points`));
 assert.match(root.querySelector('.quiz-tools').textContent,/Game points/);
 root.querySelector('[data-answers] button').click();await tick();
 assert.equal(root.querySelector('[data-score]').textContent,'1,000 game pts');
 assert.equal(root.querySelector('[data-points]').textContent,'+1000','actual live award is unchanged');
 root.querySelector('[data-next]').click();
 for(let i=1;i<10;i++){root.querySelector('[data-skip]').click();await tick();root.querySelector('[data-next]').click();}
 assert.equal(result.points,1000);assert.equal(result.correct,1);assert.equal(result.answerDetails[0].pointsAwarded,1000);
 assert.ok(result.answerDetails.slice(1).every(answer=>answer.pointsAwarded===0));
 const payload={...result,score:result.points,dailyNumber};
 w.BrainiPostGame.mount(resultRoot,{gameId:'brainmix',result:payload,focus:false});
 assert.equal(resultRoot.querySelector('.post-points strong').textContent,String(expected));
 assert.equal(resultRoot.querySelector('[data-points-label]').textContent,'Daily points');
 assert.equal(resultRoot.querySelector('[data-score-context]').textContent,'From 1,000 game points.');
 assert.equal(resultRoot.querySelector('[data-score-context]').hidden,false);
 assert.equal(JSON.stringify(w.BrainiData.getState()),before,'presentation never records a round, changes XP or submits a result');
 t.dom.window.close();
}
for(const query of ['?archive=2026-10-17','?try=1']){
 const t=setup(query),{w,root,resultRoot,questions}=t;
 w.BrainiQuiz.mount(root,questions,{gameId:'brainmix',dailyScoreNumber:w.BrainiData.dailyNumberForDate('2026-10-17')});
 assert.equal(root.querySelector('.quiz-score-context'),null,'practice never promises Daily points');
 w.BrainiPostGame.mount(resultRoot,{gameId:'brainmix',result:{score:1000,practice:true,dailyNumber:50}});
 assert.equal(resultRoot.querySelector('.post-points strong').textContent,'1,000');
 assert.equal(resultRoot.querySelector('[data-points-label]').textContent,'Game points');
 assert.equal(resultRoot.querySelector('[data-score-context]').hidden,true);
 t.dom.window.close();
}
// Ordinary topic quizzes keep the actual 500-point award and no Daily note.
{
 const t=setup('', 'science'),{w,root,resultRoot,questions}=t;
 w.BrainiQuiz.mount(root,questions,{gameId:'science'});
 root.querySelector('[data-answers] button').click();await tick();
 assert.equal(root.querySelector('[data-score]').textContent,'500 game pts');
 assert.equal(root.querySelector('.quiz-score-context'),null);
 w.BrainiPostGame.mount(resultRoot,{gameId:'science',result:{score:500,correct:1,total:10}});
 assert.equal(resultRoot.querySelector('.post-points strong').textContent,'500');
 assert.equal(resultRoot.querySelector('[data-points-label]').textContent,'Game points');
 assert.equal(resultRoot.querySelector('[data-score-context]').hidden,true);
 t.dom.window.close();
}
// Conversion is shared by actual puzzle result consumers; game values stay intact.
for(const [game,score,correct,total] of [['connections',1000,1,3],['oddoneout',100,1,10],['mathrush',100,1,1],['higherlower',100,1,10],['numberroute',834,1,3],['sequence',250,1,10],['orderup',1250,10,20],['topicrush',500,3,15],['brainiword',2500,1,1]]){
 const t=setup(),{w,resultRoot}=t;
 const day=Array.from({length:20},(_,i)=>new Date(Date.UTC(2026,9,17+i)).toISOString().slice(0,10)).find(day=>w.BrainiDailyRules.lineup(day).includes(game));
 const result={score,correct,total,dailyNumber:w.BrainiData.dailyNumberForDate(day),scoringVersion:'mathrush-v2',won:true,attempts:1};
 const copy=JSON.stringify(result),expected=w.BrainiData.dailyPointsForResult(game,result);
 w.BrainiPostGame.mount(resultRoot,{gameId:game,result,focus:false});
 assert.equal(resultRoot.querySelector('.post-points strong').textContent,expected.toLocaleString('en-GB'),game+' uses the existing canonical Daily formatter');
 assert.equal(resultRoot.querySelector('[data-score-context]').hidden,score===expected);
 assert.equal(JSON.stringify(result),copy,'no scoring payload mutation: '+game);
 t.dom.window.close();
}
// A verified canonical score refresh must update both the total and its explanation.
{
 const t=setup(),{w,resultRoot}=t,dailyNumber=w.BrainiData.dailyNumberForDate('2026-10-17');
 let current={clientResultId:'local-sample',gameId:'brainmix',dailyNumber,score:1000,correct:1,total:10};
 w.BrainiData.recentResults=()=>[{...current,answerVerificationStatus:'verified'}];
 w.BrainiPostGame.mount(resultRoot,{gameId:'brainmix',result:{...current},focus:false});
 current={...current,score:2000,correct:2};w.BrainiPostGame.refresh();
 assert.equal(resultRoot.querySelector('.post-points strong').textContent,'200');
 assert.equal(resultRoot.querySelector('[data-score-context]').textContent,'From 2,000 game points.');
 t.dom.window.close();
}
console.log('PASS real Brain Mix live award 1000 → extra 100 / main 250 Daily points, unchanged 500-point topic quiz, archive/practice safety, all Daily game formatters, canonical refresh and zero result/XP writes.');
