import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {libraryBody,prepareArticle} from '../lib/learn-content.js';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const documents=readdirSync('content/articles').map(file=>JSON.parse(readFileSync('content/articles/'+file,'utf8')));
const articles=documents.filter(a=>a.status==='published').map(prepareArticle);
for(const draft of documents.filter(a=>a.status!=='published'))assert.ok(!readFileSync('learn/index.html','utf8').includes('/learn/'+draft.slug+'/'),'Private drafts must not appear in the library');
const topics=new Set(articles.map(a=>a.topic));
// The build and live Worker both expose the same progressive enhancement contract.
for(const html of [readFileSync('learn/index.html','utf8'),libraryBody(articles)]){
 const dom=new JSDOM(html,{url:'https://brainilabgames.com/learn/',runScripts:'outside-only'});
 const w=dom.window,d=w.document;
 assert.equal(d.querySelectorAll('.learn-card[data-format=article]').length,articles.length);
 assert.ok(d.querySelector('.learn-search').hidden);
 assert.ok(d.querySelector('noscript').textContent.includes('display:flex!important'));
 assert.equal(d.querySelector('.learn-resource-link'),null);
 assert.ok(d.querySelector('.learn-surprise').hidden);
 w.eval(readFileSync('assets/js/learn-library.js','utf8'));
 const surprise=d.querySelector('[data-random-article]');
 assert.equal(surprise.parentElement.hidden,false);
 const links=[...d.querySelectorAll('.learn-card[data-format=article] h3 a')].map(link=>link.getAttribute('href'));
 // Prevent actual navigation in this DOM test while exercising native click handling.
 d.addEventListener('click',event=>event.preventDefault());
 w.Math.random=()=>0;
 surprise.click();const first=surprise.getAttribute('href');
 assert.ok(links.includes(first));
 w.dispatchEvent(new w.PageTransitionEvent('pageshow',{persisted:true}));
 surprise.click();assert.notEqual(surprise.getAttribute('href'),first,'Back navigation must not repeat the previous pick');
 assert.equal(w.sessionStorage.getItem('brainilab:last-surprise-article'),surprise.getAttribute('href'));
 const visible=()=>[...d.querySelectorAll('.learn-card[data-format=article]:not([hidden])')];
 const input=d.querySelector('#learn-search'),select=d.querySelector('#learn-topic');
 assert.equal(visible().length,topics.size);
 assert.equal(select.options.length,topics.size+2);
 const academy=[...d.querySelectorAll('[data-format=academy]')];
 if(academy.length){
  assert.deepEqual([...d.querySelectorAll('.learn-card:not([hidden])')].slice(0,6).map(c=>c.dataset.format),['article','academy','article','academy','article','academy']);
  d.querySelector('[data-format-filter=academy]').click();assert.equal(visible().length,0);assert.equal(d.querySelectorAll('[data-format=academy]:not([hidden])').length,academy.length);
  assert.equal(d.querySelector('[data-format-filter=academy]').getAttribute('aria-pressed'),'true');
  input.value='calendar';input.dispatchEvent(new w.Event('input'));assert.equal(d.querySelectorAll('[data-format=academy]:not([hidden])').length,1);
  input.value='';input.dispatchEvent(new w.Event('input'));d.querySelector('[data-format-filter=article]').click();assert.equal(d.querySelectorAll('[data-format=academy]:not([hidden])').length,0);
  d.querySelector('[data-format-filter=all]').click();
 }

 select.value='Sports';select.dispatchEvent(new w.Event('change'));
 assert.equal(visible().length,articles.filter(a=>a.topic==='Sports').length);
 assert.ok(visible().every(e=>e.dataset.topic==='Sports'));
 assert.equal(d.querySelector('.topic-nav'),null);
 assert.equal(select.closest('label').hidden,false);
 input.value='zzzzzz';input.dispatchEvent(new w.Event('input'));
 assert.equal(visible().length,0);assert.equal(d.querySelector('.learn-empty').hidden,false);
 surprise.click();assert.ok(links.includes(surprise.getAttribute('href')),'Random discovery still works with no search matches');
 const reached=new Set();
 for(let i=0;i<links.length;i++){
  w.sessionStorage.removeItem('brainilab:last-surprise-article');
  w.Math.random=()=>i/links.length;
  surprise.click();reached.add(surprise.getAttribute('href'));
 }
 assert.ok(reached.size>topics.size,'Older articles outside the latest-topic view are eligible');
 d.querySelector('.learn-search-clear').click();
 assert.equal(select.value,'Sports');assert.equal(d.activeElement,input);
 assert.equal(visible().length,articles.filter(a=>a.topic==='Sports').length);assert.ok(d.querySelector('.learn-search-clear').hidden);
 select.value='__latest';select.dispatchEvent(new w.Event('change'));
 input.value='bubble wrap';input.dispatchEvent(new w.Event('input'));
 assert.equal(visible().length,1,'Latest search also finds older articles');
 assert.ok(visible()[0].querySelector('a[href="/learn/was-bubble-wrap-invented-as-wallpaper/"]'));
 input.value='zzzzzz';input.dispatchEvent(new w.Event('input'));
 d.querySelector('[data-clear-filters]').click();
 assert.equal(visible().length,articles.length);assert.equal(select.value,'');assert.equal(input.value,'');
 assert.equal(d.activeElement,input);
 dom.window.close();
}
for(const size of [0,1,2]){
 const dom=new JSDOM(libraryBody(articles.slice(0,size)),{url:'https://brainilabgames.com/learn/',runScripts:'outside-only'}),w=dom.window,d=w.document;
 Object.defineProperty(w,'sessionStorage',{get(){throw new Error('Storage disabled');}});
 w.eval(readFileSync('assets/js/learn-library.js','utf8'));
 const link=d.querySelector('[data-random-article]');
 assert.equal(link.parentElement.hidden,size===0);
 if(size){
  d.addEventListener('click',event=>event.preventDefault());
  w.Math.random=()=>0;link.click();const first=link.href;link.click();
  if(size>1)assert.notEqual(link.href,first);else assert.equal(link.href,first);
 }
 dom.window.close();
}
console.log('PASS: static and live library controls, mobile/desktop synchronisation, search across older articles, clear preserves topic, empty reset and focus, no-JS fallback.');
