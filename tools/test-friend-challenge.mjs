import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const source=readFileSync('assets/js/friend-challenge.js','utf8'),analytics=readFileSync('assets/js/site-analytics.js','utf8');
const today=new Date().toISOString().slice(0,10),yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10),tomorrow=new Date(Date.now()+86400000).toISOString().slice(0,10);
const d=new JSDOM('<title>Daily</title><div data-friend-invitation hidden></div><main></main>',{url:'https://brainilabgames.com/daily-quiz/?friend='+today,runScripts:'outside-only'}),w=d.window;
w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new w.Event('close'));};
w.BrainiData={dateForDailyNumber:n=>n===32?today:yesterday};w.eval(source);const api=w.BrainiFriendChallenge;
const status={dailyNumber:32,completedCount:1,brainScore:1800,answers:['SECRET'],email:'PRIVATE@example.com'};
const invite=api.buildInvite(status);assert.equal(invite.url,'https://brainilabgames.com/daily-quiz/?friend='+today);assert.match(invite.text,/1 game down, 3 to go/);assert.match(invite.text,/Fancy joining me/);assert.ok(!/PRIVATE|SECRET/.test(invite.text));assert.equal(api.buildInvite({...status,dailyNumber:31}),null);
assert.match(api.buildInvite({...status,completedCount:4,brainScore:7800}).text,/7,800 points/);
assert.match(api.buildInvite({...status,completedCount:0}).text,/Fancy a little challenge/);
assert.equal(api.invitationState('?friend='+today).kind,'current');assert.equal(api.invitationState('?friend='+yesterday).kind,'expired');
for(const q of ['?friend='+tomorrow,'?friend=2026-02-31','?friend=%3Cscript%3E','?friend='+today+'&friend='+today])assert.equal(api.invitationState(q).kind,'invalid');
assert.equal(api.invitationState(''),null);api.renderInvitation();assert.equal(w.document.querySelector('[data-friend-invitation]').hidden,false);assert.match(w.document.querySelector('[data-friend-invitation]').textContent,/You’ve been challenged/);
const box=w.document.querySelector('main');api.mount(box,status);api.mount(box,status);assert.equal(box.querySelectorAll('button').length,1);
let copied='',sent=0;Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async text=>{copied=text;}},configurable:true});
w.addEventListener('brainilab:friendchallenge',()=>sent++);box.querySelector('button').click();assert.equal(w.document.querySelector('dialog').open,true);assert.equal(w.document.querySelector('[data-friend-share]').hidden,true);
w.document.querySelector('[data-friend-copy]').click();await new Promise(r=>setTimeout(r,0));assert.equal(copied,invite.text);assert.equal(sent,1);assert.match(w.document.querySelector('.friend-dialog [role="status"]').textContent,/Copied/);
w.document.querySelector('[data-friend-close]').click();assert.equal(w.document.activeElement,box.querySelector('button'));
api.open(status);w.document.querySelector('textarea').value='Hey Alex, your turn! '+invite.url;w.document.querySelector('[data-friend-copy]').click();await new Promise(r=>setTimeout(r,0));assert.equal(copied,'Hey Alex, your turn! '+invite.url);assert.equal(sent,2);
api.open(status);w.document.querySelector('textarea').value='   ';w.document.querySelector('[data-friend-copy]').click();assert.equal(sent,2);assert.match(w.document.querySelector('.friend-dialog [role="status"]').textContent,/Write your message/);
Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async()=>{throw Error('Denied');}}});api.open(status);w.document.querySelector('[data-friend-copy]').click();await new Promise(r=>setTimeout(r,0));assert.equal(sent,2);assert.match(w.document.querySelector('.friend-dialog [role="status"]').textContent,/Select and copy/);
Object.defineProperty(w.navigator,'share',{value:async()=>{const e=Error('Cancelled');e.name='AbortError';throw e;},configurable:true});api.open(status);w.document.querySelector('[data-friend-share]').click();await new Promise(r=>setTimeout(r,0));assert.equal(sent,2);
Object.defineProperty(w.navigator,'share',{value:async data=>{assert.ok(data.text.includes(invite.url));}});api.open(status);w.document.querySelector('[data-friend-share]').click();await new Promise(r=>setTimeout(r,0));assert.equal(sent,3);
w.eval(readFileSync('assets/js/post-game.js','utf8'));w.BrainiPostGame.mount(box,{result:{score:1800,correct:8,total:10,dailyNumber:32},status});assert.equal(box.querySelector('.post-share').textContent,'Challenge a friend');
w.BrainiPostGame.mount(box,{result:{score:1800,correct:8,total:10,practice:true},status});assert.equal(box.querySelector('.post-share').textContent,'Share result');
api.open(status);w.Date=class extends Date{constructor(...args){super(...(args.length?args:[Date.now()+86400000]));}};w.document.querySelector('[data-friend-copy]').click();await new Promise(r=>setTimeout(r,0));assert.equal(sent,3);assert.match(w.document.querySelector('.friend-dialog [role="status"]').textContent,/Daily has ended/);w.close();
// Analytics loads before the shell on production: arrival must not depend on the UI module.
for(const query of ['?friend='+today,'?friend='+yesterday,'?friend='+today+'&friend='+today,'?friend=PRIVATE@example.com']){
 const page=new JSDOM('<title>Daily</title>',{url:'https://brainilabgames.com/daily-quiz/'+query,runScripts:'outside-only'}),x=page.window;
 x.eval(analytics);x.dispatchEvent(new x.CustomEvent('brainilab:friendchallenge',{detail:{method:'copy'}}));assert.equal(x.dataLayer,undefined);
 x.BrainiSiteAnalytics.setConsent(true);x.dispatchEvent(new x.CustomEvent('brainilab:friendchallenge',{detail:{method:'copy',score:999,email:'PRIVATE@example.com'}}));x.dispatchEvent(new x.CustomEvent('brainilab:friendchallenge',{detail:{method:'unsafe'}}));
 const events=x.dataLayer.filter(e=>e[0]==='event');assert.equal(events.filter(e=>e[1]==='friend_challenge_open').length,query==='?friend='+today?1:0);assert.equal(events.filter(e=>e[1]==='friend_challenge_share').length,1);assert.ok(!JSON.stringify(x.dataLayer).includes('PRIVATE'));x.close();
}
console.log('PASS: same-day links, partial/full score wording, no answer/identity leakage, invalid/future/expired links, mount deduplication, accessible close focus, clipboard success/failure, midnight expiry and consent-gated analytics load order.');
