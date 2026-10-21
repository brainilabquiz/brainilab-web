import assert from 'node:assert/strict';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {prepareArticle,articleBody,safeLink,cleanHtml} from '../lib/learn-content.js';
import {articleGame,articleJourney} from '../lib/article-game.js';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);

const flags='/geography/world-flags-quiz/?difficulty=easy&set=1';
for(const url of [flags,'/science/science-quiz/?set=2&difficulty=hard','/sports/sports-quiz/?difficulty=medium#main-content','/history/history-quiz/?set=1'])assert.equal(safeLink(url),true,url);
for(const url of ['//evil.example/','javascript:alert(1)','/geography/world-flags-quiz/?difficulty=easy&difficulty=hard','/geography/world-flags-quiz/?set=1&set=2','/geography/world-flags-quiz/?difficulty=easy&email=private@example.com','/geography/world-flags-quiz/?next=https://evil.example/','/geography/world-flags-quiz/?set=0','/geography/world-flags-quiz/?set=-1','/geography/world-flags-quiz/?set=01','/geography/world-flags-quiz/?set=1.5','/geography/world-flags-quiz/?difficulty=%65asy','/geography/world-flags-quiz/?difficulty=expert','/admin/?set=1','/profile/?difficulty=easy','/geography/world-flags-quiz/?difficulty=easy\\@evil.example','/geography/world-flags-quiz/?set=1#<script>'])assert.equal(safeLink(url),false,url);
assert.ok(cleanHtml(`<p><a href="${flags}">Play</a><a href="javascript:alert(1)">Bad</a></p>`).includes('difficulty=easy&amp;set=1'));
assert.ok(!cleanHtml('<a href="/geography/world-flags-quiz/?email=private">Bad</a>').includes('href='));

const articles=readdirSync('content/articles').filter(f=>f.endsWith('.json')).map(file=>JSON.parse(readFileSync('content/articles/'+file,'utf8'))).filter(a=>a.status==='published');
let total=0;
for(const raw of articles){
 const a=prepareArticle(raw);
 assert.equal(a.game.url,raw.game.url,`${a.slug}: destination must not silently change`);
 assert.deepEqual(a.quiz,raw.quiz,`${a.slug}: quiz must not change`);
 assert.ok(existsSync(a.game.url.split(/[?#]/)[0].slice(1)+'index.html'),a.slug);
 const dom=new JSDOM(articleBody(a,[a])),link=dom.window.document.querySelector('[data-article-game]');
 const destination=new URL(link.getAttribute('href'),'https://brainilabgames.com'),original=new URL(raw.game.url,'https://brainilabgames.com');
 assert.equal(destination.pathname,original.pathname,a.slug);
 assert.equal(destination.hash,articleJourney(a)&&!original.hash?'#learn-'+a.slug:original.hash,a.slug);
 const pastWordPuzzle=original.pathname==='/games/brainiword/'&&!original.search;
 assert.equal(destination.search,pastWordPuzzle?'?archive=2026-08-29':original.search,a.slug);
 if(pastWordPuzzle){
  assert.ok(!destination.searchParams.has('daily')&&!destination.searchParams.has('try')&&!destination.searchParams.has('today'),'Reading practice cannot select a Daily extra');
  assert.match(link.querySelector('.article-game-action').textContent,/Try a past puzzle/);
 }else assert.match(link.querySelector('.article-game-action').textContent,/Play now/);
 assert.equal(dom.window.document.querySelectorAll('[data-article-game]').length,1,a.slug);
 const image=link.querySelector('img');assert.equal(image.alt,'');
 assert.ok(existsSync(image.getAttribute('src').slice(1)),a.slug);
 assert.equal(link.querySelectorAll('button,input,iframe').length,0,a.slug);
 assert.equal(dom.window.document.querySelectorAll('.article-fold[open]').length,0,a.slug);
 dom.window.close();total++;
}
assert.equal(total,articles.length);assert.ok(total>0);
const catalogue=new JSDOM(readFileSync('games/index.html','utf8'));
assert.equal(new URL(catalogue.window.document.querySelector('[data-random-past-game="brainiword"]').getAttribute('href'),'https://brainilabgames.com/games/').search,'?archive=2026-08-29','Use the existing safe catalogue fallback date');
catalogue.window.close();
for(const suffix of ['?archive=2026-09-07#existing','?daily=2026-10-21#existing']){
 const explicit=new JSDOM(articleGame({url:'/games/brainiword/'+suffix}));
 assert.equal(explicit.window.document.querySelector('a').getAttribute('href'),'/games/brainiword/'+suffix,'Preserve explicitly supplied game modes and hashes');
 explicit.window.close();
}
const oldHash=new JSDOM(articleGame({url:'/games/brainiword/#existing'}));
assert.equal(oldHash.window.document.querySelector('a').getAttribute('href'),'/games/brainiword/?archive=2026-08-29#existing');
oldHash.window.close();
const fallback=new JSDOM(articleGame({url:'/games/',name:'<img src=x onerror=alert(1)>'}));
assert.equal(fallback.window.document.querySelector('a').getAttribute('href'),'/games/');
assert.equal(fallback.window.document.querySelectorAll('img').length,1);
assert.ok(fallback.window.document.querySelector('a').textContent.includes('Explore games'));
fallback.window.close();
console.log(`PASS: ${total} article-to-game destinations, explicit unranked BrainiWord reading practice, preserved quiz data/modes/hashes, valid illustrations, folded tools, query options and rejected unsafe links.`);
