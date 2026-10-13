import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {prepareArticle,renderPage} from '../lib/learn-content.js';
import {enrichAuthors} from '../lib/learning-render.js';
import {readyPaths} from '../lib/learning-model.js';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const authors=read('content/authors.json');
const articles=enrichAuthors(readdirSync('content/articles').map(f=>prepareArticle(read('content/articles/'+f))),authors);
const paths=readyPaths(readdirSync('content/paths').map(f=>read('content/paths/'+f)),articles);
const template=readFileSync('learn/index.html','utf8');
const snapshot=JSON.stringify({articles,paths});
let steps=0;
for(const path of paths){
 for(const [i,lesson] of path.lessons.entries()){
  const article=articles.find(a=>a.slug===lesson.slug);
  // No script runs: the next lesson must be accessible after reading alone.
  const dom=new JSDOM(renderPage(template,articles,article,paths));
  const d=dom.window.document;
  const following=articles.find(a=>a.slug===path.lessons[i+1]?.slug);
  const href=following?`/learn/${following.slug}/`:`/learn/paths/${path.slug}/`;
  const link=[...d.querySelectorAll('[data-course-step]')].find(a=>a.getAttribute('href')===href);
  assert.ok(link,`${lesson.slug}: expected ${href}`);
  assert.equal(link.closest('details'),null,'Continue without expanding a panel');
  assert.equal(link.closest('.article-end')?.tagName,'FOOTER');
  assert.equal(link.hidden,false);
  assert.equal(link.target,'','Internal course links stay in the current tab');
  assert.equal(link.querySelector('.course-step-label').textContent,following?'Next lesson':'Back to course');
  assert.equal(link.querySelector('strong').textContent,following?.title||path.title);
  assert.equal(link.getAttribute('aria-label'),`${following?'Next lesson':'Back to course'}: ${following?.title||path.title}`);
  assert.equal(link.querySelector('.course-step-arrow').getAttribute('aria-hidden'),'true');
  for(const fold of d.querySelectorAll('.article-fold'))assert.equal(fold.open,false);
  assert.ok(d.querySelector('details.article-course [data-path-progress]'),'Existing saved progress remains available');
  if(i)assert.ok([...d.querySelectorAll('details.article-course a')].some(a=>a.getAttribute('href')===`/learn/${path.lessons[i-1].slug}/`),'Previous lesson remains reachable');
  assert.equal(d.querySelectorAll('.article-body>section').length,article.sections.length);
  dom.window.close();steps++;
 }
}
for(const article of articles.filter(a=>!paths.some(p=>p.lessons.some(l=>l.slug===a.slug)))){
 const dom=new JSDOM(renderPage(template,articles,article,paths));
 assert.equal(dom.window.document.querySelector('[data-course-step]'),null,'Ordinary articles do not get course controls');
 dom.window.close();
}
assert.equal(JSON.stringify({articles,paths}),snapshot,'Rendering preserves content, quizzes, versions and course order');
console.log(`PASS Academy course flow: ${steps} direct steps across ${paths.length} courses, final return links, no JavaScript requirement, folded tools, previous lessons and ordinary articles preserved.`);
