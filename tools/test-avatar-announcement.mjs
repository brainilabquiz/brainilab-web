import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {pathToFileURL} from 'node:url';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const source=readFileSync('assets/js/avatar-announcement.js','utf8'),tick=()=>new Promise(r=>setTimeout(r,0)),fixtures=[];
async function make({path='/',signed=false,seen=null,storage=true,overlay=null}={}){
 const dom=new JSDOM('<div class="nav-right"><a class="avatar" href="/profile/">Profile</a></div><button id="keep">Keep browsing</button>',{url:'https://brainilabgames.com'+path,runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 fixtures.push(dom);let logged=signed,opens=[],timers=[],fail=false;
 w.HTMLElement.prototype.getClientRects=function(){return this.hidden||w.getComputedStyle(this).display==='none'?[]:[{width:100,height:50}];};
 w.BrainiData={authState:()=>({status:logged?'authenticated':'guest'})};
 w.BrainiAuth={open:options=>opens.push(options)};w.BrainiPerf={ensureCloud:async()=>{if(fail)throw Error('offline');}};
 w.setTimeout=(fn,ms)=>{timers.push({fn,ms,cleared:false});return timers.length;};w.clearTimeout=id=>{if(timers[id-1])timers[id-1].cleared=true;};
 if(seen!==null)w.localStorage.setItem('brainilab_avatar_announcement_seen_v1',seen);
 if(!storage)Object.defineProperty(w,'localStorage',{get(){throw Error('blocked');}});
 if(overlay){const el=w.document.createElement('aside');el.className=overlay;w.document.body.append(el);}
 w.eval(readFileSync('assets/js/avatar-design.js','utf8'));w.eval(source);await tick();
 return {w,opens,timers,run(){const task=timers.find(t=>!t.cleared);if(task){task.cleared=true;task.fn();}},setSigned(value){logged=value;w.dispatchEvent(new w.Event('brainilab:authchange'));},fail(value){fail=value;}};
}
const guest=await make();assert.equal(guest.w.document.querySelector('.avatar-announcement'),null);assert.equal(guest.timers[0].ms,15000);
guest.w.document.querySelector('#keep').focus();guest.run();const card=guest.w.document.querySelector('.avatar-announcement');
assert.ok(card);assert.equal(guest.w.document.activeElement.id,'keep','no automatic focus theft');assert.match(card.textContent,/free account.*XP/s);
assert.ok(guest.w.localStorage.getItem('brainilab_avatar_announcement_seen_v1'));
card.querySelector('[data-avatar-join]').click();await tick();assert.equal(guest.opens.length,1);assert.equal(guest.opens[0].mode,'signup');assert.equal(guest.opens[0].source,'avatar_announcement');assert.equal(guest.w.document.querySelector('.avatar-announcement'),null);
const now=Date.now();for(const age of [0,86400000,29*86400000,-86400000]){const recent=await make({seen:String(now-age)});recent.run();assert.equal(recent.w.document.querySelector('.avatar-announcement'),null);}
const expired=await make({seen:String(now-31*86400000)});expired.run();assert.ok(expired.w.document.querySelector('.avatar-announcement'));expired.w.document.querySelector('.avatar-announcement-close').focus();expired.w.document.dispatchEvent(new expired.w.KeyboardEvent('keydown',{key:'Escape'}));assert.equal(expired.w.document.querySelector('.avatar-announcement'),null);assert.ok(expired.w.document.activeElement.matches('.nav-right .avatar'));
for(const path of ['/games/number-route/','/brainiword/','/learn/why-is-the-sky-blue/','/profile/','/editor/']){const page=await make({path});page.run();assert.equal(page.w.document.querySelector('.avatar-announcement'),null);assert.equal(page.timers.length,0,'no timer during play, reading or profile editing');}
for(const options of [{signed:true},{storage:false}]){const page=await make(options);page.run();assert.equal(page.w.document.querySelector('.avatar-announcement'),null);}
const cookies=await make({overlay:'marketing-consent'});cookies.run();assert.equal(cookies.w.document.querySelector('.avatar-announcement'),null);assert.equal(cookies.w.localStorage.getItem('brainilab_avatar_announcement_seen_v1'),null);
cookies.w.document.querySelector('.marketing-consent').remove();cookies.w.dispatchEvent(new cookies.w.Event('brainilab:statistics-consent'));cookies.run();assert.ok(cookies.w.document.querySelector('.avatar-announcement'));
const login=await make();login.run();login.setSigned(true);assert.equal(login.w.document.querySelector('.avatar-announcement'),null);
const otherTab=await make();otherTab.run();otherTab.w.dispatchEvent(new otherTab.w.StorageEvent('storage',{key:'brainilab_avatar_announcement_seen_v1',newValue:String(Date.now())}));assert.equal(otherTab.w.document.querySelector('.avatar-announcement'),null);
const modal=await make();modal.run();const dialog=modal.w.document.createElement('div');dialog.className='quiz-modal show';modal.w.document.body.append(dialog);modal.w.document.body.click();await tick();assert.equal(modal.w.document.querySelector('.avatar-announcement'),null,'opening a game removes the invitation');
const retry=await make();retry.run();retry.w.BrainiAuth=null;retry.fail(true);retry.w.document.querySelector('[data-avatar-join]').click();await tick();assert.match(retry.w.document.querySelector('[data-avatar-invite-error]').textContent,/could not open/);assert.equal(retry.w.document.querySelector('[data-avatar-join]').disabled,false);
retry.w.BrainiAuth={open:options=>retry.opens.push(options)};retry.w.document.querySelector('[data-avatar-join]').click();await tick();assert.equal(retry.opens.length,1);
for(const dom of fixtures)dom.window.close();
console.log('PASS delayed guest invitation, no focus theft, 30-day dismissal/cross-tab frequency, excluded play/reading/profile routes, cookies/modal priority, auth hide, storage failure, signup and retry.');
