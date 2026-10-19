// Release boundary tests: pure dates, private routes, actual rendered public copy,
// and an optional post-build check that unreleased editorial work stays absent.
// No live HTTP, database writes, credentials or clock-dependent publication.
import assert from 'node:assert/strict';
import {existsSync,readFileSync,readdirSync,statSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
import {HALLOWEEN,HALLOWEEN_ARTICLES,halloweenState,halloweenPublicConfig,isHalloweenPath,hiddenHalloweenArticle,privatePreviewState} from '../lib/halloween-event.js';
import {decorateHalloween,renderHalloweenPage} from '../lib/halloween-render.js';
import worker from '../worker.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const options=new Set(process.argv.slice(2));
const launched=options.has('--launched');
const {JSDOM}=process.env.JSDOM_MODULE
 ? await import(pathToFileURL(process.env.JSDOM_MODULE).href)
 : await import('jsdom');
const parse=html=>new JSDOM(html).window.document;
const eventStart=Date.parse('2026-10-18T22:00:00Z');
const eventEnd=Date.parse('2026-11-01T23:00:00Z');
const names={
 'why-carve-pumpkins-halloween':'Why do we carve pumpkins at Halloween? It began with a turnip',
 'are-bats-blind':'Are bats blind? Their eyes deserve more credit',
 'trick-or-treat-meaning-origin':'What does “trick or treat” mean? A tiny Halloween bargain'
};
assert.equal(HALLOWEEN.enabled,launched,'Publication must match the explicitly reviewed release phase.');
assert.equal(Date.parse(HALLOWEEN.start),eventStart,'Launch is midnight on 19 October in Madrid.');
assert.equal(Date.parse(HALLOWEEN.end),eventEnd,'Collection closes after the entire local day of 1 November.');
assert.deepEqual(new Set(HALLOWEEN_ARTICLES),new Set(Object.keys(names)));

for(const [time,active,status,day] of [
 [eventStart-1,false,'upcoming','2026-10-18'],
 [eventStart,true,'active','2026-10-19'],
 [eventStart+1,true,'active','2026-10-19'],
 [Date.parse('2026-10-24T21:59:59Z'),true,'active','2026-10-24'],
 [Date.parse('2026-10-24T22:00:00Z'),true,'active','2026-10-25'],
 [Date.parse('2026-10-25T00:59:59Z'),true,'active','2026-10-25'],
 [Date.parse('2026-10-25T01:00:00Z'),true,'active','2026-10-25'],
 [Date.parse('2026-10-25T22:59:59Z'),true,'active','2026-10-25'],
 [Date.parse('2026-10-25T23:00:00Z'),true,'active','2026-10-26'],
 [eventEnd-1,true,'active','2026-11-01'],
 [eventEnd,false,'closed','2026-11-02'],
 [eventEnd+1,false,'closed','2026-11-02']
]){
 const result=halloweenState(time,true);
 assert.equal(result.active,active,`active at ${new Date(time).toISOString()}`);
 assert.equal(result.status,status);
 assert.equal(result.day,day,'Cosmetic participation dates follow Madrid, including the DST change.');
 assert.equal(result.preview,false);
}
for(const invalid of [NaN,Infinity,-Infinity,'not a date',{}]){
 const result=halloweenState(invalid,true);
 assert.equal(result.active,false,'Malformed time cannot open the event.');
 assert.equal(result.serverNow,null);
 assert.equal(result.day,null);
 assert.deepEqual(halloweenPublicConfig(result),{active:false,enabled:false,status:'unavailable'});
}
for(const disabled of [false,null,0,'yes',1,{}]){
 const result=halloweenState(eventStart,disabled);
 assert.equal(result.enabled,false,'Only boolean true enables publication.');
 assert.equal(result.active,false);
 assert.equal(result.status,'disabled','Status must agree with the strict boolean publication switch.');
}
for(const time of [eventStart-1,eventStart,eventEnd-1,eventEnd]){
 assert.equal(halloweenState(time,false).active,false,'The OFF switch also prevents accidental date-triggered release.');
}
const active=halloweenState(eventStart+12*3600000,true);
assert.equal(halloweenPublicConfig(active),active,'Active public config retains the authoritative event state.');
for(const day of ['2026-10-19','2026-10-25','2026-11-01']){
 const preview=privatePreviewState(day);
 assert.equal(preview.day,day);
 assert.equal(preview.active,true);
 assert.equal(preview.preview,true);
}
for(const day of ['2026-10-18','2026-11-02','2026-10-32','2027-10-19','<script>']){
 assert.throws(()=>privatePreviewState(day),/Invalid private preview day/);
}

for(const route of ['/halloween','/halloween/','/halloween/index.html','/halloween/trick-or-think/','/halloween/spooky-connections/'])assert.equal(isHalloweenPath(route),true,route);
for(const route of ['/','/games/','/learn/','/halloweenish/','/other/halloween/'])assert.equal(isHalloweenPath(route),false,route);
const protectedArticles=HALLOWEEN_ARTICLES.flatMap(slug=>['/learn/'+slug,'/learn/'+slug+'/','/learn/'+slug+'/index.html']);
for(const route of protectedArticles)assert.equal(hiddenHalloweenArticle(route),true,route);
for(const route of ['/learn/','/learn/are-bats-blindness/','/learn/why-roman-concrete-lasts/','/learn/paths/word-detective/'])assert.equal(hiddenHalloweenArticle(route),false,route);

const fixture='<!doctype html><html lang="en"><head><title>Learn | BrainiLab</title><meta name="description" content="Explore curious articles and courses."/><meta property="og:title" content="Learn"/><meta property="og:description" content="Explore curious articles and courses."/><meta property="og:url" content="https://brainilabgames.com/learn/"/><link rel="canonical" href="https://brainilabgames.com/learn/"/><script type="application/ld+json">{"@context":"https://schema.org","@type":"CollectionPage","name":"Learn"}</script></head><body class="site"><header><a class="brand" href="/"><img alt="BrainiLab" src="/assets/brand/brainilab-logo.png"/></a><nav id="mainNav"><a href="/learn/" aria-current="page">Learn</a></nav></header><main id="main-content"><p>Unrelated library body</p></main><div class="home-hero wrap">Home content</div><footer>Footer remains here.</footer></body></html>';
for(const state of [null,{},halloweenState(eventStart,false),halloweenState(eventStart-1,true),halloweenState(eventEnd,true)]){
 assert.equal(decorateHalloween(fixture,state,'/'),fixture,'Inactive decoration must preserve every original byte.');
}
for(const homePath of ['/','/index.html']){
 const d=parse(decorateHalloween(fixture,active,homePath));
 assert.equal(d.body.classList.contains('site'),true);
 assert.equal(d.body.classList.contains('halloween-season'),true);
 assert.equal(d.querySelectorAll('.brand .halloween-brand-pumpkin').length,1);
 assert.equal(d.querySelectorAll('.halloween-home-web').length,1);
 assert.equal(d.querySelector('.home-hero').textContent,'Home content');
 assert.equal(d.querySelector('.halloween-nav-link').getAttribute('href'),'/halloween/');
 assert.equal(d.querySelector('.halloween-nav-link').hasAttribute('aria-current'),false);
 assert.equal(d.querySelectorAll('[data-halloween-config]').length,1);
 assert.deepEqual(JSON.parse(d.querySelector('[data-halloween-config]').textContent),active);
 assert.equal(d.querySelector('footer').textContent,'Footer remains here.');
}
const ordinary=parse(decorateHalloween(fixture,active,'/games/'));
assert.equal(ordinary.querySelectorAll('.halloween-home-web').length,0,'Home spiderweb does not spread across reading/game pages.');
assert.equal(ordinary.querySelectorAll('.halloween-nav-link').length,1);
const template=existsSync(path.join(root,'learn/index.html'))?readFileSync(path.join(root,'learn/index.html'),'utf8'):fixture;
const textIsPublic=d=>{
 const clone=d.body.cloneNode(true);
 clone.querySelectorAll('script,style').forEach(n=>n.remove());
 assert.doesNotMatch(clone.textContent,/\b(?:SEO|AEO|GEO|acquisition|retention|monetisation|monetization)\b|private preview|internal objective/i,'Public copy must describe the reader’s event, not internal goals.');
};
for(const game of [null,'trick-or-think','spooky-connections']){
 const d=parse(renderHalloweenPage(template,active,game));
 const title=game==='trick-or-think'?'Trick or Think?':game==='spooky-connections'?'Spooky Connections':'Halloween at BrainiLab';
 const canonical='https://brainilabgames.com/halloween/'+(game?game+'/':'');
 assert.equal(d.title,game?title+' | BrainiLab':title);
 assert.equal(d.querySelector('link[rel="canonical"]').getAttribute('href'),canonical);
 assert.equal(d.querySelector('meta[property="og:url"]').getAttribute('content'),canonical,'Shared links must not keep Learn’s URL.');
 assert.match(d.querySelector('meta[property="og:title"]').getAttribute('content'),new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')),'Shared title describes the actual event/game.');
 assert.equal(d.querySelector('meta[property="og:description"]').getAttribute('content'),d.querySelector('meta[name="description"]').getAttribute('content'));
 assert.ok(d.querySelector('meta[name="twitter:title"]'),'Twitter/card title is set explicitly.');
 assert.ok(d.querySelector('meta[name="twitter:description"]'),'Twitter/card description is set explicitly.');
 const schemas=[...d.querySelectorAll('script[type="application/ld+json"]')].map(n=>JSON.parse(n.textContent));
 assert.equal(schemas.length,1);
 assert.equal(schemas[0]['@type'],game?'WebApplication':'CollectionPage');
 assert.equal(schemas[0].name,title);
 assert.equal(schemas[0].url,canonical);
 assert.equal(d.querySelectorAll('.halloween-nav-link[aria-current="page"]').length,1);
 assert.equal(d.querySelectorAll('#mainNav [href="/learn/"][aria-current="page"]').length,0);
 assert.equal(d.querySelectorAll('script[src*="learn-library"]').length,0,'No unrelated library behaviour in Halloween view.');
 assert.equal(d.querySelectorAll('[data-halloween-game]').length,game?1:0);
 if(game)assert.equal(d.querySelector('[data-halloween-game]').getAttribute('data-halloween-game'),game);
 else{
  assert.equal(d.querySelectorAll('.halloween-game-teaser').length,2);
  assert.equal(d.querySelectorAll('.halloween-reward').length,3);
  assert.equal(d.querySelectorAll('.halloween-reading-card').length,3);
  for(const [slug,headline]of Object.entries(names))assert.equal(d.querySelector(`.halloween-reading-card a[href="/learn/${slug}/"] h3`).textContent,headline,'No stale guessed article headlines.');
 }
 textIsPublic(d);
}
const closed=parse(renderHalloweenPage(template,halloweenState(eventEnd,true)));
assert.match(closed.querySelector('h1').textContent,/treats.*keep/i);
assert.equal(closed.querySelectorAll('.halloween-game-teaser a').length,0,'Closed event does not invite new play.');
assert.equal(closed.querySelectorAll('.halloween-game-teaser .halloween-finished').length,2);
assert.equal(closed.querySelectorAll('.halloween-reading-card a').length,3,'Stories remain available after the collection event.');
assert.equal(closed.querySelectorAll('.halloween-season').length,0,'Seasonal global decoration stops after the event.');
textIsPublic(closed);

const {build}=await import('esbuild');
const eventSource=readFileSync(path.join(root,'lib/halloween-event.js'),'utf8');
async function workerWithFlag(flag){
 let substitutions=0;
 const bundle=await build({
  entryPoints:[path.join(root,'worker.js')],bundle:true,write:false,platform:'node',format:'cjs',legalComments:'none',
  plugins:[{name:'isolated-test-flag',setup(builder){builder.onLoad({filter:/halloween-event\.js$/},()=>({contents:eventSource.replace(/enabled:(?:false|true),/,()=>{substitutions++;return 'enabled:'+flag+',';}),loader:'js'}));}}]
 });
 assert.equal(substitutions,1,'Exactly one explicit publication switch is used in each isolated test.');
 const module={exports:{}};
 runInNewContext(bundle.outputFiles[0].text,{module,exports:module.exports,require:createRequire(import.meta.url),Request,Response,Headers,URL,URLSearchParams,Date,Intl,AbortSignal,TextEncoder,TextDecoder,Buffer,console,setTimeout,clearTimeout,process:{env:{}},fetch(){throw Error('Release test attempted an external request');}});
 return module.exports.default;
}
const disabledWorker=launched?await workerWithFlag(false):worker;
const enabledWorker=launched?worker:await workerWithFlag(true);

// Exercise the real Worker dispatch with an asset/network tripwire. The switch
// is intentionally OFF even if a caller or future clock reaches launch day.
const savedNow=Date.now;
let assetsAccessed=0;
const env={ASSETS:{fetch(){assetsAccessed++;throw Error('Release gate touched public assets');}}};
const ctx={waitUntil(){throw Error('Release gate scheduled external work');}};
try{
 for(const time of [eventStart-1,eventStart,eventEnd+1]){
  Date.now=()=>time;
  for(const route of ['/halloween','/halloween/','/halloween/trick-or-think/','/halloween/spooky-connections/',...protectedArticles]){
   for(const method of ['GET','HEAD']){
    const response=await disabledWorker.fetch(new Request('https://brainilabgames.com'+route,{method}),env,ctx);
    assert.equal(response.status,404,`Unreleased ${method} ${route} at ${time}`);
    assert.equal(response.headers.get('Cache-Control'),'no-store');
    assert.equal(response.headers.get('X-Robots-Tag'),'noindex');
   }
  }
  const config=await disabledWorker.fetch(new Request('https://brainilabgames.com/api/halloween/config'),env,ctx);
  assert.equal(config.status,200);
  assert.equal(config.headers.get('Cache-Control'),'no-store');
  assert.deepEqual(await config.json(),{active:false,enabled:false,status:'unavailable'});
  const head=await disabledWorker.fetch(new Request('https://brainilabgames.com/api/halloween/config',{method:'HEAD'}),env,ctx);
  assert.equal(await head.text(),'');
  const post=await disabledWorker.fetch(new Request('https://brainilabgames.com/api/halloween/config',{method:'POST'}),env,ctx);
  assert.equal(post.status,405);
 }
}finally{Date.now=savedNow;}
assert.equal(assetsAccessed,0,'All disabled routes terminate before content or database access.');

// Simulate the approved flag change in memory, without editing or building a
// publishable file. This tests real Worker dispatch on launch day, not regexes
// that merely resemble its implementation. Every asset/network path is local.
const staticRoutes=['/games/','/daily-quiz/','/rankings/','/groups/','/history/','/science/'];
try{
 for(const [time,decorate]of [[eventStart-1,false],[eventStart,true],[eventEnd,false]]){
  Date.now=()=>time;
  for(const route of staticRoutes){
   const response=await enabledWorker.fetch(new Request('https://brainilabgames.com'+route),{
    ASSETS:{fetch:async()=>new Response(fixture,{headers:{'Content-Type':'text/html; charset=utf-8','Content-Length':String(Buffer.byteLength(fixture)),ETag:'original','Last-Modified':'Mon, 19 Oct 2026 00:00:00 GMT','Cache-Control':'public,max-age=300'}})}
   },ctx);
   const result=await response.text();
   assert.equal(response.status,200);
   assert.equal(parse(result).querySelectorAll('.halloween-nav-link').length,decorate?1:0,`Seasonal menu is consistent on ${route}`);
   if(decorate){
    assert.equal(response.headers.get('Cache-Control'),'no-store');
    assert.equal(response.headers.has('ETag'),false);
    assert.equal(response.headers.has('Last-Modified'),false,'A static timestamp cannot validate transformed seasonal HTML.');
    assert.equal(response.headers.has('Content-Length'),false);
   }else assert.equal(result,fixture,'Outside the event, real fallback dispatch preserves original HTML.');
  }
 }
 Date.now=()=>eventStart;
 for(const method of ['GET','HEAD']){
  let conditionals=null;
  const response=await enabledWorker.fetch(new Request('https://brainilabgames.com/rankings/',{method,headers:{'If-None-Match':'old-page','If-Modified-Since':'Wed, 21 Oct 2026 00:00:00 GMT'}}),{
   ASSETS:{fetch:async req=>{conditionals=[req.headers.get('If-None-Match'),req.headers.get('If-Modified-Since')];return conditionals.some(Boolean)?new Response(null,{status:304}):new Response(method==='HEAD'?null:fixture,{headers:{'Content-Type':'text/html','Last-Modified':'Mon, 19 Oct 2026 00:00:00 GMT'}});}}
  },ctx);
  assert.deepEqual(conditionals,[null,null],'Old document validators must not bypass the seasonal menu.');assert.equal(response.status,200);assert.equal(response.headers.has('Last-Modified'),false);
  assert.equal(response.headers.get('Cache-Control'),'no-store');const html=await response.text();assert.equal(method==='HEAD'?html==='':html.includes('halloween-nav-link'),true);
 }
 const bytes='plain static asset';
 const nonHtml=await enabledWorker.fetch(new Request('https://brainilabgames.com/assets/readme.txt'),{
  ASSETS:{fetch:async()=>new Response(bytes,{headers:{'Content-Type':'text/plain','Cache-Control':'public,max-age=300'}})}
 },ctx);
 assert.equal(await nonHtml.text(),bytes);
 assert.equal(nonHtml.headers.get('Cache-Control'),'public,max-age=300','Non-HTML assets retain their cache policy.');
}finally{Date.now=savedNow;}
assert.equal(readFileSync(path.join(root,'lib/halloween-event.js'),'utf8'),eventSource,'The launch simulation never changes the disabled release source.');

const privateDir=path.resolve(root,'../release/articles');
if(options.has('--require-release'))assert.ok(existsSync(privateDir),'Private editorial package must exist for final release audit.');
if(existsSync(privateDir)){
 for(const slug of HALLOWEEN_ARTICLES){
  const doc=JSON.parse(readFileSync(path.join(privateDir,slug+'.json'),'utf8'));
  assert.equal(doc.status,'draft',slug);
  assert.equal(Object.hasOwn(doc,'publishedAt'),false,'Future release does not masquerade as already published.');
  assert.equal(doc.title,names[slug]);
  assert.equal(doc.sections.length,4);
  assert.ok(doc.sources.length>=2);
  const articlePath=path.join(root,'content/articles',slug+'.json');
  assert.equal(existsSync(articlePath),launched,'Only the approved publication includes the article source.');
  if(launched){const published=JSON.parse(readFileSync(articlePath,'utf8'));assert.equal(published.status,'published');assert.equal(published.title,names[slug]);assert.ok(published.publishedAt);}
  for(const suffix of ['','-small','-thumb']){
   const relative='assets/images/learn/'+slug+suffix+'.webp';
   if(options.has('--require-release'))assert.ok(existsSync(path.resolve(root,'../release',relative)),'Reviewed cover remains in the private release package.');
   assert.equal(existsSync(path.join(root,relative)),(launched||options.has('--assets-staged')),'Cover assets may be deliberately staged only in the authorised release phase.');
  }
 }
}
const dist=path.join(root,'dist');
if(options.has('--require-dist'))assert.ok(existsSync(dist),'Build the production directory before final release audit.');
let distFilesChecked=0;
function walk(directory){return readdirSync(directory).flatMap(name=>{const f=path.join(directory,name);return statSync(f).isDirectory()?walk(f):[f];});}
if(existsSync(dist)){
 for(const file of walk(dist).filter(f=>/\.(?:html|xml|json|txt)$/i.test(f))){
  const relative=path.relative(dist,file).replaceAll('\\','/');
  const contents=readFileSync(file,'utf8');
  for(const [slug,title]of Object.entries(names)){
   if(launched)continue;
   assert.equal(contents.includes(title),false,`Unreleased headline leaked in ${relative}`);
   assert.equal(contents.includes('/learn/'+slug+'/'),false,`Unreleased article route leaked in ${relative}`);
  }
  assert.doesNotMatch(relative,/^(?:release|research|content)\//,'Internal release package is not deployable static content.');
  distFilesChecked++;
 }
 for(const route of ['halloween/index.html','halloween/trick-or-think/index.html','halloween/spooky-connections/index.html',...HALLOWEEN_ARTICLES.map(slug=>'learn/'+slug+'/index.html')])assert.equal(existsSync(path.join(dist,route)),launched&&route.startsWith('learn/'),'Article publication matches the reviewed phase: '+route);
 for(const slug of HALLOWEEN_ARTICLES)for(const suffix of ['','-small','-thumb'])assert.equal(existsSync(path.join(dist,'assets/images/learn/'+slug+suffix+'.webp')),(launched||options.has('--assets-staged')),'Only the authorised asset staging phase includes the reviewed covers.');
 for(const file of ['sitemap.xml','learn/feed.xml','learn/index.html'])assert.ok(existsSync(path.join(dist,file)),'Public output audited: '+file);
}
console.log(`PASS Halloween release: exact Madrid start/end and DST, invalid time/switch, private preview dates, 9 article aliases, inactive byte preservation, active decoration, 2 games/3 treats/3 articles, matching metadata/schema, closed hub, disabled real Worker routes, in-memory launch routing on 6 public sections, private editorial isolation; ${distFilesChecked?distFilesChecked+' production documents checked':'production audit pending build'}. No external requests.`);
