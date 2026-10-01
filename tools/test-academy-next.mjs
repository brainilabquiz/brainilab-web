import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {prepareArticle,renderPage} from '../lib/learn-content.js';
import {enrichAuthors} from '../lib/learning-render.js';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const articles=enrichAuthors(readdirSync('content/articles').map(f=>prepareArticle(read('content/articles/'+f))),read('content/authors.json'));
const paths=readdirSync('content/paths').map(f=>read('content/paths/'+f));
const article=articles.find(a=>a.slug==='decimals-money-and-parts-of-ten'),course=paths.find(p=>p.slug==='fractions-from-zero');
const html=renderPage(readFileSync('learn/index.html','utf8'),articles,article,paths);
const bundle=readFileSync('assets/js/learning-paths.bundle.js','utf8');
const tick=()=>new Promise(r=>setTimeout(r,10));
async function round(w){for(let i=0;i<article.quiz.questions.length;i++){w.document.querySelector(`[name="question-${i}"][value="${article.quiz.questions[i].answer}"]`).checked=true;w.document.querySelector('form[data-lesson-quiz]').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await tick();w.document.querySelector('[data-quiz-next]').click();await tick();}}
function dom(){return new JSDOM(html,{url:'https://brainilabgames.com/learn/'+article.slug+'/',runScripts:'outside-only'});}
const guest=dom(),w=guest.window;w.eval(bundle);await tick();
const lab=w.document.querySelector('[data-academy-lab=decimals]'),slider=lab.querySelector('input'),mode=lab.querySelector('select'),output=lab.querySelector('[data-lab-output]');
assert.equal(lab.querySelectorAll('.is-filled').length,50);
mode.value='100';mode.dispatchEvent(new w.Event('change'));assert.equal(slider.value,'50');assert.match(output.textContent,/0.50/);
slider.value='5';slider.dispatchEvent(new w.Event('input'));assert.equal(lab.querySelectorAll('.is-filled').length,5);assert.match(output.textContent,/smaller than 0.5/);
mode.value='10';mode.dispatchEvent(new w.Event('change'));assert.match(output.textContent,/rounds to the nearest/);assert.equal(slider.value,'1');
for(const n of [0,10]){slider.value=n;slider.dispatchEvent(new w.Event('input'));assert.equal(lab.querySelectorAll('.is-filled').length,n*10);}
await round(w);
assert.equal(w.document.querySelector('[data-completion-panel]').hidden,false);
assert.match(w.document.querySelector('[data-completion-progress]').textContent,/1 of 6.*17%/);
assert.equal(w.document.querySelector('[data-completion-next]').getAttribute('href'),'/learn/fractions-equal-parts/');
assert.match(w.document.querySelector('[data-completion-xp]').textContent,/Sign in/);
w.document.querySelector('[data-quiz-retry]').click();assert.equal(w.document.querySelector('[data-completion-panel]').hidden,true);
guest.window.close();
// A full course offers its successor; failed sync never claims XP, retries replace the message.
const signed=dom(),sw=signed.window;const saved={};for(const l of course.lessons.slice(0,-1)){saved[l.slug]={version:articles.find(a=>a.slug===l.slug).quiz.version,score:3,total:3};}
sw.localStorage.setItem('brainilab_learning_v1:test-account',JSON.stringify(saved));let attempts=0;
const client={auth:{getSession:async()=>({data:{session:{user:{id:'test-account'}}}})},from:()=>({select:()=>({eq:async()=>({data:[]})})}),rpc:async()=>++attempts===1?{error:{message:'network'}}:{data:{xp_awarded:40}}};
sw.BrainiBackendAuth={getClient:()=>client};sw.eval(bundle);await tick();await round(sw);
assert.match(sw.document.querySelector('[data-completion-progress]').textContent,/6 of 6.*100%/);
assert.equal(sw.document.querySelector('[data-follow-course]').hidden,false);
assert.match(sw.document.querySelector('[data-completion-xp]').textContent,/Retry/);
assert.ok(!sw.document.querySelector('[data-completion-xp]').textContent.includes('+40'));
sw.document.querySelector('[data-sync-retry]').click();await tick();
assert.equal(sw.document.querySelector('[data-completion-xp]').textContent,'+40 XP added to your account');
assert.equal(sw.document.querySelector('[data-sync-retry]').hidden,true);
client.rpc=async()=>({data:{xp_awarded:0}});sw.document.querySelector('[data-quiz-retry]').click();await round(sw);
assert.match(sw.document.querySelector('[data-completion-xp]').textContent,/already earned/);
sw.dispatchEvent(new sw.CustomEvent('brainilab:backend-auth',{detail:{session:null}}));await tick();assert.equal(sw.document.querySelector('[data-completion-panel]').hidden,true);
signed.window.close();
console.log('PASS: decimal values/mode/bounds; guest progress; gaps; whole-course next step; XP failure/retry/replay and account switch.');
