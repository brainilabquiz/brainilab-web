import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {actionRows,actionsView} from '../editor/growth-seo-actions.js';
import {seoHTML,bindSEO} from '../editor/growth-seo-explorer.js';
import {unassignedFixture} from './fixtures/growth-unassigned.mjs';
import {playIndexFixture} from './fixtures/growth-play-index.mjs';
const {JSDOM}=createRequire(import.meta.url)(process.env.JSDOM_MODULE||'jsdom');
function fixture(size=4){const f=unassignedFixture(size);f.report.playSessions=playIndexFixture(size).playSessions;return f;}
const {report,workspace}=fixture(),prefix='https://brainilabgames.com',url=prefix+'/learn/sample-0/';
const q=report.seoExplorer.searchSources.webPages.rows;
q[0].clicks=0;q[1].clicks=2;q[4].clicks=1;
const all=report.playSessions.cohorts.all,google=report.playSessions.cohorts.googleOrganic;
all.landingPages[0].sessionsWithStart=2;all.landingPages[0].startEventCount=7;
all.landingPages[2].sessionsWithStart=1;all.landingPages[3].sessionsWithStart=0;
google.landingPages[0].sessionsWithStart=1;google.landingPages[0].startEventCount=4;
google.landingPages.push({path:'/learn/sample-2/',sessions:3,sessionsWithStart:1,startEventCount:2});
const original=JSON.stringify({report,workspace});
assert.equal(actionRows(report,workspace,'unassigned','').rows.length,4);
const clicks=actionRows(report,workspace,'unassigned','','clicks').rows;
assert.equal(clicks.length,2);assert.equal(clicks[0].query.query,'second sample 0');assert.equal(clicks[0].query.impressions,3);assert.equal(clicks[0].query.clicks,2);
assert.equal(clicks[1].query.clicks,1);assert.equal(clicks.filter(r=>r.url===url).length,1);
assert.equal(actionRows(report,workspace,'unassigned','second sample 0','clicks').rows.length,1);
assert.equal(actionRows(report,workspace,'unassigned','absent','clicks').rows.length,0);
const organic=actionRows(report,workspace,'unassigned','','google_starts').rows;
assert.equal(organic.length,2);assert.equal(organic[0].play.cohorts.find(c=>c.key==='googleOrganic').row.sessionsWithStart,1);
const started=actionRows(report,workspace,'unassigned','','all_starts').rows;
assert.equal(started.length,2);assert.equal(started[0].url,url);assert.equal(started[0].play.cohorts.find(c=>c.key==='all').row.sessionsWithStart,2); // not 7 events, nor all + organic
for(const state of ['published','monitoring','dismissed'])for(const focus of ['clicks','google_starts','all_starts']){
 const decision={id:20,url,state,revision:3,updated_at:'2026-10-25T18:00:00Z'};
 const ws={opportunities:[{...decision,state:'pending',id:21},decision]};
 assert.equal(actionRows(report,ws,'needs_review','',focus).rows.some(r=>r.url===url),false);
 assert.equal(actionRows(report,ws,'unassigned','',focus).rows.some(r=>r.url===url),false);
 assert.match(actionsView(report,ws,'all','',focus).rows.join(''),/Preserve this decision/);
}
assert.equal(actionRows(report,null,'unassigned','','clicks').rows.length,0);
assert.equal(actionRows(report,{opportunities:[]},'unassigned','','clicks').rows.length,2);
for(const mutate of [r=>r.playSessions.cohorts.googleOrganic.quality.sampled=true,r=>r.playSessions.cohorts.googleOrganic.quality.thresholded=true,r=>r.playSessions.cohorts.googleOrganic.quality.otherRow=true,r=>delete r.playSessions.cohorts.googleOrganic.landingStartsObservedAt]){
 const bad=structuredClone(report);mutate(bad);assert.equal(actionRows(bad,workspace,'unassigned','','google_starts').rows.length,0);assert.equal(actionRows(bad,workspace,'unassigned','','search').rows.length,4);
}
for(const value of [null,0,99]){const bad=structuredClone(report);bad.playSessions.cohorts.googleOrganic.landingPages[0].sessionsWithStart=value;assert.equal(actionRows(bad,workspace,'unassigned','','google_starts').rows.some(r=>r.url===url),false);}
const missing=structuredClone(report);delete missing.playSessions;missing.searchPerformance.current.landingPages[0].events.game_start=999;
assert.equal(actionRows(missing,workspace,'unassigned','','all_starts').rows.length,0);assert.match(actionsView(missing,workspace,'unassigned','','all_starts').note,/does not establish zero/);
const view=actionsView(report,workspace,'unassigned','','all_starts');assert.ok(view.exported.every(r=>r.length===37));
assert.equal(view.exported[1][20],2);assert.equal(view.exported[1][21],1);assert.equal(view.exported[1][25],10);assert.equal(view.exported[1][26],2);
assert.equal(view.exported[1][7],'2026-07-25');assert.equal(view.exported[1][30],'2026-09-26');assert.equal(view.exported[1][32],'Europe/Madrid');assert.match(view.note,/not an organic-only scope/);
const observations=new Map([[url,{state:'ready',url,checkedAt:'2026-10-26T18:00:00Z',modifiedAt:'2026-10-21T05:16:51Z'}]]);
const checked=actionsView(report,workspace,'unassigned','','all_starts',observations);assert.match(checked.rows[0],/falls inside this search window/);assert.equal(checked.exported[1][35],'2026-10-21T05:16:51Z');
assert.equal(actionsView(report,workspace,'unassigned','','search').exported[2][21],''); // missing organic row remains empty
assert.equal(JSON.stringify({report,workspace}),original);

const dom=new JSDOM('<main></main>',{url:'https://brainilabgames.com/admin/'});globalThis.document=dom.window.document;globalThis.Event=dom.window.Event;
globalThis.fetch=()=>{throw Error('Focus/filter/navigation must not make a request');};
const root=document.querySelector('main');root.innerHTML=seoHTML(report);bindSEO(root,report,workspace);root.querySelector('[data-seo-view="actions"]').click();root.querySelector('[data-seo-unassigned]').click();
const focus=root.querySelector('[data-seo-focus]');assert.equal(focus.closest('label').hidden,false);focus.value='clicks';focus.dispatchEvent(new Event('change'));
assert.equal(root.querySelectorAll('tbody tr').length,2);assert.match(root.querySelector('[data-seo-results]').textContent,/second sample 0/);
focus.value='all_starts';focus.dispatchEvent(new Event('change'));assert.match(root.querySelector('[data-seo-note]').textContent,/not an organic-only scope/);
let fetches=0;globalThis.fetch=async(u,options)=>{fetches++;assert.equal(options.credentials,'omit');const body='<title>Updated sample</title><script type="application/ld+json">'+JSON.stringify({'@type':'Article',url:u,dateModified:'2026-10-21T05:16:51Z'})+'</script>';const response=new Response(body,{headers:{'Content-Type':'text/html'}});Object.defineProperty(response,'url',{value:u});return response;};
root.querySelector('[data-seo-review-url]').click();assert.equal(focus.closest('label').hidden,true);root.querySelector('[data-seo-check-current]').click();await new Promise(r=>setTimeout(r,10));assert.equal(fetches,1);
root.querySelector('[data-seo-view="actions"]').click();assert.match(root.querySelector('[data-seo-results]').textContent,/Current public-page check/);assert.match(root.querySelector('[data-seo-results]').textContent,/falls inside this search window/);assert.equal(fetches,1);
let blob;globalThis.URL.createObjectURL=v=>{blob=v;return 'blob:fixture';};globalThis.URL.revokeObjectURL=()=>{};dom.window.HTMLAnchorElement.prototype.click=function(){};
root.querySelector('[data-seo-export]').click();const csv=await blob.text();assert.match(csv,/All-source sessions with a recorded start/);assert.match(csv,/Recorded starts · all sources/);assert.match(csv,/2026-10-21T05:16:51.000Z/);
const large=fixture(32);root.innerHTML=seoHTML(large.report);bindSEO(root,large.report,large.workspace);globalThis.fetch=()=>{throw Error('Filters cannot fetch');};root.querySelector('[data-seo-view="actions"]').click();root.querySelector('[data-seo-unassigned]').click();
const nextFocus=root.querySelector('[data-seo-focus]');nextFocus.value='all_starts';nextFocus.dispatchEvent(new Event('change'));assert.equal(root.querySelectorAll('tbody tr').length,25);assert.equal(actionsView(large.report,large.workspace,'unassigned','','all_starts').exported.length,32);
root.querySelector('[data-seo-next]').click();assert.equal(root.querySelectorAll('tbody tr').length,6);const input=root.querySelector('[data-seo-filter]');input.value='sample-0/';input.dispatchEvent(new Event('input'));assert.match(root.querySelector('[data-seo-page]').textContent,/Page 1 of 1/);
assert.equal(JSON.stringify({report,workspace}),original);
console.log('PASS evidence focus: strongest positive clicked row without query sums, independent compatible union-session scopes, unknown/zero/quality guards, decision protection, explicit-current-check reuse, complete dated CSV, pagination and no collection or writes from filtering.');
