import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
const batch=JSON.parse(readFileSync('content/game-batches/knowledge-variety-20261014.json','utf8'));
const norm=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
assert.equal(batch.topicrush.length,4);assert.equal(batch.connections.length,8);
assert.deepEqual(batch.topicrush.map(t=>t.answers.length),[88,63,38,32]);
assert.equal(batch.topicrush.reduce((n,t)=>n+t.answers.length,0),221);
assert.equal(batch.sources.length,4);assert.ok(batch.sources.every(s=>s.checked_at===batch.date&&/^[a-f0-9]{64}$/.test(s.sha256)&&/^https:\/\//.test(s.url)));
const sources=new Set(batch.sources.map(s=>s.url)),keys=new Set();
for(const t of batch.topicrush){
 assert.ok(sources.has(t.source_url));assert.ok(!keys.has(t.external_key));keys.add(t.external_key);
 assert.ok(t.target_count>=5&&t.target_count<=30&&t.target_count<=t.answers.length);
 const forms=new Map();for(const a of t.answers){assert.ok(a.answer.trim()&&a.answer.length<=160);assert.equal(new Set(a.aliases.map(norm)).size,a.aliases.length);for(const x of [a.answer,...a.aliases]){const n=norm(x);assert.ok(n.length>=2);assert.ok(!forms.has(n)||forms.get(n)===a.answer,`Ambiguous form ${x}`);forms.set(n,a.answer);}}
 assert.equal(new Set(t.answers.map(a=>norm(a.answer))).size,t.answers.length);
 t.formMap=forms;
}
const [sky,parks,plays,nato]=batch.topicrush;
for(const [topic,input,expected] of [[sky,'Ursa Major','Ursa Major'],[sky,'great bear','Ursa Major'],[sky,'BOOTES','Boötes'],[parks,'Haleakala','Haleakalā National Park'],[parks,'Yosemite NP','Yosemite National Park'],[plays,'Henry 4 Part 2','Henry IV Part II'],[plays,'Richard 3','Richard III'],[nato,'Turkey','Türkiye'],[nato,'Czech Republic','Czechia'],[nato,'U.S.A.','United States']])assert.equal(topic.formMap.get(norm(input)),expected,input);
for(const [topic,input] of [[sky,'Big Dipper'],[parks,'Muir Woods'],[parks,'Acadia National Park and Preserve'],[plays,'Henry IV'],[plays,'Henry VI'],[plays,'Venus and Adonis'],[nato,'Austria'],[nato,'Ireland'],[nato,'Great Britain'],[nato,'Macedonia']])assert.equal(topic.formMap.has(norm(input)),false,input);
const signatures=new Set();for(const p of batch.connections){
 assert.ok(sources.has(p.source_url)&&p.explanation.trim()&&p.prompt.trim());
 assert.ok(!keys.has(p.external_key));keys.add(p.external_key);assert.equal(p.clues.length,4);
 assert.equal(new Set([p.correct_connection,...p.distractors].map(norm)).size,4);
 assert.equal(p.distractors.length,3);assert.ok(p.fact_checks);
 const signature=JSON.stringify(p.clues.map(norm).sort());assert.ok(!signatures.has(signature));signatures.add(signature);
}
const admin=readFileSync('assets/js/admin.js','utf8');
const parser=admin.slice(admin.indexOf('  function parseCSV('),admin.indexOf('  function importRowFromCSV('));
const normaliser=admin.slice(admin.indexOf('  function csvList('),admin.indexOf('  function openPoolImport('));
const parse=vm.runInNewContext(parser+';parseCSV');const normalize=vm.runInNewContext('const cleanError=e=>e.message;'+normaliser+';normalizePoolImport');
for(const [kind,expected] of [['topicrush',batch.topicrush],['connections',batch.connections]]){
 const rows=parse(readFileSync(`admin/content-batches/${kind}-20261014.csv`,'utf8'));assert.equal(rows.length,expected.length);
 const imported=normalize(kind,rows);assert.ok(imported.every(x=>x.valid),JSON.stringify(imported.filter(x=>!x.valid)));
 for(let i=0;i<imported.length;i++){
  const actual=JSON.parse(JSON.stringify(imported[i].row)),source=expected[i];
  for(const k of Object.keys(actual))assert.deepEqual(actual[k],source[k],`${kind}[${i}].${k}`);
 }
}
console.log('PASS four complete themes / 221 canonical answers / 421 aliases, exclusions, unique keys/choices, source records and exact real Admin CSV round-trip.');
