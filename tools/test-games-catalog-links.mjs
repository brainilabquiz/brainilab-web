import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const html=readFileSync('games/index.html','utf8');
const script=readFileSync('assets/js/games-library.js','utf8');
const doc=new JSDOM(html,{url:'https://brainilabgames.com/games/'}).window.document;
const graph=JSON.parse(doc.querySelector('script[type="application/ld+json"]').textContent)['@graph'];
const list=graph.find(x=>x['@type']==='ItemList');
const normalise=value=>new URL(value,'https://brainilabgames.com/games/').pathname.replace(/index\.html$/,'').replace(/\/$/,'');
const cards=[...doc.querySelectorAll('[data-anytime-game]')];
const routes=cards.map(card=>normalise(card.querySelector('a').getAttribute('href')));
assert.equal(list.numberOfItems,cards.length);
assert.equal(new Set(list.itemListElement.map(x=>x.url)).size,cards.length);
assert.deepEqual(list.itemListElement.map(x=>normalise(x.url)).sort(),routes.sort(),'Every distinct visible game has one structured link');
assert.deepEqual(list.itemListElement.map(x=>x.position),Array.from({length:cards.length},(_,i)=>i+1));
const archiveLinks=[...doc.querySelectorAll('[data-random-past-game]')];
assert.equal(archiveLinks.length,4);
for(const a of archiveLinks){
 const url=new URL(a.getAttribute('href'),'https://brainilabgames.com/games/');
 assert.equal(url.origin,'https://brainilabgames.com');
 assert.equal(url.searchParams.get('archive'),'2026-08-29');
 assert.ok(!url.searchParams.has('daily')&&!url.searchParams.has('try'),'Static fallback stays archive practice');
 assert.ok(readFileSync('.'+url.pathname,'utf8').includes('rel="canonical"'),'Existing game destination');
}
const fixtures=[html,html.replace(/href="[^"]+" (?=data-random-past-game)/g,'')];
const final=[];
for(const fixture of fixtures){
 const dom=new JSDOM(fixture,{url:'https://brainilabgames.com/games/',runScripts:'outside-only'});const w=dom.window;
 w.Date=class extends Date{constructor(...args){super(...(args.length?args:['2026-10-21T12:00:00Z']));}static now(){return Date.parse('2026-10-21T12:00:00Z');}};
 w.Math.random=()=>0;
 let writes=0;
 w.BrainiData={dailyGameIdsForDate:date=>date<'2026-09-01'?['brainmix','brainiword','orderup','topicrush']:[],recentResults:()=>[{practice:true,challengeDate:'2026-08-29'}],personalBest:()=>null,player:()=>({level:1}),saveResult:()=>{writes++;},addXP:()=>{writes++;}};
 w.BrainiIcons={product:()=>''};w.eval(script);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 const links=[...w.document.querySelectorAll('[data-random-past-game]')];
 assert.ok(links.every(a=>a.href.endsWith('?archive=2026-08-30')),'Hydration still chooses unseen practice content');
 final.push(links.map(a=>({href:a.href,label:a.getAttribute('aria-label'),text:a.textContent})));
 assert.equal(writes,0,'Library navigation never awards progress or saves game results');dom.window.close();
}
assert.deepEqual(final[0],final[1],'Static fallback does not alter hydrated navigation');
console.log('PASS Games catalogue: all visible games discoverable, safe archive fallbacks, unchanged unseen-practice hydration, no result or XP writes.');
