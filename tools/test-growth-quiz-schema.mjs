import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {compareQuiz,quizSchemaView,quizSchemaOverview,observeQuizQuestions} from '../editor/growth-quiz-schema.js';
import {parseCurrentPage} from '../editor/growth-current-page.js';
import {seoHTML,bindSEO} from '../editor/growth-seo-explorer.js';
import scope from '../lib/quiz-schema-scope.json' with {type:'json'};
const {JSDOM}=createRequire(import.meta.url)(process.env.JSDOM_MODULE||'jsdom');
const dom=new JSDOM('<main></main>',{url:'https://brainilabgames.com/admin/'}),d=dom.window.document;
const at='2026-10-28T19:00:00Z',now=Date.parse(at)+1000,url='https://brainilabgames.com'+scope.topics[0].path;
const page={url,checkedAt:at,sha256:'a'.repeat(64),state:'ready',questions:['How many continents are there?','What is the smallest prime number?']};
const bank={topic:'general-knowledge',source:'published-question-tables',sha256:'b'.repeat(64),providers:['anytime','fixed','local'].map(name=>({name,complete:true,observedAt:at,prompts:['How many continents are commonly recognized?','What is the smallest prime number greater than 100?']}))};
const snapshot={quizSchema:{schemaVersion:1,domain:'brainilabgames.com',banks:[bank],pages:[page]}};
const c=compareQuiz(snapshot,url,null,now);
assert.equal(c.rows[0].state,'reviewed_equivalent');assert.equal(c.rows[1].state,'review_needed','qualifiers must not be dropped by fuzzy matching');
assert.match(quizSchemaView(snapshot,url,null,now).html,/not a proven semantic error/);
assert.equal(compareQuiz(snapshot,url+'index.html',null,now),null);
const later=structuredClone(snapshot);later.quizSchema.banks[0].providers.forEach(p=>p.observedAt='2026-10-28T20:00:00Z');
assert.equal(compareQuiz(later,url,null,Date.parse('2026-10-28T20:00:01Z')).rows[1].reviewKey,c.rows[1].reviewKey,'same content read later must not create another review identity');
for(const mutate of [s=>s.quizSchema.banks[0].providers.pop(),s=>s.quizSchema.banks[0].providers[0].complete=false,s=>s.quizSchema.pages[0].state='unknown',s=>s.quizSchema.banks[0].providers[0].observedAt='2026-10-25T19:00:00Z']){
 const s=structuredClone(snapshot);mutate(s);if(s.quizSchema.pages[0].state==='unknown')s.quizSchema.pages[0].questions=[];
 assert.equal(compareQuiz(s,url,null,now).reviewNeeded,0,'incomplete, ambiguous or old data cannot establish a mismatch');
}
const invalid=structuredClone(snapshot);invalid.quizSchema.banks[0].providers.push(bank.providers[0]);assert.equal(compareQuiz(invalid,url,null,now).unknown,true);
for(const field of ['banks','pages']){const s=structuredClone(snapshot);s.quizSchema[field]=[null];assert.equal(compareQuiz(s,url,null,now).unknown,true);}
const missing=structuredClone(snapshot);missing.quizSchema.banks[0].providers.forEach(p=>p.prompts=[]);assert.equal(compareQuiz(missing,url,null,now).rows[0].state,'review_needed','a reviewed counterpart must still exist');
const xss=structuredClone(snapshot);xss.quizSchema.pages[0].questions=['<img src=x onerror=alert(1)>'];assert.doesNotMatch(quizSchemaView(xss,url,null,now).html,/<img/);
const graph=parts=>'<main><h1>Quiz</h1></main><script type="application/ld+json">'+JSON.stringify({'@graph':[{'@type':'Quiz','@id':url+'#quiz',...(parts===null?{}:{hasPart:parts})}]})+'</script>';
const declaration=[{'@type':'Question',name:'A real question?'}];
const parsed=parseCurrentPage(graph(declaration),url,at,d);assert.deepEqual(parsed.quizQuestions,{state:'ready',questions:['A real question?']});
assert.equal(parseCurrentPage('<template>'+graph(declaration)+'</template>',url,at,d).quizQuestions.state,'unknown');
assert.equal(parseCurrentPage(graph(declaration)+graph(declaration),url,at,d).quizQuestions.state,'unknown');
assert.equal(parseCurrentPage(graph(null),url,at,d).quizQuestions.state,'not_declared');

// All remaining real declarations have exact or reviewed counterparts in the local fallback.
const packs=JSON.parse(readFileSync('assets/js/quiz-packs.js','utf8').match(/const PACKS=(.*);\r?\n/)[1]);
let declared=0;
for(const t of scope.topics){
 const u='https://brainilabgames.com'+t.path,html=readFileSync('.'+t.path+'index.html','utf8'),obs=parseCurrentPage(html,u,at,d),prompts=Object.values(packs[t.local]).flatMap(sets=>Object.values(sets).flatMap(qs=>qs.map(q=>q.q)));
 const s={quizSchema:{schemaVersion:1,domain:'brainilabgames.com',banks:[{...bank,topic:t.slug,providers:bank.providers.map(p=>({...p,prompts}))}],pages:[{url:u,checkedAt:at,sha256:'a'.repeat(64),...obs.quizQuestions}]}};
 const compared=compareQuiz(s,u,null,now);assert.equal(compared.reviewNeeded,0,t.slug);assert.equal(compared.unknown,false,t.slug);declared+=compared.rows.length;
}
assert.equal(declared,22);
const report={seoExplorer:{schemaVersion:1,domain:'brainilabgames.com',observedAt:at,pages:[],sources:[],backlinks:[],...snapshot}},workspace={opportunities:[]};
const before=JSON.stringify({report,workspace});let calls=0;globalThis.fetch=()=>{calls++;throw Error('No automatic requests');};globalThis.document=d;
const root=d.querySelector('main');root.innerHTML=seoHTML(report,now);bindSEO(root,report,workspace);root.querySelector('[data-seo-view="quiz"]').click();
assert.equal(calls,0);assert.equal(root.querySelector('[data-seo-prev]').hidden,true);assert.equal(root.querySelectorAll('[data-seo-review-url]').length,6);
root.querySelector('[data-seo-review-url]').click();assert.equal(d.activeElement.id,'growth-page-review-title');assert.match(root.textContent,/Dynamic quiz questions/);assert.equal(calls,0);
assert.equal(JSON.stringify({report,workspace}),before);assert.ok(quizSchemaOverview(snapshot,now).exported.every(r=>r.length===13));
dom.window.close();console.log('PASS dynamic quiz schema: 22 real declarations, reviewed equivalences, preserved qualifiers, stale/incomplete/ambiguous data, stable review identity, safe CSV/HTML, inert parsing, six-page navigation/focus, zero automatic requests and no decision writes.');
