import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const context={window:{},Date,Math};vm.createContext(context);vm.runInContext(fs.readFileSync('assets/js/daily-rules.js','utf8'),context);
const rules=context.window.BrainiDailyRules,config=JSON.parse(fs.readFileSync('content/daily-rules.json','utf8'));
assert.deepEqual(JSON.parse(JSON.stringify(rules.config)),config,'client and source contract differ');
assert.equal(rules.lineup('2026-09-30'),null);assert.equal(rules.model('2026-09-30').maxScore,10000);
const counts=new Map();let samples=0;
for(let offset=0;offset<730;offset++){
 const day=new Date(Date.parse(config.startsOn+'T00:00:00Z')+offset*86400000).toISOString().slice(0,10),ids=rules.lineup(day);
 assert.equal(new Set(ids).size,3);assert.ok(ids.every(id=>config.rotation.includes(id)));counts.set(ids[0],(counts.get(ids[0])||0)+1);
 assert.equal(rules.max(ids[0],day),2500);for(const id of ids.slice(1))assert.equal(rules.max(id,day),1000);
 for(const raw of [-1,0,1,625,1250,2499,2500,99999,NaN]){
  const main=rules.points(raw,ids[0],day),extra=rules.points(raw,ids[1],day);
  assert.ok(main>=0&&main<=2500&&extra>=0&&extra<=1000&&extra<=main);assert.ok(main+extra<=3500);samples++;
 }
 assert.equal(rules.points(2500,'unknown',day),0);
}
assert.equal(new Set(counts.values()).size,1,'balanced main-game rotation');
const sql=fs.readFileSync('supabase/migrations/20260930052528_daily_main_and_chosen_extra.sql','utf8');assert.ok(sql.includes(JSON.stringify(config)));
assert.match(sql,/PRIMARY KEY\(user_id,challenge_date\)/);assert.match(sql,/ENABLE ROW LEVEL SECURITY/);assert.match(sql,/pg_advisory_xact_lock/);assert.match(sql,/Concurrent change:/);
console.log(`PASS Daily contract: 730 dates, all 10 main games balanced, ${samples} weighted scores, legacy boundary, private unique extra and conflict guard.`);
