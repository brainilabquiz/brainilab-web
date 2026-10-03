import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const tick=()=>new Promise(r=>setTimeout(r,0));
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
function setup(query=''){
 const w=new JSDOM('<main><div id="result"></div></main>',{url:'https://brainilabgames.com/games/sequence/'+query,runScripts:'outside-only'}).window;
 w.HTMLElement.prototype.scrollIntoView=function(){};
 w.BrainiData={authState:()=>({status:'authenticated'})};
 w.BrainiContinuity={rewardMarkup:r=>r.practice?'Practice round · no XP or streak changes':r.answerVerificationStatus==='verified'?'+55 XP':r.clientResultId?'Checking your XP.':''};
 w.eval(readFileSync('assets/js/post-game.js','utf8'));
 const root=w.document.querySelector('#result');
 const options={gameId:'sequence',name:'Sequence',result:{correct:2,total:10,score:500,accuracy:20},metrics:[{label:'Accuracy',value:'20%'}],next:{href:'/games/sequence/',label:'Play again'}};
 return {w,root,options};
}
{
 const {w,root,options}=setup(),save=deferred(),verify=deferred();let slow;
 w.setTimeout=(fn,ms)=>{assert.equal(ms,8000);slow=fn;return 1;};w.clearTimeout=()=>{};
 const done=w.BrainiPostGame.complete(root,options,{save:()=>save.promise,verify:()=>verify.promise});
 assert.match(root.textContent,/2 \/ 10/);assert.match(root.textContent,/Saving your result/);assert.doesNotMatch(root.textContent,/\+55 XP/);
 assert.equal(w.document.activeElement,root.querySelector('.post-score'));
 slow();assert.match(root.textContent,/taking longer/);
 root.querySelector('.post-primary').focus();
 save.resolve({clientResultId:'saved',cloudSyncStatus:'synced'});await tick();
 assert.match(root.textContent,/Checking your XP/);assert.equal(w.document.activeElement,root.querySelector('.post-primary'));
 verify.resolve({correct:1,total:10,score:250,accuracy:10,answerVerificationStatus:'verified'});await done;
 assert.match(root.textContent,/1 \/ 10/);assert.equal(root.querySelector('.post-points strong').textContent,'250');assert.equal(root.querySelector('.post-metrics dd').textContent,'10%');assert.match(root.textContent,/\+55 XP/);
 assert.equal(w.document.activeElement,root.querySelector('.post-primary'));w.close();
}
for(const kind of ['reject','empty','verify-reject','practice']){
 const {w,root,options}=setup(kind==='practice'?'?try=1':'');
 await w.BrainiPostGame.complete(root,options,{save:async()=>{if(kind==='reject'||kind==='practice')throw Error('offline');return kind==='empty'?null:{clientResultId:'saved'};},verify:async()=>{throw Error('unavailable');}});
 assert.match(root.textContent,/2 \/ 10/);assert.ok(root.querySelector('.post-primary'));
 assert.match(root.textContent,kind==='practice'?/Practice round/:kind==='verify-reject'?/Checking your XP/:/could not be saved/);
 assert.doesNotMatch(root.textContent,/\+55 XP/);w.close();
}
// Real engines must reveal the result even when saving never resolves.
for(const [slug,module,pack,choice]of [['sequence','BrainiSequence','sequence-puzzles','[data-answers] button'],['odd-one-out','BrainiOddOneOut','odd-one-out-puzzles','[data-items] button'],['higher-lower','BrainiHigherLower','higher-lower-pairs','[data-higher]'],['survival','BrainiSurvival','quiz-packs','[data-answers] button']]){
 const w=new JSDOM(readFileSync(`games/${slug}/index.html`,'utf8'),{url:`https://brainilabgames.com/games/${slug}/`,runScripts:'outside-only'}).window;
 w.HTMLElement.prototype.scrollIntoView=function(){};const waiting=deferred();let saves=0;
 w.BrainiBackendAuth={isConfigured:()=>false};w.BrainiData={authState:()=>({status:'authenticated'}),api:{submitGameResult:()=>{saves++;return waiting.promise;}}};
 w.BrainiContinuity={rewardMarkup:()=>''};
 for(const f of ['post-game',pack,slug])w.eval(readFileSync(`assets/js/${f}.js`,'utf8'));
 const root=w.document.querySelector('[data-intro]').parentElement;await w[module].mount(root);root.querySelector('[data-start]').click();await tick();
 for(let i=0;i<30&&!root.querySelector('.post-game');i++){root.querySelector(choice).click();await tick();root.querySelector('[data-next]').click();await tick();}
 assert.ok(root.querySelector('.post-game'),slug);assert.equal(root.querySelector('[data-stage]').hidden,true);assert.equal(root.querySelector('[data-result]').hidden,false);
 assert.match(root.textContent,/Saving your result/);assert.equal(saves,1);root.querySelector('[data-next]').click();assert.equal(saves,1);
 waiting.reject(Error('offline'));await tick();assert.match(root.textContent,/could not be saved/);w.close();
}
console.log('PASS immediate results for four engines; slow, failed, practice and verified saves; canonical scores; keyboard focus and one submission.');
