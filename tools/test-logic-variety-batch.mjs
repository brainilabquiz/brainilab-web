import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const batch=JSON.parse(readFileSync('content/game-batches/logic-variety-20261014.json','utf8'));
assert.equal(batch.sequence.length,18);assert.equal(batch.numberroute.length,12);
assert.equal(new Set([...batch.sequence,...batch.numberroute].map(p=>p.external_key)).size,30);
const seen=new Set();
for(const p of batch.sequence){
 assert.equal(p.sequence_values.length,5);assert.equal(new Set(p.options).size,4);
 assert.ok(p.options.includes(p.answer_value));assert.ok(p.explanation.trim());
 assert.ok(batch.sources.some(s=>s.url===p.source_url&&s.checked_at===batch.date));
 assert.ok(!seen.has(JSON.stringify(p.sequence_values)));seen.add(JSON.stringify(p.sequence_values));
}
// Independent exhaustive evaluation: this does not use the batch generator.
function evaluate(numbers,operators){
 let total=Number(numbers[0]);
 for(let i=0;i<3;i++){
  const next=Number(numbers[i+1]);
  if(operators[i]==='+')total=total+next;
  else if(operators[i]==='−')total=total-next;
  else if(operators[i]==='×')total=total*next;
  else if(operators[i]==='÷'){if(!next||!Number.isInteger(total/next))return null;total=total/next;}
  else return null;
  if(Math.abs(total)>1000)return null;
 }
 return total;
}
const symbols=['+','−','×','÷'],sets=new Set();
assert.equal(new Set(batch.numberroute.map(p=>JSON.stringify(p.solution))).size,12,'Operator routes vary across the batch');
assert.equal(batch.numberroute.filter(p=>p.solution.includes('÷')).length,6);
for(const p of batch.numberroute){
 assert.equal(p.numbers.length,4);assert.equal(new Set(p.numbers).size,4);
 assert.ok(p.numbers.every(n=>Number.isInteger(n)&&n>=1&&n<=9));
 assert.ok(p.target>=0&&p.target<=200);
 const set=JSON.stringify([...p.numbers].sort());assert.ok(!sets.has(set));sets.add(set);
 const solutions=[];
 for(const a of symbols)for(const b of symbols)for(const c of symbols){
  const route=[a,b,c];if(evaluate(p.numbers,route)===p.target)solutions.push(route);
 }
 assert.equal(solutions.length,1,p.external_key);assert.deepEqual(solutions[0],p.solution);
 assert.equal(evaluate(p.numbers,p.solution),p.target);
 assert.ok(batch.sources.some(s=>s.url===p.source_url));
}
// Concrete mathematical meanings checked independently of the stored answer key.
const byFamily=Object.fromEntries(batch.sequence.map(p=>[p.family,p]));
assert.equal(byFamily.factorials.answer_value,[1,2,3,4,5,6].reduce((n,x)=>n*x,1));
assert.equal(byFamily['descending-squares'].answer_value,5**2);
assert.equal(byFamily['even-squares'].answer_value,12**2);
assert.equal(byFamily['odd-cubes'].answer_value,11**3);
assert.equal(byFamily['powers-of-four'].answer_value,4**5);
assert.equal(byFamily['divide-by-four'].answer_value,16/4);
assert.equal(byFamily['repeat-nine'].answer_value,10**6-1);
assert.equal(byFamily['add-previous-two'].answer_value,4+7);
assert.equal(byFamily['triple-minus-one'].answer_value,41*3-1);
assert.equal(byFamily['triple-plus-one'].answer_value,121*3+1);
assert.equal(byFamily['growing-triangular-steps'].answer_value,35+21);
assert.equal(byFamily['steps-growing-by-three'].answer_value,35+16);
assert.equal(byFamily['steps-growing-by-four'].answer_value,45+21);
assert.equal(byFamily.primes.answer_value,13);
assert.equal(byFamily['interleave-count-down'].answer_value,90-10);
assert.equal(byFamily['interleave-count-fives'].answer_value,10+5);
assert.equal(byFamily['interleave-powers-squares'].answer_value,3**2);
assert.equal(byFamily['interleave-squares-down'].answer_value,40-10);
console.log('PASS 30 original logic puzzles: four distinct choices, mathematical answer checks, source records, 768 exhaustive operator routes and exactly one valid route per Number Route puzzle.');
