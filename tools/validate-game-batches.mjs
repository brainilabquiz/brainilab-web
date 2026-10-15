import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
import path from 'node:path';
const canonical=s=>String(s).trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ');
const gcd=(a,b)=>b?gcd(b,a%b):(a<0n?-a:a);
function rational(n,d=1n){n=BigInt(n);d=BigInt(d);assert.notEqual(d,0n,'Zero denominator');if(d<0n){n=-n;d=-d;}const g=gcd(n,d);return [n/g,d/g];}
function decimal(s){
 s=String(s).replaceAll('−','-').replaceAll(',','').trim();
 assert.match(s,/^-?\d+(?:\.\d+)?$/,'Unsupported number');
 const [whole,fraction='']=s.split('.'),denominator=10n**BigInt(fraction.length),sign=s.startsWith('-')?-1n:1n;
 return rational(sign*(BigInt(whole.replace('-',''))*denominator+BigInt(fraction||0)),denominator);
}
const multiply=(a,b)=>rational(a[0]*b[0],a[1]*b[1]);
export function labelValue(label,kind='number'){
 let s=String(label).trim().replaceAll('−','-');
 if(kind==='number'){
  if(s.endsWith('%'))return multiply(decimal(s.slice(0,-1)),[1n,100n]);
  if(s.includes('/')){const [n,d,...rest]=s.split('/');assert.equal(rest.length,0);return rational(n,d);}
  return decimal(s);
 }
 if(kind==='calculation'){
  const m=s.match(/^(\d+) ([+\-×÷]) (\d+)$/);assert.ok(m,'Use one explicit arithmetic operation');
  const a=BigInt(m[1]),b=BigInt(m[3]);return m[2]==='+'?rational(a+b):m[2]==='-'?rational(a-b):m[2]==='×'?rational(a*b):rational(a,b);
 }
 const units={duration:{second:[1n,1n],seconds:[1n,1n],minute:[60n,1n],minutes:[60n,1n]},length:{mm:[1n,1000n],cm:[1n,100n],m:[1n,1n]},mass:{mg:[1n,1000n],g:[1n,1n],kg:[1000n,1n]}};
 const m=s.match(/^([\d.,]+) ([a-z]+)$/);assert.ok(m&&units[kind]?.[m[2]],'Unsupported or mixed measurement unit');
 return multiply(decimal(m[1]),units[kind][m[2]]);
}
export function validateOrderRound(r){
 assert.equal(r.items?.length,10,'Order Up needs ten items');assert.equal(new Set(r.items.map(canonical)).size,10,'Repeated card');
 assert.equal(r.sort_values?.length,10,'Every card needs a comparable value');assert.ok(r.comparison_unit&&r.source_url,'Comparison unit and source required');
 const values=r.sort_values.map(v=>{assert.equal(v.length,2);assert.ok(v.every(Number.isSafeInteger));assert.ok(v[1]>0);return rational(v[0],v[1]);});
 for(let i=1;i<values.length;i++)assert.ok(values[i-1][0]*values[i][1]<values[i][0]*values[i-1][1],'Sort values must increase strictly: no ties or reversals');
 if(r.evaluation_kind==='documented-fact'){
  assert.equal(r.item_evidence?.length,10,'Document each factual comparison value');
  for(const fact of r.item_evidence)assert.ok(/^https:\/\//.test(fact.source_url)&&fact.detail?.trim(),'Per-card source evidence required');
 }else{
  assert.ok(['number','calculation','duration','length','mass'].includes(r.evaluation_kind),'Unsupported comparison rule');
  const expectedUnit={number:'number',calculation:'number',duration:'seconds',length:'metres',mass:'grams'}[r.evaluation_kind];
  assert.equal(r.comparison_unit,expectedUnit,'Use a single comparison unit');
  r.items.forEach((label,i)=>assert.deepEqual(labelValue(label,r.evaluation_kind),values[i],'Label value disagrees with its sort key'));
 }
 return values;
}
export function matchesRule(label,rule){
 const [n,d]=labelValue(label);
 if(rule.type==='equal'){const target=rational(...rule.value);return n*target[1]===target[0]*d;}
 assert.equal(d,1n,'Whole-number rule requires integers');
 if(rule.type==='multiple')return n%BigInt(rule.base)===0n;
 if(rule.type==='factor')return n!==0n&&BigInt(rule.base)%n===0n;
 if(rule.type==='prime'){if(n<2n)return false;for(let i=2n;i*i<=n;i++)if(n%i===0n)return false;return true;}
 if(rule.type==='square'){if(n<0n)return false;for(let i=0n;i*i<=n;i++)if(i*i===n)return true;return false;}
 throw Error('Unsupported explicit Odd One Out rule');
}
export function validateOddPuzzle(p){
 assert.equal(p.items?.length,4);assert.equal(new Set(p.items.map(canonical)).size,4);
 assert.ok(Number.isInteger(p.odd_index)&&p.odd_index>=0&&p.odd_index<4);
 assert.ok(p.prompt?.trim()&&p.explanation?.trim()&&p.source_url);
 if(p.category==='math'){
  assert.ok(p.rule,'Math questions require an explicit testable rule');
  const failures=p.items.flatMap((label,i)=>matchesRule(label,p.rule)?[]:[i]);
  assert.deepEqual(failures,[p.odd_index],'Exactly one item must fail the stated rule');
 }else assert.ok(p.fact_checks,'Non-math questions require documented per-item source checks');
}
const directory=path.resolve('content/game-batches');let rounds=0,odd=0;
for(const file of readdirSync(directory).filter(f=>f.endsWith('.json'))){
 const b=JSON.parse(readFileSync(path.join(directory,file),'utf8')),sources=new Set((b.sources||[]).map(s=>s.url));
 for(const r of b.orderup||[]){validateOrderRound(r);assert.ok(sources.has(r.source_url));rounds++;}
 for(const p of b.oddoneout||[]){validateOddPuzzle(p);assert.ok(sources.has(p.source_url));odd++;}
}
console.log(`Game batch quality: ${rounds} strict Order Up rounds and ${odd} explicit-rule Odd One Out questions validated.`);
