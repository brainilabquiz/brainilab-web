import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
import {validateOrderRound,validateOddPuzzle,labelValue} from './validate-game-batches.mjs';
const b=JSON.parse(readFileSync('content/game-batches/order-quality-20261015.json','utf8'));
assert.equal(b.orderup.length,8);assert.equal(b.oddoneout.length,8);assert.equal(b.quality_holds.length,7);assert.equal(Object.keys(b.future_replacements).length,4);
const keys=[...b.orderup,...b.oddoneout].map(x=>x.external_key);assert.equal(new Set(keys).size,16);
for(const r of b.orderup)validateOrderRound(r);for(const p of b.oddoneout)validateOddPuzzle(p);
const round=structuredClone(b.orderup[0]);round.sort_values[1]=round.sort_values[0];assert.throws(()=>validateOrderRound(round),/ties/);
round.sort_values=b.orderup[0].sort_values;round.items[0]='99';assert.throws(()=>validateOrderRound(round),/disagrees/);
const units=structuredClone(b.orderup[6]);units.comparison_unit='grams';assert.throws(()=>validateOrderRound(units),/single comparison unit/);
const badOdd=structuredClone(b.oddoneout[0]);badOdd.items[(badOdd.odd_index+1)%4]='26';assert.throws(()=>validateOddPuzzle(badOdd),/Exactly one/);
const noEvidence={...b.orderup[0],evaluation_kind:'documented-fact'};assert.throws(()=>validateOrderRound(noEvidence),/Document each/);
assert.deepEqual(labelValue('−0.4'),[-2n,5n]);assert.deepEqual(labelValue('1,500 mg','mass'),[3n,2n]);assert.deepEqual(labelValue('25%'),[1n,4n]);
const admin=readFileSync('assets/js/admin.js','utf8'),parse=vm.runInNewContext(admin.slice(admin.indexOf('  function parseCSV('),admin.indexOf('  function importRowFromCSV('))+';parseCSV');
const normalize=vm.runInNewContext('const cleanError=e=>e.message;'+admin.slice(admin.indexOf('  function csvList('),admin.indexOf('  function openPoolImport('))+';normalizePoolImport');
for(const [kind,expected] of [['orderup',b.orderup],['oddoneout',b.oddoneout]]){
 const rows=parse(readFileSync(`admin/content-batches/${kind}-20261015.csv`,'utf8')),result=normalize(kind,rows);assert.equal(result.length,8);assert.ok(result.every(x=>x.valid),JSON.stringify(result.filter(x=>!x.valid)));
 for(let i=0;i<8;i++){const actual=JSON.parse(JSON.stringify(result[i].row));for(const key of Object.keys(actual))assert.deepEqual(actual[key],expected[i][key],`${kind}[${i}].${key}`);}
}
console.log('PASS 80 exact card values, eight unique odd answers, tie/value/unit/ambiguity guards and real Admin CSV round-trips.');
