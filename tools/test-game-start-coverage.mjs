import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const load=(w,name)=>w.eval(readFileSync('assets/js/'+name+'.js','utf8'));
const tick=()=>new Promise(r=>setTimeout(r,0));
const order=JSON.parse(readFileSync('content/game-batches/order-quality-20261015.json')).orderup.slice(0,2).map(r=>({roundId:r.external_key,title:r.title,prompt:r.prompt,directionLabel:r.direction_label,items:r.items.map((label,i)=>({itemId:r.external_key+'-'+i,label}))}));
const topic=JSON.parse(readFileSync('content/game-batches/knowledge-variety-20261014.json')).topicrush[0];
for(const [slug,id,api,pool,startSelector] of [
 ['sequence','sequence','BrainiSequence','sequence-puzzles','[data-start]'],
 ['odd-one-out','oddoneout','BrainiOddOneOut','odd-one-out-puzzles','[data-start]'],
 ['higher-lower','higherlower','BrainiHigherLower','higher-lower-pairs','[data-start]'],
 ['survival','survival','BrainiSurvival',null,'[data-start]'],
 ['order-up','orderup','BrainiOrderUp',null,'[data-ou-start]'],
 ['topic-rush','topicrush','BrainiTopicRush',null,'[data-tr-start]']
])for(const mode of ['accepted','rejected','archive','try','empty']){
 const query=mode==='archive'?'?archive=2026-09-07':mode==='try'?'?try=1':'';
 const w=new JSDOM(readFileSync('games/'+slug+'/index.html','utf8'),{url:'https://brainilabgames.com/games/'+slug+'/'+query,runScripts:'outside-only'}).window;
 let writes=0;
 w.HTMLElement.prototype.scrollIntoView=()=>{};w.requestAnimationFrame=fn=>fn();
 w.BrainiData={pastDailyDate:x=>x,recentResults:()=>[],anytimeHistory:()=>({}),daily:()=>({number:53}),dailyNumberForDate:()=>53,api:{submitGameResult:async()=>{writes++;throw Error('No result should be submitted just by starting');}}};
 w.BrainiBackendAuth={isConfigured:()=>false};w.BrainiContinuity={rewardMarkup:()=>''};
 w.BrainiDailyGames={loadOrderUp:async()=>{if(mode==='empty')throw Error('fixture unavailable');return {dailyNumber:53,rounds:order,source:'local'};},loadTopicRush:async()=>{if(mode==='empty')throw Error('fixture unavailable');return {dailyNumber:53,title:topic.title,prompt:topic.prompt,targetCount:topic.target_count,durationSeconds:60,topicId:topic.external_key,source:'local'};}};
 w.BrainiQuizPacks={get:()=>mode==='empty'?[]:Array.from({length:10},(_,n)=>({q:'Fixture question '+n,a:['one','two','three','four'],c:0}))};
 const choice=mode!=='rejected';w.localStorage.setItem('brainilab_statistics_consent_v1',JSON.stringify({allowed:choice,at:Date.now()}));
 load(w,'site-analytics');load(w,'post-game');load(w,'puzzle-results');
 if(pool){load(w,pool);if(mode==='empty')w[{sequence:'BrainiSequencePuzzles',oddoneout:'BrainiOddOneOutPuzzles',higherlower:'BrainiHigherLowerPairs'}[id]].all=()=>[];}
 load(w,slug);const start=w.document.querySelector(startSelector),root=start.closest('[id]');
 await w[api].mount(root);assert.equal((w.dataLayer||[]).filter(e=>e[0]==='event'&&e[1]==='game_start').length,0,'mount is not a start');
 start.click();await tick();
 const starts=(w.dataLayer||[]).filter(e=>e[0]==='event'&&e[1]==='game_start');
 assert.equal(starts.length,mode==='accepted'?1:0,id+' '+mode);
 if(starts.length){assert.equal(starts[0][2].game_id,id);assert.equal(starts[0][2].mode,['orderup','topicrush'].includes(id)?'daily':'anytime');assert.equal(Object.keys(starts[0][2]).some(k=>/score|xp|email|user_id/.test(k)),false);}
 assert.equal(writes,0,'start must never submit results or XP');w.close();
}
console.log('PASS six real controllers: no start on mount, one start after successful load, consent rejection/archive/try/load-failure excluded, no score or XP writes.');
