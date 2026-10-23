import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {renderNews,renderEmptyNews,NEWS_WINDOW_MS} from '../lib/breaking-news.js';
const {JSDOM}=createRequire(import.meta.url)(process.env.JSDOM_MODULE||'jsdom');
const now=Date.parse('2026-10-23T12:00:00Z');
const item={title:'A source-backed headline',summary:'A short, attributed summary of the report.',sourceName:'Research & Science',sourceUrl:'https://example.org/news/one',reportedAt:'2026-10-23T05:00:00Z'};
const edition=stories=>({generatedAt:'2026-10-23T10:00:00Z',stories});
const doc=html=>new JSDOM('<main>'+html+'</main>').window.document;
test('one source action per story, accessible headlines and visible source dates',()=>{
 const d=doc(renderNews(edition([item]),now));
 assert.equal(d.querySelectorAll('h1').length,1);assert.equal(d.querySelectorAll('h2').length,1);
 const article=d.querySelector('li article'),link=article.querySelector('.breaking-news__story-link');
 assert.equal(article.querySelectorAll('a').length,1);assert.equal(link.href,item.sourceUrl);
 assert.equal(link.target,'_blank');assert.ok(link.rel.split(' ').includes('noopener'));assert.match(link.textContent,/opens in a new tab/);
 assert.equal(article.querySelector('.breaking-news__publisher').textContent,item.sourceName);
 assert.equal(article.querySelector('time').dateTime,'2026-10-23T05:00:00.000Z');assert.match(article.querySelector('time').textContent,/23 Oct 2026/);
 assert.match(d.querySelector('.breaking-news__edition').textContent,/1 story from 1 source/);
 assert.match(d.querySelector('.breaking-news__summary').textContent,/attributed summary/);
});
test('counts describe only the surviving edition, including duplicate source names',()=>{
 const stories=Array.from({length:5},(_,i)=>({...item,title:'Story '+i,sourceUrl:'https://example.org/news/'+i,sourceName:i<2?'BBC News':'Source '+i}));
 stories.push({...item,title:'Expired',sourceUrl:'https://example.org/expired',reportedAt:new Date(now-NEWS_WINDOW_MS).toISOString()});
 const d=doc(renderNews(edition(stories),now));
 assert.equal(d.querySelectorAll('li article').length,5);assert.match(d.querySelector('.breaking-news__edition').textContent,/5 stories from 4 sources/);
 assert.equal(d.querySelectorAll('li time').length,5);assert.doesNotMatch(d.querySelector('main').textContent,/Expired/);
});
test('calendar dates use UTC rather than the viewer clock',()=>{
 const d=doc(renderNews(edition([{...item,reportedAt:'2026-10-23T00:10:00+02:00'}]),now));
 assert.match(d.querySelector('li time').textContent,/22 Oct 2026/);assert.match(d.querySelector('.breaking-news__note').textContent,/UTC/);
});
test('empty and expired editions have a useful route without invented dates or operational details',()=>{
 assert.equal(renderNews(edition([item]),now+NEWS_WINDOW_MS),'');
 const d=doc(renderEmptyNews());assert.equal(d.querySelectorAll('h1').length,1);assert.equal(d.querySelectorAll('time').length,0);
 assert.equal(d.querySelector('.breaking-news__empty a').getAttribute('href'),'/learn/');assert.doesNotMatch(d.body.textContent,/API|Codex|key|retry|Updated/i);
});
test('source names are escaped and no headline can create markup or unsafe links',()=>{
 const html=renderNews(edition([item]),now);assert.match(html,/Research &amp; Science/);
 for(const bad of [{...item,title:'<img src=x onerror=alert(1)>'},{...item,sourceUrl:'javascript:alert(1)'}])assert.equal(renderNews(edition([bad]),now),'');
});
test('template keeps indexing rules and removes home-only loading and stylesheet work',()=>{
 const html=readFileSync(new URL('../breaking-news/index.html',import.meta.url),'utf8');
 assert.match(html,/content="noindex,follow"/);assert.match(html,/class="editorial-skip" href="#main-content"/);
 assert.doesNotMatch(html,/home\.css|homeQuiz\[data-home-loading\]/);assert.match(html,/aria-current="page" class="news-nav-link"/);
 const css=readFileSync(new URL('../assets/css/breaking-news.css',import.meta.url),'utf8');
 assert.doesNotMatch(css,/news-aura|@keyframes|animation:/);assert.match(css,/:focus-visible/);
});
