import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import worker from '../worker.js';
import {BreakingNewsStore} from '../lib/public-page-store.js';
import {REFRESH_MS} from '../lib/news-refresh.js';
import {ARCHIVE_PATH, editionId, editionPath} from '../lib/news-archive.js';

const origin = 'https://brainilabgames.com';
const now = Date.now(), latestAt = Math.floor(now/REFRESH_MS)*REFRESH_MS-2*60*1000;
const pageTemplate = readFileSync('breaking-news/index.html','utf8');
const ctx = {waitUntil(){throw Error('Archive browsing must not schedule work');}};
const edition = (time,n) => ({generatedAt:new Date(time).toISOString(), stories:[{
  title:'Headline '+n,summary:'An archived summary.',sourceName:'BBC News',
  sourceUrl:'https://www.bbc.com/news/articles/example'+n,reportedAt:new Date(time-60_000).toISOString(),evidence:'private evidence'
}]});

function fixture() {
  const editions = Array.from({length:26},(_,i)=>edition(latestAt-i*REFRESH_MS,i));
  const data = new Map(editions.map(item=>['audit:'+Math.floor(Date.parse(item.generatedAt)/REFRESH_MS),
    {edition:item,usage:{private:true},evidence:[{secret:true}]}]));
  data.set('edition',editions[0]);
  const effects = [];
  const storage = {
    async get(keys){return Array.isArray(keys)?new Map(keys.map(key=>[key,data.get(key)])):data.get(keys);},
    async list({start,end,limit,reverse}){
      assert.equal(reverse,true);assert(limit<=22);
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
  return {editions,effects,calls,store,env};
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
  assert.deepEqual(previews.map(a=>a.getAttribute('href')),f.editions.slice(1,3).map(editionPath));
  assert.deepEqual(previews.map(a=>a.querySelector('time').dateTime),f.editions.slice(1,3).map(e=>e.generatedAt));
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
  assert.equal(index.pageNode.url,origin+ARCHIVE_PATH);
  assert.equal(index.pageNode.mainEntity.numberOfItems,links.length);
  assert.deepEqual(index.pageNode.mainEntity.itemListElement.map(n=>[n.name,n.url]),links.map(a=>[a.textContent,origin+a.getAttribute('href')]));
  const older=index.doc.querySelector('.bn-archive-pagination a').getAttribute('href');
  assert(older.endsWith(editionId(f.editions[19].generatedAt)));
  const second=await page(await worker.fetch(new Request(origin+older),f.env,ctx));
  assert.equal(second.pageNode.url,origin+older);
  assert.equal(second.doc.querySelector('link[rel=canonical]').href,origin+older);
  const earlier=[...second.doc.querySelectorAll('[data-edition-link]')];
  assert.equal(earlier[0].getAttribute('href'),editionPath(f.editions[20]));
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
