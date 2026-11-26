// Learn pages must not jump while they load: the server renders the state the scripts would set.
// Run: JSDOM_MODULE=<abs path to jsdom/lib/api.js> node tools/test-learn-no-shift.mjs
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {prepareArticle,libraryBody} from '../lib/learn-content.js';
import {chapterMenu,enrichAuthors,pathBody} from '../lib/learning-render.js';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const authors=read('content/authors.json');
const all=enrichAuthors(readdirSync('content/articles').filter(f=>f.endsWith('.json')).map(f=>prepareArticle(read('content/articles/'+f))),authors);
const published=all.filter(a=>a.status==='published');
const paths=readdirSync('content/paths').filter(f=>f.endsWith('.json')).map(f=>read('content/paths/'+f));
const script=readFileSync('assets/js/learn-library.js','utf8');

// What can move the layout: visibility, classes and short labels.
const state=doc=>[...doc.querySelectorAll('main *')].map(el=>[el.hidden,el.getAttribute('class')||'',el.children.length?'':el.textContent.trim()]);
function expectNoChange(articles,view){
 const html=`<!doctype html><html><body><main>${libraryBody(articles,paths,{view})}</main></body></html>`;
 const before=state(new JSDOM(html).window.document);
 const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://brainilabgames.com/learn/'+(view==='opinion'?'opinion/':'')});
 dom.window.eval(script);
 const after=state(dom.window.document);
 assert.equal(after.length,before.length,view+': same elements');
 const changed=after.map((s,i)=>JSON.stringify(s)===JSON.stringify(before[i])?null:[i,before[i],s]).filter(Boolean);
 assert.deepEqual(changed,[],view+' with '+articles.filter(a=>a.articleKind==='opinion').length+' opinion pieces: the script changes nothing that moves the page');
 const noscript=new JSDOM(html).window.document.querySelector('noscript').textContent;
 for(const selector of ['.learn-surprise','div.learn-format-filters','.learn-search','.learn-topic-select','.learn-more','[data-browse-topic]'])assert.ok(noscript.includes(selector),view+': no-JS readers do not see '+selector);
}
expectNoChange(published,'article');
// Opinion pieces live in the content store; mark a few local articles to cover none, a short list and paging.
for(const count of [0,3,12,13,15]){
 const articles=published.map((a,i)=>i<count?{...a,articleKind:'opinion'}:a);
 expectNoChange(articles,'opinion');
 expectNoChange(articles,'article');
}

// Academy chapter menus start closed, so phones never see a 400 px list collapse; wide screens open it beside the lesson.
for(const p of paths){
 const menu=new JSDOM(chapterMenu(p,all)).window.document.querySelector('[data-chapter-menu]');
 assert.equal(menu.open,false,p.slug+': chapter menu starts closed');
 assert.ok(!pathBody(p,all,authors).includes('details open data-chapter-menu'),p.slug+': course page renders it closed');
}
assert.match(readFileSync('editor/learning-progress.js','utf8'),/matchMedia\?\.\("\(max-width: 1000px\)"\)[\s\S]*?el\.open=!chapterMedia\.matches/,'the script opens chapter menus on wide screens');

// Lesson status labels stay readable.
const size=readFileSync('assets/css/learning-paths.css','utf8').match(/\.outline-status\{[^}]*font-size:(\d+)px/);
assert.ok(size&&+size[1]>=12,'chapter status text is at least 12px');
console.log(`PASS Learn no-shift: library and opinion views (0-15 opinion pieces) match their scripted state; ${paths.length} chapter menus start closed.`);
