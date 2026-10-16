import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const source=readFileSync('assets/js/account-menu.js','utf8');
const flush=()=>new Promise(resolve=>setTimeout(resolve,0));
function page(auth={status:'guest'},path='/'){
 const dom=new JSDOM('<header class="topbar"><div class="nav"><nav class="links"><a href="/learn/">Learn</a></nav><div class="nav-right"><a class="avatar" href="/profile/">B</a></div></div></header>',{url:'https://brainilabgames.com'+path,runScripts:'outside-only'}),w=dom.window;
 w.currentAuth=auth;w.opened=[];w.loaded=0;
 const player={displayName:'Player',avatarUrl:null,level:1,xp:0,currentStreak:0,totalGames:0,totalQuestions:0};
 w.BrainiData={authState:()=>w.currentAuth,player:()=>player,api:{getAuthState:async()=>w.currentAuth,getPlayer:async()=>player,track(){}}};
 w.BrainiProgressUI={avatarImageMarkup:()=>'<svg aria-hidden="true"></svg>',defaultAvatarMarkup:()=>'<svg aria-hidden="true"></svg>',tier:()=>({name:'Rookie'}),avatarClass:()=> 'rank-fixture',xpProgress:()=>({level:1,percent:0,nextLevel:2,label:'Start with a game'})};
 w.BrainiPerf={ensureCloud:async()=>{w.loaded++;w.BrainiAuth={open:opts=>w.opened.push(opts)};return true;}};
 w.eval(source);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 return w;
}
let w=page(),d=w.document,button=d.querySelector('[data-header-signup]');
assert.ok(button);assert.equal(button.textContent,'Create free account');assert.equal(button.type,'button');
assert.equal(button.closest('.header-account-invite').hidden,false);assert.equal(w.loaded,0);assert.equal(w.opened.length,0);
for(let i=0;i<3;i++)w.BrainiAccountMenu.hydrate();
assert.equal(d.querySelectorAll('[data-header-signup]').length,1,'no duplicates after progress updates');
button.click();await flush();assert.equal(w.loaded,1);assert.equal(w.opened.length,1);
assert.equal(w.opened[0].mode,'signup');assert.equal(w.opened[0].source,'header');
w.currentAuth={status:'authenticated',user:{id:'test',is_anonymous:false}};
w.dispatchEvent(new w.Event('brainilab:authchange'));assert.equal(button.closest('.header-account-invite').hidden,true);
button.click();await flush();assert.equal(w.opened.length,1,'no signup for an existing signed-in account');
w.currentAuth={status:'guest'};w.dispatchEvent(new w.Event('brainilab:authchange'));assert.equal(button.closest('.header-account-invite').hidden,false);w.close();

for(const auth of [{status:'guest',guestUserId:'anonymous-fixture'},{status:'authenticated',user:{is_anonymous:true}}]){w=page(auth);assert.equal(w.document.querySelector('.header-account-invite').hidden,false);w.close();}
for(const auth of [{status:'authenticated',user:{is_anonymous:false}},{status:'loading'},{status:'unknown'}]){w=page(auth);assert.equal(w.document.querySelector('.header-account-invite').hidden,true);w.close();}
for(const path of ['/admin/','/auth/']){w=page({status:'guest'},path);assert.equal(w.document.querySelector('[data-header-signup]'),null);w.close();}

w=page();d=w.document;button=d.querySelector('[data-header-signup]');let finish;
w.BrainiPerf.ensureCloud=()=>{w.loaded++;return new Promise(resolve=>{finish=()=>{w.BrainiAuth={open:opts=>w.opened.push(opts)};resolve(true);};});};
button.click();button.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
assert.equal(w.loaded,1);assert.equal(button.disabled,true);assert.equal(button.textContent,'Opening…');
finish();await flush();assert.equal(w.opened.length,1);assert.equal(button.disabled,false);w.close();

w=page();d=w.document;button=d.querySelector('[data-header-signup]');
w.BrainiPerf.ensureCloud=async()=>false;button.click();await flush();
assert.equal(d.querySelector('[role="status"]').hidden,false);assert.match(d.querySelector('[role="status"]').textContent,/Please try again/);assert.equal(button.disabled,false);
w.BrainiPerf.ensureCloud=async()=>{w.BrainiAuth={open:opts=>w.opened.push(opts)};return true;};
button.click();await flush();assert.equal(w.opened.length,1);assert.equal(d.querySelector('[role="status"]').hidden,true);w.close();

w=page();button=w.document.querySelector('[data-header-signup]');
w.BrainiPerf.ensureCloud=()=>new Promise(resolve=>{finish=()=>{w.BrainiAuth={open:opts=>w.opened.push(opts)};resolve(true);};});
button.click();w.currentAuth={status:'authenticated',user:{is_anonymous:false}};w.dispatchEvent(new w.Event('brainilab:authchange'));finish();await flush();
assert.equal(w.opened.length,0);assert.equal(button.closest('.header-account-invite').hidden,true);w.close();

// Use the existing real modal, without submitting any account or email.
w=page();d=w.document;w.BrainiIcons={product:()=>''};w.BrainiBackendAuth={init:async()=>{},isConfigured:()=>true};
w.eval(readFileSync('assets/js/auth.js','utf8'));await flush();
button=d.querySelector('[data-header-signup]');button.focus();button.click();await flush();
assert.ok(d.querySelector('.auth-modal.show'));assert.ok(d.querySelector('[data-email-mode="signup"][aria-pressed="true"]'));
assert.equal(d.querySelectorAll('input[type=email]').length,1);assert.equal(d.querySelector('.auth-close'),d.activeElement);
assert.equal(d.querySelectorAll('input[type=checkbox]').length,0,'opening signup does not subscribe to a newsletter');
d.querySelector('.auth-close').click();assert.equal(d.activeElement,button,'focus returns to the header action');w.close();
console.log('PASS desktop account invitation: visible guests/anonymous players, hidden signed-in/loading states, explicit signup, deduplication, pending guard, offline retry, account switch, real modal and focus return.');
