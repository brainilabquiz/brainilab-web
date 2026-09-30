import {readFileSync} from 'node:fs';import {pathToFileURL} from 'node:url';import assert from 'node:assert/strict';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);const tick=()=>new Promise(r=>setTimeout(r,0));
for(const [slug,module,pack,choice] of [['sequence','BrainiSequence','sequence-puzzles','[data-answers] button'],['odd-one-out','BrainiOddOneOut','odd-one-out-puzzles','[data-items] button'],['higher-lower','BrainiHigherLower','higher-lower-pairs','[data-higher]'],['survival','BrainiSurvival','quiz-packs','[data-answers] button']]){
 const dom=new JSDOM(readFileSync(`games/${slug}/index.html`,'utf8'),{url:`https://brainilabgames.com/games/${slug}/`,runScripts:'outside-only'}),w=dom.window;let saves=0;
 w.BrainiBackendAuth={isConfigured:()=>false};w.BrainiData={api:{submitGameResult:async(id,payload)=>{saves++;return {...payload,clientResultId:'test',cloudSyncStatus:'local_only'};}}};w.BrainiContinuity={rewardMarkup:()=>'<p>Checking your XP.</p>'};
 for(const f of ['post-game',pack,slug])w.eval(readFileSync('assets/js/'+f+'.js','utf8'));
 const root=w.document.querySelector('[data-intro]').parentElement;await w[module].mount(root);root.querySelector('[data-start]').click();await tick();
 for(let i=0;i<30&&!root.querySelector('.post-game');i++){const answer=root.querySelector(choice);assert.ok(answer,slug+' answer');answer.click();await tick();root.querySelector('[data-next]').click();await tick();}
 assert.ok(root.querySelector('.post-game'),slug+' completed');assert.equal(saves,1);assert.match(root.textContent,/Checking your XP/);assert.ok(root.querySelector('.post-primary').href.includes('/games/'));dom.window.close();
}
console.log('PASS: complete Higher or Lower, Odd One Out, Sequence and Survival rounds with mocked saves; shared result, next action and one submission.');
