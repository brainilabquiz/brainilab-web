import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {renderNews,renderEmptyNews,newsEditionRevision} from '../lib/breaking-news.js';
const {JSDOM}=createRequire(import.meta.url)(process.env.JSDOM_MODULE||'jsdom');
const now=Date.parse('2026-10-23T12:00:00Z');
const item={title:'A report with its original headline',summary:'An original summary that remains fully readable.',sourceName:'BBC News',sourceUrl:'https://example.org/report',reportedAt:'2026-10-23T08:00:00Z'};
const edition=n=>({generatedAt:'2026-10-23T10:00:00Z',stories:Array.from({length:n},(_,i)=>({...item,title:item.title+' '+i,sourceName:['BBC News','The Guardian','Al Jazeera','NASA','WHO'][i],sourceUrl:item.sourceUrl+'/'+i}))});
test('every card has one labelled source action, original text and an explicit visual reading action',()=>{
 for(const count of [1,2,3,4,5]){
  const e=edition(count),d=new JSDOM(renderNews(e,now)).window.document;
  assert.equal(d.querySelectorAll('.breaking-news__story').length,count);
  const ids=[...d.querySelectorAll('[id]')].map(x=>x.id);assert.equal(new Set(ids).size,ids.length);
  for(const [i,article] of [...d.querySelectorAll('article')].entries()){
   const link=article.querySelector('a');assert.equal(article.querySelectorAll('a').length,1);
   assert.equal(link.href,e.stories[i].sourceUrl);assert.equal(link.target,'_blank');assert.match(link.rel,/noopener/);
   const labels=link.getAttribute('aria-labelledby').split(' ').map(id=>d.getElementById(id));assert.ok(labels.every(Boolean));assert.equal(labels[0].textContent,e.stories[i].title);assert.match(labels[1].textContent,/opens in a new tab/);
   assert.equal(article.querySelector('.breaking-news__summary').textContent,e.stories[i].summary);
   assert.equal(article.querySelector('.breaking-news__publisher').textContent,e.stories[i].sourceName);
   assert.equal(article.querySelector('.breaking-news__mark').getAttribute('aria-hidden'),'true');
   assert.equal(link.querySelector('.bn-read-short').textContent,'Read report');
   assert.equal(link.querySelector('.bn-read-full').textContent,'Read the full report on '+e.stories[i].sourceName);
  }
  assert.equal(d.querySelector('[data-news-revision]').dataset.newsRevision,newsEditionRevision(e,now));
 }
});
test('masthead uses edition time and distinguishes the next scheduled check',()=>{
 const nextCheck=new Date('2026-10-24T00:00:00Z');
 const d=new JSDOM(renderNews(edition(5),now,{nextCheck})).window.document;
 assert.equal(d.querySelector('.bn-kicker time').dateTime,'2026-10-23');
 assert.equal(d.querySelector('.bn-live time').dateTime,'2026-10-23T10:00:00.000Z');
 assert.equal(d.querySelector('.bn-live time').textContent,'10:00 UTC');
 assert.equal(d.querySelector('.breaking-news__edition time').dateTime,nextCheck.toISOString());
 const empty=new JSDOM(renderEmptyNews({nextCheck})).window.document;
 assert.equal(empty.querySelector('.bn-live').textContent,'No current edition');
 assert.equal(empty.querySelector('.bn-kicker time'),null);
 assert.equal(empty.querySelector('[data-news-filter]'),null);
 assert.equal(empty.querySelector('.bn-report-link').getAttribute('href'),'/suggestions/');
});
test('card and navigation styling preserve full text, focus and a quiet single active state',()=>{
 const css=readFileSync(new URL('../assets/css/breaking-news.css',import.meta.url),'utf8'),global=readFileSync(new URL('../assets/css/visual-system.css',import.meta.url),'utf8');
 assert.doesNotMatch(css,/line-clamp|text-overflow|infinite/);assert.match(css,/:focus-visible/);assert.match(css,/min-height:\s*44px/);
 assert.match(css,/@media \(prefers-reduced-motion: no-preference\)\s*\{\s*\.bn-pulse\s*\{\s*animation:/);
 assert.match(global,/a\.news-nav-link\{[^}]*animation:none!important/);assert.match(global,/a\.news-nav-link::after\{display:none!important\}/);
});
