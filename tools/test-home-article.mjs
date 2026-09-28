import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {prepareArticle,latestArticle} from '../lib/learn-content.js';
import {serveLearn} from '../lib/learn-worker.js';
const template=readFileSync('index.html','utf8'),base=JSON.parse(readFileSync('content/articles/why-the-moon-changes-shape.json','utf8'));
const older=prepareArticle({...base,slug:'older',order:1,publishedAt:'2026-09-20T00:00:00Z'});
const newest=prepareArticle({...base,slug:'newest',order:999,publishedAt:'2026-09-24T00:00:00Z',title:'Newest <test>',cover:{...base.cover,position:20}});
assert.equal(latestArticle([older,newest]).slug,'newest');
const env={ASSETS:{fetch:async()=>new Response(template)}},ctx={waitUntil(){}},cache={match:async()=>null,put:async()=>{}};
async function home(rows,fail=false){return (await serveLearn(new Request('https://brainilabgames.com/'),env,ctx,cache,async()=>{if(fail)throw Error('offline');return new Response(JSON.stringify(rows.map(document=>({document}))));})).text();}
let html=await home([older,newest]);
assert.match(html,/href="\/learn\/newest\/"/);assert.ok(!html.includes('/learn/older/'));
assert.match(html,/Newest &lt;test&gt;/);assert.match(html,/object-position:center 20%/);
assert.ok(html.indexOf('class="home-article"')<html.indexOf('class="home-video"'));
assert.equal((html.match(/class="home-article"/g)||[]).length,1);
html=await home([older]);assert.ok(!html.includes('/learn/newest/'));assert.match(html,/\/learn\/older\//);
html=await home([]);assert.match(html,/Explore the library/);assert.ok(!html.includes('class="home-article"'));
html=await home([],true);assert.ok(!html.includes('class="home-article"'));assert.match(html,/Explore Learn/);
console.log('PASS: newest publication over editorial order, withdrawal, empty/offline library, escaped title, cover crop and article-before-video order.');
