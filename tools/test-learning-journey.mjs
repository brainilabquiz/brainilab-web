import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resumeSection,enrichAuthors} from '../lib/learning-render.js';
import {prepareArticle} from '../lib/learn-content.js';
import {serveLearn} from '../lib/learn-worker.js';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const articles=enrichAuthors(readdirSync('content/articles').map(f=>read('content/articles/'+f)).filter(a=>a.status==='published').map(prepareArticle),read('content/authors.json'));
const paths=readdirSync('content/paths').map(f=>read('content/paths/'+f));
const p=paths[0],first=articles.find(a=>a.slug===p.lessons[0].slug),bundle=readFileSync('assets/js/learning-paths.bundle.js','utf8');
const tick=()=>new Promise(r=>setTimeout(r,15));
const dom=new JSDOM(resumeSection(paths,articles),{url:'https://brainilabgames.com/profile/',runScripts:'outside-only'}),w=dom.window;
w.localStorage.setItem('brainilab_learning_v1:guest',JSON.stringify({[first.slug]:{version:first.quiz.version,score:1,total:3}}));
w.eval(bundle);await tick();
assert.equal(w.document.querySelectorAll('[data-resume-course]:not([hidden])').length,1);
assert.equal(w.document.querySelector('[data-resume-course]:not([hidden]) [data-continue]').getAttribute('href'),'/learn/'+p.lessons[1].slug+'/');
assert.equal(w.document.querySelector('[data-resume-empty]').hidden,true);
// Switching accounts must never transfer a guest's course progress.
let resolveRemote;
const client={from:()=>({select:()=>({eq:()=>new Promise(r=>resolveRemote=r)})})};
w.BrainiBackendAuth={getClient:()=>client};
w.dispatchEvent(new w.CustomEvent('brainilab:backend-auth',{detail:{session:{user:{id:'other'}}}}));await tick();
assert.equal(w.document.querySelectorAll('[data-resume-course]:not([hidden])').length,0);
w.dispatchEvent(new w.CustomEvent('brainilab:backend-auth',{detail:{session:null}}));await tick();
resolveRemote({data:[]});await tick();
assert.equal(w.document.querySelectorAll('[data-resume-course]:not([hidden])').length,1);
w.localStorage.setItem('brainilab_learning_v1:guest',JSON.stringify({[first.slug]:{version:'outdated'}}));w.dispatchEvent(new w.StorageEvent('storage',{key:'brainilab_learning_v1:guest'}));
assert.equal(w.document.querySelectorAll('[data-resume-course]:not([hidden])').length,0);
dom.window.close();
// Worker uses public directory only, no personalized HTML or stale withdrawn courses.
const template=readFileSync('profile/index.html','utf8');
const assets={fetch:async()=>new Response(template)};const ctx={waitUntil:()=>{}};const cache={match:async()=>null,put:async()=>{}};
const fetcher=async url=>new Response(JSON.stringify((url.includes('/learn_publications?')?articles:url.includes('/learn_paths?')?paths:read('content/authors.json')).map(document=>({document}))));
const response=await serveLearn(new Request('https://brainilabgames.com/profile/'),{ASSETS:assets},ctx,cache,fetcher);const html=await response.text();
assert.equal(response.headers.get('cache-control'),'no-store');assert.equal((html.match(/learning-paths.bundle.js/g)||[]).length,1);assert.ok(html.includes('data-resume-course'));
const fallback=await serveLearn(new Request('https://brainilabgames.com/profile/'),{ASSETS:assets},ctx,cache,async()=>{throw Error('offline');});const fh=await fallback.text();
assert.ok(fh.includes('Today’s Daily'));assert.ok(fh.includes('Try Academy again'));assert.ok(!fh.includes('data-resume-course'));
// One recommendation, including safe handling of explicit puzzle guidance.
const resultDom=new JSDOM('<div id="result"></div>',{url:'https://brainilabgames.com/games/number-route/',runScripts:'outside-only'}),rw=resultDom.window;
rw.eval(readFileSync('assets/js/post-game.js','utf8'));rw.eval(readFileSync('assets/js/puzzle-results.js','utf8'));
rw.BrainiPuzzleResults.show(rw.document.querySelector('#result'),{gameId:'numberroute',name:'Number Route',result:{correct:2,total:3,practice:true},guide:{href:'/learn/how-to-play-number-route/',title:'Follow the running total'},summary:'Practice'});
assert.equal(rw.document.querySelectorAll('.post-guide').length,1);assert.equal(rw.document.querySelector('.post-guide').getAttribute('href'),'/learn/how-to-play-number-route/');
for(const gameId of ['brainmix','sequence','science','brainiword','worldcapitals']){rw.BrainiPostGame.mount(rw.document.querySelector('#result'),{gameId,result:{correct:1,total:3,practice:true}});assert.equal(rw.document.querySelectorAll('.post-guide').length,1,gameId);}
rw.close();console.log('PASS: resume links, guest/account isolation, stale versions and requests, profile worker/fallback, one relevant result recommendation.');
