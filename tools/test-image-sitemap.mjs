import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {articleSitemapImage,articleSitemapEntry,imageSitemapNamespace,refreshLearnSitemap} from '../lib/learn-sitemap.js';
import {serveLearn} from '../lib/learn-worker.js';

const base='https://brainilabgames.com';
const ns='http://www.google.com/schemas/sitemap-image/1.1';
const root='<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
const game='<url><loc>'+base+'/games/</loc><lastmod>2026-09-01</lastmod></url>';
const stale='<url><loc>'+base+'/learn/withdrawn/</loc><image:image><image:loc>'+base+'/assets/images/learn/withdrawn.webp</image:loc></image:image></url>';
const sample=JSON.parse(readFileSync('content/articles/why-is-the-sky-blue.json','utf8'));
const original=imageSitemapNamespace(root+game+stale+'</urlset>');
const documents=readdirSync('content/articles').filter(f=>f.endsWith('.json')).map(f=>JSON.parse(readFileSync('content/articles/'+f,'utf8'))).filter(a=>a.status==='published');
let covered=0;
for(const article of documents){
 const image=articleSitemapImage(article),entry=articleSitemapEntry(article);
 assert.ok(entry.includes('<loc>'+base+'/learn/'+article.slug+'/</loc>'));
 if(image){
  assert.ok(image.includes('<image:loc>'+base+article.cover.src+'</image:loc>'));
  assert.ok(existsSync('.'+article.cover.src));
  assert.ok(!image.includes('-preview-')&&!image.includes('og-card')&&!image.includes('supabase'));
  covered++;
 }
}
assert.ok(covered>0);
for(const src of [undefined,'/assets/images/learn/../private.webp','/assets/images/learn/a.webp?token=secret','//elsewhere.test/a.webp','https://elsewhere.test/a.webp','/assets/brand/og-card.png','/assets/images/learn/a.svg','/assets/images/learn/a.webp"><bad>']){
 const article={...sample,cover:{src}};
 assert.equal(articleSitemapImage(article),'');
 assert.ok(articleSitemapEntry(article).includes('/learn/'+sample.slug+'/'));
}
assert.equal(articleSitemapImage({...sample,cover:{src:'/assets/images/learn/daily-or-anytime.webp'}}),'');
assert.ok(articleSitemapImage({slug:'daily-or-anytime',cover:{src:'/assets/images/learn/daily-or-anytime.webp'}}));
assert.throws(()=>articleSitemapEntry({...sample,slug:'a&b'}));
assert.equal(imageSitemapNamespace(original),original);
assert.equal((original.match(/xmlns:image=/g)||[]).length,1);
assert.throws(()=>imageSitemapNamespace(root.replace('>',' xmlns:image="https://wrong.test">')+'</urlset>'));
assert.throws(()=>imageSitemapNamespace('<not-a-sitemap/>'));
const path={slug:'sky-colours'};
const xml=refreshLearnSitemap(original,[sample],[path]);
assert.equal(refreshLearnSitemap(xml,[sample],[path]),xml,'Regeneration must not duplicate entries/images/namespaces');
assert.ok(xml.includes(game),'Unrelated page timestamps must be preserved exactly');
assert.ok(!xml.includes('withdrawn'));
assert.equal((xml.match(/<image:image>/g)||[]).length,1);
for(const removed of [refreshLearnSitemap(xml,[],[]),refreshLearnSitemap(original,[],[])]){
 assert.ok(!removed.includes('/learn/'+sample.slug+'/')&&!removed.includes(sample.cover.src)&&!removed.includes('withdrawn'));
 assert.ok(removed.includes(game));
}
for(const tag of ['caption','title','license','geo_location'])assert.ok(!xml.includes('<image:'+tag));

const env={ASSETS:{fetch:async()=>new Response(original)}},ctx={waitUntil(){}},cache={match:async()=>null,put:async()=>{}};
let articleRows=[sample];
const fetcher=async input=>new Response(JSON.stringify(input.includes('learn_publications?')?articleRows.map(document=>({document})):[]));
const request=new Request(base+'/sitemap.xml');
let response=await serveLearn(request,env,ctx,cache,fetcher);
assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/application\/xml/);
const published=await response.text();assert.ok(published.includes(articleSitemapImage(sample)));
response=await serveLearn(new Request(request,{method:'HEAD'}),env,ctx,cache,fetcher);
assert.equal(response.status,200);assert.equal(await response.text(),'');
articleRows=[];
response=await serveLearn(request,env,ctx,cache,fetcher);
const withdrawn=await response.text();assert.ok(!withdrawn.includes(sample.cover.src)&&!withdrawn.includes('withdrawn'));
assert.ok(withdrawn.includes(game));
response=await serveLearn(request,env,ctx,cache,async()=>{throw Error('unavailable');});
assert.equal(response.status,503,'Never restore withdrawn static images on publication failure');
console.log(`PASS image sitemap: ${covered} existing same-origin reading covers; shared static/live XML, exact dates, regeneration, withdrawal, HEAD/failure and unsafe/external image omission.`);
