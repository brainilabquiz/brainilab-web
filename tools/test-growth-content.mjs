import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{JSDOM}=require(process.env.JSDOM_MODULE||'jsdom');
const {contentHTML,bindContent}=await import('../editor/growth-content.js');
const dom=new JSDOM('<main></main>'),root=dom.window.document.querySelector('main');
const report={contentMeasurement:{schemaVersion:1,property:'555562532',mode:'manual_snapshot',period:{start:'2026-09-05',end:'2026-10-02'},observedAt:'2026-10-03T21:00:00Z',rows:[
 {path:'/learn/moon/',title:'Moon <img src=x onerror=alert(1)>',topic:'Science',kind:'lesson',courses:['Moon course'],views:4,activeUsers:2,readSignals:null},
 {path:'/learn/future/',title:'Future',topic:'History',kind:'article',courses:[],views:null,activeUsers:null,readSignals:null},
 {path:'/learn/paths/moon/',title:'Moon course',topic:'Science',kind:'course',courses:[],views:8,activeUsers:3,readSignals:null},
 {path:'javascript:alert(1)',title:'Unsafe',kind:'article',views:999}
]}};
root.innerHTML=contentHTML(report,Date.parse('2026-10-06'));bindContent(root,report);
assert.match(root.textContent,/Older than 48 hours/);assert.match(root.textContent,/Automatic Analytics sync is not connected/);
assert.equal(root.querySelectorAll('img').length,0);assert.equal(root.querySelectorAll('tbody tr').length,3);
assert.match(root.querySelector('tbody tr').textContent,/Moon course/);
assert.match(root.textContent,/Not measured/);
for(const link of root.querySelectorAll('a')){assert.equal(link.target,'_blank');assert.match(link.rel,/noopener/);}
const select=root.querySelector('[data-content-kind]');select.value='lesson';select.dispatchEvent(new dom.window.Event('change'));
assert.equal(root.querySelectorAll('tbody tr').length,1);assert.match(root.querySelector('tbody').textContent,/Moon <img/);
const search=root.querySelector('[data-content-search]');search.value='absent';search.dispatchEvent(new dom.window.Event('input'));assert.equal(root.querySelector('[data-content-empty]').hidden,false);
root.innerHTML=contentHTML(null);assert.match(root.textContent,/No dated content report/);bindContent(root,null);
console.log('Content insights: consent-data caveats, missing counts, stale data, type/search filters, XSS and safe links passed.');
