import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {renderHalloweenPage} from '../lib/halloween-render.js';
import {privatePreviewState} from '../lib/halloween-event.js';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const modelSource=readFileSync('assets/js/halloween-game-model.js','utf8'),uiSource=readFileSync('assets/js/halloween-games.js','utf8');
const tick=()=>new Promise(r=>setTimeout(r,0)),plain=x=>JSON.parse(JSON.stringify(x));
const template='<!doctype html><html><head><title>Learn</title><meta name="description" content="Learn"/><link rel="canonical" href="https://brainilabgames.com/learn/"/></head><body><main id="main-content"></main></body></html>';
let cases=0;
async function setup(game='trick-or-think',options={}){
 const html=renderHalloweenPage(template,privatePreviewState(),game);
 const dom=new JSDOM(html,{url:'https://brainilabgames.com/halloween/'+game+'/'+(options.hash??'#challenge=70'),runScripts:'outside-only'}),w=dom.window;
 const calls={starts:0,saves:[],release:null,owner:'guest:invitation-test'};
 w.fetch=()=>{throw Error('No external request in isolated game tests');};
 w.BrainiData={authState:()=>({status:'guest'}),api:{submitGameResult(){throw Error('Daily must not be called');}}};
 w.eval(modelSource);const model=w.BrainiHalloweenGameModel,pack=model.game(game),owner=calls.owner;
 const key='brainilab_halloween_game_v1:live:'+encodeURIComponent(owner)+':'+game;
 const session={session_id:'entry-test',game,day:'2026-10-19',ownerKey:owner,preview:false,guest:true,pack:plain(model.publicPack(game)),practice:false};
 const finished=game==='trick-or-think'?{answers:pack.questions.map((q,i)=>({id:q.id,answer:i<7?q.answer:q.options.find(o=>o.id!==q.answer).id}))}:{attempts:[['w00','w01','w04','w08'],...pack.groups.map(g=>plain(g.wordIds))]};
 if(options.finished)w.localStorage.setItem(key,JSON.stringify({version:pack.version,preview:false,session,submission:finished,screen:'result',answered:false,saved:true}));
 if(options.stored)w.localStorage.setItem(key,options.stored);
 w.BrainiLabHalloween={identityKey:()=>calls.owner,availability:()=>({allowed:options.allowed!==false,preview:false,day:'2026-10-19',message:'This Halloween special has finished.'}),snapshot:()=>({entitlements:[],cloud:false}),
  startGame:async()=>{calls.starts++;if(options.fail)throw Error('Could not connect. Please try again.');if(options.held)await new Promise(r=>{calls.release=r;});return {...session,completed:!!options.finished,result:options.finished?{score:40}:null};},
  completeGame:async payload=>{calls.saves.push(plain(payload));return {saved:true,verifiedSummary:plain(model.summary(game,payload.submission))};}};
 w.HTMLElement.prototype.scrollIntoView=function(){calls.scrolled=true;};
 const before=w.localStorage.getItem(key);w.eval(uiSource);await tick();
 return {dom,w,calls,model,pack,key,before,root:w.document.querySelector('[data-halloween-game]'),close(){dom.window.close();}};
}
const parser=await setup();
for(const score of [0,1,20,70,99,100])assert.equal(parser.model.challengeScore('#challenge='+score),score);
for(const bad of [null,undefined,70,'','#challenge=-1','#challenge=101','#challenge=07','#challenge=70.5','#challenge=1e2','#challenge=Infinity','#challenge=NaN','#challenge=70&name=Sam','#challenge=%37%30','#challenge=<img src=x onerror=bad()>','#other=70'])assert.equal(parser.model.challengeScore(bad),null);
cases++;parser.close();
for(const game of ['trick-or-think','spooky-connections']){
 const u=await setup(game);
 assert.equal(u.calls.starts,0,'Opening the invitation never starts or saves a round');assert.equal(u.calls.saves.length,0);
 assert.match(u.root.textContent,/A challenge from your friend/);assert.match(u.root.querySelector('[data-hg-heading]').textContent,/beat 70\/100/);
 assert.notEqual(u.root.querySelector('[data-hg-heading]').textContent,u.pack.title,'The page title is not duplicated');
 assert.equal(u.root.querySelectorAll('.halloween-intro-art').length,1);assert.equal(u.root.querySelector('.halloween-intro-art').getAttribute('aria-hidden'),'true');
 assert.match(u.root.querySelector('[data-hg-start]').textContent,/Take the challenge/);assert.match(u.root.textContent,/No sign-up needed/);assert.equal(u.root.querySelector('.halloween-intro-rules').open,false);
 assert.equal(u.root.querySelectorAll('input,form,a[href*="login"],a[href*="signup"]').length,0);assert.equal(u.root.querySelector('[data-hg-answer],[data-hg-word]'),null);
 u.root.querySelector('[data-hg-start]').click();await tick();assert.equal(u.calls.starts,1);assert.ok(u.root.querySelector(game==='trick-or-think'?'[data-hg-answer]':'[data-hg-word]'));
 assert.equal(u.w.document.activeElement,u.root.querySelector('[data-hg-heading]'));assert.equal(u.calls.scrolled,true);assert.equal(u.calls.saves.length,0);
 const persisted=JSON.parse(u.w.localStorage.getItem(u.key));assert.equal('challenge' in persisted,false);assert.equal('challenge' in persisted.session,false,'A shared target is never a verified result');
 cases++;u.close();
 const ordinary=await setup(game,{hash:''});assert.match(ordinary.root.querySelector('[data-hg-start]').textContent,/Let’s play/);assert.doesNotMatch(ordinary.root.textContent,/A challenge from your friend/);cases++;ordinary.close();
 const closed=await setup(game,{allowed:false});assert.equal(closed.root.querySelector('[data-hg-start]'),null);assert.equal(closed.calls.starts,0);cases++;closed.close();
 const old=await setup(game,{finished:true,hash:'#challenge=100'});assert.equal(old.calls.starts,0);assert.equal(old.w.localStorage.getItem(old.key),old.before,'Opening keeps an already saved result untouched');
 assert.match(old.root.querySelector('[data-hg-challenge-outcome]').textContent,/friend’s score: 100\/100/);
 const replay=old.root.querySelector('[data-hg-replay]');assert.match(replay.textContent,/Play this challenge again/);assert.equal(replay.closest('details'),null);
 replay.click();await tick();assert.equal(old.calls.starts,1);assert.ok(old.root.querySelector(game==='trick-or-think'?'[data-hg-answer]':'[data-hg-word]'));assert.match(old.root.textContent,/Practice round/);assert.equal(old.calls.saves.length,0);cases++;old.close();
 const matched=await setup(game,{finished:true,hash:'#challenge='+(game==='trick-or-think'?70:90)});assert.match(matched.root.querySelector('[data-hg-challenge-outcome]').textContent,/You matched/);cases++;matched.close();
 const won=await setup(game,{finished:true,hash:'#challenge=0'});assert.match(won.root.querySelector('[data-hg-challenge-outcome]').textContent,/You beat/);cases++;won.close();
 const rendered=new JSDOM(renderHalloweenPage(template,privatePreviewState(),game)).window.document;
 assert.equal(rendered.querySelectorAll('h1').length,1);assert.equal(rendered.querySelectorAll('template[data-hg-intro-art]').length,1);
 assert.equal(new URL(rendered.querySelector('link[rel="canonical"]').href).hash,'');assert.match(rendered.querySelector('meta[name="description"]').content,/Ten Halloween questions|Sixteen words/);assert.equal(rendered.querySelector('meta[property="og:description"]').content,rendered.querySelector('meta[name="description"]').content);cases++;
}
for(const [hash,copy]of [['#challenge=100',/match 100\/100/],['#challenge=0',/A spooky little challenge/],['#challenge=<img src=x onerror=bad()>',/Ten little surprises/]]){
 const u=await setup('trick-or-think',{hash});assert.match(u.root.querySelector('[data-hg-heading]').textContent,copy);assert.equal(u.root.querySelector('img,script'),null);cases++;u.close();
}
const held=await setup('trick-or-think',{held:true});const button=held.root.querySelector('[data-hg-start]');button.click();button.click();await tick();assert.equal(held.calls.starts,1);assert.equal(button.disabled,true);held.calls.release();await tick();assert.ok(held.root.querySelector('[data-hg-answer]'));cases++;held.close();
const failed=await setup('spooky-connections',{fail:true});failed.root.querySelector('[data-hg-start]').click();await tick();assert.equal(failed.root.querySelector('[data-hg-start]').disabled,false);assert.match(failed.root.querySelector('[data-hg-status]').textContent,/Please try again/);cases++;failed.close();
const first=await setup();first.root.querySelector('[data-hg-start]').click();await tick();first.root.querySelector('[data-hg-answer]').click();const stored=first.w.localStorage.getItem(first.key);first.close();
const resumed=await setup('trick-or-think',{stored});assert.equal(resumed.w.localStorage.getItem(resumed.key),stored);assert.match(resumed.root.querySelector('[data-hg-start]').textContent,/Continue game/);resumed.root.querySelector('[data-hg-start]').click();await tick();assert.equal(resumed.calls.starts,0,'A saved unfinished session resumes without an extra start');assert.equal(resumed.root.querySelectorAll('[data-hg-answer]:disabled').length,4);resumed.root.querySelector('[data-hg-next]').click();await tick();assert.match(resumed.root.textContent,/Question 2 of 10/);cases++;resumed.close();
console.log(`PASS Halloween invitation entry: ${cases} cases; strict local score target, one-tap guest play, old links, no auto-start, duplicate prevention, focus, clear errors, resume, saved result/practice, honest comparison, canonical metadata and existing artwork. No live data or messages.`);
