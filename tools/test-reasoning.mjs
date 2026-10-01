import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {questions,scoreAnswers,challengeVersion} from '../editor/reasoning-questions.js';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
assert.equal(questions.length,12);assert.equal(new Set(questions.map(q=>q.id)).size,12);
questions.forEach(q=>{assert.equal(new Set(q.options).size,4);assert.ok(q.answer>=0&&q.answer<4);assert.ok(q.explanation.length>40);});
// Independent expected answers guard editorial mistakes, not merely the scoring implementation.
assert.deepEqual(questions.map(q=>q.options[q.answer]),['Triangle','14','Right','Red circle','17','Friday','Bottom-right','It is not a triangle','47','13','Up','27']);
assert.equal(scoreAnswers(questions.map(q=>q.answer)).correct,12);assert.equal(scoreAnswers(questions.map(q=>(q.answer+1)%4)).correct,0);
const html=readFileSync('reasoning/index.html','utf8'),js=readFileSync('assets/js/reasoning.bundle.js','utf8');
function page(saved){const dom=new JSDOM(html,{url:'https://brainilabgames.com/reasoning/',runScripts:'outside-only'});dom.window.HTMLElement.prototype.scrollIntoView=()=>{};if(saved)dom.window.sessionStorage.setItem('brainilab-reasoning:'+challengeVersion,saved);dom.window.eval(js);return dom;}
let dom=page(),w=dom.window,root=w.document.querySelector('[data-reasoning]');root.querySelector('[data-start]').click();assert.equal(root.querySelector('[data-check]').disabled,true);
for(let i=0;i<12;i++){
 const choice=i%2===0?questions[i].answer:(questions[i].answer+1)%4;
 const input=root.querySelector(`input[value="${choice}"]`);input.checked=true;input.dispatchEvent(new w.Event('change',{bubbles:true}));root.querySelector('[data-check]').click();
 assert.equal(root.querySelectorAll('input:not(:disabled)').length,0);assert.ok(!root.querySelector('.reason-feedback').hidden);
 root.querySelector('[data-check]').click();assert.equal(JSON.parse(w.sessionStorage.getItem('brainilab-reasoning:'+challengeVersion)).length,i+1);
 if(i===3){const saved=w.sessionStorage.getItem('brainilab-reasoning:'+challengeVersion);dom.window.close();dom=page(saved);w=dom.window;root=w.document.querySelector('[data-reasoning]');assert.match(root.querySelector('[data-start]').textContent,/Continue/);root.querySelector('[data-start]').click();}
 else root.querySelector('[data-next]').click();
}
assert.equal(root.querySelector('.reason-score strong').textContent,'6');assert.equal(root.querySelectorAll('.reason-breakdown>div').length,4);root.querySelector('[data-review]').click();assert.equal(root.querySelector('[data-review-list]').hidden,false);assert.equal(root.querySelectorAll('details').length,12);root.querySelector('[data-replay]').click();assert.match(root.querySelector('.reason-top').textContent,/Puzzle 1/);assert.equal(JSON.parse(w.sessionStorage.getItem('brainilab-reasoning:'+challengeVersion)).length,0);dom.window.close();
for(const bad of ['{}','[null]','[4]','[0,null]','not-json']){const d=page(bad);assert.equal(d.window.document.querySelector('[data-start]').textContent,'Start the challenge');d.window.close();}
console.log('PASS reasoning: original answer key, 0/12 and 12/12, mixed 6/12, single-submit, refresh/resume, review/replay and corrupt-storage recovery.');
