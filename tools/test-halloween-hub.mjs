import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {halloweenBody} from '../lib/halloween-render.js';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const source=name=>readFileSync('assets/js/'+name+'.js','utf8'),tick=()=>new Promise(resolve=>setTimeout(resolve,0));
let cases=0;
async function mount({day='2026-10-19',storage={},account=null,closed=false}={}){
 const config={enabled:true,active:!closed,preview:!account,status:closed?'closed':'active',day,serverNow:Date.parse(day+'T12:00Z'),start:'2026-10-18T22:00:00Z',end:'2026-11-01T23:00:00Z'};
 const dom=new JSDOM('<script type="application/json" data-halloween-config>'+JSON.stringify(config)+'</script>'+halloweenBody({closed,preview:!account}),{url:'http://127.0.0.1:8809/halloween/',runScripts:'outside-only'}),w=dom.window;
 let auth=account?{status:'authenticated',user:{id:'account-a'}}:{status:'guest',guestUserId:'hub-guest'},rpc=0;const scrolls=[];
 w.HTMLElement.prototype.scrollIntoView=function(options){scrolls.push({id:this.id,...options});};
 w.BrainiData={authState:()=>auth};w.fetch=()=>{throw Error('Hub must not fetch')};
 w.BrainiHalloweenEntitlements={load:()=>{rpc++},snapshot:()=>account};
 Object.defineProperty(w.crypto,'randomUUID',{value:()=>w.Math.random().toString()});
 for(const [key,value]of Object.entries(storage))w.localStorage.setItem(key,value);
 for(const name of ['halloween-game-model','halloween-guest-model','halloween-event-client','halloween-hub'])w.eval(source(name));
 await tick();
 const api=w.BrainiLabHalloween,root=w.document.querySelector('.halloween-page'),action=game=>root.querySelector('[data-halloween-game-card="'+game+'"] [data-halloween-game-action]')?.textContent;
 const snapshot=()=>Object.fromEntries(Array.from({length:w.localStorage.length},(_,i)=>{const key=w.localStorage.key(i);return [key,w.localStorage.getItem(key)]}));
 async function complete(game){const session=await api.startGame(game),pack=w.BrainiHalloweenGameModel.game(game),submission=game==='trick-or-think'?{answers:pack.questions.map(q=>({id:q.id,answer:q.answer}))}:{attempts:pack.groups.map(g=>g.wordIds)};return api.completeGame({gameId:game,sessionId:session,submission});}
 return {dom,w,api,root,action,snapshot,complete,scrolls,rpc:()=>rpc,auth:value=>{auth=value;w.dispatchEvent(new w.CustomEvent('brainilab:authchange'))},close:()=>dom.window.close()};
}
const quiz='trick-or-think',connections='spooky-connections';
let u=await mount();
assert.equal(u.action(quiz),'Play today');assert.equal(u.action(connections),'Play today');assert.match(u.root.querySelector('[data-halloween-next-title]').textContent,/Pumpkin thinker/);assert.equal(u.rpc(),0);cases++;
const shortcut=u.root.querySelector('.halloween-shortcuts a'),historyBefore=u.w.history.length;shortcut.click();assert.equal(u.w.document.activeElement,u.root.querySelector('#halloween-play h2'));assert.equal(u.w.location.hash,'#halloween-play');assert.equal(u.w.history.length,historyBefore+1);assert.deepEqual(u.scrolls,[{id:'halloween-play',behavior:'instant',block:'start'}]);shortcut.click();assert.equal(u.w.history.length,historyBefore+1,'same destination does not add duplicate history');cases++;
for(const modifier of ['ctrlKey','metaKey','shiftKey','altKey']){let prevented;u.w.document.addEventListener('click',event=>{prevented=event.defaultPrevented;event.preventDefault();},{once:true});shortcut.dispatchEvent(new u.w.MouseEvent('click',{bubbles:true,cancelable:true,button:0,[modifier]:true}));assert.equal(prevented,false,'modified section link keeps browser behavior');}cases++;
await u.complete(quiz);assert.equal(u.action(quiz),'Play again');assert.match(u.root.querySelector('[data-halloween-game-state]').textContent,/Played today · 100\/100/);assert.equal(u.root.querySelector('[data-halloween-next-action]').getAttribute('href'),'/halloween/spooky-connections/');cases++;
await u.complete(connections);assert.match(u.root.querySelector('[data-halloween-next-title]').textContent,/Little bat/);assert.match(u.root.querySelector('[data-halloween-next-copy]').textContent,/another day/);assert.equal(u.root.querySelector('[data-halloween-next-action]').getAttribute('href'),'#halloween-read');cases++;
const firstDay=u.snapshot();u.auth({status:'guest',guestUserId:'someone-else'});assert.equal(u.action(quiz),'Play today');assert.match(u.root.querySelector('[data-halloween-next-title]').textContent,/Pumpkin thinker/);cases++;u.close();
u=await mount({day:'2026-10-20',storage:firstDay});assert.equal(u.action(quiz),'Play today');assert.equal(u.api.snapshot().progress.days_played,1);assert.match(u.root.querySelector('[data-halloween-next-copy]').textContent,/three different days/);await u.complete(quiz);const secondDay=u.snapshot();cases++;u.close();
u=await mount({day:'2026-10-21',storage:secondDay});await u.complete(quiz);assert.match(u.root.querySelector('[data-halloween-next-title]').textContent,/All three/);assert.equal(u.root.querySelector('[data-halloween-next-action]').getAttribute('href'),'/profile/?section=progress');cases++;u.close();
// Exercise the real game controller: saved-view labels must open a real result.
u=await mount();const section=u.w.document.createElement('section');section.dataset.halloweenGame=quiz;u.root.append(section);u.w.eval(source('halloween-games'));await tick();section.querySelector('[data-hg-start]').click();await tick();
for(const q of u.w.BrainiHalloweenGameModel.game(quiz).questions){section.querySelector('[data-hg-answer="'+q.answer+'"]').click();section.querySelector('[data-hg-next]').click();await tick();}
u.w.dispatchEvent(new u.w.Event('pageshow'));assert.equal(u.action(quiz),'See result');const saved=u.snapshot();assert.ok(section.querySelector('[data-hg-replay]'));cases++;u.close();
u=await mount({storage:saved});const resumed=u.w.document.createElement('section');resumed.dataset.halloweenGame=quiz;u.root.append(resumed);u.w.eval(source('halloween-games'));await tick();assert.ok(resumed.querySelector('[data-hg-replay]'));assert.equal(u.action(quiz),'See result');cases++;
const key='brainilab_halloween_game_v1:preview:'+encodeURIComponent(u.api.identityKey())+':'+quiz,corrupt=JSON.parse(u.w.localStorage.getItem(key));corrupt.session.session_id='wrong';u.w.localStorage.setItem(key,JSON.stringify(corrupt));u.w.dispatchEvent(new u.w.CustomEvent('brainilab:halloween-progress'));assert.equal(u.action(quiz),'Play again');cases++;u.close();
u=await mount({account:{cloud:true,status:'active',entitlements:['pumpkin-thinker'],progress:{games_completed:1,distinct_games:1,days_played:1}}});assert.equal(u.action(quiz),'Open game');assert.equal(u.api.snapshot().activity.known,false);assert.equal(u.rpc(),1,'Only existing account collection load; card rendering starts no sessions');assert.equal(u.root.querySelector('[data-halloween-next-action]').getAttribute('href'),'#halloween-play');cases++;u.close();
u=await mount({account:{cloud:true,status:'unavailable',loading:true,entitlements:[],progress:{}}});assert.match(u.root.querySelector('[data-halloween-next-copy]').textContent,/Checking/);assert.equal(u.action(quiz),'Open game');cases++;u.close();
u=await mount({closed:true});assert.equal(u.root.querySelector('[data-halloween-next]'),null);assert.equal(u.root.querySelector('[data-halloween-game-action]'),null);cases++;u.close();
console.log(`PASS Halloween hub: ${cases} real-ledger, result restore, day rollover, identity isolation, account fallback, no extra RPC and anchor-focus cases.`);
