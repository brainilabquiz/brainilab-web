import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const {PGlite}=await import(pathToFileURL(process.env.PGLITE_MODULE).href),db=new PGlite();
const uid='10000000-0000-4000-8000-000000000001',other='10000000-0000-4000-8000-000000000002';
const id=n=>`20000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const scalar=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0];
const verify=(game,key,rows)=>scalar(`select verify_brainilab_${game}_result($1,$2::jsonb)`,[key,JSON.stringify(rows)]);
async function result(key,game,verified=false){
 const sid=await scalar('insert into game_sessions(user_id,client_result_id,game_id) values($1,$2,$3) returning id',[uid,key,game]);
 return scalar("insert into game_results(session_id,user_id,score,correct_answers,total_questions,accuracy,answers_verified,result_payload)values($1,$2,123,2,10,20,$3,'{\"won\":true,\"attempts\":4,\"verifiedOrderPairsCorrect\":45,\"verifiedOrderPairsTotal\":90}')returning id",[sid,uid,verified]);
}
try{
 await db.exec("create schema auth;create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;");
 await db.exec(await readFile('tools/fixtures/rewards-schema.sql','utf8'));
 await db.exec(`create table sequence_puzzles(id uuid,answer_value numeric);create table odd_one_out_puzzles(id uuid,odd_index integer);create table higher_lower_pairs(id uuid,left_value numeric,right_value numeric,comparison_type text);
 create table daily_rotating_content(daily_challenge_id uuid,game_id text,content_id uuid,position int);
 create function brainilab_higher_lower_direction(text,numeric,numeric)returns text language sql as $$select case when $2>$3 then 'first' else 'second' end$$;
 create function brainilab_daily_game_ids(date)returns text[] language sql as $$select array['sequence','oddoneout','higherlower']$$;`);
 await db.exec(await readFile('tools/fixtures/verifiers-before-immutability.sql','utf8'));
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid]);
 for(let i=1;i<=10;i++)await db.query('insert into sequence_puzzles values($1,30);',[id(i)]);
 const wrong=Array.from({length:10},(_,i)=>({puzzle_id:id(i+1),answer:0})),right=wrong.map(x=>({...x,answer:30}));
 await result('before','sequence');assert.equal((await verify('sequence','before',wrong)).score,0);assert.equal((await verify('sequence','before',right)).score,2500,'Reproduce old result-rewrite bug');
 let migration=await readFile('supabase/migrations/20261004101742_verifier_result_immutability.sql','utf8');
 // Production guard compares exact live function text; local fixtures normalize line endings.
 migration=migration.replace(/do \$guard\$[\s\S]*?end;\$guard\$;/,'');await db.exec(migration);
 await result('after','sequence');assert.equal((await verify('sequence','after',wrong)).score,0);assert.equal((await verify('sequence','after',right)).score,0);assert.equal((await verify('sequence','after',null)).score,0,'Retry returns canonical result even after midnight/content retirement');
 const cases=[['quiz','science',`$1,$2::uuid,$3::jsonb`,[id(900)]],['anytime_quiz','science',`$1,$2,$3,$4::jsonb`,['science','easy']],['daily','brainmix',`$1,$2::uuid,$3::jsonb`,[id(900)]],['brainiword','brainiword',`$1,$2::uuid,$3::jsonb`,[id(900)]],['topic_rush','topicrush',`$1,$2::uuid,$3::jsonb`,[id(900)]],['order_up','orderup',`$1,$2::uuid,$3::jsonb`,[id(900)]],['survival','survival','$1,$2::jsonb',[]],['odd_one_out','oddoneout','$1,$2::jsonb',[]],['higher_lower','higherlower','$1,$2::jsonb',[]],['sequence','sequence','$1,$2::jsonb',[]]];
 for(const [rpc,game,signature,args] of cases){
  const key='frozen-'+rpc,rid=await result(key,game,true),query=`select verify_brainilab_${rpc}_result(${signature})`;
  const before=await scalar('select row_to_json(r) from game_results r where id=$1',[rid]);
  const canonical=await scalar(query,[key,...args,'[]']);if(game==='brainiword'){assert.equal(canonical.won,true);assert.equal(canonical.attempts,4);}else assert.equal(canonical.score,123);
  assert.deepEqual(await scalar('select row_to_json(r) from game_results r where id=$1',[rid]),before,'No score/timestamp/payload mutation: '+rpc);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[other]);await assert.rejects(()=>scalar(query,[key,...args,'[]']),/not found/);
  await db.query("select set_config('request.jwt.claim.sub','',false)");await assert.rejects(()=>scalar(query,[key,...args,'[]']),/Authentication required/);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid]);
  await result('pending-'+rpc,game);for(const value of [null,'null','{}'])await assert.rejects(()=>scalar(query,['pending-'+rpc,...args,value]),/must be an array/);
  const def=await scalar('select pg_get_functiondef(p.oid) from pg_proc p where proname=$1',['verify_brainilab_'+rpc+'_result']);assert.match(def,/for update of gr/i);
 }
 // Valid first attempts still score, while empty answer values do not manufacture completion.
 for(let i=1;i<=10;i++){await db.query('insert into odd_one_out_puzzles values($1,1)',[id(i)]);await db.query("insert into higher_lower_pairs values($1,20,10,'higher')",[id(i)]);}
 for(const [rpc,game,field,value]of [['odd_one_out','oddoneout','selected_index',1],['higher_lower','higherlower','choice','first'],['sequence','sequence','answer',30]]){
  const rows=Array.from({length:10},(_,i)=>({puzzle_id:id(i+1),pair_id:id(i+1),[field]:value}));await result('valid-'+rpc,game);
  const r=await verify(rpc,'valid-'+rpc,rows);assert.equal(r.correct_answers,10);assert.ok(r.score>0);
  await result('null-'+rpc,game);rows[0][field]=null;await assert.rejects(()=>verify(rpc,'null-'+rpc,rows),/Invalid/);
 }
 console.log('PASS: reproduced mutable score; ten verifiers preserve first result and timestamps, reject foreign/unauthenticated requests and malformed arrays; three puzzle verifiers retain scoring and reject empty values.');
}finally{await db.close();}
