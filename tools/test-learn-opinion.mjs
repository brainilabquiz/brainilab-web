import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {prepareArticle,prepareArticleSummary,renderPage} from '../lib/learn-content.js';
import {serveLearn} from '../lib/learn-worker.js';
import {inspectArticle} from '../lib/article-writing.js';
import {learnSchemaURL} from '../editor/page-schema-evidence.js';

const template=readFileSync('learn/index.html','utf8');
const source=JSON.parse(readFileSync('content/articles/daily-or-anytime.json','utf8'));
const author=JSON.parse(readFileSync('content/authors.json','utf8'))[0];
const opinion=prepareArticle({...source,slug:'opinion-test',articleKind:'opinion',authorId:author.slug,author});
const regular=prepareArticle({...source,author});
const documents=[regular,opinion];
const original=JSON.stringify(documents);
const parse=html=>new JSDOM(html,{url:'https://brainilabgames.com/learn/opinion/',runScripts:'outside-only'});
const graph=dom=>[...dom.window.document.querySelectorAll('script[type="application/ld+json"]')]
  .flatMap(node=>JSON.parse(node.textContent)['@graph']||[]);

const library=parse(renderPage(template,documents,null,[],{view:'opinion'}));
const d=library.window.document;
assert.equal(d.querySelector('h1').textContent,'Opinion');
assert.equal(d.querySelector('link[rel=canonical]').href,'https://brainilabgames.com/learn/opinion/');
assert.equal(d.querySelectorAll('.learn-card').length,1);
assert.equal(d.querySelector('.learn-card h3 a').getAttribute('href'),'/learn/opinion-test/');
assert.equal(d.querySelector('.learn-opinion-byline [rel=author]').textContent,author.name);
assert.equal(graph(library).find(node=>node['@type']==='CollectionPage').hasPart.length,1);
assert.equal(graph(library).find(node=>node['@type']==='BreadcrumbList').itemListElement.at(-1).name,'Opinion');
library.window.eval(readFileSync('assets/js/learn-library.js','utf8'));
assert.equal(d.querySelector('#learn-count').textContent,'1 of 1 opinion piece');
d.querySelector('#learn-search').value='absentword';
d.querySelector('#learn-search').dispatchEvent(new library.window.Event('input'));
assert.equal(d.querySelector('.learn-card').hidden,true);
assert.equal(d.querySelector('.learn-empty').hidden,false);
d.querySelector('.learn-search-clear').click();
assert.equal(d.querySelector('.learn-card').hidden,false);

const empty=parse(renderPage(template,[regular],null,[],{view:'opinion'}));
assert.equal(empty.window.document.querySelectorAll('.learn-card').length,0);
assert.equal(empty.window.document.querySelector('.learn-empty').hidden,false);
assert.equal(graph(empty).find(node=>node['@type']==='CollectionPage').hasPart.length,0);
empty.window.eval(readFileSync('assets/js/learn-library.js','utf8'));
assert.equal(empty.window.document.querySelector('[data-clear-filters]').hidden,true);

const page=parse(renderPage(template,documents,opinion));
const article=graph(page).find(node=>node['@type']==='Article');
assert.equal(article.genre,'Opinion');
assert.equal(article.author.name,author.name);
assert.equal(article.datePublished,source.publishedAt);
assert.equal(article.dateModified,source.updatedAt||source.publishedAt);
assert.equal(page.window.document.querySelector('.article-header .eyebrow a').textContent,'Opinion');
assert.equal(page.window.document.querySelector('.article-byline [rel=author]').textContent,author.name);
assert.equal(prepareArticleSummary(opinion).articleKind,'opinion');
assert.equal(learnSchemaURL('https://brainilabgames.com/learn/opinion/'),false);
assert(inspectArticle({...opinion,authorId:''},{document:d}).problems.some(issue=>issue.code==='opinion-author'));
assert(!inspectArticle(regular,{document:d}).problems.some(issue=>issue.code==='opinion-author'));
assert.equal(JSON.stringify(documents),original);

const pending=[];
const cache={match:async()=>null,put:async()=>{}};
const context={waitUntil:p=>pending.push(p)};
const assets={fetch:async()=>new Response(template)};
const fetcher=async url=>Response.json((url.includes('learn_paths?')?[]:url.includes('learn_authors?')?[author]:documents).map(document=>({document})));
for(const method of ['GET','HEAD']){
 const response=await serveLearn(new Request('https://brainilabgames.com/learn/opinion/',{method}),{ASSETS:assets},context,cache,fetcher);
 assert.equal(response.status,200);
 const html=await response.text();
 assert(method==='HEAD'?html==='':html.includes('/learn/opinion-test/'));
}
await Promise.all(pending);
for(const dom of [library,empty,page])dom.window.close();
console.log('PASS Opinion: dedicated published catalogue, signed cards and articles, honest empty state, search/reset, genre, original dates, legacy documents and GET/HEAD routes.');
