import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {reviewQueue,reviewQueueHTML} from '../editor/growth-decision-queue.js';
import {actionRows,actionsView,currentDecisions} from '../editor/growth-seo-actions.js';
import {seoHTML,bindSEO} from '../editor/growth-seo-explorer.js';
const {JSDOM}=createRequire(import.meta.url)(process.env.JSDOM_MODULE||'jsdom');
const url='https://brainilabgames.com/learn/example/',other='https://brainilabgames.com/games/example/',at='2026-10-26T08:00:00Z';
const pending={id:1,url,state:'pending',revision:3,updated_at:at},approved={...pending,id:2,url:other,state:'approved'};
const source={schemaVersion:1,property:'sc-domain:brainilabgames.com',source:'google_search_console_api',dataState:'final',observedAt:at,timezone:'America/Los_Angeles',period:{start:'2026-07-26',end:'2026-10-23'},images:{searchType:'image',aggregation:'byProperty',rows:[],rowsWithheld:0},webPages:{searchType:'web',aggregation:'byPage',rows:[],rowsWithheld:0}};
const checks={https:true,title:true,description:true,canonical:true,heading:true,structuredData:true,robots:true,internalLinks:true};
const seo={schemaVersion:1,domain:'brainilabgames.com',observedAt:at,pages:[{url,finalUrl:url,status:200,trust:100,checks,checkedAt:at}],sources:[],backlinks:[],searchSources:source};
const report={seoExplorer:seo,opportunities:[{...pending,status:'published'}]},workspace={opportunities:[pending,approved]};
const original=JSON.stringify({report,workspace});
assert.equal(actionRows(report,workspace).rows.length,0);
assert.deepEqual(reviewQueue(currentDecisions(workspace),source).map(r=>[r.url,r.state,r.hasSearch]),[[other,'approved',false],[url,'pending',false]]);
let result=actionsView(report,workspace,'needs_review','');assert.equal(result.rows.length,0);assert.match(result.before,/2 pages · 1 approved · 1 pending/);assert.match(result.before,/No matching query\/page row/);assert.match(result.before,/Revision 3/);assert.match(result.before,/2026-07-26 to 2026-10-23/);assert.match(result.before,/Demand remains unknown/);
for(const scope of ['needs_review','unassigned','all'])for(const focus of ['search','clicks','google_starts','all_starts'])assert.match(actionsView(report,workspace,scope,'no matching text',focus).before,/2 pages · 1 approved · 1 pending/);
for(const state of ['published','monitoring','dismissed']){
 const records=[pending,{...pending,id:3,state}];assert.deepEqual(reviewQueue(records,source),[]);assert.doesNotMatch(reviewQueueHTML(records,source),/data-seo-open-decision/);
}
const conflicts=reviewQueue([pending,{...pending,id:4,state:'approved'}],source);assert.equal(conflicts.length,1);assert.equal(conflicts[0].state,'conflict');assert.equal(conflicts[0].records.length,2);assert.match(reviewQueueHTML([pending,{...pending,id:4,state:'approved'}],source),/0 approved · 0 pending · 1 conflicting/);
assert.equal(currentDecisions({opportunities:[pending,{...approved,id:1}]}),null);assert.equal(reviewQueue(null,source),null);assert.match(actionsView(report,null,'needs_review','').before,/unavailable/);assert.doesNotMatch(actionsView(report,null,'needs_review','').before,/data-seo-open-decision/);
const missing=structuredClone(report);delete missing.seoExplorer.searchSources;
assert.match(actionsView(missing,workspace,'needs_review','').before,/2 pages/);assert.match(actionsView(missing,workspace,'needs_review','').before,/No validated final Web query\/page source/);
const withSearch=structuredClone(source);withSearch.webPages.rows=[{path:'/learn/example/',query:'a question',clicks:0,impressions:1,position:9}];assert.equal(reviewQueue([pending],withSearch)[0].hasSearch,true);
withSearch.webPages.rows[0].path+='/';assert.equal(reviewQueue([pending],withSearch)[0].hasSearch,false);
assert.match(reviewQueueHTML([],source),/No pending or approved/);
const hostile=structuredClone(source);hostile.timezone='<img src=x onerror=alert(1)>';assert.doesNotMatch(reviewQueueHTML([pending],hostile),/<img/);

const dom=new JSDOM('<main></main>',{url:'https://brainilabgames.com/admin/'});globalThis.document=dom.window.document;globalThis.Event=dom.window.Event;
const root=document.querySelector('main');let requests=0;globalThis.fetch=async()=>{requests++;throw Error('Unexpected request');};
root.innerHTML=seoHTML(report)+'<select data-growth-filter><option value="all">All</option><option value="published" selected>Published</option></select><article data-opportunity="1" tabindex="-1" hidden></article><article data-opportunity="2" tabindex="-1" hidden></article>';
root.querySelector('[data-growth-filter]').onchange=()=>root.querySelectorAll('article').forEach(el=>el.hidden=false);
bindSEO(root,report,workspace);root.querySelector('[data-seo-view="actions"]').click();
assert.equal(root.querySelector('[data-seo-review-queue]').open,true);assert.equal(root.querySelectorAll('[data-seo-review-queue] li').length,2);assert.equal(root.querySelector('[data-seo-export]').disabled,true);
root.querySelector('[data-seo-open-decision="2"]').click();assert.equal(document.activeElement.dataset.opportunity,'2');assert.equal(root.querySelector('[data-growth-filter]').value,'all');
for(const key of ['clicks','google_starts','all_starts']){const s=root.querySelector('[data-seo-focus]');s.value=key;s.dispatchEvent(new Event('change'));assert.equal(root.querySelectorAll('[data-seo-review-queue] li').length,2);}
const input=root.querySelector('[data-seo-filter]');input.value='nothing';input.dispatchEvent(new Event('input'));assert.equal(root.querySelectorAll('[data-seo-review-queue] li').length,2);
assert.equal(requests,0);assert.equal(root.querySelectorAll('script,img').length,0);assert.equal(JSON.stringify({report,workspace}),original);
console.log('PASS saved review queue: missing/absent query evidence and all filters retain unfinished work; approved-first, exact-URL deduplication/conflicts, protected states, duplicate-ID guard, keyboard decision navigation, no requests or mutations.');
