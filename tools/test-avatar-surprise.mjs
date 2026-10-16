import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const dom=new JSDOM('',{url:'https://brainilabgames.com/profile/',runScripts:'outside-only'}),w=dom.window;
let writes=0;
const player=Object.freeze({xp:800,level:7,score:1234,avatarDesign:Object.freeze({skin:'cocoa',frame:'green',title:'curious'})});
w.BrainiData=new Proxy({},{get(){throw Error('Surprise must not read or change player state');}});
w.Storage.prototype.setItem=function(){writes++;};
w.fetch=()=>{throw Error('Surprise must not make a request');};
for(const file of ['avatar-design','profile-rewards-model'])w.eval(readFileSync('assets/js/'+file+'.js','utf8'));
const C=w.BrainiRewardCatalog,A=w.BrainiAvatarDesign,plain=value=>JSON.parse(JSON.stringify(value));
const randomKinds=['hair','hairColor','shirt','background','glasses','hat','prop'];
const source=Object.freeze({...C.clean(player.avatarDesign),mode:'picture'}),before=plain({player,source});
let calls=0;
const rolls=[.125,.2,.4,.6,.64,.65,.999];
const result=C.surprise(source,player.xp,()=>rolls[calls++]);
assert.equal(calls,7,'one deterministic draw per randomized category');
assert.deepEqual(plain(result),{...plain(source),mode:'built',hair:'curls',hairColor:'black',shirt:'orange',background:'sunshine',glasses:'none',hat:'beanie',prop:'icepop'});
assert.notEqual(result,source);assert.equal(result.skin,'cocoa');assert.equal(result.frame,'green');assert.equal(result.title,'curious');
assert.deepEqual(plain({player,source}),before,'input and player identity, XP and score are unchanged');

// Every cosmetic boundary uses the existing catalog, including malformed earned XP.
const boundaries=[...new Set([0,...Object.values(C.groups).flatMap(list=>list.flatMap(item=>item.xp?[item.xp-1,item.xp]:[]))])];
const rich=Object.freeze({...C.clean(),mode:'built',skin:'ebony',frame:'orbit',title:'sage',hair:'braids',hairColor:'silver',shirt:'berry',background:'coral',glasses:'doughnut',hat:'graduate',prop:'book'});
const richBefore=plain(rich);
for(const earned of [...boundaries,-1,Infinity,NaN,'150.9'])for(const roll of [0,.49,.649,.65,.8,.999999,1]){
 const current=C.available(rich,earned),draft=C.surprise(rich,earned,()=>roll);
 assert.deepEqual(plain(C.available(draft,earned)),plain(draft),'no combination contains a locked option');
 for(const kind of ['skin','frame','title'])assert.equal(draft[kind],current[kind],kind+' preserves its available current choice');
 assert.equal(draft.mode,'built');assert.notEqual(draft,rich);
 assert.ok(randomKinds.some(kind=>draft[kind]!==current[kind]),'each draft changes at least one illustrated appearance choice');
 assert.notEqual(A.markup(draft,C.xp(earned)),A.markup(current,C.xp(earned)),'the changed draft renders visibly different');
 assert.deepEqual(plain(C.surprise(rich,earned,()=>roll)),plain(draft),'injected draws are reproducible');
}
assert.deepEqual(plain(rich),richBefore);
for(const kind of ['glasses','hat','prop'])for(const item of C.groups[kind].filter(item=>item.xp)){
 assert.notEqual(C.surprise(source,item.xp-1,()=>.999999)[kind],item.id);
 assert.equal(C.surprise(source,item.xp,()=>.999999)[kind],item.id,'new extras become drawable at their exact existing XP threshold');
}

// Empty extras are more likely than all decorated choices combined.
for(const kind of ['glasses','hat','prop']){
 let empty=0;
 for(let i=0;i<20;i++)if(C.surprise(source,10000,()=>(i+.5)/20)[kind]==='none')empty++;
 assert.ok(empty>10&&empty<20,'extras favor none while keeping unlocked accessories discoverable');
}

// An otherwise identical draw falls back to a different unlocked hairstyle.
const simple=Object.freeze(C.available({mode:'built',skin:'umber'},0));
const fallback=C.surprise(simple,0,()=>0);
assert.equal(fallback.hair,'curls');assert.equal(fallback.skin,'umber');
for(const kind of Object.keys(C.groups).filter(kind=>kind!=='hair'))assert.equal(fallback[kind],simple[kind]);
assert.notEqual(A.markup(fallback,0),A.markup(simple,0));
let defaults=0;w.Math.random=()=>{defaults++;return .999999;};
assert.equal(C.surprise(null,0).mode,'built');assert.equal(defaults,7,'the optional source defaults to Math.random');
assert.deepEqual(plain({player,source}),before);assert.equal(writes,0,'pure draft generation never saves or writes storage');
dom.window.close();
console.log('PASS deterministic surprise drafts, existing XP boundaries, unlocked-only combinations, preserved skin/frame/title, weighted optional extras, visible fallback changes and no player/input/storage mutation.');
