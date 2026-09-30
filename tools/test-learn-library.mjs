import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {libraryBody,prepareArticle} from '../lib/learn-content.js';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const articles=readdirSync('content/articles').map(file=>prepareArticle(JSON.parse(readFileSync('content/articles/'+file,'utf8'))));
const topics=new Set(articles.map(a=>a.topic));
// The build and live Worker both expose the same progressive enhancement contract.
for(const html of [readFileSync('learn/index.html','utf8'),libraryBody(articles)]){
 const dom=new JSDOM(html,{url:'https://brainilabgames.com/learn/',runScripts:'outside-only'});
 const w=dom.window,d=w.document;
 assert.equal(d.querySelectorAll('.learn-card').length,articles.length);
 assert.ok(d.querySelector('.learn-search').hidden);
 assert.ok(d.querySelector('noscript').textContent.includes('display:flex!important'));
 w.eval(readFileSync('assets/js/learn-library.js','utf8'));
 const visible=()=>[...d.querySelectorAll('.learn-card:not([hidden])')];
 const input=d.querySelector('#learn-search'),select=d.querySelector('#learn-topic');
 assert.equal(visible().length,topics.size);
 assert.equal(select.options.length,topics.size+2);
 select.value='Sports';select.dispatchEvent(new w.Event('change'));
 assert.equal(visible().length,articles.filter(a=>a.topic==='Sports').length);
 assert.ok(visible().every(e=>e.dataset.topic==='Sports'));
 assert.equal(d.querySelector('[data-topic-filter="Sports"]').getAttribute('aria-pressed'),'true');
 input.value='zzzzzz';input.dispatchEvent(new w.Event('input'));
 assert.equal(visible().length,0);assert.equal(d.querySelector('.learn-empty').hidden,false);
 d.querySelector('.learn-search-clear').click();
 assert.equal(select.value,'Sports');assert.equal(d.activeElement,input);
 assert.equal(visible().length,2);assert.ok(d.querySelector('.learn-search-clear').hidden);
 d.querySelector('[data-topic-filter="__latest"]').click();
 input.value='bubble wrap';input.dispatchEvent(new w.Event('input'));
 assert.equal(visible().length,1,'Latest search also finds older articles');
 assert.ok(visible()[0].querySelector('a[href="/learn/was-bubble-wrap-invented-as-wallpaper/"]'));
 input.value='zzzzzz';input.dispatchEvent(new w.Event('input'));
 d.querySelector('[data-clear-filters]').click();
 assert.equal(visible().length,articles.length);assert.equal(select.value,'');assert.equal(input.value,'');
 assert.equal(d.activeElement,input);
 dom.window.close();
}
console.log('PASS: static and live library controls, mobile/desktop synchronisation, search across older articles, clear preserves topic, empty reset and focus, no-JS fallback.');
