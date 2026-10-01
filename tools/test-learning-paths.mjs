import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {validQuiz,gradeQuiz,pathProgress,readyPaths} from '../lib/learning-model.js';
import {renderPage,prepareArticle,cleanHtml} from '../lib/learn-content.js';
import {renderLearningPage,enrichAuthors,teamSection} from '../lib/learning-render.js';
import {serveLearn} from '../lib/learn-worker.js';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const authors=read('content/authors.json'),articles=enrichAuthors(readdirSync('content/articles').map(f=>prepareArticle(read('content/articles/'+f))),authors),paths=readdirSync('content/paths').map(f=>read('content/paths/'+f)),template=readFileSync('learn/index.html','utf8');
assert.equal(readyPaths(paths,articles).length,paths.length);
const lesson=articles.find(a=>a.slug===paths[0].lessons[0].slug),quiz=lesson.quiz;
assert.equal(validQuiz(quiz),true);assert.throws(()=>gradeQuiz(quiz,[0]));assert.equal(gradeQuiz(quiz,quiz.questions.map(q=>q.answer)).score,3);
assert.equal(validQuiz({...quiz,questions:[...quiz.questions,{prompt:'Missing',options:['A','A','B','C'],answer:0,explanation:'Duplicate'}]}),false);
const ls=paths[0].lessons.map(l=>({slug:l.slug,version:articles.find(a=>a.slug===l.slug).quiz.version}));
assert.equal(pathProgress(ls,{[ls[0].slug]:{version:ls[0].version}}).percent,Math.round(100/ls.length));assert.equal(pathProgress(ls,{[ls[0].slug]:{version:'outdated'}}).percent,0);
assert.equal(readyPaths(paths,articles.filter(a=>a.slug!==lesson.slug)).length,paths.length-1);
assert.ok(cleanHtml('<table><caption>Compare</caption><tr><th scope="col">A</th><td onclick="bad()">B</td></tr></table>').includes('<th scope="col">'));assert.ok(!cleanHtml('<table onclick="bad()"><tr><td style="color:red">x</td></tr></table>').includes('onclick'));
const html=renderPage(template,articles,lesson,paths);assert.equal((html.match(/src="\/assets\/js\/learning-paths.bundle/g)||[]).length,1);assert.match(html,/By <a[^>]+href="\/about\/#biel-sarda"[^>]*>Biel Sardà<\/a>/);assert.ok(html.includes('data-lesson-quiz'));
const schema=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);assert.equal(schema['@graph'].find(x=>x['@type']==='Article').author['@type'],'Person');
assert.ok(!teamSection([...authors,{slug:'private',name:'Private Person',visible:false}]).includes('Private Person'));
for(const author of authors.filter(a=>a.visible&&a.active!==false&&a.photo))assert.ok(teamSection([author]).includes('src="'+author.photo+'"'),'Published author portrait must render instead of initials');
const env={ASSETS:{fetch:async r=>new Response(new URL(r.url).pathname.startsWith('/about')?readFileSync('about/index.html','utf8'):template)}},ctx={waitUntil(){}},cache={match:async()=>null,put:async()=>{}};
const fetcher=async url=>new Response(JSON.stringify((url.includes('learn_paths?')?paths:url.includes('learn_authors?')?authors:articles).map(document=>({document}))));
assert.equal((await serveLearn(new Request('https://brainilabgames.com/learn/paths/missing/'),env,ctx,cache,fetcher)).status,404);
const page=await serveLearn(new Request('https://brainilabgames.com/learn/paths/'+paths[0].slug+'/'),env,ctx,cache,fetcher);assert.equal(page.status,200);const pathHTML=await page.text();assert.ok(pathHTML.includes('data-lesson-number="3"'));assert.ok(pathHTML.includes('academy-sidebar'));assert.ok(!pathHTML.includes('What you will learn'));assert.ok(!pathHTML.includes(paths[0].outcomes[0]));assert.ok(pathHTML.includes('BrainiLab Academy'));assert.ok(html.includes('aria-current="page"'));
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const dom=new JSDOM(html,{url:'https://brainilabgames.com/learn/'+lesson.slug+'/',runScripts:'outside-only'}),w=dom.window;w.structuredClone=structuredClone;w.eval(readFileSync('assets/js/learning-paths.bundle.js','utf8'));
async function playRound(win, quiz, wrongFirst=false){
 await new Promise(r=>setTimeout(r,10));
 for(let i=0;i<quiz.questions.length;i++){
  assert.equal(win.document.querySelectorAll('fieldset:not([hidden])').length,1);
  const q=quiz.questions[i],choice=wrongFirst&&i===0?(q.answer+1)%4:q.answer;
  win.document.querySelector(`[name="question-${i}"][value="${choice}"]`).checked=true;
  win.document.querySelector('[data-lesson-quiz]').dispatchEvent(new win.Event('submit',{bubbles:true,cancelable:true}));
  await new Promise(r=>setTimeout(r,0));
  assert.equal(win.document.querySelectorAll(`fieldset[data-question="${i}"] input:not(:disabled)`).length,0);
  if(i===0&&wrongFirst)assert.equal(win.document.querySelectorAll('.answer.wrong').length,1);
  win.document.querySelector('[data-quiz-next]').click();
  await new Promise(r=>setTimeout(r,0));
 }
}
await playRound(w,quiz);
assert.match(w.document.querySelector('[data-quiz-result]').textContent,/3 of 3 correct/);assert.ok([...w.document.querySelectorAll('[data-explanation]')].every(e=>!e.hidden));
const stored=w.localStorage.getItem('brainilab_learning_v1:guest');assert.equal(JSON.parse(stored)[lesson.slug].version,quiz.version);
const pathDom=new JSDOM(renderLearningPage(template,{articles,paths,authors,path:paths[0]}),{url:'https://brainilabgames.com/learn/paths/',runScripts:'outside-only'});pathDom.window.localStorage.setItem('brainilab_learning_v1:guest',stored);pathDom.window.eval(readFileSync('assets/js/learning-paths.bundle.js','utf8'));
assert.equal(pathDom.window.document.querySelector('[data-lesson-number]').textContent,'✓');assert.match(pathDom.window.document.querySelector('[data-progress-label]').textContent,new RegExp(Math.round(100/ls.length)+'%'));
w.document.querySelector('[data-quiz-retry]').click();assert.equal(w.document.querySelectorAll('input:checked').length,0);assert.equal(JSON.parse(w.localStorage.getItem('brainilab_learning_v1:guest'))[lesson.slug].version,quiz.version);
// Every navigational link carries the explicit new-tab policy.
for(const a of w.document.querySelectorAll('a[href]')){const external=/^https?:$/.test(a.protocol)&&a.hostname.replace(/^www\./,'')!=='brainilabgames.com';assert.equal(a.target,external?'_blank':'');assert.equal(a.relList.contains('noopener'),external);}
dom.window.close();pathDom.window.close();
// Every current Academy lesson has a working in-article lab.
for(const article of articles.filter(a=>a.quiz)){
 const labDom=new JSDOM(renderPage(template,articles,article,paths),{url:'https://brainilabgames.com/learn/'+article.slug+'/',runScripts:'outside-only'}),lw=labDom.window;
 lw.eval(readFileSync('assets/js/learning-paths.bundle.js','utf8'));
 const lab=lw.document.querySelector('[data-academy-lab]');assert.ok(lab,article.slug);assert.ok(lab.querySelector('[data-lab-output]').textContent.length>25);
 const input=lab.querySelector('input,select');if(input){input.value=input.type==='range'?input.max:input.type==='number'?'2000':'1';input.dispatchEvent(new lw.Event('input',{bubbles:true}));assert.ok(lab.querySelector('[data-lab-output]').textContent.length>20);}
 if(article.slug==='multiply-by-11-in-your-head'){const cell=lab.querySelector('[data-r="8"][data-c="2"]');cell.click();assert.match(lab.querySelector('.lab-equation').textContent,/8 × 2 = 16/);assert.equal(lab.querySelectorAll('button.is-product').length,1);cell.dispatchEvent(new lw.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));assert.match(lab.querySelector('.lab-equation').textContent,/8 × 3 = 24/);}
 if(article.slug==='mental-math-round-and-adjust'){for(let i=0;i<4;i++)lab.querySelector('[data-step]').click();assert.match(lab.querySelector('[data-lab-output]').textContent,/65 real stickers/);}
 labDom.window.close();
}
// Account switches must not reuse guest answers, and old server versions must not erase current local completion.
const accountDom=new JSDOM(html,{url:'https://brainilabgames.com/learn/'+lesson.slug+'/',runScripts:'outside-only'}),aw=accountDom.window;
aw.localStorage.setItem('brainilab_learning_v1:account-a',stored);
const client={auth:{getSession:async()=>({data:{session:{user:{id:'account-a'}}}})},from:()=>({select:()=>({eq:async(_,id)=>({data:id==='account-a'?[{article_slug:lesson.slug,quiz_version:'old-version',score:1,total:3}]:[]})})}),rpc:async()=>({data:{}})};
aw.BrainiBackendAuth={getClient:()=>client};aw.eval(readFileSync('assets/js/learning-paths.bundle.js','utf8'));await new Promise(r=>setTimeout(r,10));
assert.match(aw.document.querySelector('[data-progress-label]').textContent,new RegExp(Math.round(100/ls.length)+'%'));
await playRound(aw,quiz,true);
aw.dispatchEvent(new aw.CustomEvent('brainilab:backend-auth',{detail:{session:{user:{id:'account-b'}}}}));await new Promise(r=>setTimeout(r,10));
assert.match(aw.document.querySelector('[data-progress-label]').textContent,/0%/);assert.equal(aw.document.querySelectorAll('input:checked').length,0);assert.equal(aw.document.querySelectorAll('fieldset:not([hidden]) input:disabled').length,0);assert.equal(aw.document.querySelector('[type=submit]').hidden,false);accountDom.window.close();
// Admin: edit person/socials, path order and selected author without touching production.
const admin=new JSDOM('<div id="root"></div>',{url:'https://brainilabgames.com/admin/',runScripts:'outside-only'}),a=admin.window;a.structuredClone=structuredClone;a.confirm=()=>true;
const ar=authors.map(document=>({slug:document.slug,revision:1,document})),pr=paths.map(document=>({slug:document.slug,revision:1,document,published_revision:1}));let saved;
const rpc=async(name,p)=>name==='admin_list_learn_articles'?articles.map(document=>({slug:document.slug,document,published_revision:1})):name==='admin_list_learning_entities'?(p.p_kind==='author'?ar:pr):name==='admin_save_learning_entity'?(saved=p,{slug:p.p_slug}):[];
a.eval(readFileSync('assets/js/admin-learning.bundle.js','utf8'));await a.BrainiLearningAdmin.render({root:a.document.querySelector('#root'),rpc,sb:{},kind:'author'});a.document.querySelector('[data-entity]').click();assert.equal(a.document.querySelector('#entity-name').value,'Biel Sardà');const existingSocials=a.document.querySelectorAll('[data-social]').length;a.document.querySelector('#add-social').click();assert.equal(a.document.querySelectorAll('[data-social]').length,existingSocials+1);const newSocial=a.document.querySelectorAll('[data-social]')[existingSocials];newSocial.querySelector('[data-label]').value='YouTube';newSocial.querySelector('[data-url]').value='https://www.youtube.com/@BrainiLab';a.document.querySelector('[data-entity-save=publish]').click();await new Promise(r=>setTimeout(r,10));assert.equal(saved.p_document.socials[existingSocials].url,'https://www.youtube.com/@BrainiLab');assert.deepEqual(JSON.parse(JSON.stringify(saved.p_document.socials.slice(0,existingSocials))),authors[0].socials||[]);
await a.BrainiLearningAdmin.render({root:a.document.querySelector('#root'),rpc,sb:{},kind:'path'});a.document.querySelector('[data-entity]').click();const first=a.document.querySelector('[data-path-lesson]').dataset.pathLesson;a.document.querySelector('[data-lesson-move="1"]').click();assert.notEqual(a.document.querySelector('[data-path-lesson]').dataset.pathLesson,first);assert.equal(a.document.querySelector('#editor-author').value,'biel-sarda');admin.window.close();
console.log(`PASS: ${paths.length} coherent paths, ${articles.reduce((n,a)=>n+(a.quiz?.questions.length||0),0)} quiz questions, progress/version rules, full-round grading, retry/reload, completion tick, tables, safe HTML, Person/byline privacy, live path routing, admin author/social/path ordering.`);
