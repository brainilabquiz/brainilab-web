import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareArticle,renderPage} from '../lib/learn-content.js';
import {serveLearn} from '../lib/learn-worker.js';
import {articleTimestamp} from '../lib/article-date.js';
import {learnFeed} from '../lib/learn-seo.js';
const template=readFileSync('learn/index.html','utf8');
const a=prepareArticle(JSON.parse(readFileSync('content/articles/why-the-moon-changes-shape.json','utf8')));
const html=renderPage(template,[a],a);
const graph=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1])['@graph'];
const article=graph.find(n=>n['@type']==='Article'),crumbs=graph.find(n=>n['@type']==='BreadcrumbList');
assert.equal(article.author.name,'BrainiLab');assert.equal(article.inLanguage,'en');assert.equal(article.isAccessibleForFree,true);
assert.equal(article.datePublished,a.publishedAt);assert.ok(article.citation.includes(a.sources[0].url));
assert.equal(crumbs.itemListElement.length,3);assert.ok(crumbs.itemListElement[2].item.endsWith('/'+a.slug+'/'));
assert.match(html,/class="article-byline"/);assert.ok(html.includes('datetime="'+a.publishedAt+'"'));
assert.match(html,/name="twitter:image"/);assert.ok(html.includes(a.cover.src));assert.match(html,/max-image-preview:large/);
assert.ok(graph[0].sameAs.includes('https://www.tiktok.com/@brainilabquiz'));
// The Worker renders a generated HTML template again. Metadata must not accumulate.
const rerendered=renderPage(html,[a],a);
for(const page of [html,rerendered]){
 assert.equal((page.match(/type="application\/rss\+xml"/g)||[]).length,1);
 assert.equal((page.match(/property="article:published_time"/g)||[]).length,1);
 assert.equal((page.match(/property="article:modified_time"/g)||[]).length,1);
 assert.equal((page.match(/name="twitter:title"/g)||[]).length,1);
}
assert.equal(article.url,article.mainEntityOfPage);
const localSource={...a,sources:[{name:'Game rules',url:'/games/sequence/'}]};
const localGraph=JSON.parse(renderPage(template,[localSource],localSource).match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1])['@graph'];
assert.deepEqual(localGraph.find(n=>n['@type']==='Article').citation,['https://brainilabgames.com/games/sequence/']);
assert.ok(!renderPage(rerendered,[a],null).includes('property="article:published_time"'));
// Real legacy SQL notation must agree with the readable date without changing
// the original instant, fractional precision, source document or RSS timestamp.
for(const [input,expected] of [
 ['2026-10-11 08:49:38.464979+00','2026-10-11T08:49:38.464979+00:00'],
 ['2026-10-11 08:49:38+02','2026-10-11T08:49:38+02:00'],
 ['2026-10-11 08:49:38.123456-0530','2026-10-11T08:49:38.123456-05:30'],
 ['2026-10-11T08:49:38.123456Z','2026-10-11T08:49:38.123456Z'],
 ['2026-10-11','2026-10-11'],
 ['2026-02-30 08:49:38+00','2026-02-30 08:49:38+00'],
 ['2026-10-11 08:49:38','2026-10-11 08:49:38'],
 [undefined,undefined]
])assert.equal(articleTimestamp(input),expected);
const legacy={...a,publishedAt:'2026-10-11 08:49:38.464979+00',updatedAt:'2026-10-11 08:49:38.464979+00'};
const originalLegacy=JSON.stringify(legacy),legacyHTML=renderPage(template,[legacy],legacy),legacyAgain=renderPage(legacyHTML,[legacy],legacy);
const date='2026-10-11T08:49:38.464979+00:00';
const {datePublished:previousPublished,dateModified:previousModified,...unchangedArticle}=article;
for(const page of [legacyHTML,legacyAgain]){
 const node=JSON.parse(page.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1])['@graph'].find(n=>n['@type']==='Article');
 assert.equal(node.datePublished,date);assert.equal(node.dateModified,date);
 assert.ok(page.includes('datetime="'+date+'">11 Oct 2026</time>'));
 for(const name of ['published_time','modified_time']){assert.equal((page.match(new RegExp('property="article:'+name+'"','g'))||[]).length,1);assert.ok(page.includes('property="article:'+name+'" content="'+date+'"'));}
 assert.equal(Date.parse(node.datePublished),Date.parse(legacy.publishedAt));
 const {datePublished,dateModified,...rest}=node;assert.deepEqual(rest,unchangedArticle);
}
assert.equal(JSON.stringify(legacy),originalLegacy);
assert.ok(learnFeed([legacy]).includes('<pubDate>Sun, 11 Oct 2026 08:49:38 GMT</pubDate>'));
const env={ASSETS:{fetch:async()=>new Response(template)}},ctx={waitUntil(){}},cache={match:async()=>null,put:async()=>{}};
const feed=new Request('https://brainilabgames.com/learn/feed.xml');
let response=await serveLearn(feed,env,ctx,cache,async()=>new Response(JSON.stringify([{document:a}])));
assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/rss\+xml/);
const xml=await response.text();assert.match(xml,/^<\?xml/);assert.ok(xml.includes('/'+a.slug+'/'));assert.ok(!xml.includes('<script'));
response=await serveLearn(feed,env,ctx,cache,async()=>new Response('[]'));assert.ok(!(await response.text()).includes('<item>'));
response=await serveLearn(new Request(feed,{method:'HEAD'}),env,ctx,cache,async()=>new Response('[]'));assert.equal(await response.text(),'');
response=await serveLearn(feed,env,ctx,cache,async()=>{throw Error('offline');});assert.equal(response.status,503);
console.log('PASS: published author/date, Article/Organization/breadcrumb graph, social previews, citations, RSS routing/withdrawal/HEAD/failure.');
