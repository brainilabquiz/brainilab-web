import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const games={brainmix:'brain-mix',connections:'connections',mathrush:'math-rush',brainiword:'brainiword',numberroute:'number-route',orderup:'order-up',oddoneout:'odd-one-out',topicrush:'topic-rush',sequence:'sequence',higherlower:'higher-lower'};
const pages=['/daily-quiz',...Object.values(games).map(slug=>'/games/'+slug)];
const allowed=new Set(['https://alldle.net','https://www.alldle.net']);
const blocks=[];
for(const line of readFileSync('_headers','utf8').split(/\r?\n/)){
  if(!line.trim()||line.trim().startsWith('#'))continue;
  if(!/^\s/.test(line))blocks.push({path:line.trim(),headers:{}});
  else {const colon=line.indexOf(':');assert.ok(colon>0);blocks.at(-1).headers[line.slice(0,colon).trim().toLowerCase()]=line.slice(colon+1).trim();}
}
const exact=path=>blocks.find(b=>b.path===path)?.headers||{};
const ancestors=path=>exact(path)['content-security-policy']?.match(/^frame-ancestors ([^;]+);$/)?.[1].split(/\s+/)||[];

test('all current Daily games have exact Alldle-only frame rules for every URL alias',()=>{
  const rotation=JSON.parse(readFileSync('content/daily-rules.json','utf8')).rotation;
  assert.deepEqual(new Set(rotation),new Set(Object.keys(games)),'Review framing when the Daily rotation changes');
  for(const page of pages){
    assert.ok(readFileSync(page.slice(1)+'/index.html','utf8').includes('<html'));
    for(const suffix of ['','/','/index.html'])assert.deepEqual(new Set(ancestors(page+suffix)),allowed,page+suffix);
  }
});

test('global framing denial and other security controls remain; no broad exception',()=>{
  const global=exact('/*');
  assert.equal(global['x-frame-options'],'DENY');
  assert.equal(global['x-content-type-options'],'nosniff');
  assert.equal(global['referrer-policy'],'strict-origin-when-cross-origin');
  assert.equal(global['permissions-policy'],'camera=(), microphone=(), geolocation=()');
  const scoped=blocks.filter(b=>b.headers['content-security-policy']);
  assert.equal(scoped.length,pages.length*3);
  assert.deepEqual(new Set(scoped.map(b=>b.path)),new Set(pages.flatMap(p=>['','/','/index.html'].map(s=>p+s))));
  for(const path of ['/','/admin/','/admin/index.html','/profile/','/learn/','/learn/paths/','/about/','/rankings/','/groups/','/general-knowledge/general-knowledge-quiz/','/games/survival/','/games/brain-mix/other','/daily-quiz/private'])assert.equal(ancestors(path).length,0,path);
});

test('only exact HTTPS Alldle ancestors can satisfy each permitted document policy',()=>{
  for(const page of pages){
    const origins=ancestors(page+'/');
    for(const origin of allowed)assert.ok(origins.includes(origin));
    for(const origin of ['http://alldle.net','https://preview.alldle.net','https://alldle.net.example.org','https://example.org','https://brainilabgames.com','http://127.0.0.1:8841'])assert.ok(!origins.includes(origin),origin);
  }
});
