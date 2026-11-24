import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

// Account visibility (Nov 2026): the home page invites guests to a free account under the hero, and the account menu
// shows pictograms and a clear sign-up box for guests. The invitation is dismissible and opens sign-up only on click.
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const read=p=>readFileSync(p,'utf8');
const flush=()=>new Promise(resolve=>setTimeout(resolve,0));
const home=read('index.html');
const invite=home.match(/<aside class="home-account-invite"[\s\S]*?<\/aside>/)?.[0];
assert.ok(invite,'the home page has the invitation markup');
assert.match(invite,/ hidden>/,'hidden until the script knows the visitor is a guest');
assert.match(invite,/data-home-account-dismiss aria-label="Not now"/,'it can be dismissed');
assert.ok(home.indexOf('<!-- home-facts:end -->')<home.indexOf('home-account-invite'),'outside the Worker-filled facts markers');

function page(auth={status:'guest'},storage={}){
  const dom=new JSDOM(`<header class="topbar"><div class="nav"><nav class="links"></nav><div class="nav-right"><a class="avatar" href="/profile/">B</a></div></div></header><main><a class="home-hero-primary" href="/daily-quiz/">Play</a>${invite}</main>`,{url:'https://brainilabgames.com/',runScripts:'outside-only'}),w=dom.window;
  for(const [k,v] of Object.entries(storage))w.localStorage.setItem(k,v);
  w.currentAuth=auth;w.opened=[];
  const player={displayName:'Player',avatarUrl:null,level:1,xp:240,currentStreak:0,totalGames:0,totalQuestions:0};
  w.BrainiData={authState:()=>w.currentAuth,player:()=>player,api:{track(){}}};
  for(const name of ['player-personalities','avatar-design','progression-ui'])w.eval(read('assets/js/'+name+'.js'));
  w.BrainiPerf={ensureCloud:async()=>{w.BrainiAuth={open:opts=>w.opened.push(opts)};return true;}};
  w.eval(read('assets/js/account-menu.js'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  return w;
}

// Guests see it; sign-up opens only after the click, with its own source.
let w=page(),d=w.document,box=d.querySelector('[data-home-account-invite]');
assert.equal(box.hidden,false,'guests see the invitation');
assert.equal(w.opened.length,0,'nothing opens by itself');
d.querySelector('[data-home-account-join]').click();await flush();await flush();
assert.equal(JSON.stringify(w.opened),JSON.stringify([{source:'home_invite',mode:'signup'}]));

// Signed-in players, loading states and anonymous sessions.
for(const [auth,hidden] of [[{status:'authenticated',user:{is_anonymous:false}},true],[{status:'loading'},true],[{status:'authenticated',user:{is_anonymous:true}},false]]){
  w=page(auth);assert.equal(w.document.querySelector('[data-home-account-invite]').hidden,hidden,JSON.stringify(auth));
}
// Signing in hides it straight away.
w=page();w.currentAuth={status:'authenticated',user:{is_anonymous:false}};w.dispatchEvent(new w.Event('brainilab:authchange'));
assert.equal(w.document.querySelector('[data-home-account-invite]').hidden,true);

// Dismissal hides it, moves focus somewhere sensible and lasts 30 days.
w=page();d=w.document;
d.querySelector('[data-home-account-dismiss]').click();
assert.equal(d.querySelector('[data-home-account-invite]').hidden,true);
assert.equal(d.activeElement,d.querySelector('.home-hero-primary'));
const stamp=w.localStorage.getItem('brainilab:home-account-invite-dismissed');assert.ok(Number(stamp)>0);
w.dispatchEvent(new w.Event('brainilab:datachange'));assert.equal(d.querySelector('[data-home-account-invite]').hidden,true,'stays hidden on refresh');
w=page({status:'guest'},{'brainilab:home-account-invite-dismissed':String(Date.now()-5*864e5)});
assert.equal(w.document.querySelector('[data-home-account-invite]').hidden,true,'still dismissed after 5 days');
w=page({status:'guest'},{'brainilab:home-account-invite-dismissed':String(Date.now()-31*864e5)});
assert.equal(w.document.querySelector('[data-home-account-invite]').hidden,false,'back after 30 days');

// Account menu: pictograms on every row, a sign-up box for guests with the primary choice first.
w=page();d=w.document;d.querySelector('.avatar').click();
let menu=d.querySelector('.account-popover');
assert.ok(menu);
assert.equal(menu.querySelectorAll('.account-popover-row .account-row-icon svg[aria-hidden]').length,0,'icons are hidden through their wrapper');
assert.ok([...menu.querySelectorAll('a.account-popover-row')].every(row=>row.querySelector(':scope>.account-row-icon[aria-hidden="true"]')),'every link row has a pictogram');
const auth=menu.querySelectorAll('.account-popover-authbox .account-popover-authbtn');
assert.ok(auth[0].matches('[data-account-signup]')&&auth[1].matches('[data-account-login]'),'sign-up first, log-in second');
assert.match(menu.querySelector('.account-popover-pitch').textContent,/free account/i);
assert.match(menu.querySelector('.account-progress-link').textContent,/240 XP/);
w.BrainiAccountMenu.close();
w.currentAuth={status:'authenticated',user:{is_anonymous:false}};
w.BrainiAccountMenu.openFor(d.querySelector('.avatar'));menu=d.querySelector('.account-popover');
assert.ok(menu.querySelector('[data-account-signout] .account-row-icon'),'sign out has its own pictogram');
assert.equal(menu.querySelector('.account-popover-authbox'),null);

// Styles.
const css=read('assets/css/visual-system.css').replace(/\r\n/g,'\n');
const menuCss=css.slice(css.indexOf('/* ===== Account menu (24 Nov 2026)'));
assert.ok(menuCss.length>500);
assert.match(menuCss,/body\.home-page\.braini-visual \.home-account-invite\[hidden\]\{display:none\}/,'the hidden attribute wins over display:flex');
const motion=menuCss.indexOf('@media(prefers-reduced-motion:no-preference)');
assert.ok(motion>0);assert.equal(menuCss.slice(0,motion).includes('animation'),false,'menu motion only when allowed');
assert.doesNotMatch(menuCss,/font:[^;]*inherit/,'no font shorthand with inherit (it drops the whole declaration)');
for(const bundle of ['assets/js/shell.bundle.js','assets/js/home-shell.bundle.js'])assert.match(read(bundle),/function hydrateHomeInvite\(\)/,bundle);
console.log('Account visibility checks passed');
