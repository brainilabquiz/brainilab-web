import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {libraryBody,prepareArticle} from '../lib/learn-content.js';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const read=p=>readFileSync(p,'utf8'), release=JSON.parse(read('content/releases/discovery-20260929.json'));
const dom=new JSDOM('',{url:'https://brainilabgames.com/games/number-route/',runScripts:'outside-only'});
dom.window.eval(read('assets/js/number-route.js'));
const apply=dom.window.BrainiNumberRoute.apply;
assert.equal(release.number_route.length,60);assert.equal(release.connections.length,24);
const worksheet=release.worksheet;
assert.equal(worksheet.length,5);
for(const p of [...release.number_route,...worksheet]){
 const solutions=[];
 for(const a of ['+','−','×','÷'])for(const b of ['+','−','×','÷'])for(const c of ['+','−','×','÷']){
  let v=p.numbers[0];const ops=[a,b,c];
  for(let i=0;i<3;i++){v=apply(v,ops[i],p.numbers[i+1]);if(v===null||Math.abs(v)>1000)break;}
  if(v===p.target)solutions.push(ops);
 }
 assert.equal(solutions.length,1,JSON.stringify(p));assert.deepEqual(solutions[0],p.solution);
}
for(const p of release.connections){assert.equal(p.clues.length,4);assert.equal(new Set([p.correct_connection,...p.distractors].map(s=>s.toLowerCase())).size,4);assert.ok(p.explanation.length>10);}
dom.window.close();
for(const [game,object,root,start,pool,count] of [
 ['number-route','BrainiNumberRoute','#numberRouteGame','[data-start]','BrainiNumberRoutePuzzles',100],
 ['connections','BrainiConnections','#connectionsGame','[data-connections-start]','BrainiConnectionsPuzzles',44]
])for(const query of ['','?try=1']){
 const d=new JSDOM(read(`games/${game}/index.html`),{url:`https://brainilabgames.com/games/${game}/${query}`,runScripts:'outside-only'}),w=d.window;
 let starts=0;w.BrainiBackendAuth={isConfigured:()=>false};w.BrainiSiteAnalytics={gameStart:()=>starts++};
 w.eval(read('assets/js/data.js'));w.eval(read(`assets/js/${game}-puzzles.js`));
 assert.equal(w[pool].all().length,count);w.eval(read(`assets/js/${game}.js`));
 await w[object].mount(w.document.querySelector(root));w.document.querySelector(start).click();await new Promise(r=>setTimeout(r,0));
 assert.equal(starts,query?0:1,game+query);w.close();
}
const pdf='/assets/resources/five-number-puzzles.pdf';
for(const query of ['?from=number-break','?from=private@example.com']){
 const d=new JSDOM(`<title>Number Route</title><a href="${pdf}">PDF</a>`,{url:'https://brainilabgames.com/games/number-route/'+query,runScripts:'outside-only'}),w=d.window;
 w.eval(read('assets/js/site-analytics.js'));const link=w.document.querySelector('a');link.addEventListener('click',e=>e.preventDefault());link.click();assert.equal(w.dataLayer,undefined);
 w.BrainiSiteAnalytics.setConsent(true);link.click();w.BrainiSiteAnalytics.gameStart('numberroute',{});w.BrainiSiteAnalytics.gameStart('connections',{});
 const events=w.dataLayer.filter(x=>x[0]==='event');assert.equal(events.filter(x=>x[1]==='resource_arrival').length,query==='?from=number-break'?1:0);
 assert.equal(events.filter(x=>x[1]==='resource_download').length,1);assert.equal(events.filter(x=>x[1]==='game_start').length,2);
 assert.ok(!JSON.stringify(w.dataLayer).includes('private@example.com'));w.BrainiSiteAnalytics.setConsent(false);link.click();assert.equal(w.dataLayer.filter(x=>x[0]==='event').length,0);w.close();
}
const article=prepareArticle(JSON.parse(read('content/articles/five-number-puzzles-printable.json')));
assert.ok(libraryBody([article]).includes('learn-resource-link'));assert.ok(!libraryBody([]).includes('learn-resource-link'));
assert.match(article.sections[0].html,/five-number-puzzles.pdf/);assert.equal(article.sections.filter(s=>s.html.includes('practice-answer')).length,5);
for(const game of ['number-route','connections']){
 const d=new JSDOM(read(`games/${game}/index.html`));assert.equal(d.window.document.querySelectorAll('h1').length,1);
 assert.equal(d.window.document.querySelectorAll('[data-game-guides] a').length,2);
 for(const a of d.window.document.querySelectorAll('[data-game-guides] a'))assert.ok(read('.'+a.getAttribute('href')+'index.html'));
 d.window.close();
}
console.log('PASS: 65 unique routes, 24 complete clue sets, expanded fallback pools, real game starts/practice exclusion, consent-gated resource attribution, no unpublished promo and guide links.');
