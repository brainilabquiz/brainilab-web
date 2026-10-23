import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {prepareArticle} from '../lib/learn-content.js';
import {readingPages,refreshGameReadings} from '../lib/game-readings.js';
const require=createRequire(import.meta.url),{JSDOM}=require(process.env.JSDOM_MODULE||'jsdom');
const read=file=>readFileSync(file,'utf8');
const articles=readdirSync('content/articles').filter(f=>f.endsWith('.json')).map(f=>JSON.parse(read('content/articles/'+f))).filter(a=>a.status==='published').map(prepareArticle);
const expected=new Map([['sports/sports-quiz/index.html','what-is-pickleball'],['science/science-quiz/index.html','how-does-a-compass-work'],['geography/world-capitals-quiz/index.html','what-is-an-estuary']]);
const established=new Map([['sports/sports-quiz/index.html',['how-to-read-a-tennis-score','why-golf-balls-have-dimples']],['science/science-quiz/index.html',['why-is-the-sky-blue','why-does-ice-float']],['geography/world-capitals-quiz/index.html',["why-canberra-is-australias-capital","why-time-zones-get-messy"]]]);
for(const file of readingPages){
 const before=read(file),after=refreshGameReadings(before,articles,file);
 assert.equal(refreshGameReadings(after,articles,file),after,'Repeated builds must not duplicate a reading or remove later content');
 const previous=new JSDOM(before),next=new JSDOM(after),p=previous.window.document,n=next.window.document;
 // Compare DOM outside the recommendations, including Start, questions, metadata and scripts.
 p.querySelector('[data-game-guides]').replaceChildren();n.querySelector('[data-game-guides]').replaceChildren();
 // Existing regeneration already retires the old duplicate recommendation aside.
 p.querySelectorAll('aside[aria-label="Related reading"]').forEach(el=>el.remove());
 const outside=doc=>doc.documentElement.outerHTML.replace(/<!-- related-reading:20260928 -->/g,'').replace(/>\s+</g,'><');
 assert.equal(outside(p),outside(n),file+' changed outside the reading section');
 const rendered=new JSDOM(after).window.document,slug=expected.get(file),extra=rendered.querySelectorAll('.game-reading-extra a');
 assert.equal(extra.length,slug?1:0,file);
 const cardLinks=doc=>[...doc.querySelectorAll('[data-game-guides]>div a')].map(a=>a.getAttribute('href'));
 if(established.has(file))assert.deepEqual(cardLinks(rendered),established.get(file).map(s=>'/learn/'+s+'/'),'Established published illustrated readings stay in the same order');
 assert.equal(rendered.querySelectorAll('.game-reading-extra img,.game-reading-extra script,.game-reading-extra button').length,0);
 if(slug){
  assert.equal(extra[0].getAttribute('href'),'/learn/'+slug+'/');assert.ok(extra[0].textContent.trim().endsWith('→'));
  const without=articles.filter(a=>a.slug!==slug),unpublished=articles.map(a=>a.slug===slug?{...a,status:'draft'}:a);
  for(const source of [without,unpublished])assert.ok(!new JSDOM(refreshGameReadings(after,source,file)).window.document.querySelector('.game-reading-extra'),'Unavailable readings must not leave a stale link');
 }
 previous.window.close();next.window.close();
}
console.log('Organic discovery: three crawlable links, published-only targets, stable illustrated picks, idempotence and unchanged game/metadata/script DOM across 19 entrances passed.');
