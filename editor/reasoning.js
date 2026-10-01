import {questions,scoreAnswers,challengeVersion} from './reasoning-questions.js';
const root=document.querySelector('[data-reasoning]');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const storageKey='brainilab-reasoning:'+challengeVersion;
let answers=[],index=0,selected=null,checked=false;
function readSaved(){try{const a=JSON.parse(sessionStorage.getItem(storageKey));if(Array.isArray(a)&&a.length<=questions.length&&a.every(n=>Number.isInteger(n)&&n>=0&&n<4))return a;}catch{}return [];}
function save(){try{sessionStorage.setItem(storageKey,JSON.stringify(answers));}catch{}}
function focus(){root.querySelector('h2')?.focus({preventScroll:true});root.scrollIntoView({block:'start',behavior:'auto'});}
function visual(q){return q.grid?`<table class="reason-grid"><caption>Each row follows the same rule</caption><tbody>${q.grid.map(row=>`<tr>${row.map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`:q.visual?`<div class="reason-tiles" aria-hidden="true">${q.visual.map(v=>`<span>${esc(v)}</span>`).join('')}</div><p class="sr-only">${q.visual.map(v=>({'●':'circle','■':'square','▲':'triangle','↑':'up arrow','→':'right arrow','↻':'clockwise turn','↕':'horizontal reflection','?':'question mark'})[v]||v).join(', ')}</p>`:'';}
function intro(){
 answers=readSaved();
 root.innerHTML=`<div class="reason-intro"><span class="reason-icon" aria-hidden="true">✦</span><p class="eyebrow">Patterns · numbers · space · logic</p><h2 tabindex="-1">Take a moment. Work it out.</h2><p>Twelve puzzles, one at a time. Choose an answer, then see the reasoning behind it. There is no timer.</p><div class="reason-facts"><span><strong>12</strong> puzzles</span><span><strong>4</strong> kinds of thinking</span><span><strong>1</strong> point per answer</span></div><button class="btn" data-start>${answers.length&&answers.length<questions.length?'Continue your challenge':answers.length===questions.length?'See your result':'Start the challenge'}</button><p class="reason-note">A score for these puzzles, not an IQ measurement.</p>${answers.length?'<button class="reason-text-button" data-fresh>Start again with the same puzzles</button>':''}</div>`;
 root.querySelector('[data-start]').onclick=()=>{index=answers.length;selected=null;checked=false;index===questions.length?result():question();focus();};
 root.querySelector('[data-fresh]')?.addEventListener('click',()=>{answers=[];index=0;selected=null;checked=false;save();question();focus();});
}
function question(){
 const q=questions[index];
 root.innerHTML=`<div class="reason-top"><span>Puzzle ${index+1} of ${questions.length}</span><span>${q.topic}</span></div><progress aria-label="Puzzles answered" value="${answers.length}" max="${questions.length}"></progress><h2 tabindex="-1">${esc(q.prompt)}</h2>${visual(q)}<fieldset class="reason-options"><legend class="sr-only">Choose one answer</legend>${q.options.map((s,i)=>`<label><input type="radio" name="answer" value="${i}"/><span class="reason-letter" aria-hidden="true">${'ABCD'[i]}</span><span>${esc(s)}</span></label>`).join('')}</fieldset><button class="btn" data-check disabled>Check my answer</button><section class="reason-feedback" aria-live="polite" hidden></section><button class="btn" data-next hidden>${index===questions.length-1?'See my result':'Next puzzle →'}</button><p class="reason-note">No timer. Your answers stay in this tab if you reload.</p>`;
 root.querySelectorAll('input').forEach(radio=>radio.addEventListener('change',()=>{if(checked)return;selected=Number(radio.value);root.querySelector('[data-check]').disabled=false;}));
 root.querySelector('[data-check]').onclick=()=>{
  if(checked||selected===null)return;
  checked=true;answers[index]=selected;save();
  root.querySelectorAll('input').forEach((input,i)=>{input.disabled=true;input.closest('label').classList.toggle('is-correct',i===q.answer);input.closest('label').classList.toggle('is-wrong',i===selected&&i!==q.answer);});
  const feedback=root.querySelector('.reason-feedback');feedback.hidden=false;feedback.innerHTML=`<strong>${selected===q.answer?'That’s right. +1 point':'The answer is '+esc(q.options[q.answer])+'.'}</strong><p>${esc(q.explanation)}</p>`;
  root.querySelector('[data-check]').hidden=true;root.querySelector('[data-next]').hidden=false;root.querySelector('progress').value=answers.length;
 };
 root.querySelector('[data-next]').onclick=()=>{if(!checked)return;index++;selected=null;checked=false;index===questions.length?result():question();focus();};
}
function result(){
 const score=scoreAnswers(answers);
 root.innerHTML=`<div class="reason-result"><p class="eyebrow">Challenge complete</p><h2 tabindex="-1">You worked through all twelve.</h2><div class="reason-score"><strong>${score.correct}</strong><span>/ ${score.total}<small>puzzles solved</small></span></div><p>${score.correct===12?'Every answer matched. Try explaining one of the trickier ones in your own words.':'Take another look at the explanations. A missed puzzle is a useful place to start.'}</p><div class="reason-breakdown">${Object.entries(score.byTopic).map(([topic,s])=>`<div><strong>${s.correct}<small> / ${s.total}</small></strong><span>${topic}</span></div>`).join('')}</div><p class="reason-note">This result describes these twelve puzzles only. It is not an IQ score or a measure of your overall ability.</p><a class="btn" href="/learn/paths/patterns-and-reasoning/">Explore patterns and reasoning →</a><button class="reason-text-button" data-review>Review my answers</button><button class="reason-text-button" data-replay>Try the same puzzles again</button><div data-review-list hidden>${questions.map((q,i)=>`<details><summary><span>${answers[i]===q.answer?'✓':'↺'}</span> ${i+1}. ${esc(q.prompt)}</summary><p>Your answer: <strong>${esc(q.options[answers[i]])}</strong></p><p>Correct answer: <strong>${esc(q.options[q.answer])}</strong></p><p>${esc(q.explanation)}</p><a href="/learn/${q.lesson}/">Explore this idea →</a></details>`).join('')}</div></div>`;
 root.querySelector('[data-review]').onclick=()=>{const list=root.querySelector('[data-review-list]');list.hidden=!list.hidden;root.querySelector('[data-review]').setAttribute('aria-expanded',String(!list.hidden));};
 root.querySelector('[data-replay]').onclick=()=>{answers=[];index=0;selected=null;checked=false;save();question();focus();};
}
if(root)intro();
