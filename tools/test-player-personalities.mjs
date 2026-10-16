import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const source=file=>readFileSync('assets/js/'+file,'utf8');
const dom=()=>new JSDOM('<div id="avatars"></div>',{url:'https://brainilabgames.com/',runScripts:'outside-only'});
const load=(w,files)=>files.forEach(f=>w.eval(source(f)));
let d=dom(),w=d.window;load(w,['player-personalities.js','data.js','progression-ui.js']);
const people=w.BrainiPeople,first=w.BrainiData.player(),stored=Object.fromEntries(Object.entries(w.localStorage));
assert.equal(people.PEOPLE.length,50);assert.equal(new Set(people.PEOPLE.map(p=>p.avatar)).size,50);
const combinations=new Set();
for(const person of people.PEOPLE){
 assert.ok(existsSync('.'+person.avatar));const svg=readFileSync('.'+person.avatar,'utf8');
 assert.match(svg,/<title>Illustrated avatar inspired by /);assert.doesNotMatch(svg,/<script|<image|href=["']https?:/);
 for(const prefix of people.PREFIXES){const name=prefix+' '+person.short;combinations.add(name);assert.ok(name.length<=30);assert.equal(people.resolve({name}).avatar,person.avatar);}
}
assert.equal(combinations.size,400);
for(let i=0;i<300;i++){const id='Guest '+i.toString(16).padStart(10,'0');assert.deepEqual(people.resolve({name:id}),people.resolve({name:id}));assert.ok(!people.resolve({name:id}).displayName.startsWith('Guest '));}
assert.equal(people.resolve({name:'Bili D. King'}).displayName,'Bili D. King');
assert.ok(people.isPreset(first.displayName));assert.equal(first.avatarUrl,undefined);assert.ok(first.defaultAvatarUrl);
assert.ok(Object.keys(stored).length,'first load persists its identity before play');
const second=dom();Object.entries(stored).forEach(([k,v])=>second.window.localStorage.setItem(k,v));load(second.window,['player-personalities.js','data.js']);
assert.equal(second.window.BrainiData.player().displayName,first.displayName);assert.equal(second.window.BrainiData.player().defaultAvatarUrl,first.defaultAvatarUrl);
await w.BrainiData.api.syncExternalGuestUser({id:'guest-fixture',is_anonymous:true});
const old={user_id:'guest-fixture',display_name:'Guest 012345ABCD',leaderboard_display_name:'Guest 012345ABCD',leaderboard_enabled:true,avatar_url:null};
let profile={...old},calls=[],mode='normal',anonymous=true;
w.BrainiBackendAuth={isConfigured:()=>true,getSession:async()=>({user:{id:'guest-fixture',is_anonymous:anonymous}}),getClient:()=>({from:()=>{
 let payload=null,filters=[];const chain={select:()=>chain,eq:(k,v)=>{filters.push([k,v]);return chain;},update:value=>{payload=value;calls.push({value,filters});return chain;},single:async()=>({data:profile,error:null}),maybeSingle:async()=>{
  if(mode==='error')return {data:null,error:Error('offline')};
  if(mode==='race'){profile={...old,display_name:'My chosen name',leaderboard_display_name:'My chosen name'};return {data:null,error:null};}
  profile={...profile,...payload};return {data:profile,error:null};
 }};return chain;
}})};
load(w,['supabase-profile.js']);await w.BrainiProfiles.sync();
assert.equal(profile.display_name,first.displayName,'first game carries browser nickname into anonymous account');
assert.equal(profile.leaderboard_display_name,first.displayName);assert.deepEqual(Object.keys(calls[0].value).sort(),['display_name','leaderboard_display_name']);
assert.equal(calls[0].filters.length,3,'owner and both original aliases guard concurrent edits');
assert.equal(w.BrainiData.player().defaultAvatarUrl,first.defaultAvatarUrl);assert.equal(w.BrainiData.player().avatarUrl,null);
calls=[];await w.BrainiProfiles.sync();assert.equal(calls.length,0,'return visits do not write again');
for(const custom of [{display_name:'Custom me'},{leaderboard_display_name:'Public custom'},{leaderboard_enabled:false}]){
 profile={...old,...custom};calls=[];await w.BrainiProfiles.fetchMyProfile();assert.equal(calls.length,0,'preserve custom alias or visibility');
}
profile={...old};anonymous=false;calls=[];await w.BrainiProfiles.fetchMyProfile();assert.equal(calls.length,0,'never rewrite registered account');anonymous=true;
profile={...old};mode='race';assert.equal((await w.BrainiProfiles.fetchMyProfile()).display_name,'My chosen name');
profile={...old};mode='error';assert.equal((await w.BrainiProfiles.fetchMyProfile()).display_name,old.display_name,'cosmetic failure leaves readable profile');
const bad=w.BrainiProgressUI.avatarImageMarkup({name:'Guest 012345ABCD',avatarUrl:'javascript:alert(1)'});assert.doesNotMatch(bad,/javascript:/);
const container=w.document.querySelector('#avatars');container.innerHTML=w.BrainiProgressUI.avatarImageMarkup({name:'Curious Einstein',avatarUrl:'https://example.test/photo.jpg'});
const img=container.querySelector('img');assert.match(img.src,/photo.jpg$/);img.dispatchEvent(new w.Event('error'));assert.match(img.src,/einstein.svg$/);assert.equal(img.dataset.fallbackAvatar,undefined);
assert.match(w.BrainiProgressUI.avatarImageMarkup({name:'Custom me',avatarUrl:'https://example.test/photo.jpg?x="&y=1'}),/&amp;y/);
const rankReply={rows:[{name:old.display_name,rank:1,score:1234,level:8,avatar_url:null}],user:{name:old.display_name,rank:1,score:1234,level:8,is_me:true}};
w.BrainiBackendAuth={isConfigured:()=>true,init:async()=>{},getSession:async()=>null,getClient:()=>({rpc:async()=>({data:rankReply,error:null})})};
load(w,['supabase-rankings.js']);const ranking=await w.BrainiRankingsCloud.individual({period:'monthly'}),row=ranking.rows[0];
assert.equal(row.identityName,old.display_name);assert.equal(row.name,people.resolve({name:old.display_name}).displayName);assert.equal(row.score,1234);assert.equal(row.level,8);assert.equal(row.rank,1);assert.ok(!('userId' in row));
assert.equal(people.resolve(row).avatar,people.resolve({name:old.display_name}).avatar,'normalising the label does not reassign the portrait');
d.window.close();second.window.close();
console.log('PASS 50 local portraits, 400 matching nicknames, stable reload, first game identity, owner-only compare-and-swap, customised/hidden/registered profiles, race/offline recovery, safe URLs, photo fallback and unchanged score/level/rank.');
