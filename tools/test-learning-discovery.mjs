import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {prepareArticle,articleBody} from '../lib/learn-content.js';
import {topicAnchor,topicIndexBody} from '../lib/learn-topic-index.js';
import {pathBody} from '../lib/learning-render.js';
import {refreshGameReadings,readingPages} from '../lib/game-readings.js';
const load=file=>JSON.parse(readFileSync(file,'utf8'));
const articles=readdirSync('content/articles').filter(f=>f.endsWith('.json')).map(f=>load('content/articles/'+f)).filter(a=>a.status==='published').map(prepareArticle);
const paths=readdirSync('content/paths').filter(f=>f.endsWith('.json')).map(f=>load('content/paths/'+f)).filter(p=>p.status==='published');
const authors=load('content/authors.json'),doc=html=>new JSDOM(html,{url:'https://brainilabgames.com/'}).window.document;
const index=doc(topicIndexBody(articles,paths));
assert.equal(index.querySelectorAll('.topic-index-list li').length,articles.length,'Course recommendations must not replace or duplicate article entries');
for(const p of paths){
 const section=index.getElementById(topicAnchor(p.topic));
 assert.equal(section.querySelectorAll(`.topic-index-explore a[href="/learn/paths/${p.slug}/"]`).length,1,'Every ready course appears once under its actual subject');
 const page=doc(pathBody(p,articles,authors)),link=page.querySelector('.academy-explore a');
 assert.equal(link.getAttribute('href'),'/learn/topics/#'+topicAnchor(p.topic));
 assert.ok(index.getElementById(link.hash.slice(1)),'Course link must resolve to an existing topic section');
 assert.equal(page.querySelectorAll('.path-lessons>li').length,p.lessons.length,'Discovery links preserve the complete lesson order');
}
const p=paths[0],withdrawn=articles.filter(a=>a.slug!==p.lessons[0].slug);
assert.equal(doc(topicIndexBody(withdrawn,[p])).querySelectorAll('.topic-index-explore a[href*="/learn/paths/"]').length,0,'A course with a withdrawn lesson must not be promoted');
assert.equal(doc(topicIndexBody(articles,[{...p,status:'draft'}])).querySelectorAll('.topic-index-explore a[href*="/learn/paths/"]').length,0,'Draft courses must not be promoted');
const unsafe={...p,title:'<img src=x onerror=alert(1)>'},safe=doc(topicIndexBody(articles,[unsafe]));
assert.equal(safe.querySelectorAll('img,script').length,0);assert.ok(safe.querySelector(`a[href="/learn/paths/${p.slug}/"]`).textContent.includes(unsafe.title));
for(const file of readingPages){
 const original=readFileSync(file,'utf8'),html=refreshGameReadings(original,articles,file,paths),page=doc(html),links=[...page.querySelectorAll('.game-reading-paths a')];
 assert.equal(refreshGameReadings(html,articles,file,paths),html,'Repeated builds must not duplicate course or topic links');
 assert.ok(index.getElementById(links[0].hash.slice(1)),file+' points to a real topic');
 if(links[1]){const selected=page.querySelector('[data-game-guides]>div a').getAttribute('href'),course=paths.find(p=>links[1].getAttribute('href')===`/learn/paths/${p.slug}/`);assert.ok(course.lessons.some(l=>selected===`/learn/${l.slug}/`),'Promoted course contains the actual recommended reading');}
 const without=doc(refreshGameReadings(html,articles,file,[]));assert.equal(without.querySelectorAll('.game-reading-paths a[href*="/learn/paths/"]').length,0,'An unavailable course leaves no stale link');
 const outside=html=>{const d=doc(html);d.querySelector('[data-game-guides]').replaceChildren();d.querySelectorAll('aside[aria-label="Related reading"]').forEach(n=>n.remove());return d.documentElement.outerHTML.replace(/<!-- related-reading:20260928 -->/g,'').replace(/>\s+</g,'><');};
 assert.equal(outside(html),outside(original),'Game scripts, controls and metadata remain unchanged');
}
assert.ok(articleBody(articles[0],articles,paths).includes('/learn/topics/#'+topicAnchor(articles[0].topic)),'Existing article-to-topic route is retained');
console.log('PASS discovery: complete topic inventory, real fragments, ready course membership, withdrawal/draft guards, safe labels, idempotence and preserved game/lesson content.');
