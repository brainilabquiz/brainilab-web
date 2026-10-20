import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const sourceRoot=process.env.AVATAR_SOURCE_ROOT||'.';
const source=file=>readFileSync(path.join(sourceRoot,'assets/js',file),'utf8');
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
const dom=new JSDOM('<header class="topbar"><div class="nav"><nav class="links"></nav><div class="nav-right"><a class="avatar" href="/profile/">B</a></div></div></header><div data-profile-rank-hero><span class="rank-avatar"></span><div class="profile-rank-main"><h2>Level 12</h2></div></div><span data-profile-account-avatar></span><section data-profile-rewards></section>',{url:'https://brainilabgames.com/profile/',runScripts:'outside-only'});
const w=dom.window,d=w.document;
let player={id:'owner-a',displayName:'Player A',avatarUrl:'https://example.com/photo-a.png',level:12,xp:2700,score:1234};
let auth={status:'authenticated',user:{id:'owner-a',is_anonymous:false}};
w.BrainiData={player:()=>player,authState:()=>auth,api:{getAuthState:async()=>auth,getPlayer:async()=>player}};
w.BrainiBackendAuth={init:async()=>{},isConfigured:()=>false};
for(const file of ['player-personalities.js','avatar-design.js','progression-ui.js','account-menu.js','profile-rewards-model.js','avatar-studio-ui.js'])w.eval(source(file));
let style=w.BrainiRewardCatalog.clean({});
w.BrainiRewardStore={snapshot:()=>({owner:auth.user?.id||'guest',style,cloud:auth.status==='authenticated',loading:false,saving:false,error:'',notice:''}),load:async()=>{}};
w.eval(source('profile-rewards.js'));
w.eval(source('auth.js'));
await tick();
const portraits=[d.querySelector('.avatar'),d.querySelector('[data-profile-rank-hero] .rank-avatar'),d.querySelector('[data-profile-account-avatar]'),d.querySelector('[data-style-preview-avatar]'),d.querySelector('[data-avatar-mini]')];
const initial=portraits.map(el=>el.firstChild),unchangedPlayer=JSON.stringify(player);
const studio=d.querySelector('[data-profile-rewards]'),choiceChanges=[];
const choicesObserver=new w.MutationObserver(records=>choiceChanges.push(...records));
for(const el of studio.querySelectorAll('.reward-grid,.avatar-academy-grid,.avatar-challenge-grid'))choicesObserver.observe(el,{childList:true,attributes:true,subtree:true});
const originalChoices=studio.querySelectorAll('[data-reward-kind]').length;
const changes=[];
const observer=new w.MutationObserver(records=>changes.push(...records.filter(record=>portraits.includes(record.target))));
for(const el of portraits)observer.observe(el,{childList:true});
for(let repeat=0;repeat<3;repeat++){
 for(const name of ['datachange','profilechange','progressionchange','authchange'])w.dispatchEvent(new w.CustomEvent('brainilab:'+name));
 w.BrainiProfileRewards.render();
}
await tick();
const repeatedReplacements=changes.length;
console.log(JSON.stringify({repeatedEvents:12,profileRenders:3,portraitReplacements:repeatedReplacements,retainedPortraits:portraits.filter((el,i)=>el.firstChild===initial[i]).length}));
if(process.argv.includes('--measure-only')){observer.disconnect();w.close();process.exit(0);}
assert.equal(repeatedReplacements,0,'unchanged startup/cloud events retain all decoded portraits');
assert.equal(JSON.stringify(player),unchangedPlayer,'rendering cannot mutate XP, level or score');
assert.equal(choiceChanges.length,0,'identical cloud/profile events do not rebuild or relabel expanded choice grids');
assert.equal(studio.querySelectorAll('[data-reward-kind]').length,originalChoices,'no catalogue option is hidden or removed to improve performance');
choicesObserver.disconnect();
observer.disconnect();

// A failed remote photo must not be retried by every progress/style event.
const photo=portraits[0].firstChild;
photo.dispatchEvent(new w.Event('error'));
assert.ok(photo.classList.contains('default-player-avatar'));
const fallback=photo.src;
w.dispatchEvent(new w.CustomEvent('brainilab:datachange'));
w.dispatchEvent(new w.CustomEvent('brainilab:profilechange'));
w.dispatchEvent(new w.CustomEvent('brainilab:progressionchange'));
w.BrainiProfileRewards.render();
await tick();
assert.equal(portraits[0].firstChild,photo);
assert.equal(photo.src,fallback,'the working fallback remains in place');

// An actual photo change replaces the portrait, unlike an XP/ring-only update.
player={...player,avatarUrl:'https://example.com/photo-b.png'};
w.dispatchEvent(new w.CustomEvent('brainilab:profilechange'));
w.BrainiProfileRewards.render();
await tick();
const changed=portraits[0].firstChild;
assert.notEqual(changed,photo);assert.equal(changed.src,player.avatarUrl);
player={...player,xp:2880,level:13};
w.dispatchEvent(new w.CustomEvent('brainilab:progressionchange'));
assert.equal(portraits[0].firstChild,changed,'XP decoration does not reload the same photo');
assert.equal(portraits[0].classList.contains('rank-step-4'),false,'old ring classes are removed');
assert.equal(portraits[0].classList.contains('rank-step-6'),true,'the new level ring still updates');
await tick();
assert.equal(portraits[0].firstChild,changed,'the async auth renderer retains the same decoded photo');
assert.equal(portraits[0].title,'Player A · account & stats','preserve the existing async auth tooltip');

// Equipped choices still update immediately and produce stable SVG nodes.
style=w.BrainiRewardCatalog.clean({mode:'built',glasses:'sun',prop:'icepop',frame:'copper'});
player={...player,avatarDesign:style};
w.dispatchEvent(new w.CustomEvent('brainilab:stylechange'));
const built=portraits.map(el=>el.firstChild);
assert.ok(built.every(el=>el.tagName.toLowerCase()==='svg'));
assert.equal(portraits[0].dataset.profileFrame,'copper');
w.dispatchEvent(new w.CustomEvent('brainilab:datachange'));
w.BrainiProfileRewards.render();
await tick();
assert.ok(portraits.every((el,i)=>el.firstChild===built[i]),'saved custom artwork remains stable across both renderers');

// Account switch/logout must replace the previous person's artwork immediately.
auth={status:'authenticated',user:{id:'owner-b',is_anonymous:false}};
style=w.BrainiRewardCatalog.clean({});
player={id:'owner-b',displayName:'Player B',avatarUrl:null,level:1,xp:0,score:0};
w.dispatchEvent(new w.CustomEvent('brainilab:authchange'));
w.BrainiProfileRewards.render();
await tick();
assert.equal(portraits[0].querySelector('svg'),null);assert.match(portraits[0].title,/Player B/);
auth={status:'guest',guestUserId:'guest-c'};
player={...player,id:'guest-c',displayName:'Guest C',avatarUrl:'https://example.com/photo-c.png'};
w.dispatchEvent(new w.CustomEvent('brainilab:authchange'));
w.BrainiProfileRewards.render();
await tick();
assert.equal(portraits[0].firstChild.src,player.avatarUrl);assert.match(portraits[0].title,/Guest C/);

// Restore an externally replaced/cleared container rather than trusting the cache.
portraits[0].replaceChildren();w.BrainiAccountMenu.hydrate();
assert.equal(portraits[0].firstChild.src,player.avatarUrl);
const existing=portraits[0].firstChild;
w.BrainiAccountMenu.hydrate();assert.equal(portraits[0].firstChild,existing);
w.close();
console.log('PASS stable photo/SVG rendering, image fallback, XP decoration, saved styles, account switch/logout, external replacement recovery and unchanged player values.');
