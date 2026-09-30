import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const read=p=>readFileSync(p,'utf8');
function page(file,path,script){const dom=new JSDOM(read(file),{url:'https://brainilabgames.com'+path,runScripts:'outside-only'});dom.window.eval(read(script));dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));return dom;}
for(const query of ['?type=numbers','?type=words','?type=quizzes','?type=private%40example.com','?type=words&type=numbers']){
 const d=page('games/index.html','/games/'+query,'assets/js/game-discovery.js'),w=d.window;
 const shown=()=>[...w.document.querySelectorAll('[data-anytime-game]')].filter(e=>!e.hidden);
 const expected=query==='?type=numbers'?3:query==='?type=words'?3:query==='?type=quizzes'?11:17;
 assert.equal(shown().length,expected);assert.equal(w.document.querySelectorAll('[aria-pressed="true"]').length,1);
 w.document.querySelector('[data-game-filter="all"]').click();assert.equal(shown().length,17);assert.equal(new URL(w.location.href).searchParams.has('type'),false);
 w.document.querySelector('[data-game-filter="words"]').click();assert.deepEqual(shown().map(e=>e.dataset.anytimeGame),['brainiword','connections','oddoneout']);assert.equal(new URL(w.location.href).searchParams.get('type'),'words');d.window.close();
}
const plain=new JSDOM(read('games/index.html'));assert.equal(plain.window.document.querySelectorAll('[data-anytime-game][hidden]').length,0);assert.equal(plain.window.document.querySelector('[data-game-filters]').hidden,true);plain.window.close();
const d=page('suggestions/index.html','/suggestions/?context=post-game&game=worldflags','assets/js/suggestions-ui.js'),w=d.window,doc=w.document;
assert.equal(doc.querySelector('h1').textContent,'How was your game?');assert.equal(doc.getElementById('feedbackGame').textContent,'About World Flags');
const form=doc.getElementById('suggestionsForm'),message=form.elements.message,submit=()=>form.dispatchEvent(new w.Event('submit',{cancelable:true}));
let calls=0,resolve,reject,payload;
w.BrainiFeedback={submit:async p=>{calls++;payload=p;return new Promise((yes,no)=>{resolve=yes;reject=no;});}};
submit();assert.equal(calls,0);assert.equal(doc.activeElement,message);
message.value='The clue was hard to read on my phone.';submit();submit();assert.equal(calls,1);assert.equal(form.querySelector('[type="submit"]').disabled,true);assert.match(payload.message,/^\[After playing World Flags\]/);
reject(new Error('private server detail'));await new Promise(r=>setTimeout(r,0));assert.equal(form.hidden,false);assert.equal(message.value,'The clue was hard to read on my phone.');assert.ok(!doc.getElementById('suggestionsError').textContent.includes('private'));
let sent=0;w.addEventListener('brainilab:feedbacksent',()=>sent++);submit();resolve({ok:true});await new Promise(r=>setTimeout(r,0));assert.equal(form.hidden,true);assert.equal(doc.getElementById('suggestionsSuccess').hidden,false);assert.equal(sent,1);assert.equal(doc.activeElement,doc.getElementById('suggestionsSuccess'));
doc.getElementById('suggestAnother').click();assert.equal(message.value,'');assert.equal(form.elements.type.value,'improvement');assert.equal(form.hidden,false);w.close();
const invalid=page('suggestions/index.html','/suggestions/?context=post-game&game=%3Cimg%3E','assets/js/suggestions-ui.js');assert.equal(invalid.window.document.getElementById('feedbackGame').hidden,true);invalid.window.close();
console.log('PASS: 17-card filter coverage, shareable views, duplicate/invalid queries, no-JS fallback; optional feedback validation, duplicate submit lock, retry, success focus and safe context.');
