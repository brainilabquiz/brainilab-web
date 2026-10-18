import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {articleJourney,articleGame} from '../lib/article-game.js';
import {prepareArticle} from '../lib/learn-content.js';
import {readingPages,refreshGameReadings} from '../lib/game-readings.js';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const articles=readdirSync('content/articles').filter(f=>f.endsWith('.json')).map(f=>JSON.parse(readFileSync('content/articles/'+f,'utf8'))).filter(a=>a.status==='published').map(prepareArticle);
for(const file of readingPages){
 const html=readFileSync(file,'utf8'),result=refreshGameReadings(html,articles,file);
 assert.equal(refreshGameReadings(result,articles,file),result,'reading refresh is idempotent');
 const d=new JSDOM(result).window.document,links=[...d.querySelectorAll('[data-game-guides] a')];
 assert.equal(d.querySelectorAll('[data-game-guides]').length,1);assert.ok(links.length>=1&&links.length<=2);
 for(const link of links){const a=articles.find(a=>link.getAttribute('href')==='/learn/'+a.slug+'/');assert.ok(a);assert.equal(link.querySelector('strong').textContent,a.title);const image=link.querySelector('img');assert.equal(image.alt,'');assert.ok(existsSync(image.getAttribute('src').slice(1)));assert.equal(image.getAttribute('loading'),'lazy');}
 assert.equal(d.querySelectorAll('aside[aria-label="Related reading"]').length,0);
 d.defaultView.close();
}
const flag=articles.find(a=>a.slug==='how-to-learn-world-flags');
let d=new JSDOM(articleGame(flag.game,flag));let u=new URL(d.window.document.querySelector('a').href,'https://brainilabgames.com');assert.equal(u.searchParams.get('difficulty'),'easy');assert.equal(u.searchParams.get('set'),'1');assert.equal(u.hash,'#learn-'+flag.slug);d.window.close();
assert.equal(articleJourney({...flag,slug:'../admin'}),null);assert.equal(articleJourney({...flag,game:{url:'/daily-quiz/'}}),null);
const source=readFileSync('assets/js/post-game.js','utf8'),tick=()=>new Promise(r=>setTimeout(r,0));
function setup(search='',directory=null){
 const dom=new JSDOM('<main></main>',{url:'https://brainilabgames.com/geography/world-flags-quiz/'+search,runScripts:'outside-only'}),w=dom.window;
 let calls=0,requestOptions,opened=[];w.AbortController=AbortController;
 w.fetch=async(path,options)=>{calls++;requestOptions=options;assert.equal(path,'/assets/data/learn-game-links.json');if(directory instanceof Error)throw directory;return {ok:true,json:async()=>directory||{version:1,articles:articles.map(articleJourney).filter(Boolean)}};};
 w.BrainiData={authState:()=>({status:'guest'})};w.BrainiAuth={open:async o=>opened.push(o)};
 w.eval(source);const root=w.document.querySelector('main');
 const mount=extra=>w.BrainiPostGame.mount(root,{gameId:'worldflags',result:{correct:4,total:5,score:400},focus:false,...extra});mount();
 return {dom,w,root,mount,calls:()=>calls,requestOptions:()=>requestOptions,opened};
}
let h=setup('?difficulty=easy&set=1#learn-how-to-learn-world-flags');
await tick();assert.equal(h.calls(),1);assert.equal(h.requestOptions().credentials,'omit');assert.equal(h.root.querySelector('.post-guide strong').textContent,flag.title+' →');assert.equal(h.root.querySelector('.post-guide>span').textContent,'Back to your reading');assert.equal(h.root.querySelectorAll('.post-guide').length,1);h.mount();await tick();assert.equal(h.calls(),1,'one directory request per page');assert.equal(h.root.querySelector('.post-primary').pathname,'/games/','result navigation preserved');assert.equal(h.w.localStorage.length,0);
assert.equal(h.opened.length,0);h.w.BrainiSiteAnalytics={accountPrompt:()=>{throw Error('analytics unavailable');}};h.root.querySelector('[data-join-account]').click();await tick();assert.deepEqual(h.opened.map(o=>({...o})),[{source:'game_result',mode:'signup'}]);assert.ok(!h.root.querySelector('[data-join-account]').disabled);
h.w.BrainiAuth.open=async()=>{throw Error('sign in offline');};h.root.querySelector('[data-join-account]').click();await tick();assert.ok(!h.root.querySelector('[data-account-error]').hidden);assert.ok(!h.root.querySelector('[data-join-account]').disabled);h.root.querySelector('[data-dismiss-account]').click();assert.ok(h.root.querySelector('[data-account-invite]').hidden);h.dom.window.close();
for(const query of ['', '#learn-../admin','#learn-https://evil.example','#learn-x#learn-y','#learn-'+('a'.repeat(101)),'?learn=ignored-query']){h=setup(query);await tick();assert.equal(h.calls(),0,query);assert.notEqual(h.root.querySelector('.post-guide>span').textContent,'Back to your reading');h.dom.window.close();}
for(const directory of [new Error('offline'),{version:2,articles:[]},{version:1,articles:[{...articleJourney(flag),gameId:'science'}]},{version:1,articles:[{...articleJourney(flag),gamePath:'/sports/sports-quiz/'}]}]){h=setup('#learn-'+flag.slug,directory);await tick();assert.equal(h.root.querySelector('.post-guide>span').textContent,'A little reading');assert.equal(h.root.querySelector('.post-score').textContent,'4 / 5');h.dom.window.close();}
h=setup('#learn-'+flag.slug,{version:1,articles:[{...articleJourney(flag),title:'<img src=x onerror=alert(1)>'}]});await tick();assert.equal(h.root.querySelector('.post-guide img'),null);assert.match(h.root.querySelector('.post-guide strong').textContent,/<img/);h.dom.window.close();
console.log('PASS reading journeys: nineteen game sections, original covers/current titles, safe article context, query preservation, mismatches/offline fallback, one request/no storage, intact result routing and resilient explicit/dismissible sign-up.');
