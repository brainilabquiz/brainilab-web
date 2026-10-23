import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,existsSync} from 'node:fs';
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
   assert.equal(link.querySelector('.breaking-news__summary').textContent,e.stories[i].summary);
   assert.equal(article.querySelector('.breaking-news__publisher').textContent,e.stories[i].sourceName);
   assert.equal(article.querySelector('.breaking-news__mark').getAttribute('aria-hidden'),'true');
   assert.equal(link.querySelector('.breaking-news__read').getAttribute('aria-hidden'),'true');assert.match(link.querySelector('.breaking-news__read').textContent,/Read report/);
  }
  assert.equal(d.querySelector('[data-news-revision]').dataset.newsRevision,newsEditionRevision(e,now));
 }
});
test('masthead image is decorative, local, dimensioned and responsive, including empty editions',()=>{
 for(const html of [renderNews(edition(5),now),renderEmptyNews()]){
  const d=new JSDOM(html).window.document,img=d.querySelector('.breaking-news__art img');
  assert.equal(img.alt,'');assert.equal(img.closest('picture').getAttribute('aria-hidden'),'true');assert.equal(img.width,640);assert.equal(img.height,427);assert.equal(img.getAttribute('loading'),'lazy');
  for(const path of [img.getAttribute('src'),...img.getAttribute('srcset').split(',').map(x=>x.trim().split(' ')[0])])assert.ok(existsSync(new URL('..'+path,import.meta.url)));
 }
});
test('card and navigation styling preserve full text, focus and a quiet single active state',()=>{
 const css=readFileSync(new URL('../assets/css/breaking-news.css',import.meta.url),'utf8'),global=readFileSync(new URL('../assets/css/visual-system.css',import.meta.url),'utf8');
 assert.doesNotMatch(css,/line-clamp|text-overflow|animation:|@keyframes/);assert.match(css,/:focus-visible/);assert.match(css,/min-height:44px/);
 assert.match(global,/a\.news-nav-link\{[^}]*animation:none!important/);assert.match(global,/a\.news-nav-link::after\{display:none!important\}/);
});
