import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {playLandingData,playLandingsView} from '../editor/growth-play-discovery.js';
import {actionsView,currentDecisions} from '../editor/growth-seo-actions.js';
import {seoHTML,bindSEO} from '../editor/growth-seo-explorer.js';
import {unassignedFixture} from './fixtures/growth-unassigned.mjs';
import {playIndexFixture} from './fixtures/growth-play-index.mjs';
const {JSDOM}=createRequire(import.meta.url)(process.env.JSDOM_MODULE||'jsdom');
const prefix='https://brainilabgames.com',url=prefix+'/learn/sample-0/';
function fixture(size=4){const f=unassignedFixture(size);f.report.playSessions=playIndexFixture(size).playSessions;f.report.seoExplorer.searchSources.webPages.rows=[];return f;}
const {report,workspace}=fixture(),decisions=currentDecisions(workspace),original=JSON.stringify({report,workspace});
// Regression: real play was invisible in Next checks solely for lacking a query.
assert.equal(actionsView(report,workspace,'unassigned','','all_starts').rows.length,0);
assert.equal(playLandingData(report,decisions,'all').rows.length,3);assert.equal(playLandingData(report,decisions,'googleOrganic').rows.length,0);
const c=structuredClone(report);c.playSessions.cohorts.googleOrganic.landingPages[0].sessionsWithStart=1;
assert.equal(playLandingData(c,decisions,'googleOrganic').rows.length,1);assert.equal(playLandingData(c,decisions,'googleOrganic').rows[0].row.sessionsWithStart,1);
const all=playLandingsView(report,decisions,'all');assert.equal(all.rows.length,3);assert.match(all.note,/not an organic-only scope/);assert.ok(all.exported.every(r=>r.length===21));assert.equal(all.exported[1][3],3);assert.equal(all.exported[1][4],5);assert.match(all.exported[1][15],/not zero demand/);assert.equal(all.exported[1][5],'2026-09-26');assert.equal(all.exported[1][16],'2026-07-25');
assert.match(actionsView(report,workspace,'needs_review','').help,/data-seo-play-landings/);assert.match(playLandingsView(report,decisions,'googleOrganic').note,/does not establish zero/);
for(const state of ['pending','approved','published','monitoring','dismissed']){const d=[{id:21,url,state,revision:2,updated_at:'2026-10-25T18:00:00Z'}];assert.equal(playLandingData(c,d,'googleOrganic').rows.length,0);}
for(const mutate of [
 r=>r.seoExplorer.searchSources.webPages.rows.push({path:'/learn/sample-0/',query:'returned zero sample',clicks:0,impressions:0,position:null}),
 r=>r.seoExplorer.pages.push({...r.seoExplorer.pages[0]}),
 r=>r.seoExplorer.pages[0].status=404,r=>r.seoExplorer.pages[0].finalUrl=url+'other/',
 r=>r.seoExplorer.pages[0].checkedAt='2026-02-30T12:00:00Z',r=>r.seoExplorer.pages[0].checkedAt='2026-10-26T18:00:00Z',
 r=>r.seoExplorer.pages[0].trust=null,
 r=>r.playSessions.cohorts.googleOrganic.landingPages[0].sessionsWithStart=0,
 r=>r.playSessions.cohorts.googleOrganic.landingPages[0].sessionsWithStart=null,
 r=>r.playSessions.cohorts.googleOrganic.landingPages[0].sessionsWithStart=99,
 r=>delete r.playSessions.cohorts.googleOrganic.landingBaselineObservedAt,
 r=>r.playSessions.cohorts.googleOrganic.quality.sampled=true,
 r=>r.playSessions.cohorts.googleOrganic.quality.thresholded=true,
 r=>r.playSessions.cohorts.googleOrganic.quality.otherRow=true,
 r=>r.playSessions.cohorts.googleOrganic.landingPages[0].path='/profile/',
 r=>r.playSessions.cohorts.googleOrganic.landingPages[0].path='/learn/sample-0/index.html',
 r=>r.playSessions.cohorts.googleOrganic.landingPages[0].path='/learn/sample-0/?private=1'
]){const r=structuredClone(c);mutate(r);assert.equal(playLandingData(r,decisions,'googleOrganic').rows.length,0);}
assert.equal(playLandingData(report,null).rows.length,0);assert.equal(playLandingData(report,decisions,'unknown').rows.length,0);assert.equal(playLandingData(report,decisions,'all','absent').rows.length,0);assert.equal(playLandingData(report,decisions,'all','sample-0/').rows.length,1);
const missing=structuredClone(report);delete missing.seoExplorer.searchSources;assert.match(playLandingsView(missing,decisions).note,/No validated final Web/);
assert.equal(JSON.stringify({report,workspace}),original);

const dom=new JSDOM('<main></main>',{url:prefix+'/admin/'});globalThis.document=dom.window.document;globalThis.Event=dom.window.Event;globalThis.fetch=()=>{throw Error('Discovery must not collect data or read live pages');};
const root=document.querySelector('main');root.innerHTML=seoHTML(report);bindSEO(root,report,workspace);root.querySelector('[data-seo-view="actions"]').click();root.querySelector('[data-seo-play-landings]').click();
assert.equal(root.querySelector('[data-seo-decision-scope]').value,'play_landings');assert.equal(root.querySelector('[data-seo-focus-label]').hidden,true);assert.equal(root.querySelector('[data-seo-play-source-label]').hidden,false);assert.equal(document.activeElement,root.querySelector('[data-seo-play-source]'));assert.equal(root.querySelectorAll('tbody tr').length,3);assert.doesNotMatch(root.querySelector('[data-seo-results]').textContent,/undefined/);
const source=root.querySelector('[data-seo-play-source]');source.value='googleOrganic';source.dispatchEvent(new Event('change'));assert.equal(root.querySelector('[data-seo-export]').disabled,true);assert.match(root.querySelector('[data-seo-count]').textContent,/0 rows/);
source.value='all';source.dispatchEvent(new Event('change'));root.querySelector('[data-seo-review-url]').click();assert.equal(root.querySelector('[data-seo-selected-page]').value,url);assert.equal(document.activeElement.id,'growth-page-review-title');
let blob;globalThis.URL.createObjectURL=b=>{blob=b;return 'blob:fixture';};globalThis.URL.revokeObjectURL=()=>{};dom.window.HTMLAnchorElement.prototype.click=function(){};
root.querySelector('[data-seo-view="actions"]').click();root.querySelector('[data-seo-export]').click();assert.match(await blob.text(),/No matching row in the returned Web/);
const large=fixture(34);root.innerHTML=seoHTML(large.report);bindSEO(root,large.report,large.workspace);root.querySelector('[data-seo-view="actions"]').click();root.querySelector('[data-seo-play-landings]').click();assert.equal(root.querySelectorAll('tbody tr').length,25);assert.equal(actionsView(large.report,large.workspace,'play_landings','').exported.length,34);root.querySelector('[data-seo-next]').click();assert.equal(root.querySelectorAll('tbody tr').length,8);
const input=root.querySelector('[data-seo-filter]');input.value='sample-0/';input.dispatchEvent(new Event('input'));assert.equal(root.querySelectorAll('tbody tr').length,1);assert.match(root.querySelector('[data-seo-page]').textContent,/Page 1 of 1/);
assert.equal(JSON.stringify({report,workspace}),original);
console.log('PASS measured landing discovery: no-query omission, distinct source scopes, missing/zero/quality/date guards, all decision states and aliases protected, exact inspection requirement, filtered complete CSV, pagination, keyboard navigation and no requests or mutations.');
