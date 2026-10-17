import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const {JSDOM,VirtualConsole}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const sourceRoot=process.env.AVATAR_SOURCE_ROOT||'.',errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
const dom=new JSDOM('<div id="rankingsRoot"></div>',{url:'https://brainilabgames.com/rankings/',runScripts:'outside-only',virtualConsole:vc});
const w=dom.window,d=w.document,plain=x=>JSON.parse(JSON.stringify(x));
const tick=()=>new Promise(r=>setTimeout(r,0)),settle=async()=>{for(let i=0;i<4;i++)await tick();};
for(const file of ['player-personalities','profile-achievements-model','achievement-display','avatar-design','data','progression-ui','icon-system'])w.eval(readFileSync(sourceRoot+'/assets/js/'+file+'.js','utf8'));
await w.BrainiData.api.syncExternalAuthUser({id:'owner-a',user_metadata:{}});
let current={rows:[{rank:1,name:'Example player',score:1234,level:12,isMe:true,country:'ES'}],totalPlayers:1,leaderboardEnabled:true};
let jobs=[],failure=false,held=false;
w.BrainiBackendAuth={isConfigured:()=>true};
w.BrainiRankingsCloud={individual:async()=>{if(held)return new Promise((resolve,reject)=>jobs.push({resolve,reject}));if(failure)throw Error('offline');return plain(current);}};
w.fetch=()=>{throw Error('No network allowed');};
w.eval(readFileSync(sourceRoot+'/assets/js/rankings.js','utf8'));d.dispatchEvent(new w.Event('DOMContentLoaded'));await settle();
const root=d.querySelector('#rankingsRoot'),board=root.querySelector('.ranking-layout'),row=root.querySelector('.ranking-row');assert.ok(board&&row);
const before=plain(w.BrainiData.getState());
try{
 const details=root.querySelector('details');details.open=true;const focus=details.querySelector('summary');focus.focus();
 held=true;w.dispatchEvent(new w.Event('brainilab:progressionchange'));
 assert.equal(root.querySelector('.ranking-layout'),board);assert.equal(root.querySelector('.ranking-skeleton'),null);assert.equal(root.getAttribute('aria-busy'),'true');
 jobs.shift().resolve(plain(current));await settle();
 assert.equal(root.querySelector('.ranking-layout'),board,'Identical refresh preserves the actual DOM');assert.equal(root.querySelector('.ranking-row'),row);assert.equal(details.open,true);assert.equal(d.activeElement,focus);assert.equal(root.hasAttribute('aria-busy'),false);
 // Two overlapping updates: a late earlier response must not replace newer data.
 const first=w.BrainiRankings.render(),older=jobs.shift();const second=w.BrainiRankings.render(),newer=jobs.shift();
 const changed=plain(current);changed.rows[0].score=1300;newer.resolve(changed);await second;older.resolve(plain(current));await first;
 assert.equal(root.querySelector('.ranking-row-score').textContent,Number(1300).toLocaleString());
 current=changed;held=false;failure=true;await w.BrainiRankings.render();
 assert.ok(root.querySelector('.ranking-layout'));assert.match(root.querySelector('[data-ranking-refresh-error]').textContent,/last loaded results/);assert.equal(root.hasAttribute('aria-busy'),false);
 failure=false;root.querySelector('[data-ranking-refresh-retry]').click();await settle();assert.equal(root.querySelector('[data-ranking-refresh-error]'),null);
 held=true;w.BrainiRankings.state.period='weekly';const filter=w.BrainiRankings.render();assert.ok(root.querySelector('.ranking-skeleton'),'A new selection must not show results under the wrong filter');jobs.shift().resolve(plain(current));await filter;
 // Account boundaries clear confirmed private content before awaiting a new read.
 const pending=w.BrainiRankings.render(),late=jobs.shift();await w.BrainiData.api.syncExternalAuthUser({id:'owner-b',user_metadata:{}});await tick();
 assert.equal(root.querySelector('.ranking-row'),null,'Previous account is cleared immediately');assert.ok(root.querySelector('.ranking-skeleton'));
 late.resolve(plain(current));await pending;assert.equal(root.querySelector('.ranking-row'),null,'Stale owner response cannot restore content');
 for(const job of jobs)job.resolve({rows:[],totalPlayers:0});await settle();
 assert.deepEqual(errors,[]);assert.equal(before.player.xp,w.BrainiData.player().xp);
 console.log('PASS ranking refresh: no repeat skeleton for same view, identical DOM/focus/details retained, changed scores displayed, stale responses ignored, honest retry on background errors, filter and owner boundaries cleared.');
}finally{dom.window.close();}
