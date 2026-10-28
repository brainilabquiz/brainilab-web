import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {observeLearnSchema,compactLearnSchema} from '../editor/page-schema-evidence.js';
import {inertPublicHTML} from '../editor/page-link-evidence.js';
import {learnComparison,learnSchemaPage,learnSchemaTable} from '../editor/growth-learn-schema.js';
import {seoHTML,bindSEO} from '../editor/growth-seo-explorer.js';
const {JSDOM}=createRequire(import.meta.url)(process.env.JSDOM_MODULE||'jsdom'),dom=new JSDOM('<main></main>',{url:'https://brainilabgames.com/admin/'}),d=dom.window.document;
const at='2026-10-28T20:00:00Z',now=Date.parse(at)+1000,url='https://brainilabgames.com/learn/example/',course='https://brainilabgames.com/learn/paths/example/',image='https://brainilabgames.com/assets/images/learn/example.webp';
function check(kind='Article',change={}){
 const target=kind==='Course'?course:url,date='2026-10-20T12:00:00.123456+00:00',entity={'@type':kind,url:target,...(kind==='Course'?{name:'A title',hasPart:[{'@type':'LearningResource',position:1,name:'Lesson',url}]}:{headline:'A title'}),author:{name:'An author'},image,datePublished:date,dateModified:date,...change};
 const html='<link rel="canonical" href="'+target+'"><meta property="og:image" content="'+image+'"><meta property="article:modified_time" content="'+date+'"><main><h1>A title</h1><p class="article-byline"><span>An author</span><time datetime="2026-10-20T14:00:00.123456+02:00">20 Oct 2026</time></p><figure class="article-cover"><img src="'+image+'"></figure><header class="academy-hero"><img src="'+image+'"></header><ol class="path-lessons"><li><div class="lesson-copy"><h3><a href="'+url+'">Lesson</a></h3></div></li></ol></main>';
 const f=inertPublicHTML(html,d);return {evidence:observeLearnSchema(f,target,[entity]),fragment:f,entity};
}
for(const kind of ['Article','Course']){const c=check(kind);assert.equal(c.evidence.state,'ready');assert.ok(c.evidence.checks.every(c=>c.state==='same'),kind);}
assert.equal(check('Article',{datePublished:'2026-10-20T12:00:00.123457Z'}).evidence.checks.find(c=>c.field==='published').state,'different','retain fractional precision');
assert.equal(check('Article',{datePublished:'not a date'}).evidence.checks.find(c=>c.field==='published').state,'unknown');
assert.equal(check('Article',{headline:'A different title'}).evidence.checks.find(c=>c.field==='headline').state,'different');
assert.equal(check('Course',{hasPart:[{position:2,name:'Lesson',url}]}).evidence.checks.find(c=>c.field==='lessons').state,'unknown');
assert.equal(check('Course',{hasPart:[{position:1,name:'Another lesson',url}]}).evidence.checks.find(c=>c.field==='lessons').state,'different');
const c=check('Course'),ambiguous=observeLearnSchema(c.fragment,course,[c.entity,c.entity]);assert.equal(ambiguous.state,'unknown');
assert.equal(observeLearnSchema(c.fragment,'https://brainilabgames.com/learn/paths/',[c.entity]),null);
const p={url:course,checkedAt:at,sha256:'a'.repeat(64),contentSha256:'b'.repeat(64),...compactLearnSchema(c.evidence)},snapshot={learnSchema:{schemaVersion:1,domain:'brainilabgames.com',pages:[p]}};
assert.equal(learnComparison(snapshot,course,null,now).reviewNeeded,0);assert.equal(learnComparison(snapshot,course,null,now).unknown,false);
const old=structuredClone(snapshot);old.learnSchema.pages[0].checkedAt='2026-10-28T18:00:00Z';old.learnSchema.pages[0].checks[0][1]='different';
assert.equal(learnComparison(old,course,null,now).reviewNeeded,0);assert.equal(learnComparison(old,course,null,now).historical,true);
assert.equal(learnComparison(snapshot,course,null,now+3*86400000).unknown,true);
const csv=learnSchemaPage(snapshot,course,null,now).exported;assert.ok(csv.every(r=>r.length===13));assert.equal(csv.find(r=>r[1]==='Ordered lesson names and URLs')[2].includes('b'.repeat(64)),true);
const later=structuredClone(snapshot);later.learnSchema.pages[0].checkedAt='2026-10-28T20:01:00Z';assert.equal(learnSchemaPage(later,course,null,now+120000).exported[0][2],csv[0][2]);
const xss=structuredClone(snapshot);xss.learnSchema.pages[0].checks[0][1]='different';xss.learnSchema.pages[0].details=[['canonical','<img src=x onerror=alert(1)>',course]];assert.doesNotMatch(learnSchemaPage(xss,course,null,now).html,/<img/);
const report={seoExplorer:{schemaVersion:1,domain:'brainilabgames.com',observedAt:at,pages:[],sources:[],backlinks:[],...snapshot}},before=JSON.stringify(report);let requests=0;globalThis.fetch=()=>{requests++;throw Error('No fetch');};globalThis.document=d;
const root=d.querySelector('main');root.innerHTML=seoHTML(report,now);bindSEO(root,report,{opportunities:[]});root.querySelector('[data-seo-view="learn"]').click();assert.equal(requests,0);root.querySelector('[data-seo-review-url]').click();assert.equal(d.activeElement.id,'growth-page-review-title');assert.ok(root.querySelector('.growth-learn-schema'));assert.equal(JSON.stringify(report),before);assert.equal(requests,0);
assert.equal(learnSchemaTable(snapshot,'Course',now).rows.length,1);assert.equal(learnSchemaTable(snapshot,'absent',now).rows.length,0);
dom.window.close();console.log('PASS Learn schema: shared Article/Course fields, precise date instants, visible cover and ordered lessons, ambiguity/omissions, historical correction, stale evidence, stable review keys, all-row CSV, XSS, focus and zero automatic requests or decision writes.');
