import test, {after, before, mock} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import worker from '../worker.js';
import {BreakingNewsStore} from '../lib/public-page-store.js';
import {REFRESH_MS} from '../lib/news-refresh.js';
import {ARCHIVE_PATH, editionId, editionPath} from '../lib/news-archive.js';
import {manualNewsArchive} from '../lib/news-first-edition.js';

const origin = 'https://brainilabgames.com';
const now = Date.parse('2026-11-18T12:00:00Z');
const latestAt = now - 2*60*1000;
before(() => mock.method(Date, 'now', () => now));
after(() => mock.restoreAll());
const pageTemplate = readFileSync('breaking-news/index.html','utf8');
const ctx = {waitUntil(){throw Error('Archive browsing must not schedule work');}};
const edition = (time,n) => ({generatedAt:new Date(time).toISOString(), stories:[{
  title:'Headline '+n,summary:'An archived summary.',sourceName:'BBC News',
  sourceUrl:'https://www.bbc.com/news/articles/example'+n,reportedAt:new Date(time-60_000).toISOString(),evidence:'private evidence'
}]});

function fixture(count = 26) {
  const editions = Array.from({length:count},(_,i)=>edition(latestAt-i*REFRESH_MS,i));
  const archived = [...new Map([...manualNewsArchive, ...editions]
    .filter(item => Date.parse(item.generatedAt) <= now)
    .map(item => [Date.parse(item.generatedAt), {...item, generatedAt:new Date(item.generatedAt).toISOString()}])).values()]
    .sort((a,b) => b.generatedAt.localeCompare(a.generatedAt));
  const data = new Map(editions.map(item=>['audit:'+Math.floor(Date.parse(item.generatedAt)/REFRESH_MS),
    {edition:item,usage:{private:true},evidence:[{secret:true}]}]));
  data.set('edition',editions[0]);
  const effects = [];
  const storage = {
    async get(keys){return Array.isArray(keys)?new Map(keys.map(key=>[key,data.get(key)])):data.get(keys);},
    async list({start,end,limit,reverse}){
      assert.equal(reverse,true);assert(limit<=128);
      return new Map([...data].filter(([key])=>key>=start&&key<end).sort(([a],[b])=>b.localeCompare(a)).slice(0,limit));
    },
    async put(){effects.push('put');}, async setAlarm(){effects.push('alarm');},
    async transaction(run){effects.push('current-edition-transaction');return run(storage);}
  };
  const store = new BreakingNewsStore({storage},{});
  const calls = [];
  const env = {ASSETS:{fetch:async()=>new Response(pageTemplate,{headers:{'Content-Type':'text/html'}})},
    BREAKING_NEWS:{idFromName:name=>name,get:()=>({fetch:async url=>{
      calls.push(new URL(url).pathname);
      return store.fetch(new Request(url));
    }})}};
  return {editions,archived,effects,calls,store,env};
}

async function page(response) {
  const dom = new JSDOM(await response.text());
  const doc = dom.window.document;
  const pageNode = [...doc.querySelectorAll('script[type="application/ld+json"]')].flatMap(s=>JSON.parse(s.textContent)['@graph']||[])
    .find(node=>node['@type']==='CollectionPage');
  return {dom,doc,pageNode};
}

test('latest edition and two dated previews are visible in HTML with independent links and matching schema',async()=>{
  const f=fixture(), response=await worker.fetch(new Request(origin+'/breaking-news/'),f.env,ctx);
  const {dom,doc,pageNode}=await page(response);
  assert.equal(response.status,200);
  assert.equal(pageNode.dateModified,f.editions[0].generatedAt);
  assert.equal(doc.querySelector('.bn-status .bn-live time').dateTime,pageNode.dateModified);
  const previews=[...doc.querySelectorAll('.bn-previous [data-edition-link]')];
  const previous = f.archived.filter(item => item.generatedAt < f.editions[0].generatedAt).slice(0,2);
  assert.deepEqual(previews.map(a=>a.getAttribute('href')),previous.map(editionPath));
  assert.deepEqual(previews.map(a=>a.querySelector('time').dateTime),previous.map(e=>e.generatedAt));
  assert.equal(doc.querySelectorAll('[data-news-story]').length,1,'previous cards stay outside the live source filter');
  assert.equal(doc.querySelector('.bn-foot a').getAttribute('href'),editionPath(f.editions[0]));
  assert.deepEqual(pageNode.mainEntity.itemListElement.map(item=>item.url),f.editions[0].stories.map(story=>story.sourceUrl));
  assert(doc.querySelector('.bn-main').compareDocumentPosition(doc.querySelector('.bn-previous')) & 4);
  dom.window.close();
});

test('archive pagination and old editions match real links, original times and CollectionPage data',async()=>{
  const f=fixture();
  const index=await page(await worker.fetch(new Request(origin+ARCHIVE_PATH),f.env,ctx));
  const links=[...index.doc.querySelectorAll('[data-edition-link]')];
  assert.equal(links.length,20);
  assert.deepEqual(links.map(a=>a.getAttribute('href')),f.archived.slice(0,20).map(editionPath));
  assert.equal(index.pageNode.url,origin+ARCHIVE_PATH);
  assert.equal(index.pageNode.mainEntity.numberOfItems,links.length);
  assert.deepEqual(index.pageNode.mainEntity.itemListElement.map(n=>[n.name,n.url]),links.map(a=>[a.textContent,origin+a.getAttribute('href')]));
  const older=index.doc.querySelector('.bn-archive-pagination a').getAttribute('href');
  assert.equal(older,ARCHIVE_PATH+'?before='+editionId(f.archived[19].generatedAt));
  const second=await page(await worker.fetch(new Request(origin+older),f.env,ctx));
  assert.equal(second.pageNode.url,origin+older);
  assert.equal(second.doc.querySelector('link[rel=canonical]').href,origin+older);
  const earlier=[...second.doc.querySelectorAll('[data-edition-link]')];
  assert.deepEqual(earlier.map(a=>a.getAttribute('href')),f.archived.slice(20).map(editionPath));
  assert.equal(second.doc.querySelector('.bn-archive-pagination').textContent.trim(),'Newest editions');
  assert(!links.some(link=>earlier.some(other=>other.getAttribute('href')===link.getAttribute('href'))));

  const picked=f.editions.at(-1),path=editionPath(picked);
  const response=await worker.fetch(new Request(origin+path),f.env,ctx);
  const saved=await page(response);
  assert.equal(response.status,200);
  assert.equal(saved.doc.querySelector('link[rel=canonical]').href,origin+path);
  assert.equal(saved.doc.querySelector('[property="og:url"]').content,origin+path);
  assert.equal(saved.doc.querySelector('h1').textContent,saved.pageNode.name);
  assert.equal(saved.doc.querySelector('.bn-status .bn-live time').dateTime,picked.generatedAt);
  assert.equal(saved.pageNode.datePublished,picked.generatedAt);
  assert.equal(saved.pageNode.dateModified,undefined);
  assert.equal(saved.pageNode.mainEntity.itemListElement[0].url,picked.stories[0].sourceUrl);
  assert.equal(saved.doc.querySelector('article time').dateTime,picked.stories[0].reportedAt);
  assert(!saved.doc.querySelector('[data-news-refresh]'));
  assert(!saved.doc.documentElement.innerHTML.includes('private evidence'));

  const head=await worker.fetch(new Request(origin+path,{method:'HEAD'}),f.env,ctx);
  assert.equal(head.status,200);assert.equal(await head.text(),'');
  assert.equal(head.headers.get('Cache-Control'),response.headers.get('Cache-Control'));
  assert.deepEqual(f.effects,[]);assert(f.calls.every(path=>path==='/archive'));
  for(const result of [index,second,saved])result.dom.window.close();
});

test('source filters count current and earlier stories and keep the original archived source link',async()=>{
  const f=fixture();
  const response=await worker.fetch(new Request(origin+'/breaking-news/?source=bbc'),f.env,ctx);
  const {dom,doc}=await page(response);
  assert.equal(response.status,200);
  const expected=f.archived.flatMap(item=>item.stories).filter(story=>new URL(story.sourceUrl).hostname==='www.bbc.com');
  const count=Number(doc.querySelector('[data-news-source="bbc"] span').textContent);
  assert.equal(count,expected.length);
  assert.equal(doc.querySelector('[data-news-source="bbc"]').getAttribute('aria-current'),'page');
  assert.match(doc.querySelector('.bn-source-results p').textContent,new RegExp('^'+count+' stories · 1 in the latest edition · '+(count-1)+' from earlier editions$'));
  assert.equal(doc.querySelectorAll('[data-news-story]').length,1);
  assert.equal(doc.querySelector('[name=source]').value,'bbc');
  const archivedLink=doc.querySelector('.bn-source-history a');
  const saved=await page(await worker.fetch(new Request(origin+archivedLink.getAttribute('href')),f.env,ctx));
  const title=saved.doc.querySelector(new URL(archivedLink.href,origin).hash);
  assert.equal(title.textContent,archivedLink.textContent);
  assert.equal(title.closest('article').querySelector('.breaking-news__publisher').textContent,'BBC News');
  assert.equal(title.closest('article').querySelector('.breaking-news__story-link').href,f.editions[1].stories[0].sourceUrl);
  assert.equal(doc.querySelector('.bn-previous'),null);
  assert.deepEqual(f.effects,[]);
  assert(f.calls.every(path=>path==='/archive'));
  dom.window.close();saved.dom.window.close();
});

test('keyword searches combine with source filters and preserve both through paging and clear-search links',async()=>{
  const f=fixture(58);
  const result=await page(await worker.fetch(new Request(origin+'/breaking-news/?q=Headline&source=bbc'),f.env,ctx));
  const {doc}=result;
  assert.equal(doc.querySelector('#bn-news-query').value,'Headline');
  assert.equal(Number(doc.querySelector('[data-news-source="all"] span').textContent),58);
  assert.equal(Number(doc.querySelector('[data-news-source="bbc"] span').textContent),58);
  assert.equal(doc.querySelectorAll('.bn-source-history .bn-headline-links a').length,25);
  assert.equal(doc.querySelectorAll('[data-news-story]').length,1);
  const all=new URL(doc.querySelector('a[data-news-source="all"]').getAttribute('href'),origin);
  assert.equal(all.searchParams.get('q'),'Headline');
  assert.equal(all.searchParams.get('source'),'all');
  const next=doc.querySelector('.bn-archive-pagination a');
  const nextUrl=new URL(next.getAttribute('href'),origin);
  assert.equal(nextUrl.searchParams.get('q'),'Headline');
  assert.equal(nextUrl.searchParams.get('source'),'bbc');
  assert.equal(nextUrl.searchParams.get('page'),'2');
  const second=await page(await worker.fetch(new Request(nextUrl),f.env,ctx));
  assert.equal(second.doc.querySelectorAll('.bn-source-history .bn-headline-links a').length,25);
  assert.equal(second.doc.querySelectorAll('[data-news-story]').length,0);
  const firstLinks=[...doc.querySelectorAll('.bn-source-history .bn-headline-links a')].map(a=>a.getAttribute('href'));
  const duplicateLinks=[...second.doc.querySelectorAll('.bn-source-history .bn-headline-links a')].filter(a=>firstLinks.includes(a.getAttribute('href')));
  assert.deepEqual(duplicateLinks.map(a=>[a.textContent,a.getAttribute('href')]),[]);
  const clear=new URL(doc.querySelector('.bn-news-search a').getAttribute('href'),origin);
  assert.equal(clear.searchParams.get('source'),'bbc');
  assert.equal(clear.searchParams.has('q'),false);
  assert.equal(clear.searchParams.has('page'),false);
  assert.deepEqual(f.effects,[]);
  result.dom.window.close();second.dom.window.close();
});

test('editorial supplements are searchable by source and their anchors retain the published dates',async()=>{
  const f=fixture();
  const response=await worker.fetch(new Request(origin+'/breaking-news/?source=mongabay&q=Sri+Lanka'),f.env,ctx);
  const {dom,doc}=await page(response);
  assert.equal(response.status,200);
  assert.equal(doc.querySelector('[data-news-source="mongabay"] span').textContent,'1');
  assert.equal(doc.querySelectorAll('[data-news-story]').length,0);
  const link=doc.querySelector('.bn-source-history .bn-headline-links a');
  const saved=await page(await worker.fetch(new Request(new URL(link.getAttribute('href'),origin)),f.env,ctx));
  const headline=saved.doc.querySelector(new URL(link.href,origin).hash);
  const original=manualNewsArchive.flatMap(item=>item.stories).find(story=>story.title===headline.textContent);
  assert.equal(headline.textContent,link.textContent);
  assert.equal(headline.closest('article').querySelector('time').dateTime,new Date(original.reportedAt).toISOString());
  assert.equal(headline.closest('article').querySelector('.breaking-news__story-link').href,original.sourceUrl);
  assert.equal(saved.pageNode.datePublished,saved.doc.querySelector('.bn-live time').dateTime);
  assert.equal(saved.pageNode.dateModified,undefined);
  assert.deepEqual(f.effects,[]);
  dom.window.close();saved.dom.window.close();
});

test('empty combined searches show zero counts and malformed search pages remain unavailable',async()=>{
  const f=fixture();
  const response=await worker.fetch(new Request(origin+'/breaking-news/?source=nasa&q=Headline'),f.env,ctx);
  const {dom,doc}=await page(response);
  assert.equal(response.status,200);
  assert.match(doc.querySelector('.bn-source-results p').textContent,/^0 stories/);
  assert.equal(doc.querySelector('[data-news-source="nasa"] span').textContent,'0');
  assert.equal(doc.querySelectorAll('[data-news-story],.bn-source-history .bn-headline-links a').length,0);
  assert.match(doc.querySelector('.bn-stories').textContent,/No stories match this search/);
  for(const query of ['?source=unknown','?q='+('a'.repeat(121)),'?source=bbc&page=99','?source=bbc&page=0']) {
    const missing=await worker.fetch(new Request(origin+'/breaking-news/'+query),f.env,ctx);
    assert.equal(missing.status,404,query);
  }
  assert.deepEqual(f.effects,[]);
  dom.window.close();
});

test('malformed and missing edition URLs are 404, while archive outages are 503',async()=>{
  const f=fixture(),path=editionPath(f.editions[0]);
  for(const missing of [ARCHIVE_PATH+'fake/',ARCHIVE_PATH+'2026-02-30-120000000/',ARCHIVE_PATH+'2026-10-05-000000000/',ARCHIVE_PATH+'?before=nothing']){
    const response=await worker.fetch(new Request(origin+missing),f.env,ctx);
    assert.equal(response.status,404);assert.equal(response.headers.get('X-Robots-Tag'),'noindex');
  }
  const redirect=await worker.fetch(new Request(origin+path.slice(0,-1)),f.env,ctx);
  assert.equal(redirect.status,308);assert.equal(redirect.headers.get('Location'),origin+path);
  const unavailable=await worker.fetch(new Request(origin+path),{ASSETS:f.env.ASSETS},ctx);
  assert.equal(unavailable.status,503);assert.equal(unavailable.headers.get('Retry-After'),'60');
  const preview=await worker.fetch(new Request('https://preview.example.com'+path),f.env,ctx);
  assert.equal(preview.status,404);
  assert.deepEqual(f.effects,[]);
});
