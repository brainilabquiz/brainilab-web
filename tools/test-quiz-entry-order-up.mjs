import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const read = file => readFileSync(new URL('../'+file,import.meta.url),'utf8');
const flush = () => new Promise(resolve=>setTimeout(resolve,0));
const cases = [
  ['sports/sports-quiz/','sports','Sports'],
  ['history/history-quiz/','history','History'],
  ['geography/world-capitals-quiz/','worldcapitals','World Capitals']
];
for(const [path,id,name] of cases){
  const dom = new JSDOM(read(path+'index.html'),{
    url:'https://brainilabgames.com/'+path+'?difficulty=easy&set=2',
    runScripts:'outside-only'
  });
  const w = dom.window;
  const q = selector => w.document.querySelector(selector);
  let loads=0, health=0, saves=0, histories=0;
  const analytics=[];
  const questions=Array.from({length:20},(_,i)=>({
    q:'Practice item '+(i+1),a:['One','Two','Three','Four'],c:0,f:'Explanation.',
    questionVersionId:String(i)
  }));
  w.BrainiContent={
    normalizeDifficulty:level=>level,
    async loadQuizPack(game,difficulty,set){
      loads++;
      assert.deepEqual([game,difficulty,set],[id,'easy',2]);
      return {source:'local',questions};
    },
    recordAnytimeHistory(){histories++;}
  };
  w.BrainiContentHealth={create(){health++;return {checkpoint(){},complete(){}};}};
  w.BrainiData={api:{async submitGameResult(_,result){saves++;return result;}}};
  w.BrainiPostGame={mount(){}};
  w.BrainiSiteAnalytics={
    gameStart(game,_,mode){analytics.push([game,mode]);},
    practiceComplete(game){analytics.push([game,'practice_complete']);}
  };
  w.eval(read('assets/js/quiz.js'));
  w.BrainiQuiz.mountEntry(q('#leafQuiz'),{gameId:id,name,next:{}});
  assert.equal(loads,0);
  assert.equal(health,0);
  assert.equal(q('.challenge-inner').hidden,true);
  assert.equal(q('[data-difficulty="easy"]').getAttribute('aria-current'),'true');

  if(id==='history'){
    assert.match(q('.quiz-entry-example').textContent,/1789/);
  }
  if(id==='sports'){
    q('[data-quiz-start="quick"]').click();
    await flush();
    assert.equal(q('[data-label]').textContent,'Question 1 of 5');
    assert.equal(w.document.activeElement,q('[data-q]'));
    for(let i=0;i<5;i++){
      q('[data-skip]').click();
      await flush();
      q('[data-next]').click();
    }
    const result=q('[data-inline-quiz-result]');
    assert.equal(result.hidden,false);
    assert.equal(w.document.activeElement.textContent,'0 of 5 correct');
    assert.deepEqual(analytics,[['sports','practice'],['sports','practice_complete']]);
    assert.deepEqual([loads,health,saves,histories],[1,0,0,0]);
    result.querySelector('button').click();
  }else q('[data-quiz-start="full"]').click();
  await flush();
  assert.equal(q('[data-label]').textContent,'Question 1 of 20');
  assert.equal(w.document.activeElement,q('[data-q]'));
  if(id==='sports'){
    for(let i=0;i<20;i++){
      q('[data-skip]').click();
      await flush();
      q('[data-next]').click();
    }
    await flush();
    assert.deepEqual([loads,health,saves,histories],[2,1,1,1]);
  }
  w.close();
}

const now='2026-11-15';
const draftKey='brainilab-orderup-v35-'+now;
const rounds=Array.from({length:2},(_,i)=>({
  roundId:'round-'+i,title:'Order numbers',prompt:'Put these in order.',direction:'Smallest → Largest',
  items:Array.from({length:10},(_,j)=>({itemId:i+'-'+j,label:String(j)}))
}));
async function orderSession(draft){
  const dom=new JSDOM(read('games/order-up/index.html'),{
    url:'https://brainilabgames.com/games/order-up/',runScripts:'outside-only',pretendToBeVisual:true
  });
  const w=dom.window,q=selector=>w.document.querySelector(selector);
  let time=0,visible=true;
  Object.defineProperty(w.document,'hidden',{get:()=>!visible});
  Object.defineProperty(w.performance,'now',{value:()=>time});
  const NativeDate=w.Date;
  w.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:[now+'T12:00:00Z']));}};
  if(draft)w.localStorage.setItem(draftKey,draft);
  const receipts=[];
  w.BrainiData={daily:()=>({number:2}),recentResults:()=>[],api:{
    async submitGameResult(game,payload){assert.equal(game,'orderup');receipts.push(payload);return {id:'saved',...payload};}
  }};
  w.BrainiDailyGames={
    async loadOrderUp(){return {dailyNumber:2,source:'fixture',rounds};},
    async checkOrderUpRound(){return {score:1250,correctPairs:45,exactPositions:10,accuracy:100};}
  };
  w.BrainiPostGame={async complete(_,__,{save}){await save();}};
  w.eval(read('assets/js/order-up.js'));
  await w.BrainiOrderUp.mount(q('[data-ou-intro]').closest('article')||q('[data-ou-intro]').parentElement);
  const start=async()=>{q('[data-ou-start]').click();await flush();};
  const order=async()=>{
    for(let i=0;i<10;i++)q('[data-ou-choices] button:not([disabled])').click();
    await flush();
    q('[data-ou-next]').click();
    await flush();
  };
  return {
    w, q, start, order, receipts,
    time(value){time=value;},
    visible(value){visible=value;w.document.dispatchEvent(new w.Event('visibilitychange'));},
    pause(){w.dispatchEvent(new w.Event('pagehide'));return w.localStorage.getItem(draftKey);}
  };
}

let run=await orderSession();
run.time(1000);
await run.start();
run.time(4000);
run.visible(false);
run.time(94000);
run.visible(true);
run.time(95000);
await run.order();
run.time(96000);
const draft=run.pause();
assert.equal(JSON.parse(draft).elapsedMs,5000);
run.w.close();
run=await orderSession(draft);
await run.start();
assert.equal(run.q('[data-ou-round-count]').textContent.trim(),'Round 2 of 2');
run.time(2110);
await run.order();
assert.equal(run.receipts[0].durationMs,7110);
assert.equal(run.receipts[0].score,2500);
assert.equal(run.receipts[0].orderPairsCorrect,90);
run.w.close();
const legacy=JSON.parse(draft);
delete legacy.elapsedMs;
run=await orderSession(JSON.stringify(legacy));
await run.start();
run.time(700);
await run.order();
assert.equal('durationMs' in run.receipts[0],false);
run.w.close();

console.log('PASS explicit quiz starts, isolated Sports practice, standard rounds, keyboard focus, and resumable Order Up timing.');
