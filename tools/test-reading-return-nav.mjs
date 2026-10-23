import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {articleJourney} from '../lib/article-game.js';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href),tick=()=>new Promise(r=>setTimeout(r,0));
const source=readFileSync(process.env.READING_NAV_SCRIPT||'assets/js/post-game.js','utf8');
const articles=readdirSync('content/articles').filter(f=>f.endsWith('.json')).map(f=>JSON.parse(readFileSync('content/articles/'+f,'utf8'))).filter(a=>a.status==='published').map(articleJourney).filter(Boolean);
let checks=0;
async function setup({path='/games/math-rush/',query='#learn-multiply-by-11-in-your-head',directory={version:1,articles},delay=false,html}={}){
 const dom=new JSDOM(html||readFileSync('.'+path+'index.html','utf8'),{url:'https://brainilabgames.com'+path+query,runScripts:'outside-only'}),w=dom.window,d=w.document;
 await new Promise(resolve=>d.addEventListener('DOMContentLoaded',resolve,{once:true}));
 const nav=d.querySelector('main .breadcrumb,main .reason-header'),before=nav?.outerHTML,originalTabs=[...d.querySelectorAll('.quiz-difficulty-tabs a')].map(a=>a.getAttribute('href'));
 const game=d.querySelector('#mathRushGame,#leafQuiz,[data-reasoning]'),gameHTML=game?.outerHTML;
 let calls=0,finish,writes=0;
 w.AbortController=AbortController;w.BrainiData={authState:()=>({status:'guest'}),saveResult:()=>writes++,addXP:()=>writes++};
 w.fetch=async(url,options)=>{calls++;assert.equal(url,'/assets/data/learn-game-links.json');assert.equal(options.credentials,'omit');if(delay)await new Promise(r=>finish=r);if(directory instanceof Error)throw directory;return {ok:true,json:async()=>directory};};
 w.eval(source);await tick();
 const h={w,d,dom,nav,before,originalTabs,game,gameHTML,calls:()=>calls,finish:()=>finish?.(),setHash:async hash=>{w.history.replaceState(null,'',path+query.split('#')[0]+hash);w.dispatchEvent(new w.Event('hashchange'));await tick();},close:()=>{assert.equal(writes,0);assert.equal(w.localStorage.length,0);assert.equal(w.sessionStorage.length,0);checks++;w.close();}};
 return h;
}
let h=await setup();
assert.equal(h.nav.querySelectorAll('a').length,1);assert.equal(h.nav.querySelector('a').getAttribute('href'),'/learn/multiply-by-11-in-your-head/');assert.equal(h.nav.textContent,'← Back to article');assert.equal(h.game.outerHTML,h.gameHTML);assert.equal(h.calls(),1);
h.w.dispatchEvent(new h.w.Event('pageshow'));await tick();assert.equal(h.calls(),1);assert.equal(h.nav.querySelectorAll('.reading-return-link').length,1);
const start=h.game.querySelector('[data-start]');start.focus();await h.setHash('#learn-mental-math-round-and-adjust');assert.equal(h.d.activeElement,start);assert.match(h.nav.querySelector('a').href,/mental-math-round-and-adjust/);
await h.setHash('');assert.equal(h.nav.outerHTML,h.before,'Original breadcrumb nodes/labels restored');h.close();
h=await setup();const result=h.d.createElement('div');h.d.querySelector('main').append(result);h.w.BrainiPostGame.mount(result,{gameId:'mathrush',result:{correct:5,total:10,score:500},focus:false});await tick();assert.equal(h.calls(),1,'Arrival and result share one metadata request');assert.equal(result.querySelector('.post-guide>span').textContent,'Back to your reading');assert.equal(result.querySelector('.post-guide').getAttribute('href'),'/learn/multiply-by-11-in-your-head/');h.close();
h=await setup({path:'/geography/world-flags-quiz/',query:'?difficulty=easy&set=1#learn-how-to-learn-world-flags'});
for(const [i,tab]of [...h.d.querySelectorAll('.quiz-difficulty-tabs a')].entries()){
 assert.equal(tab.getAttribute('href'),h.originalTabs[i]+'#learn-how-to-learn-world-flags');
 const before=new URL(h.originalTabs[i],h.w.location.href),after=new URL(tab.href);assert.equal(after.pathname,before.pathname);assert.equal(after.search,before.search,'Only the article hash changes; difficulty/set selection is exact');
}
await h.setHash('#other');assert.equal(h.nav.outerHTML,h.before);assert.deepEqual([...h.d.querySelectorAll('.quiz-difficulty-tabs a')].map(a=>a.getAttribute('href')),h.originalTabs);h.close();
for(const context of articles.filter((a,i,all)=>all.findIndex(b=>b.gamePath===a.gamePath)===i)){
 h=await setup({path:context.gamePath,query:'#learn-'+context.slug});assert.equal(h.nav.querySelector('.reading-return-link').getAttribute('href'),'/learn/'+context.slug+'/');assert.equal(h.d.querySelectorAll('h1').length,1);if(h.game)assert.equal(h.game.outerHTML,h.gameHTML);h.close();
}
for(const hash of ['','#learn-../admin','#learn-'+('x'.repeat(101)),'#learn-x#learn-y','#learn-https://example.com']){
 h=await setup({query:hash});assert.equal(h.calls(),0);assert.equal(h.nav.outerHTML,h.before);h.close();
}
for(const directory of [new Error('offline'),{version:2,articles},{version:1,articles:[]},{version:1,articles:articles.map(a=>({...a,gamePath:'/other-game/'}))},{version:1,articles:articles.map(a=>({...a,title:'x'.repeat(221)}))}]){
 h=await setup({directory});assert.equal(h.nav.outerHTML,h.before);assert.equal(h.game.outerHTML,h.gameHTML);h.close();
}
h=await setup({delay:true});await h.setHash('#learn-unknown');h.finish();await tick();assert.equal(h.nav.outerHTML,h.before,'A late response never shows the previous article');await h.setHash('#learn-multiply-by-11-in-your-head');assert.equal(h.nav.querySelectorAll('.reading-return-link').length,1);assert.equal(h.calls(),1);h.close();
h=await setup({delay:true});const focused=h.nav.querySelectorAll('a')[1];focused.focus();h.finish();await tick();assert.equal(h.d.activeElement,focused);assert.equal(h.nav.outerHTML,h.before,'Late metadata does not remove a focused breadcrumb');h.close();
h=await setup({delay:true});h.nav.remove();h.finish();await tick();assert.equal(h.nav.hasAttribute('data-reading-context'),false);h.close();
h=await setup({delay:true});const pending=h.d.createElement('div');h.d.querySelector('main').append(pending);h.w.BrainiPostGame.mount(pending,{gameId:'mathrush',result:{correct:2,total:5,score:200},focus:false});await h.setHash('#learn-mental-math-round-and-adjust');h.finish();await tick();assert.equal(pending.querySelector('.post-guide>span').textContent,'A little reading','A delayed result cannot restore an older article after the hash changes');assert.match(h.nav.querySelector('a').href,/mental-math-round-and-adjust/);assert.equal(h.calls(),1);h.close();
h=await setup({path:'/games/brainiword/',query:'?archive=2026-08-29#learn-repeated-letters-in-five-letter-word-games'});assert.equal(h.w.location.search,'?archive=2026-08-29');assert.equal(h.nav.querySelector('.reading-return-link').getAttribute('href'),'/learn/repeated-letters-in-five-letter-word-games/');h.close();
h=await setup({directory:{version:1,articles:articles.map(a=>({...a,title:'<img src=x onerror=alert(1)> "Read" & play'}))}});assert.equal(h.nav.querySelector('img'),null);assert.match(h.nav.querySelector('a').getAttribute('aria-label'),/<img/);h.close();
h=await setup({html:'<main><nav class="breadcrumb"><a href="/">Home</a></nav><h1>Other page</h1></main>'});assert.equal(h.calls(),0);assert.equal(h.nav.outerHTML,h.before);h.close();
console.log(`PASS reading return navigation: ${checks} real-page/failure/race cases, existing breadcrumb/Academy link, exact difficulty queries, one shared request, safe restoration/focus and no game/progress/storage writes.`);
