import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {pathProgress} from '../lib/learning-model.js';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const path=JSON.parse(readFileSync('content/paths/maths-from-zero.json','utf8'));
const lessons=path.lessons.map(l=>({...l,version:'maths-zero-v1'})),done={};
for(let i=0;i<3;i++){done[lessons[i].slug]={version:lessons[i].version};assert.equal(pathProgress(lessons,done).percent,[33,67,100][i]);}
for(const lesson of path.lessons){
 const dom=new JSDOM(readFileSync(`learn/${lesson.slug}/index.html`,'utf8'),{url:`https://brainilabgames.com/learn/${lesson.slug}/`,runScripts:'outside-only'}),w=dom.window;
 w.eval(readFileSync('assets/js/learning-paths.bundle.js','utf8'));
 const lab=w.document.querySelector('[data-academy-lab]'),inputs=[...lab.querySelectorAll('input[type=range]')],output=lab.querySelector('[data-lab-output]');
 const set=(i,value)=>{inputs[i].value=value;inputs[i].dispatchEvent(new w.Event('input',{bubbles:true}));};
 if(lab.dataset.academyLab==='add-basics'){
  assert.equal(lab.querySelectorAll('.lab-counter').length,5);assert.ok(!output.textContent.includes('= 5'));
  lab.querySelector('[data-reveal]').click();assert.match(output.textContent,/2 \+ 3 = 5/);
  set(0,10);set(1,10);assert.equal(lab.querySelectorAll('.lab-counter').length,20);lab.querySelector('[data-reveal]').click();assert.match(output.textContent,/10 \+ 10 = 20/);
  set(0,0);set(1,0);lab.querySelector('[data-reveal]').click();assert.match(output.textContent,/0 \+ 0 = 0/);assert.equal(lab.querySelectorAll('.lab-counter').length,0);
 }else if(lab.dataset.academyLab==='subtract-basics'){
  const take=lab.querySelector('[data-take]'),back=lab.querySelector('[data-back]');
  take.click();take.click();assert.match(output.textContent,/6 − 2 = 4/);assert.equal(lab.querySelectorAll('.is-removed').length,2);
  back.click();assert.match(output.textContent,/6 − 1 = 5/);
  for(let i=0;i<10;i++)take.click();assert.match(output.textContent,/6 − 6 = 0/);assert.equal(take.disabled,true);
  set(0,2);assert.match(output.textContent,/2 − 0 = 2/);assert.equal(back.disabled,true);
  set(0,0);assert.equal(take.disabled,true);assert.equal(back.disabled,true);
 }else{
  assert.equal(lab.querySelectorAll('.lab-equal-groups .lab-pile').length,3);assert.equal(lab.querySelectorAll('.lab-counter').length,6);
  lab.querySelector('[data-reveal]').click();assert.match(output.textContent,/3 × 2 = 6/);
  set(0,6);set(1,6);lab.querySelector('[data-reveal]').click();assert.match(output.textContent,/6 × 6 = 36/);assert.equal(lab.querySelectorAll('.lab-counter').length,36);
  set(0,0);lab.querySelector('[data-reveal]').click();assert.match(output.textContent,/0 × 6 = 0/);
  set(0,3);set(1,0);lab.querySelector('[data-reveal]').click();assert.match(output.textContent,/3 × 0 = 0/);
  const cell=lab.querySelector('[data-r="8"][data-c="2"]');cell.click();assert.match(lab.querySelector('.lab-equation').textContent,/8 × 2 = 16/);
  cell.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));assert.match(lab.querySelector('.lab-equation').textContent,/8 × 3 = 24/);
 }
 assert.ok(w.document.querySelector('nav[aria-label="Course chapters"]'));assert.ok(w.document.querySelector('[data-lesson-quiz]'));
 dom.window.close();
}
console.log('Maths from zero: all three labs, zero/max boundaries, reveal/reset, table keyboard and 33/67/100 completion passed.');
