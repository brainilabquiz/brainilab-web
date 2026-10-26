import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pagePlayEvidence} from '../editor/growth-page-play.js';
import {playEvidenceStatus,playFocusCoverage} from '../editor/growth-play-coverage.js';
import {actionRows,actionsView} from '../editor/growth-seo-actions.js';
import {seoHTML,bindSEO} from '../editor/growth-seo-explorer.js';
import {unassignedFixture} from './fixtures/growth-unassigned.mjs';
import {playIndexFixture} from './fixtures/growth-play-index.mjs';
const {JSDOM}=createRequire(import.meta.url)(process.env.JSDOM_MODULE||'jsdom');
const prefix='https://brainilabgames.com',url=prefix+'/learn/sample-0/';
function fixture(){const f=unassignedFixture(4);f.report.playSessions=playIndexFixture(4).playSessions;return f;}
const {report,workspace}=fixture(),original=JSON.stringify({report,workspace});
const status=(r,key='googleOrganic')=>playEvidenceStatus(pagePlayEvidence(r,url),key);
assert.equal(status(report).state,'starts_missing');assert.equal(status(report).qualifies,false);
assert.match(status(report).reason,/unknown, not zero/);assert.equal(status(report,'all').state,'recorded_start');
const cases=[
 ['baseline_missing',(r,c)=>c.landingPages[0].sessions=null],
 ['recorded_zero',(r,c)=>c.landingPages[0].sessionsWithStart=0],
 ['recorded_start',(r,c)=>c.landingPages[0].sessionsWithStart=1],
 ['inconsistent',(r,c)=>c.landingPages[0].sessionsWithStart=3],
 ['zero_baseline',(r,c)=>{c.landingPages[0].sessions=0;c.landingPages[0].sessionsWithStart=0;}],
 ['dates_missing',(r,c)=>{c.landingPages[0].sessionsWithStart=1;delete c.landingStartsObservedAt;}],
 ['quality_limited',(r,c)=>{c.landingPages[0].sessionsWithStart=1;c.quality.sampled=true;}],
 ['row_missing',(r,c)=>c.landingPages=[]],
 ['snapshot_missing',r=>delete r.playSessions],
 ['snapshot_missing',(r,c)=>c.landingPages.push({...c.landingPages[0]})],
 ['snapshot_missing',(r,c)=>c.landingPages[0].sessionsWithStart=-1]
];
for(const [expected,mutate] of cases){const r=structuredClone(report);mutate(r,r.playSessions?.cohorts.googleOrganic);assert.equal(status(r).state,expected);assert.equal(status(r).qualifies,expected==='recorded_start');}
for(const flag of ['thresholded','sampled','otherRow']){const r=structuredClone(report),c=r.playSessions.cohorts.googleOrganic;c.landingPages[0].sessionsWithStart=1;c.quality[flag]=true;assert.equal(status(r).state,'quality_limited');}
assert.equal(playEvidenceStatus(pagePlayEvidence(report,url+'index.html'),'all').state,'snapshot_missing');
const coverage=playFocusCoverage([{url},{url},{url:prefix+'/learn/sample-1/'}],report);
assert.equal(coverage.pages,2);assert.deepEqual(coverage.counts.googleOrganic,{starts_missing:1,row_missing:1});assert.deepEqual(coverage.counts.all,{recorded_start:1,starts_missing:1});
const view=actionsView(report,workspace,'unassigned','','google_starts');assert.equal(view.rows.length,0);assert.deepEqual(actionRows(report,workspace,'unassigned','','google_starts').coverage.counts.googleOrganic,{starts_missing:1,row_missing:3});assert.match(view.before,/4 distinct pages/);assert.match(view.before,/unknown, not zero play/);assert.match(view.before,/data-seo-reset-focus/);
assert.match(actionsView(report,workspace,'unassigned','sample-0/','google_starts').before,/1 distinct pages/);assert.equal(actionsView(report,workspace,'unassigned','absent','google_starts').before.includes('data-seo-play-coverage'),false);
const all=actionsView(report,workspace,'unassigned','','search');assert.match(all.rows[0],/Start-session count not returned/);assert.equal(all.exported[0].length,41);assert.equal(all.exported[1][37],'Start-session count not returned');assert.match(all.exported[1][38],/unknown, not zero/);assert.equal(all.exported[1][39],'Comparable recorded start sessions');
for(const state of ['published','monitoring','dismissed']){const ws={opportunities:[{id:21,url,state,revision:3,updated_at:'2026-10-25T18:00:00Z'},{id:22,url,state:'pending',revision:2,updated_at:'2026-10-25T18:00:00Z'}]};assert.equal(actionRows(report,ws,'needs_review','','google_starts').coverage.pages,0);assert.equal(actionRows(report,ws,'unassigned','','google_starts').coverage.counts.googleOrganic.starts_missing,undefined);}
const absent=structuredClone(report);delete absent.playSessions;assert.match(actionsView(absent,workspace,'unassigned','','google_starts').before,/No validated play snapshot/);
assert.equal(JSON.stringify({report,workspace}),original);

const dom=new JSDOM('<main></main>',{url:prefix+'/admin/'});globalThis.document=dom.window.document;globalThis.Event=dom.window.Event;globalThis.fetch=()=>{throw Error('Coverage and fallback must not make a request');};
const root=document.querySelector('main');root.innerHTML=seoHTML(report);bindSEO(root,report,workspace);root.querySelector('[data-seo-view="actions"]').click();root.querySelector('[data-seo-unassigned]').click();
const focus=root.querySelector('[data-seo-focus]');focus.value='google_starts';focus.dispatchEvent(new Event('change'));assert.match(root.querySelector('[data-seo-count]').textContent,/0 rows/);assert.equal(root.querySelector('[data-seo-export]').disabled,true);
root.querySelector('[data-seo-reset-focus]').click();assert.equal(focus.value,'search');assert.equal(document.activeElement,focus);assert.match(root.querySelector('[data-seo-count]').textContent,/4 rows/);assert.equal(root.querySelector('[data-seo-decision-scope]').value,'unassigned');
root.querySelector('[data-seo-review-url]').click();assert.equal(root.querySelector('[data-seo-selected-page]').value,url);
assert.equal(JSON.stringify({report,workspace}),original);
console.log('PASS play coverage: missing versus explicit zero, independent source scopes, incompatible/quality/date guards, unique-page diagnostics after decision/search protection, preserved CSV prefix, empty-focus recovery/focus and no requests or mutations.');
