import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const {JSDOM}=await import(process.env.JSDOM_MODULE?pathToFileURL(process.env.JSDOM_MODULE).href:'jsdom');
const source=readFileSync(new URL('../assets/js/meta-pixel.js',import.meta.url),'utf8');
const key='brainilab_marketing_consent_v1';
let count=0;
function check(name,fn){fn();console.log('PASS '+name);count++;}
function page({url='https://brainilabgames.com/games/brain-mix/',saved}={}){
 const dom=new JSDOM('<!doctype html><head></head><body><a data-manage-privacy href="/cookies/">Manage privacy</a></body>',{url,runScripts:'outside-only'});
 const w=dom.window;if(saved!==undefined)w.localStorage.setItem(key,JSON.stringify(saved));
 w.eval(source);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 return w;
}
const queue=w=>Array.from(w.fbq?.queue||[],a=>Array.from(a));
const choose=(w,allow)=>w.document.querySelector(allow?'[data-marketing-accept]':'[data-marketing-reject]').click();
const game=(w,extra={})=>w.dispatchEvent(new w.CustomEvent('brainilab:datachange',{detail:{type:'game_result',gameId:'brainmix',result:{clientResultId:'r1',dailyNumber:12,email:'private@example.com',score:999,...extra}}}));
let w=page();
check('no SDK, pixel global or event before consent',()=>{assert.equal(w.fbq,undefined);assert.equal(w.document.scripts.length,0);assert.ok(w.document.querySelector('[data-marketing-reject]'));});
game(w);choose(w,false);
check('rejection persists and does not load Meta',()=>{assert.equal(JSON.parse(w.localStorage.getItem(key)).allowed,false);assert.equal(w.fbq,undefined);});
w.document.querySelector('[data-manage-privacy]').click();choose(w,true);
check('acceptance loads one SDK and one PageView with correct pixel',()=>{assert.equal(w.document.scripts.length,1);assert.equal(w.document.scripts[0].src,'https://connect.facebook.net/en_US/fbevents.js');assert.deepEqual(queue(w).find(a=>a[0]==='trackSingle'),['trackSingle','2674204419702933','PageView']);});
check('advanced matching omitted and automatic events disabled',()=>{assert.deepEqual(queue(w).find(a=>a[0]==='init'),['init','2674204419702933']);assert.ok(queue(w).some(a=>a[0]==='set'&&a[1]==='autoConfig'&&a[2]===false));});
game(w);game(w);
check('one GameCompleted with only allowlisted game parameters',()=>{const events=queue(w).filter(a=>a[0]==='trackSingleCustom');assert.equal(events.length,1);assert.equal(events[0][2],'GameCompleted');assert.equal(JSON.stringify(events[0][3]),JSON.stringify({game_id:'brainmix',mode:'daily'}));});
game(w,{clientResultId:'practice',practice:true});game(w,{clientResultId:'try',tryFirst:true});game(w,{clientResultId:'replay',dailyReplayBlocked:true});
check('practice and duplicate Daily attempts excluded',()=>assert.equal(queue(w).filter(a=>a[0]==='trackSingleCustom').length,1));
w.BrainiMarketing.showPreferences();choose(w,true);
check('repeated acceptance does not duplicate PageView or SDK',()=>{assert.equal(queue(w).filter(a=>a[0]==='trackSingle').length,1);assert.equal(w.document.scripts.length,1);});
w.document.cookie='_fbp=test;path=/';w.BrainiMarketing.showPreferences();choose(w,false);
check('revoking pending SDK clears queued events and Meta cookie',()=>{assert.equal(queue(w).filter(a=>/^track/.test(a[0])).length,0);assert.ok(!w.document.cookie.includes('_fbp'));assert.deepEqual(queue(w).at(-1),['consent','revoke']);});
game(w,{clientResultId:'after-revoke'});
check('no events after withdrawal',()=>assert.equal(queue(w).filter(a=>/^track/.test(a[0])).length,0));w.close();
w=page({saved:{allowed:true,at:Date.now()}});
check('returning visitor consent loads pixel without prompting',()=>{assert.ok(w.fbq);assert.equal(w.document.querySelector('.marketing-consent'),null);});
const calls=[];w.fbq.callMethod=(...args)=>calls.push(args);
w.localStorage.setItem(key,JSON.stringify({allowed:false,at:Date.now()}));w.dispatchEvent(new w.StorageEvent('storage',{key}));game(w);
check('another tab revoking consent stops loaded SDK events',()=>assert.deepEqual(calls,[['consent','revoke']]));w.close();
for(const url of ['http://localhost:8000/','https://brainilab-web.orisarda9.workers.dev/','https://brainilabgames.com/admin/','https://brainilabgames.com/auth/reset-password/','https://brainilabgames.com/profile/?code=secret','https://brainilabgames.com/profile/#access_token=secret']){
 w=page({url,saved:{allowed:true,at:Date.now()}});check('no tracking on '+new URL(url).pathname+' / '+new URL(url).hostname,()=>assert.equal(w.fbq,undefined));w.close();
}
w=page({saved:{allowed:true,at:Date.now()-181*86400000}});check('expired consent requires a fresh choice',()=>{assert.equal(w.fbq,undefined);assert.ok(w.document.querySelector('.marketing-consent'));});w.close();
console.log(`${count} Meta Pixel checks passed.`);
