import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const sourceRoot=process.env.AVATAR_SOURCE_ROOT||'.';
const context={window:{}};
vm.runInNewContext(readFileSync(path.join(sourceRoot,'assets/js/profile-achievements-model.js'),'utf8'),context);
const C=context.window.BrainiAchievementCatalog;
const plain=value=>JSON.parse(JSON.stringify(value));
const zero=()=>({totalGames:0,personalBestGames:0,bestStreak:0,fullDailyCount:0});
const expectedMaterials=['Paper','Bronze','Silver','Gold','Platinum','Diamond','Titanium','Emerald','Obsidian','Prismatic'];
const expected={
 first_game:{metric:'totalGames',initial:1,values:[1,3,7,15,30,55,95,155,245,375]},
 ten_games:{metric:'totalGames',initial:10,values:[10,20,40,75,135,230,375,590,900,1350]},
 fifty_games:{metric:'totalGames',initial:50,values:[50,100,175,300,500,800,1250,1900,2800,4000]},
 personal_bests_three:{metric:'totalGames',initial:3,values:[0,10,25,55,110,210,385,680,1150,1900],variety:[3,3,4,4,5,5,6,6,7,8]},
 daily_first:{metric:'fullDailyCount',initial:1,values:[1,3,7,15,30,55,95,155,245,375]},
 daily_seven:{metric:'fullDailyCount',initial:7,values:[7,14,28,50,85,140,225,355,550,840]},
 streak_three:{metric:'bestStreak',initial:3,values:[3,5,9,16,28,47,77,122,187,277]},
 streak_seven:{metric:'bestStreak',initial:7,values:[7,10,16,26,42,67,105,160,240,350]}
};
assert.equal(C.metadataKey,'brainilab_featured_achievements_v1');
assert.deepEqual(plain(C.materials.map(item=>item.name)),expectedMaterials);
assert.deepEqual(plain(C.badges.map(item=>item.id)),Object.keys(expected));
let boundaries=0;
for(const badge of C.badges){
 const approved=expected[badge.id];assert.equal(badge.target,approved.initial,'first-tier target compatibility');
 assert.equal(badge.tiers.length,10);assert.ok(Object.isFrozen(badge.tiers));
 assert.deepEqual(plain(badge.tiers.map(t=>t.requirements[approved.metric])),approved.values,'approved threshold table');
 if(approved.variety)assert.deepEqual(plain(badge.tiers.map(t=>t.requirements.personalBestGames)),approved.variety);
 for(let i=1;i<10;i++){
  assert.ok(approved.values[i]>approved.values[i-1]);
  if(i>1)assert.ok(approved.values[i]-approved.values[i-1]>approved.values[i-1]-approved.values[i-2],'each later tier demands a larger additional effort');
 }
 for(const tier of badge.tiers){
  assert.ok(Object.isFrozen(tier));assert.ok(Object.isFrozen(tier.requirements));
  const metrics={...zero(),...tier.requirements},before=JSON.stringify(metrics),state=C.state(badge.id,metrics);
  assert.equal(state.available,true);assert.equal(state.level,tier.level);assert.equal(state.current.material,expectedMaterials[tier.level-1]);
  assert.equal(state.current.key,expectedMaterials[tier.level-1].toLowerCase());
  assert.equal(state.next?.level??null,tier.level===10?null:tier.level+1);
  assert.equal(JSON.stringify(metrics),before,'tier evaluation never mutates metrics');
  for(const [metric,target] of Object.entries(tier.requirements))if(target>0){
   assert.ok(C.state(badge.id,{...metrics,[metric]:target-1}).level<tier.level,'every required threshold matters independently');boundaries++;
  }
  const goal=state.next||state.current;
  assert.deepEqual(plain(state.progress.conditions.map(({metric,target})=>({metric,target}))),Object.entries(goal.requirements).map(([metric,target])=>({metric,target})));
  assert.ok(state.progress.ratio>=0&&state.progress.ratio<=1);
  if(tier.level===10){assert.equal(state.progress.ratio,1);assert.ok(state.progress.conditions.every(c=>c.met));}
 }
 assert.equal(C.state(badge.id,zero()).level,0);assert.equal(C.state(badge.id,zero()).current,null);assert.equal(C.state(badge.id,zero()).next.material,'Paper');
 for(const invalid of [null,{}, {...zero(),totalGames:-1},{...zero(),personalBestGames:'3'},{...zero(),bestStreak:Infinity}]){
  const state=C.state(badge.id,invalid);assert.equal(state.available,false);assert.equal(state.level,null);assert.equal(state.current,null);assert.equal(state.next,null);assert.deepEqual(plain(state.progress.conditions),[]);
 }
}
assert.equal(C.state('unknown',zero()),null);
assert.equal(C.state('personal_bests_three',{...zero(),personalBestGames:3}).level,1,'legacy three-PB eligibility does not add a saved-game gate at Paper');
assert.equal(C.state('personal_bests_three',{...zero(),totalGames:1900,personalBestGames:7}).level,9,'total games alone cannot grant the final variety tier');
assert.equal(C.state('personal_bests_three',{...zero(),totalGames:1899,personalBestGames:8}).level,9,'variety alone cannot grant the final tier');
assert.equal(C.state('personal_bests_three',{...zero(),totalGames:1900,personalBestGames:8}).level,10);
assert.ok(expected.personal_bests_three.variety.every((n,i,a)=>n<=8&&(!i||n>=a[i-1])),'variety remains reachable and never decreases');
const combined=C.state('personal_bests_three',{...zero(),totalGames:11,personalBestGames:3});
assert.equal(combined.level,2);assert.deepEqual(plain(combined.progress.conditions),[{metric:'totalGames',value:11,target:25,met:false},{metric:'personalBestGames',value:3,target:4,met:false}]);assert.equal(combined.progress.ratio,11/25);
assert.deepEqual(plain(C.normalizePublic([{id:'first_game',tier:2},{id:'unknown',tier:10},{id:'streak_seven',tier:10}])),[{id:'first_game',tier:2},{id:'streak_seven',tier:10}]);
assert.deepEqual(plain(C.normalizePublic([{id:'first_game',tier:2},{id:'first_game',tier:10},{id:'daily_seven',tier:1}])),[{id:'first_game',tier:2},{id:'daily_seven',tier:1}]);
assert.deepEqual(plain(C.normalizePublic([{id:'ten_games',tier:'3'},{id:'daily_first',tier:0},{id:'first_game',tier:1.5}])),[]);
assert.deepEqual(plain(C.normalizePublic([{id:'first_game',tier:2},{id:'streak_seven',tier:10},{id:'daily_seven',tier:1},{id:'fifty_games',tier:7}])),[],'oversized public payload is rejected as a whole');
for(const bad of [null,{},'first_game'])assert.deepEqual(plain(C.normalizePublic(bad)),[]);
assert.deepEqual(plain(C.clean(['first_game',{id:'ten_games',tier:10},'daily_first'])),['first_game','daily_first'],'legacy selected IDs stay strings; metadata tier objects are never trusted');
const requirements=plain(Object.fromEntries(C.badges.map(badge=>[badge.id,badge.tiers.map(tier=>tier.requirements)])));
for(const file of ['supabase/migrations/20261017120557_achievement_tiers_social.sql','supabase/tests/achievement_tiers_social.sql']){
 const sql=readFileSync(file,'utf8'),match=sql.match(/v_badge_catalog constant jsonb := '([^']+)'::jsonb/);
 assert.ok(match,'fixed SQL tier contract exists: '+file);assert.deepEqual(JSON.parse(match[1]),requirements,'all 80 SQL/frontend tier contracts agree: '+file);
}
console.log(`PASS achievement tiers: exact eight × ten table and migration/fixture parity, ${boundaries} independent threshold boundaries, increasing effort, finite dual-condition variety, unknown/zero/max states, pure metrics and strict public display normalization.`);
