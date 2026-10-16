import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {pathToFileURL} from 'node:url';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href),tick=()=>new Promise(r=>setTimeout(r,0));
const dom=new JSDOM('<section data-profile-rewards></section>',{url:'https://brainilabgames.com/profile/',runScripts:'outside-only'}),w=dom.window;
let player={displayName:'Sample player',level:999,xp:0,score:1234},style={},writes=0;
w.BrainiData={player:()=>structuredClone(player),authState:()=>({status:'guest'})};
for(const file of ['player-personalities','avatar-design','progression-ui','profile-rewards-model','avatar-studio-ui'])w.eval(readFileSync('assets/js/'+file+'.js','utf8'));
const C=w.BrainiRewardCatalog,A=w.BrainiAvatarDesign;
w.BrainiRewardStore={snapshot:()=>({owner:'sample',style:C.available(style,player.xp),cloud:false}),load:async()=>{},save:async()=>{writes++;return false;}};
w.eval(readFileSync('assets/js/profile-rewards.js','utf8'));await tick();
const root=w.document.querySelector('[data-profile-rewards]');
const items=[['glasses','monocle',2250],['glasses','doughnut',6500],['hat','corn',2200],['hat','wave',5500],['prop','train',3200],['prop','roll',7500]];
for(const [kind,id,xp]of items){
 assert.equal(C.groups[kind].find(x=>x.id===id).xp,xp);assert.equal(C.available({[kind]:id},xp-1)[kind],'none');assert.equal(C.available({[kind]:id},xp)[kind],id);
 assert.equal(A.markup({[kind]:id},xp-1),A.markup({},xp-1));assert.notEqual(A.markup({[kind]:id},xp),A.markup({},xp));
 const svg=A.markup({[kind]:id},xp),parsed=new w.DOMParser().parseFromString(svg,'image/svg+xml');assert.equal(parsed.querySelector('parsererror'),null);assert.doesNotMatch(svg,/<script|<image|\bhref=|\bon\w+=/i);
}
assert.equal(C.next(3015).id,'train');assert.equal(C.next(10000),null);
root.querySelector('[data-avatar-tab=extras]').click();
const extras=root.querySelector('[data-avatar-pane=extras]');assert.equal(extras.querySelectorAll('fieldset').length,3);assert.equal(extras.querySelectorAll('details').length,0,'all extra categories remain expanded');
player.xp=10000;w.BrainiProfileRewards.render();root.querySelector('[data-reward-kind=hat][data-reward-id=corn]').click();assert.match(root.querySelector('[data-avatar-note=hat]').textContent,/A-maize-ing/);assert.equal(writes,0);
root.querySelector('[data-style-cancel]').click();assert.equal(root.querySelector('[data-reward-kind=hat][data-reward-id=none]').getAttribute('aria-pressed'),'true');
for(const [level,key]of [[1,'rookie'],[5,'elementary'],[10,'highschool'],[15,'college'],[20,'graduate'],[25,'phd'],[30,'researcher'],[40,'professor'],[50,'dean'],[60,'nobel']]){
 player.xp=20*(level-1)**2;const before=JSON.stringify(player);w.BrainiProfileRewards.render();assert.equal(root.querySelector('[data-diploma-tier]').dataset.diplomaTier,key,'diploma derives from XP, never a supplied level');assert.match(root.querySelector('[data-avatar-level]').textContent,new RegExp('Level '+level+' ·'));assert.equal(JSON.stringify(player),before);
 if(level>1){player.xp--;w.BrainiProfileRewards.render();assert.notEqual(root.querySelector('[data-diploma-tier]').dataset.diplomaTier,key,'upgrade boundary is exact');}
}
assert.equal(root.querySelectorAll('[data-diploma-tier]').length,1);assert.equal(writes,0,'all diploma upgrades are automatic presentation only');
dom.window.close();console.log('PASS six original SVG unlocks, exact XP boundaries, safe art, expanded extra categories, cancel, and ten automatic diploma tiers with no score/XP/metadata writes.');
