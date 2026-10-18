import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {prepareArticle} from '../lib/learn-content.js';
import {articleJourney} from '../lib/article-game.js';
import {readingPages,refreshGameReadings} from '../lib/game-readings.js';
import {questions,challengeVersion} from '../editor/reasoning-questions.js';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const read=f=>readFileSync(f,'utf8'),tick=()=>new Promise(r=>setTimeout(r,0));
const articles=readdirSync('content/articles').filter(f=>f.endsWith('.json')).map(f=>JSON.parse(read('content/articles/'+f))).filter(a=>a.status==='published').map(prepareArticle);
assert.equal(readingPages.length,19,'all public game entrances, including two unranked challenges');
const science='science/science-quiz/index.html';
let filtered=articles.filter(a=>a.slug!=='why-is-the-sky-blue');
let d=new JSDOM(refreshGameReadings(read(science),filtered,science));assert.equal(d.window.document.querySelectorAll('.game-reading-card').length,1);d.window.close();
assert.throws(()=>refreshGameReadings(read(science),[],science),/No published readings/);
assert.equal(refreshGameReadings('<main>Other page</main>',articles,'other/index.html'),'<main>Other page</main>');
// A reading row sits below the game, never above its start action. Teaching text remains intact.
for(const file of readingPages){
 d=new JSDOM(refreshGameReadings(read(file),articles,file));const doc=d.window.document,section=doc.querySelector('.game-reading');
 const start=doc.querySelector('[data-start],[data-brainiword-start],[data-bw-start],[data-ou-start],[data-tr-start],[data-europe-start],#leafQuiz button,#brainMixChallenge button,.connections-start');
 if(start)assert.ok(start.compareDocumentPosition(section)&d.window.Node.DOCUMENT_POSITION_FOLLOWING,file);
 assert.equal(doc.querySelectorAll('h1').length,1,file);
 assert.equal(doc.querySelectorAll('link[href*="game-entry.css"]').length,1,file);
 assert.ok(section.querySelectorAll('a').length<=2,file);
 if(file==='games/brainiword/index.html')assert.match(doc.querySelector('.play-guide').textContent,/PLANT.*TRAIN/);
 d.window.close();
}
// Formerly missing result recommendations reuse the same account invitation.
for(const [gameId,path]of [['orderup','games/order-up/'],['topicrush','games/topic-rush/'],['higherlower','games/higher-lower/'],['survival','games/survival/']]){
 const dom=new JSDOM('<main></main>',{url:'https://brainilabgames.com/'+path,runScripts:'outside-only'}),w=dom.window;
 let opened=0;w.BrainiData={authState:()=>({status:'guest'})};w.BrainiAuth={open:()=>opened++};w.eval(read('assets/js/post-game.js'));
 const root=w.document.querySelector('main');w.BrainiPostGame.mount(root,{gameId,result:{correct:4,total:10,score:400},focus:false});
 assert.equal(root.querySelectorAll('[data-post-action="guide"]').length,1,gameId);assert.equal(root.querySelectorAll('[data-join-account]').length,1);assert.equal(opened,0);
 assert.ok(read('.'+root.querySelector('[data-post-action="guide"]').getAttribute('href')+'index.html'));
 root.querySelector('[data-join-account]').click();await tick();assert.equal(opened,1);root.querySelector('[data-dismiss-account]').click();assert.ok(root.querySelector('[data-account-invite]').hidden);
 w.BrainiData.authState=()=>({status:'authenticated',user:{id:'signed-in-player'}});w.dispatchEvent(new w.Event('brainilab:authchange'));assert.equal(root.querySelectorAll('[data-join-account]').length,0);dom.window.close();
}
const reasoning=articles.find(a=>a.slug==='rotation-or-reflection');assert.equal(articleJourney(reasoning).gameId,'reasoning');
// Resume an actual completed unranked challenge. No ranked saves or account enrolment.
function challenge({guest=true,delayed=false}={}){
 const dom=new JSDOM(read('reasoning/index.html'),{url:'https://brainilabgames.com/reasoning/#learn-'+reasoning.slug,runScripts:'outside-only'}),w=dom.window;let resolve,opened=0,requests=0,saves=0;
 w.HTMLElement.prototype.scrollIntoView=()=>{};w.AbortController=AbortController;
 w.BrainiData={authState:()=>guest?{status:'guest'}:{status:'authenticated',user:{id:'account-a'}},api:{submitGameResult:()=>saves++}};
 w.BrainiAuth={open:()=>opened++};w.fetch=async()=>{requests++;if(delayed)await new Promise(r=>resolve=r);return {ok:true,json:async()=>({version:1,articles:articles.map(articleJourney).filter(Boolean)})};};
 w.sessionStorage.setItem('brainilab-reasoning:'+challengeVersion,JSON.stringify(questions.map(q=>q.answer)));
 w.eval(read('assets/js/post-game.js'));w.eval(read('assets/js/reasoning.bundle.js'));const root=w.document.querySelector('[data-reasoning]');root.querySelector('[data-start]').click();
 return {dom,w,root,finish:()=>resolve?.(),opened:()=>opened,requests:()=>requests,saves:()=>saves};
}
let h=challenge();await tick();assert.equal(h.root.querySelector('.reason-score>strong').textContent,'12');assert.equal(h.root.querySelector('[data-post-action="guide"]').getAttribute('href'),'/learn/'+reasoning.slug+'/');assert.equal(h.root.querySelector('[data-reading-title]').textContent,reasoning.title+' →');assert.equal(h.requests(),1);assert.equal(h.saves(),0);assert.equal(h.w.localStorage.length,0);assert.equal(h.opened(),0);
h.root.querySelector('[data-join-account]').click();await tick();assert.equal(h.opened(),1);assert.match(h.root.querySelector('.post-account-invite').textContent,/practice round stays/);h.root.querySelector('[data-dismiss-account]').click();assert.ok(h.root.querySelector('[data-account-invite]').hidden);assert.equal(h.w.document.activeElement,h.root.querySelector('[data-post-action="guide"]'));h.dom.window.close();
h=challenge({guest:false});await tick();assert.equal(h.root.querySelectorAll('[data-join-account]').length,0);h.dom.window.close();
h=challenge({delayed:true});h.root.querySelector('[data-replay]').click();h.finish();await tick();assert.equal(h.root.querySelector('[data-post-action="guide"]'),null);assert.match(h.root.querySelector('h2').textContent,/three-shape/);h.dom.window.close();
h=challenge({delayed:true});h.w.BrainiData.authState=()=>({status:'authenticated',user:{id:'account-b'}});h.finish();await tick();assert.equal(h.root.querySelector('[data-post-action="guide"]').getAttribute('href'),'/learn/paths/patterns-and-reasoning/');h.dom.window.close();
console.log('PASS: 19 entrances, preserved guides/start actions, retired-reading fallback, four missing result recommendations, explicit/dismissible sign-up, unranked reasoning return link, replay/account-switch races and no score/storage side effects.');
