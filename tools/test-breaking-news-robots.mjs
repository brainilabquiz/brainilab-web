import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import worker from '../worker.js';
// Breaking News is indexable only while it shows current stories. Then it has a
// dated title, a description naming the publishers and an ItemList matching the
// visible briefs. Without stories it answers noindex, follow.
const page=readFileSync('breaking-news/index.html','utf8');
const reported=new Date(Date.now()-3600000).toISOString();
const edition={generatedAt:new Date(Date.now()-60000).toISOString(),stories:[
 {title:'First test headline',summary:'A short first summary.',sourceName:'BBC News',sourceUrl:'https://www.bbc.com/news/articles/test1',reportedAt:reported},
 {title:'Second test headline',summary:'A short second summary.',sourceName:'NASA',sourceUrl:'https://www.nasa.gov/news-release/test2/',reportedAt:reported}]};
const env=withNews=>({ASSETS:{fetch:async()=>new Response(page,{headers:{'Content-Type':'text/html; charset=utf-8'}})},
 BREAKING_NEWS:{idFromName:()=>1,get:()=>({fetch:async()=>Response.json(withNews?{...edition,serviceStatus:'updated'}:{generatedAt:null,stories:[],serviceStatus:'invalid-key'})})}});
const ctx={waitUntil(){}};
const robots=html=>html.match(/<meta content="([^"]*)" name="robots"\/>/)[1];

// The fixed manual edition must not hide the empty case: use a time after it expires.
const realNow=Date.now;Date.now=()=>Date.parse('2030-01-01T00:00:00Z');
const empty=await worker.fetch(new Request('https://brainilabgames.com/breaking-news/'),env(false),ctx);
Date.now=realNow;
const emptyHtml=await empty.text();
assert.equal(empty.headers.get('X-Robots-Tag'),'noindex, follow');assert.equal(robots(emptyHtml),'noindex,follow');
assert.doesNotMatch(emptyHtml,/"@type":"ItemList"/);

const full=await worker.fetch(new Request('https://brainilabgames.com/breaking-news/'),env(true),ctx),html=await full.text();
assert.equal(full.headers.get('X-Robots-Tag'),null);assert.match(robots(html),/^index,follow/);
assert.equal((html.match(/name="robots"/g)||[]).length,1);
assert.match(html,/<title>World news in brief, \d{1,2} [A-Z][a-z]+ \d{4} \| BrainiLab<\/title>/);
const description=html.match(/<meta content="([^"]*)" name="description"\/>/)[1];
assert.ok(description.includes('BBC News and NASA')&&description.length<=155,description);
const graph=JSON.parse(html.match(/<script type="application\/ld\+json">([^<]*"ItemList"[^<]*)<\/script>/)[1])['@graph'];
const list=graph.find(n=>n['@type']==='CollectionPage').mainEntity.itemListElement;
assert.deepEqual(list.map(i=>i.url),edition.stories.map(s=>s.sourceUrl));
assert.match(html,/How this page works/);assert.match(html,/<p class="breaking-news__meta">BBC News · <time datetime=/);

const head=await worker.fetch(new Request('https://brainilabgames.com/breaking-news/',{method:'HEAD'}),env(true),ctx);
assert.equal(head.status,200);
assert.ok(!readFileSync('sitemap.xml','utf8').includes('/breaking-news/'),'not in the static sitemap');
console.log('PASS Breaking News: indexable with a dated title, publisher description and matching ItemList while stories exist; noindex, follow when empty.');
