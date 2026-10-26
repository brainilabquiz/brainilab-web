import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {actionRows,actionsView} from '../editor/growth-seo-actions.js';
import {seoHTML,bindSEO} from '../editor/growth-seo-explorer.js';
import {csvCell} from '../editor/growth-search.js';
import {unassignedFixture} from './fixtures/growth-unassigned.mjs';
const {JSDOM}=createRequire(import.meta.url)(process.env.JSDOM_MODULE||'jsdom');
const {report,workspace}=unassignedFixture(),url=report.seoExplorer.pages[0].url;
// The actual omission: a complete workspace with no matching decision used to
// leave real search pages out of Next checks entirely, even after inspection.
assert.equal(actionRows(report,workspace).rows.length,0);
const discovered=actionRows(report,workspace,'unassigned');
assert.equal(discovered.rows.length,3);assert.equal(discovered.unassignedCount,3);
assert.equal(discovered.rows[0].url,url);assert.equal(discovered.rows[0].decision,null);
assert.equal(discovered.rows[0].query.impressions,100); // not 103 summed queries
assert.equal(discovered.rows[0].query.clicks,2);
assert.equal(discovered.rows[0].activity.events.game_start,0);
assert.equal(discovered.rows[1].activity,null); // missing is not zero
assert.equal(actionRows(report,workspace,'all').rows.length,0);
assert.equal(actionRows(report,workspace,'unassigned','second sample 0').rows[0].query.impressions,3);
assert.equal(actionRows(report,workspace,'unassigned','absent').rows.length,0);
for(const state of ['pending','approved','published','monitoring','dismissed']){
 const ws={opportunities:[{...workspace.opportunities[0],url,state}]};
 assert.equal(actionRows(report,ws,'unassigned').rows.some(r=>r.url===url),false,state);
}
assert.equal(actionRows(report,null,'unassigned').rows.length,0);
assert.equal(actionRows(report,{opportunities:[{...workspace.opportunities[0],revision:0}]},'unassigned').rows.length,0);
assert.equal(actionRows(report,{opportunities:[]},'unassigned').rows.length,3);
for(const mutate of [s=>s.pages.shift(),s=>s.pages[0].status=404,s=>s.pages[0].status=null,s=>s.pages[0].finalUrl=report.seoExplorer.pages[1].url,s=>s.pages[0].checkedAt='invalid',s=>s.pages.push({...s.pages[0]})]){
 const changed=structuredClone(report);mutate(changed.seoExplorer);
 assert.equal(actionRows(changed,workspace,'unassigned').rows.some(r=>r.url===url),false);
}
const duplicate=structuredClone(report);duplicate.seoExplorer.searchSources.webPages.rows.push({...duplicate.seoExplorer.searchSources.webPages.rows[0]});
assert.equal(actionRows(duplicate,workspace,'unassigned').rows.length,3);
assert.equal(actionRows(duplicate,workspace,'unassigned').rows[0].query.impressions,100);
const unsafe=structuredClone(report);unsafe.seoExplorer.searchSources.webPages.rows[0].path='/account/';
assert.equal(actionRows(unsafe,workspace,'unassigned').rows.length,0);
const invalid=structuredClone(report);invalid.seoExplorer.searchSources.dataState='all';
assert.equal(actionRows(invalid,workspace,'unassigned').rows.length,0);
const view=actionsView(report,workspace,'unassigned','');
assert.equal(view.exported.length,4);assert.ok(view.exported.every(r=>r.length===41));
assert.equal(view.exported[1][1],'No recorded decision');assert.equal(view.exported[1][2],'');
assert.equal(view.exported[1][12],0);assert.equal(view.exported[2][12],'');
assert.equal(view.exported[1][7],'2026-07-25');assert.equal(view.exported[1][13],'2026-09-26');
assert.match(view.exported[1][18],/HTTP 200 inspected/);
assert.doesNotMatch(view.rows.join(''),/data-seo-open-decision/);
assert.match(view.rows.join(''),/2 observed clicks/);assert.match(view.rows.join(''),/Not returned/);
assert.match(view.help,/not approved opportunities/);assert.match(view.help,/not proof of no prior edits/);
const injected=structuredClone(report);injected.seoExplorer.searchSources.webPages.rows[0].query='<img src=x onerror=alert(1)>';
assert.doesNotMatch(actionsView(injected,workspace,'unassigned','').rows.join(''),/<img/);
injected.seoExplorer.searchSources.webPages.rows[0].query='=sample question';
assert.ok(csvCell(actionsView(injected,workspace,'unassigned','').exported[1][3]).startsWith('"\''));
const before=JSON.stringify({report,workspace});
const dom=new JSDOM('<main></main>',{url:'https://brainilabgames.com/admin/'});
globalThis.document=dom.window.document;globalThis.Event=dom.window.Event;
globalThis.fetch=()=>{throw Error('Review must not collect or write data');};
const root=document.querySelector('main');root.innerHTML=seoHTML(report);
bindSEO(root,report,workspace);root.querySelector('[data-seo-view="actions"]').click();
assert.match(root.querySelector('[data-seo-count]').textContent,/0 rows/);
root.querySelector('[data-seo-unassigned]').click();
assert.equal(root.querySelector('[data-seo-decision-scope]').value,'unassigned');
assert.equal(document.activeElement.getAttribute('role'),'region');
assert.match(root.querySelector('[data-seo-count]').textContent,/3 rows/);
root.querySelector('[data-seo-review-url]').click();
assert.equal(document.activeElement.id,'growth-page-review-title');
assert.match(root.querySelector('.growth-page-review').textContent,/No decision for this exact URL/);
assert.equal(JSON.stringify({report,workspace}),before);
const large=unassignedFixture(32);root.innerHTML=seoHTML(large.report);bindSEO(root,large.report,large.workspace);
root.querySelector('[data-seo-view="actions"]').click();root.querySelector('[data-seo-unassigned]').click();
assert.equal(root.querySelectorAll('tbody tr').length,25);assert.match(root.querySelector('[data-seo-count]').textContent,/32 rows/);
assert.equal(actionsView(large.report,large.workspace,'unassigned','').exported.length,33);
root.querySelector('[data-seo-next]').click();assert.equal(root.querySelectorAll('tbody tr').length,7);
const input=root.querySelector('[data-seo-filter]');input.value='sample-0/';input.dispatchEvent(new Event('input'));
assert.equal(root.querySelectorAll('tbody tr').length,1);assert.match(root.querySelector('[data-seo-page]').textContent,/Page 1 of 1/);
console.log('PASS unassigned search pages: omission regression, current-decision protection, dated exact inspections, deduplication without sums, independent periods/nulls, safe export, pagination and focus navigation without writes.');
