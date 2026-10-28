import assert from 'node:assert/strict';
import {prepareArticle,prepareArticleSummary} from '../lib/learn-content.js';
import {publishedArticles,serveLearn} from '../lib/learn-worker.js';

const quiz={version:'runtime-1',questions:[1,2].map(n=>({prompt:'Which number is '+n+'?',options:[String(n),'Other','Neither','Both'],answer:0,explanation:'The number is '+n+'.'}))};
const a={slug:'runtime-one',title:'One curious question',description:'An example to read.',topic:'Curiosity',authorId:'biel',publishedAt:'2026-10-01T08:00:00Z',updatedAt:'2026-10-02T08:00:00Z',cover:{src:'/assets/images/learn/daily-or-anytime.webp',alt:'A notebook'},game:{name:'Games',url:'/games/'},hub:{url:'/learn/'},sources:[{name:'Example source',url:'https://example.com/source'}],related:['runtime-two'],sections:[{id:'answer',title:'The answer',html:'<p>First article body.</p><script>unwantedRuntimeScript()</script><img src=x onerror="unwantedRuntimeScript()">'}],quiz};
const b={...a,slug:'runtime-two',title:'Another question',related:['runtime-one'],sections:[{id:'answer',title:'The answer',html:'<p>Second article body.</p><a href="javascript:bad()">Unsafe link</a>'}]};
const author={slug:'biel',name:'Biel',visible:true,active:true};
const path={slug:'runtime-course',title:'A little course',topic:'Curiosity',description:'Two short lessons.',authorId:'biel',publishedAt:a.publishedAt,updatedAt:a.updatedAt,introduction:'<p>Start with one idea.</p>',lessons:[a,b].map(d=>({slug:d.slug,objective:'Read and try.'})),sources:a.sources};
const template='<html><head><title>Learn</title><meta name="description" content="Learn"/><meta property="og:title" content="Learn"/><meta property="og:image" content="https://brainilabgames.com/assets/brand/og-card.png"/><link rel="canonical" href="https://brainilabgames.com/learn/"/><script type="application/ld+json">{}</script></head><body><main id="main-content"></main></body></html>';
const env={ASSETS:{fetch:async request=>new Response(new URL(request.url).pathname==='/sitemap.xml'?'<urlset><url><loc>https://brainilabgames.com/games/</loc></url></urlset>':template)}};
let documents=[a,b],offline=false,calls=[];
const fetcher=async url=>{calls.push(url);if(offline)throw Error('Temporary upstream outage');return new Response(JSON.stringify((url.includes('learn_paths?')?[path]:url.includes('learn_authors?')?[author]:documents).map(document=>({document}))));};
function fixture(){let clock=0;const entries=new Map(),pending=[];return{ctx:{waitUntil(p){pending.push(p);}},cache:{async match(request){const e=entries.get(request.url);return e&&e.expires>clock?new Response(e.body,{headers:e.headers}):undefined;},async put(request,response){entries.set(request.url,{body:await response.text(),headers:response.headers,expires:clock+60000});}},async drain(){await Promise.all(pending.splice(0));},expire(){clock+=61000;},entries};}
const url=slug=>new Request('https://brainilabgames.com/learn/'+slug+'/');
const f=fixture(),original=structuredClone(documents);
const summaries=await publishedArticles(url(''),f.ctx,f.cache,fetcher,{summaryOnly:true});await f.drain();
assert.equal(summaries.length,2);assert.deepEqual(summaries.map(s=>s.sections),[[],[]],'Lists must not carry raw or cleaned reading bodies');
assert.equal(summaries[0].minutes,prepareArticle(a).minutes);assert.equal(prepareArticleSummary(a).quiz.version,quiz.version);
const sourceCalls=calls.length;
const selected=await publishedArticles(url(a.slug),f.ctx,f.cache,fetcher,{summaryOnly:true,articleSlug:a.slug});
assert.ok(selected[0].sections[0].html.includes('First article body.'));assert.ok(!selected[0].sections[0].html.includes('unwantedRuntimeScript'));assert.deepEqual(selected[1].sections,[]);
assert.equal(calls.length,sourceCalls,'A warm snapshot must not reread the database');
const all=await publishedArticles(url(''),f.ctx,f.cache,fetcher);assert.deepEqual(all.map(d=>d.sections),documents.map(d=>prepareArticle(d).sections),'The default full-content API remains sanitised');
assert.deepEqual(documents,original);
for(const pathname of ['/learn/','/learn/'+a.slug+'/','/learn/'+b.slug+'/','/learn/paths/','/learn/paths/'+path.slug+'/','/sitemap.xml']){
 const response=await serveLearn(new Request('https://brainilabgames.com'+pathname),env,f.ctx,f.cache,fetcher);assert.equal(response.status,200,pathname);const html=await response.text();assert.ok(!html.includes('unwantedRuntimeScript'));assert.ok(!html.includes('javascript:bad()'));await f.drain();
 const head=await serveLearn(new Request('https://brainilabgames.com'+pathname,{method:'HEAD'}),env,f.ctx,f.cache,fetcher);assert.equal(head.status,200);assert.equal(await head.text(),'');
}
// The author biography must not depend on loading or processing article bodies.
calls=[];const about=fixture();assert.equal((await serveLearn(new Request('https://brainilabgames.com/about/'),env,about.ctx,about.cache,fetcher)).status,200);assert.ok(!calls.some(u=>u.includes('learn_publications')));await about.drain();
// Preserve the publication boundary: expiry + withdrawal removes the page and
// sitemap entry. An upstream failure cannot revive a static or expired copy.
f.expire();documents=[];
assert.equal((await serveLearn(url(a.slug),env,f.ctx,f.cache,fetcher)).status,404);await f.drain();
const withdrawnSitemap=await serveLearn(new Request('https://brainilabgames.com/sitemap.xml'),env,f.ctx,f.cache,fetcher);assert.ok(!(await withdrawnSitemap.text()).includes('/learn/'+a.slug+'/'));
f.expire();offline=true;
for(const pathname of ['/learn/','/learn/'+a.slug+'/','/learn/paths/','/sitemap.xml']){const response=await serveLearn(new Request('https://brainilabgames.com'+pathname),env,f.ctx,f.cache,fetcher);assert.equal(response.status,503);assert.equal(response.headers.get('retry-after'),'30');assert.ok(!(await response.text()).includes(a.title));}
offline=false;documents=[a,b];assert.equal((await serveLearn(url(a.slug),env,f.ctx,f.cache,fetcher)).status,200);await f.drain();
// Corrupt cache JSON is a cache miss; the live source is still authoritative.
const corrupt=fixture();corrupt.entries.set('https://brainilabgames.com/_learn-catalogue-v2',{body:'{broken',headers:{},expires:60000});
assert.equal((await serveLearn(url(a.slug),env,corrupt.ctx,corrupt.cache,fetcher)).status,200);await corrupt.drain();
console.log('PASS Learn runtime: body-free summaries, sanitised reading bodies, cold/warm cache, same 60-second expiry, withdrawal, outage/recovery, Academy and sitemap.');
