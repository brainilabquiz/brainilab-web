import assert from 'node:assert/strict';
import {readFileSync}from'node:fs';import{createHash}from'node:crypto';import vm from'node:vm';
const source=readFileSync('assets/js/quiz-packs.js','utf8'),review=JSON.parse(readFileSync('content/game-batches/factual-revisions-20261022.json','utf8'));
const packs=JSON.parse(source.match(/const PACKS=(\{.*\});/)[1]),answers={},questions=[];
vm.runInNewContext(source,{window:{},URLSearchParams,Math,Date,JSON});
for(const[topic,difficulties]of Object.entries(packs))for(const[difficulty,sets]of Object.entries(difficulties))for(const[number,rows]of Object.entries(sets)){
 assert.equal(rows.length,20);answers[topic+':'+difficulty+':'+number]=rows.map(q=>({a:q.a,c:q.c}));questions.push(...rows);
 for(const q of rows){assert.equal(q.a.length,4);assert.equal(new Set(q.a).size,4);assert.ok(Number.isInteger(q.c)&&q.c>=0&&q.c<4);}
}
assert.equal(questions.length,360);
const signature=createHash('sha256').update(JSON.stringify(Object.fromEntries(Object.entries(answers).sort(([a],[b])=>a<b?-1:a>b?1:0)))).digest('hex');
assert.equal(signature,'c9a37f80fb9f87cd2f4bfa3cbe0373838a02c09c1e70244c3fe7f09e5e64f7f7','All 360 answer labels, correct positions and pack positions stay unchanged');
assert.equal(review.revisions.length,9);
for(const revision of review.revisions){const found=questions.filter(q=>q.q===revision.prompt);assert.equal(found.length,1);assert.equal(found[0].a[found[0].c],revision.answer);assert.equal(found[0].f,revision.explanation);assert.match(revision.source,/^https:\/\//);assert.equal(revision.checkedAt,'2026-10-22');}
assert.ok(questions.some(q=>q.q.includes('charter, sealed in 1215')));assert.ok(questions.some(q=>q.q.includes('ITTF specify')));assert.ok(questions.some(q=>q.q.includes("men's world-title")));assert.ok(questions.some(q=>q.q.includes('In May 2026')));
console.log('PASS nine source-checked fallback revisions; all 360 answer sets, correct positions, pack order and four-option structures preserved.');
