import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {libraryBody,prepareArticle} from '../lib/learn-content.js';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const template=JSON.parse(readFileSync('content/articles/why-do-onions-make-you-cry.json','utf8'));
const script=readFileSync('assets/js/learn-library.js','utf8');
const fixture=(slug,title,description)=>prepareArticle({...template,slug,title,description,topic:'Science & nature'});
// Both the query and the indexed copy must normalise. Swapping languages tests both directions.
for(const [title,description,queries] of [
 ['Colourful colours at the centre','A grey favourite and its behaviour.', ['colorful colors center','gray favorite behavior','COLORED']],
 ['Colorful colors at the center','A gray favorite and its behavior.', ['colourful colours centre','grey favourite behaviour','COLOURED']]
]){
 const articles=[fixture('spelling-example',title,description+' Coloured colored.'),fixture('unrelated-name','Colorado and its canyons','An unrelated place name.')];
 const dom=new JSDOM(libraryBody(articles),{url:'https://brainilabgames.com/learn/',runScripts:'outside-only'});
 const w=dom.window,d=w.document;w.eval(script);
 const input=d.querySelector('#learn-search');
 const search=value=>{input.value=value;input.dispatchEvent(new w.Event('input'));return [...d.querySelectorAll('.learn-card:not([hidden])')];};
 for(const q of queries){const found=search(q);assert.equal(found.length,1,q);assert.equal(found[0].querySelector('h3 a').getAttribute('href'),'/learn/spelling-example/');assert.equal(input.value,q,'Keep the reader’s spelling');assert.equal(new URLSearchParams(w.location.hash.split('?')[1]).get('q'),q,'Keep shared URLs readable');}
 assert.equal(search('colorado')[0].querySelector('h3 a').getAttribute('href'),'/learn/unrelated-name/','Do not rewrite part of a place name');
 assert.equal(search('colorz').length,0,'Do not invent fuzzy matches');
 dom.window.close();
}
const dom=new JSDOM(readFileSync('learn/index.html','utf8'),{url:'https://brainilabgames.com/learn/#academy?q=colors',runScripts:'outside-only'});
const w=dom.window,d=w.document,course=d.querySelector('[data-format=academy]');
// Isolate a lesson-only term: it need not appear in the course title or summary.
course.dataset.searchLessons=JSON.stringify([{slug:'spelling-lesson',title:'Seeing colours differently'}]);
w.eval(script);
assert.equal(course.hidden,false);
assert.equal(course.querySelector('[data-matched-lesson]').getAttribute('href'),'/learn/spelling-lesson/');
assert.equal(course.querySelector('[data-matched-lesson]').textContent,'Lesson: Seeing colours differently →');
assert.equal(d.querySelector('#learn-search').value,'colors');
dom.window.close();
console.log('PASS: British/American search in both directions, lesson links, original query/hash, whole-word names and no fuzzy false matches.');
