import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {sitemapDate,sitemapLastmod} from '../lib/sitemap-date.js';
import {serveLearn} from '../lib/learn-worker.js';

for(const [input,expected] of [
 ['2026-10-11 08:49:38.464979+00','2026-10-11T08:49:38Z'],
 ['2026-10-12T17:50:01.663034+00:00','2026-10-12T17:50:01Z'],
 ['2026-10-09T17:07:39.649548Z','2026-10-09T17:07:39Z'],
 ['2026-10-18T00:30:00+02:00','2026-10-17T22:30:00Z'],
 ['2026-10-18 09:30:00-0530','2026-10-18T15:00:00Z'],
 ['2024-02-29','2024-02-29'],['2026-10-18','2026-10-18'],
 ['2026-02-29',''],['2026-04-31T10:00:00Z',''],['2026-13-01',''],
 ['2026-10-18T24:00:00Z',''],['2026-10-18T10:60:00Z',''],['2026-10-18T10:00:60Z',''],
 ['2026-10-18T10:00:00+14:01',''],['2026-10-18T10:00:00+02:99',''],
 ['2026-10-18T10:00:00',''],['0000-01-01',''],['today',''],['<script>bad</script>',''],
 [undefined,''],[null,''],[42,''],[{},'']
])assert.equal(sitemapDate(input),expected,String(input));
assert.equal(sitemapLastmod('not a date'),'');
assert.equal(sitemapLastmod('2026-10-11 08:49:38.464979+00'),'<lastmod>2026-10-11T08:49:38Z</lastmod>');

const documents=[];for(const name of await readdir('content/articles'))if(name.endsWith('.json')){const a=JSON.parse(await readFile('content/articles/'+name,'utf8'));if(a.status==='published')documents.push(a);}
for(const a of documents){const normalized=sitemapDate(a.updatedAt);if(normalized){assert.match(normalized,/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}Z)?$/);assert.ok(Math.abs(Date.parse(normalized)-Date.parse(a.updatedAt))<1000,a.slug);}}
const sample=documents[0],legacy={...sample,slug:'legacy-date-check',updatedAt:'2026-10-11 08:49:38.464979+00'},invalid={...sample,slug:'invalid-date-check',updatedAt:'2026-02-30T09:00:00Z'};
const env={ASSETS:{fetch:async()=>new Response('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://brainilabgames.com/games/</loc></url></urlset>')}};
const fetcher=async input=>new Response(JSON.stringify(input.includes('learn_publications?')?[{document:legacy},{document:invalid}]:[]));
const response=await serveLearn(new Request('https://brainilabgames.com/sitemap.xml'),env,{waitUntil(){}},{match:async()=>null,put:async()=>{}},fetcher);
assert.equal(response.status,200);const xml=await response.text();
assert.ok(xml.includes('<loc>https://brainilabgames.com/learn/legacy-date-check/</loc><lastmod>2026-10-11T08:49:38Z</lastmod>'));
assert.ok(xml.includes('<loc>https://brainilabgames.com/learn/invalid-date-check/</loc></url>'));
assert.ok(!xml.includes('464979')&&!xml.includes('2026-02-30'));
assert.ok(xml.includes('/games/')&&xml.includes('/learn/topics/'));
console.log('PASS sitemap dates: stored timestamps, SQL/ISO/offset formats, calendar validation, no invented date, current articles and Worker XML.');
