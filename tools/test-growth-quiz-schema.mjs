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
const targeted=structuredClone(snapshot);
const checkAt='2026-11-11T11:49:00Z',checkNow=Date.parse(checkAt)+1000;
targeted.quizSchema.verifications=[{url,scopeVersion:scope.version,receiptSha256:'c'.repeat(64),declarationsSha256:'d'.repeat(64),declarationsAt:at,cloudAt:checkAt,localAt:checkAt,
 rows:[[page.questions[0],['equivalent','equivalent','equivalent']],[page.questions[1],['text','text','text']]]}];
const verified=quizSchemaView(targeted,url,null,checkNow);
assert.equal(verified.comparison.source,'targeted');
assert.equal(verified.comparison.unknown,false,'targeted verification retains the original declaration date');
assert.deepEqual(verified.comparison.rows.map(row=>row.state),['reviewed_equivalent','matched']);
assert.match(verified.html,/Targeted check of the listed declarations/);
assert.match(verified.html,/local · reviewed equivalent/);
assert.equal(verified.exported[0][9],checkAt);
assert.doesNotMatch(verified.exported[0][2],/original declaration capture/);
assert.match(quizSchemaView(targeted,url,null,checkNow+3*86400000).html,/Dated verification/);
const changed={url,checkedAt:checkAt,state:'ready',quizQuestions:{state:'ready',questions:['Different question?']}};
assert.notEqual(compareQuiz(targeted,url,changed,checkNow).source,'targeted');
const removed={...changed,quizQuestions:{state:'not_declared',questions:[]}};
const archived=quizSchemaView(targeted,url,removed,checkNow);
assert.equal(archived.comparison.archived,true);
assert.equal(archived.comparison.recent,false);
assert.match(archived.html,/current page declares no Question entries/);
for(const row of archived.exported.slice(0,-1)){
 assert.ok(row[2].includes('; original declaration capture: '+at+'; stable review key: '));
 assert.equal(row[9],checkAt,'keep the bank check date in Observed at');
}
assert.equal(archived.exported.at(-1)[9],checkAt,'keep the later page capture in the date row');
const newBank=structuredClone(targeted);newBank.quizSchema.banks[0].providers[0].observedAt='2026-11-11T11:49:01Z';
assert.notEqual(compareQuiz(newBank,url,null,checkNow).source,'targeted');
const graph=parts=>'<main><h1>Quiz</h1></main><script type="application/ld+json">'+JSON.stringify({'@graph':[{'@type':'Quiz','@id':url+'#quiz',...(parts===null?{}:{hasPart:parts})}]})+'</script>';
const declaration=[{'@type':'Question',name:'A real question?'}];
const parsed=parseCurrentPage(graph(declaration),url,at,d);assert.deepEqual(parsed.quizQuestions,{state:'ready',questions:['A real question?']});
assert.equal(parseCurrentPage('<template>'+graph(declaration)+'</template>',url,at,d).quizQuestions.state,'unknown');
assert.equal(parseCurrentPage(graph(declaration)+graph(declaration),url,at,d).quizQuestions.state,'unknown');
assert.equal(parseCurrentPage(graph(null),url,at,d).quizQuestions.state,'not_declared');
const gameGraph=graph(null).replace('"@type":"Quiz"','"@type":"Game"');
assert.equal(parseCurrentPage(gameGraph,url,at,d).quizQuestions.state,'not_declared');
assert.equal(parseCurrentPage(gameGraph.replace('#quiz','#other'),url,at,d).quizQuestions.state,'unknown');
assert.equal(parseCurrentPage(gameGraph+graph(null),url,at,d).quizQuestions.state,'unknown');

const topicPaths=scope.topics.map(t=>t.path);
for(const path of [...topicPaths,'/games/brain-mix/','/geography/europe-flags-quiz/']){
 const pageURL='https://brainilabgames.com'+path;
 const html=readFileSync('.'+path+'index.html','utf8');
 const scripts=JSDOM.fragment(html).querySelectorAll('script[type="application/ld+json"]');
 const nodes=Array.from(scripts,s=>JSON.parse(s.textContent)).flatMap(data=>data['@graph']||[data]);
 const games=nodes.filter(n=>n['@type']==='Game');
 assert.equal(games.length,1,path);
 assert.equal(games[0].url,pageURL,path);
 assert.ok(games[0].name&&games[0].image,path);
 assert.equal(games[0].genre,'Quiz game',path);
 assert.ok(!nodes.some(n=>n['@type']==='Quiz')&&!Object.hasOwn(games[0],'hasPart'),path);
 assert.ok(nodes.some(n=>n['@type']==='BreadcrumbList'),path);
 assert.ok(nodes.some(n=>n['@type']==='FAQPage'&&n.mainEntity.length>0),path);
 const webPage=nodes.find(n=>n['@type']==='WebPage');
 if(webPage)assert.equal(webPage.mainEntity['@id'],games[0]['@id'],path);
 if(topicPaths.includes(path))assert.equal(parseCurrentPage(html,pageURL,at,d).quizQuestions.state,'not_declared',path);
}
const report={seoExplorer:{schemaVersion:1,domain:'brainilabgames.com',observedAt:at,pages:[],sources:[],backlinks:[],...snapshot}},workspace={opportunities:[]};
const before=JSON.stringify({report,workspace});let calls=0;globalThis.fetch=()=>{calls++;throw Error('No automatic requests');};globalThis.document=d;
const root=d.querySelector('main');root.innerHTML=seoHTML(report,now);bindSEO(root,report,workspace);root.querySelector('[data-seo-view="quiz"]').click();
assert.equal(calls,0);assert.equal(root.querySelector('[data-seo-prev]').hidden,true);assert.equal(root.querySelectorAll('[data-seo-review-url]').length,6);
root.querySelector('[data-seo-review-url]').click();assert.equal(d.activeElement.id,'growth-page-review-title');assert.match(root.textContent,/Dynamic quiz questions/);assert.equal(calls,0);
assert.equal(JSON.stringify({report,workspace}),before);assert.ok(quizSchemaOverview(snapshot,now).exported.every(r=>r.length===13));
dom.window.close();console.log('PASS dynamic quiz schema: eight playable game pages, archived and targeted evidence, reviewed wording, dated observations, safe exports and six-page navigation.');
