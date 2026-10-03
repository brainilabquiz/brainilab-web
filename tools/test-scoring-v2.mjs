import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const {PGlite}=await import(pathToFileURL(process.env.PGLITE_MODULE).href);
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const w=new JSDOM('',{url:'https://brainilabgames.com/games/math-rush/',runScripts:'outside-only'}).window;
w.eval(readFileSync('assets/js/math-rush.js','utf8'));
const db=new PGlite(),uid='10000000-0000-4000-8000-000000000001';
const scalar=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0];
async function createResult(key,game='mathrush',daily=null,seed=null){
 const sid=await scalar('insert into game_sessions(user_id,client_result_id,game_id,daily_number) values($1,$2,$3,$4) returning id',[uid,key,game,daily]);
 return scalar('insert into game_results(user_id,session_id,result_payload) values($1,$2,$3) returning id',[uid,sid,JSON.stringify(seed?{seed}:{})]);
}
const verify=(key,seed,answers)=>scalar('select verify_brainilab_math_rush_result($1,$2,$3)',[key,seed,JSON.stringify(answers)]);
try{
 await db.exec("create role anon;create role authenticated;create schema auth;create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;");
 await db.exec(readFileSync('tools/fixtures/rewards-schema.sql','utf8'));
 await db.exec("create table number_route_puzzles(id uuid,solution text[]);create table daily_rotating_content(daily_challenge_id uuid,game_id text,content_id uuid,position int);create function brainilab_daily_game_ids(date)returns text[] language sql as $$select array['mathrush','numberroute']$$;");
 for(const r of JSON.parse(readFileSync('tools/fixtures/scoring-before.json')))await db.exec(r.definition);
 await db.exec(readFileSync('supabase/migrations/20261003210727_math_rush_scoring_and_daily_actions.sql','utf8'));
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid]);
 for(let n=0;n<100;n++){
  const seed=`v2:anytime:sample-${n}`,local=Array.from(w.BrainiMathRush.localOperations(seed),x=>({a:x.a,b:x.b,op:x.op,answer:x.answer}));
  const cloud=await scalar('select brainilab_math_operations_v2($1)',[seed]);
  assert.deepEqual(cloud.map(x=>({a:x.a,b:x.b,op:x.operator,answer:x.answer})),local);
  assert.equal(new Set(local.map(x=>`${x.a}:${x.op}:${x.b}`)).size,60);
  for(const op of ['+','−','×','÷'])assert.equal(local.filter(x=>x.op===op).length,15);
  assert.ok(local.every(x=>Number.isInteger(x.answer)&&x.answer>0));
  assert.ok(local.filter(x=>x.op==='÷').every(x=>x.b>1&&x.answer>1));
 }
 console.log('PASS: 100 seeds, 6,000 unique-per-run operations; balanced operators; JS/PostgreSQL parity.');
 const seed='v2:anytime:scoring',ops=await scalar('select brainilab_math_operations_v2($1)',[seed]);
 for(const [key,c,e,skip,expected]of [['perfect',60,0,0,6000],['half',30,0,0,3000],['mixed',20,5,2,1750],['floor',0,4,0,0],['early-error',1,1,0,50],['skip',0,0,3,0],['near-perfect',59,1,0,5850]]){
  await createResult(key,'mathrush',null,seed);
  const answers=ops.slice(0,c+e+skip).map((o,i)=>({position:i+1,answer:i<c?o.answer:-1,skipped:i>=c+e}));
  const r=await verify(key,seed,answers);assert.equal(r.score,expected,key);assert.equal(r.correct_answers,c);assert.equal(r.total_questions,c+e);
  assert.deepEqual(await verify(key,seed,ops.map(o=>({position:o.position,answer:o.answer}))),r,'immutable '+key);
  const points=await scalar("select brainilab_daily_game_points('mathrush',$1,$2,'{\"scoringVersion\":\"mathrush-v2\"}')",[r.score,c]);assert.equal(points,Math.round(expected/6000*2500));
 }
 assert.equal(await scalar("select brainilab_daily_game_points('mathrush',3000,30,'{}')"),2500,'legacy score preserved');
 const legacy='anytime:legacy';await createResult('legacy','mathrush',null,legacy);const a=await scalar('select brainilab_math_rush_operation($1,1)',[legacy]);assert.equal((await verify('legacy',legacy,[{position:1,answer:a.answer}])).score,100);
 await createResult('invalid','mathrush',null,seed);
 for(const rows of [[],null,[{position:2,answer:0}],[{position:1,answer:0},{position:1,answer:0}]])await assert.rejects(()=>verify('invalid',seed,rows));
 await assert.rejects(()=>verify('invalid','v2:anytime:other',[{position:1,answer:0}]),/seed mismatch/);
 await db.query("select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',false)");await assert.rejects(()=>verify('perfect',seed,[{position:1,answer:0}]),/not found/);
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid]);
 const today=await scalar('select current_date::text'),did=await scalar("insert into daily_challenges(challenge_date,daily_number,status)values(current_date,42,'published')returning id");
 const pack=await scalar('select get_brainilab_math_rush_game($1,current_date)',['v2:requested']);assert.equal(pack.seed,`v2:daily:${today}:mathrush`);assert.equal(pack.operations.length,60);assert.equal(pack.operations[0].answer,undefined);
 await createResult('daily','mathrush',42,pack.seed);const full=await scalar('select brainilab_math_operations_v2($1)',[pack.seed]);assert.equal((await verify('daily',pack.seed,full.slice(0,30).map(o=>({position:o.position,answer:o.answer})))).score,3000);
 const rounds=[];for(let n=1;n<=3;n++){const id=`20000000-0000-4000-8000-${String(n).padStart(12,'0')}`;await db.query("insert into number_route_puzzles values($1,array['+','×','−'])",[id]);await db.query("insert into daily_rotating_content values($2,'numberroute',$1,$3)",[id,did,n]);rounds.push({puzzle_id:id,operators:['+','×','−'],attempts:1,response_time_ms:1000});}
 for(const [key,attempts,expected]of [['route-perfect',1,2500],['route-errors',2,2200],['route-floor',20,600]]){
  await createResult(key,'numberroute',42);const r=await scalar('select verify_brainilab_number_route_result($1,$2)',[key,JSON.stringify(rounds.map(r=>({...r,attempts})))]);assert.equal(r.score,expected);
  const again=await scalar('select verify_brainilab_number_route_result($1,$2)',[key,JSON.stringify(rounds)]);assert.equal(again.score,expected);
 }
 assert.equal(await scalar("select has_function_privilege('anon','brainilab_math_operations_v2(text)','execute')"),false);
 console.log('PASS: penalties, zero floor, skips, proportional Daily score, legacy history, immutable results, ownership, input validation, Number Route attempts and helper permissions.');
}catch(e){console.error(e.message,e.where||'');process.exitCode=1;}finally{await db.close();w.close();}
