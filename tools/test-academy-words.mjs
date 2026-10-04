import {labBundle,labMarkup} from './academy-lab-fixture.mjs';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {activityFor} from '../lib/academy-labs.js';
import {validQuiz,gradeQuiz,pathProgress,readyPaths} from '../lib/learning-model.js';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const path=read('content/paths/word-detective.json');
const articles=readdirSync('content/articles').map(f=>read('content/articles/'+f));
assert.equal(readyPaths([path],articles).length,1);
const cases=[['homophones-same-sound-different-meaning','sentence-clues',[1,0,0]],['words-that-mean-their-own-opposite','dust',[0,1,1]],['connections-puzzles-find-the-hidden-link','specific-test',[0,1,1]]];
for(const [slug,section,answers] of cases){
 const dom=new JSDOM(activityFor(slug,section),{url:'https://brainilabgames.com/learn/'+slug+'/',runScripts:'outside-only'}),w=dom.window;
 w.eval(labBundle);
 const lab=w.document.querySelector('.academy-lab'),out=lab.querySelector('[data-lab-output]');
 assert.equal(lab.querySelectorAll('[aria-hidden="true"] button').length,0);
 for(const [i,answer] of answers.entries()){
  const buttons=lab.querySelectorAll('.lab-choices button');
  buttons[1-answer].click();assert.match(out.textContent,/^Not quite\./);
  buttons[answer].click();assert.match(out.textContent,/^That fits\./);
  assert.equal(lab.querySelectorAll('[aria-pressed="true"]').length,1);
  assert.equal(buttons[answer].getAttribute('aria-pressed'),'true');
  assert.equal(lab.querySelector('[data-lab-visual]').dataset.solved,'true');
  lab.querySelector('[data-word-next]').click();
  assert.equal(w.document.activeElement,lab.querySelector('legend'));
  assert.equal(lab.querySelectorAll('[aria-pressed="true"]').length,0);
  assert.equal(lab.querySelector('.word-lab-counter').textContent,`Clue ${(i+1)%3+1} of 3`);
 }
 assert.equal(w.localStorage.length,0,'Practice must not write progress or XP');
 assert.equal(out.getAttribute('aria-live'),'polite');dom.window.close();
 const article=articles.find(a=>a.slug===slug);assert.equal(validQuiz(article.quiz),true);
 assert.equal(gradeQuiz(article.quiz,article.quiz.questions.map(q=>q.answer)).score,3);
 assert.equal(gradeQuiz(article.quiz,article.quiz.questions.map(q=>(q.answer+1)%4)).score,0);
}
const lessons=path.lessons.map(l=>({slug:l.slug,version:'word-detective-v1'})),saved={};
for(const [i,l] of lessons.entries()){saved[l.slug]={version:l.version};assert.equal(pathProgress(lessons,saved).percent,[33,67,100][i]);}
const html=readFileSync('learn/paths/word-detective/index.html','utf8');
assert.match(html,/Course chapters/);assert.match(html,/biel-sarda/);assert.match(html,/homophones-same-sound-different-meaning-small.webp/);
for(const l of lessons)assert.ok(html.includes('/learn/'+l.slug+'/'));
assert.ok(readFileSync('sitemap.xml','utf8').includes('/learn/paths/word-detective/'));
assert.ok(readFileSync('learn/index.html','utf8').includes(path.title));
console.log('PASS Word detective: all 9 practice scenes, wrong/right/retry, focus/reset, no XP writes, final quizzes, 33/67/100 progress, discovery and sitemap.');
