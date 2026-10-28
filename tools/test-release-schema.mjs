import assert from 'node:assert/strict';
import {compareLearnSchema,checkLearnCatalogue} from './release-schema.mjs';
import {articlePreviews} from '../lib/article-preview-images.js';
const base='https://brainilabgames.com',article='/learn/example/',course='/learn/paths/example/',date='2026-10-20T12:00:00.123456+00:00',image=base+'/assets/images/learn/example.webp';
function fixture(kind='Article',change={},page={}){
 const path=kind==='Course'?course:article,entity={'@type':kind,url:base+path,...(kind==='Course'?{name:'A title',hasPart:[{position:1,name:'Lesson',url:base+article}]}:{headline:'A title'}),author:{'@type':'Person',name:'Biel'},image,datePublished:date,dateModified:date,...change};
 return '<!doctype html><html><head><link rel="canonical" href="'+base+path+'"><meta property="og:image" content="'+image+'"><meta property="article:modified_time" content="'+date+'"><script type="application/ld+json">'+JSON.stringify({'@graph':[entity]})+'</script></head><body><main><h1>'+String(page.title||'A title')+'</h1><p class="article-byline"'+(page.hide?' hidden':'')+'><span>'+String(page.author||'Biel')+'</span> · Published <time datetime="'+(page.datetime||date)+'">'+(page.label||'20 Oct 2026')+'</time></p>'+(kind==='Course'?'<header class="academy-hero"><img src="'+(page.cover||image)+'"></header><ol class="path-lessons"><li><div class="lesson-copy"><h3><a href="'+base+article+'">Lesson</a></h3></div></li></ol>':'<figure class="article-cover"><img src="'+(page.cover||image)+'"></figure>')+'</main></body></html>';
}
for(const kind of ['Article','Course']){
 const path=kind==='Course'?course:article;
 assert.equal(compareLearnSchema(fixture(kind),path).ok,true,kind);
 for(const [field,change]of [['headline',kind==='Course'?{name:'Wrong title'}:{headline:'Wrong title'}],['author',{author:{name:'Another author'}}],['cover',{image:base+'/assets/images/learn/other.webp'}],['published',{datePublished:'2026-10-21T12:00:00Z'}],['modified',{dateModified:'2026-10-21T12:00:00Z'}]]){
  const result=compareLearnSchema(fixture(kind,change),path);assert.equal(result.ok,false,kind+' '+field);assert.ok(result.problems.some(p=>p.field===field&&p.state==='different'));
 }
 assert.equal(compareLearnSchema(fixture(kind,{}, {cover:base+'/assets/images/learn/other.webp'}),path).ok,false);
 assert.equal(compareLearnSchema(fixture(kind,{}, {label:'21 Oct 2026'}),path).problems.some(p=>p.field==='published_label'),true);
 assert.equal(compareLearnSchema(fixture(kind,{}, {hide:true}),path).ok,false,'Hidden bylines cannot prove visible agreement');
 const missingModified=compareLearnSchema(fixture(kind).replace(/<meta property="article:modified_time"[^>]*>/,''),path);
 assert.ok(missingModified.problems.some(p=>p.field==='modified'&&p.state==='unverified'),'Missing modification metadata blocks publication without inventing a mismatch');
 assert.equal(compareLearnSchema(fixture(kind).replace('</head>','<meta property="article:modified_time" content="'+date+'"></head>'),path).ok,false,'Duplicate metadata remains ambiguous');
 assert.equal(compareLearnSchema(fixture(kind,{datePublished:'2026-10-20T14:00:00.123456+02:00'}),path).ok,true,'Compare instants, preserving fractional precision');
 assert.equal(compareLearnSchema(fixture(kind,{datePublished:'2026-10-20T12:00:00.123457Z'}),path).ok,false);
}
assert.equal(compareLearnSchema(fixture('Article',{}, {title:'A&nbsp;title'}),article).ok,true);
const [cover,preview]=Object.entries(articlePreviews)[0];
const equivalent=fixture('Article',{image:base+preview.src},{cover:base+cover}).replace('property="og:image" content="'+image,'property="og:image" content="'+base+preview.src);
assert.equal(compareLearnSchema(equivalent,article).ok,true,'Allow registered same-image preview pairs');
for(const html of [fixture().replace('"@graph":[','"@graph":['.slice(0,-1)),fixture().replace('<h1>','<h1 hidden>'),fixture().replace('rel="canonical"','rel="not-canonical"'),fixture().replace('"name":"Biel"','"name":null')])assert.equal(compareLearnSchema(html,article).ok,false);
assert.equal(compareLearnSchema(fixture('Course',{hasPart:[{position:1,name:'Wrong lesson',url:base+article}]}),course).ok,false);
globalThis.__schemaGateExecuted=false;
assert.equal(compareLearnSchema(fixture().replace('</main>','<script>globalThis.__schemaGateExecuted=true</script><img src="https://untrusted.invalid/tracker"></main>'),article).ok,true);assert.equal(globalThis.__schemaGateExecuted,false);
const xml=paths=>'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+paths.map(p=>'<url><loc>'+base+p+'</loc></url>').join('')+'</urlset>',requests=[];let fail=false,changed=false,sitemaps=0;
const fetcher=async(url,options)=>{
 requests.push({url,options});const path=new URL(url).pathname;
 if(path==='/sitemap.xml'){sitemaps++;return new Response(xml(changed&&sitemaps>1?[article,course,'/learn/new-article/']:[article,course]));}
 if(fail&&path===article)return new Response('error code: 1102',{status:503});
 return new Response(fixture(path.includes('/paths/')?'Course':'Article'),{headers:{'Content-Type':'text/html'}});
};
const options={fetcher,pause:async()=>{}};
let result=await checkLearnCatalogue('https://codex-test-brainilab-web.brainilabquiz.workers.dev',options);assert.equal(result.ok,true);assert.equal(result.checked,2);assert.equal(result.articles,1);assert.equal(result.courses,1);
for(const r of requests){assert.equal(r.options.method,'GET');assert.equal(r.options.redirect,'manual');assert.equal(r.options.headers.Cookie,undefined);assert.equal(r.options.headers.Authorization,undefined);assert.ok(r.url.startsWith('https://codex-test-brainilab-web.brainilabquiz.workers.dev/'));}
fail=true;result=await checkLearnCatalogue(base,options);assert.equal(result.ok,false);assert.ok(result.problems.some(p=>p.reason==='HTTP 503'));fail=false;changed=true;sitemaps=0;
result=await checkLearnCatalogue(base,options);assert.equal(result.ok,false);assert.ok(result.problems.some(p=>p.reason==='catalogue_changed_during_check'));
result=await checkLearnCatalogue(base,{fetcher:async()=>new Response('<not-a-sitemap/>'),pause:async()=>{}});assert.equal(result.ok,false);
console.log('PASS schema publication gate: Article/Course titles, bylines, visible covers, registered image pairs, exact date instants and displayed dates; missing/hidden/malformed evidence, course lessons, inert parsing, full inventory, anonymous bounded reads, HTTP failure and inventory drift.');
