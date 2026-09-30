// Real PostgreSQL in isolated PGlite; never calls the production database.
import {readFile,readdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const {PGlite}=await import(pathToFileURL(process.env.PGLITE_MODULE).href),db=new PGlite();
let passed=0;const check=(v,label)=>{assert.ok(v,label);passed++;console.log('PASS',label)};
const scalar=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0];
const a='10000000-0000-4000-8000-000000000001',b='20000000-0000-4000-8000-000000000002';
try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,is_anonymous boolean default true);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
 create table brainilab_guest_claims(guest_user_id uuid,token_hash text,claimed_by uuid,expires_at timestamptz,claimed_at timestamptz);`);
 await db.exec(await readFile('tools/fixtures/rewards-schema.sql','utf8'));
 await db.exec(`alter table player_progression add primary key(user_id);alter table profiles add primary key(user_id);alter table game_results add primary key(id);alter table game_results add unique(session_id);alter table game_sessions add primary key(id);alter table game_sessions add unique(user_id,client_result_id);
 insert into auth.users(id)values('${a}'),('${b}');insert into profiles(user_id,display_name)values('${a}','Fixture A'),('${b}','Fixture B');
 insert into topic_rush_settings(singleton,launch_date)values(true,'2026-01-01');insert into order_up_settings(singleton,launch_date)values(true,'2026-01-01');
 create table brainiword_valid_guesses(word text primary key);create table brainiword_words(id uuid primary key,word text);create table daily_brainiword(daily_challenge_id uuid,word_id uuid);
 insert into brainiword_valid_guesses values('APPLE'),('HOUSE'),('HELLO');`);
 await db.exec(await readFile('tools/fixtures/rewards-existing-helpers.sql','utf8'));
 await db.exec(await readFile('supabase/migrations/20260928203423_ranking_rewards_continuity.sql','utf8'));
 for(const file of (await readdir('tools/fixtures/daily-before')).sort())await db.exec(await readFile('tools/fixtures/daily-before/'+file,'utf8'));
 const historian='50000000-0000-4000-8000-000000000005';
 await db.query('insert into auth.users(id)values($1)',[historian]);
 await db.query("insert into profiles(user_id,display_name)values($1,'Historical fixture')",[historian]);
 for(const day of ['2026-09-27','2026-09-28','2026-09-29']){
  const oldIds=await scalar('select brainilab_daily_game_ids($1)',[day]);
  for(const game of oldIds){
   const sid=await scalar("insert into game_sessions(user_id,game_id,client_result_id,daily_number,completed_at)values($1,$2,$3,brainilab_daily_number_for_date($4),$4::date+interval '12 hours') returning id",[historian,game,day+game,day]);
   await db.query("insert into game_results(session_id,user_id,score,correct_answers,total_questions,answers_verified,verified_correct_answers,verified_total_questions,result_payload,created_at)values($1,$2,2000,8,10,true,8,10,'{\"won\":true,\"attempts\":3}',$3::date+interval '12 hours')",[sid,historian,day]);
  }
 }
 await db.query('select refresh_brainilab_player_progression($1)',[historian]);
 const snapshot=()=>scalar("select jsonb_build_object('days',(select jsonb_agg(to_jsonb(s)-'updated_at' order by stat_date)from player_daily_stats s where user_id=$1),'progress',(select to_jsonb(p)-'updated_at' from player_progression p where user_id=$1),'periods',(select jsonb_agg(to_jsonb(p)-'updated_at' order by period_type,period_start)from player_period_stats p where user_id=$1))",[historian]);
 const before=await snapshot();
 await db.exec(await readFile('supabase/migrations/20260930052528_daily_main_and_chosen_extra.sql','utf8'));
 check(true,'complete rollout SQL compiles with concurrent-function preconditions');
 await db.query('select refresh_brainilab_player_progression($1)',[historian]);
 assert.deepEqual(await snapshot(),before);check(true,'historical scores, XP, streaks and period totals survive migration and recomputation unchanged');
 const context={window:{},Date,Math};vm.createContext(context);vm.runInContext(await readFile('assets/js/daily-rules.js','utf8'),context);
 const rows=(await db.query("select d::date as day,brainilab_daily_game_ids(d::date) as games,brainilab_daily_point_limit((brainilab_daily_game_ids(d::date))[2],d::date) as extra from generate_series('2026-10-01'::date,'2027-10-01'::date,'1 day') d")).rows;
 for(const r of rows){const day=new Date(r.day).toISOString().slice(0,10);assert.deepEqual(r.games,Array.from(context.window.BrainiDailyRules.lineup(day)));assert.equal(r.extra,1000);}
 check(true,'366 server/client lineups and bonus limits match');
 check((await scalar("select cardinality(brainilab_daily_game_ids('2026-09-30'))"))===4,'old dates retain four-game schedule');
 check(await scalar("select brainilab_weighted_daily_points('brainmix',10000,10,'{}','2026-10-01')")===2500,'main game max 2500');
 check(await scalar("select brainilab_weighted_daily_points('brainiword',0,1,'{\"won\":true,\"attempts\":1}','2026-10-01')")===1000,'extra max 1000');
 check(await scalar("select is_brainilab_english_guess(' apple ')")===true,'English word is normalized');
 for(const word of ['ZZZZZ','ABCDE','QWERT','12345','ABCD','ABCDEF','',null])assert.equal(await scalar('select is_brainilab_english_guess($1)',[word]),false);
 check(true,'unknown words and malformed guesses are invalid');
 const challenge='30000000-0000-4000-8000-000000000003',word='40000000-0000-4000-8000-000000000004';
 await db.query("insert into daily_challenges(id,challenge_date,daily_number,status)values($1,'2026-09-07',10,'published')",[challenge]);await db.query('insert into brainiword_words values($1,$2)',[word,'APPLE']);await db.query('insert into daily_brainiword values($1,$2)',[challenge,word]);
 const invalid=await scalar("select check_brainilab_brainiword_guess($1,'ZZZZZ',1)",[challenge]);check(invalid.valid_word===false&&!invalid.finished&&invalid.states.length===0,'archive invalid guess has no evaluation or used attempt');
 const valid=await scalar("select check_brainilab_brainiword_guess($1,'APPLE',1)",[challenge]);check(valid.valid_word&&valid.won&&valid.states.length===5,'archive valid word uses the dictionary');
 // Shift only this isolated fixture clock boundary to today; production SQL stays unchanged.
 await db.exec("create or replace function public.brainilab_daily_choice_starts() returns date language sql immutable set search_path='' as $$select (now() at time zone 'UTC')::date$$;alter table brainilab_daily_choices drop constraint daily_choice_date;");
 const today=await scalar("select (now() at time zone 'UTC')::date"),daily=await scalar('select brainilab_daily_number_for_date($1)',[today]),ids=await scalar('select brainilab_daily_game_ids($1)',[today]);
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[a]);
 const choose=id=>scalar('select choose_brainilab_daily_extra($1)',[id]);
 await assert.rejects(()=>choose(ids[1]),/main Daily first/);check(true,'extra is unavailable before verified main completion');
 const submit=(client,game,score=10000)=>scalar('select to_jsonb(r) from submit_brainilab_game_result($1,$2,now(),$3,10,10,100,1000,null,$4) r',[client,game,score,daily]);
 const main=await submit('main-fixture',ids[0]);
 await assert.rejects(()=>choose(ids[1]),/main Daily first/);
 await db.query('update game_results set answers_verified=true,verified_correct_answers=10,verified_total_questions=10 where id=$1',[main.result_id]);
 await db.query('select refresh_brainilab_player_progression($1)',[a]);
 let stat=(await db.query('select * from player_daily_stats where user_id=$1 and stat_date=$2',[a,today])).rows[0];
 check(stat.daily_brain_score===2500&&stat.full_daily&&stat.xp_earned===350,'main alone completes Daily, earns 250 bonus XP and 2500 score');
 check(Number(await scalar('select current_streak from player_progression where user_id=$1',[a]))===1,'main alone secures streak');
 check((await choose(ids[1])).game_id===ids[1],'first extra choice reserved');check((await choose(ids[1])).game_id===ids[1],'same choice is idempotent');
 await assert.rejects(()=>choose(ids[2]),/already chosen/);await assert.rejects(()=>submit('second-extra',ids[2]),/already chosen/);check(true,'second extra blocked both at selection and submission');
 const bonus=await submit('extra-fixture',ids[1],2500);await db.query("update game_results set answers_verified=true,verified_correct_answers=1,result_payload='{\"won\":true,\"attempts\":1}' where id=$1",[bonus.result_id]);await db.query('select refresh_brainilab_player_progression($1)',[a]);
 stat=(await db.query('select * from player_daily_stats where user_id=$1 and stat_date=$2',[a,today])).rows[0];check(stat.daily_brain_score===3500&&stat.daily_games_completed===2,'combined score capped at 3500 with two games');
 await assert.rejects(()=>db.query('update game_results set score=123 where id=$1',[main.result_id]),/locked/);check(true,'verified Daily cannot be rewritten');
 check((await submit('retry-main',ids[0])).already_existed,'second tab submission cannot duplicate main');
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[b]);await assert.rejects(()=>choose(ids[1]),/main Daily first/);check(true,'another player cannot inherit a choice or completed main');
 await db.exec('set role authenticated');await assert.rejects(()=>db.query('select * from brainilab_daily_choices'),/permission denied/);await db.exec('reset role');check(true,'private choices cannot be read or written directly');
 // A guest chose the other extra, then signs into an account with a locked choice.
 await db.exec(`create table player_connections_history(user_id uuid,puzzle_id uuid,times_played integer,first_played_at timestamptz,last_played_at timestamptz,primary key(user_id,puzzle_id));
 create table content_play_sessions(user_id uuid,client_play_id text,unique(user_id,client_play_id));
 create function refresh_brainilab_player_analytics(uuid) returns void language sql as $$select$$;`);
 const guestMain=await submit('guest-main',ids[0]);await db.query('update game_results set answers_verified=true,verified_correct_answers=10,verified_total_questions=10 where id=$1',[guestMain.result_id]);
 await choose(ids[2]);const guestExtra=await submit('guest-other-extra',ids[2]);await db.query('update game_results set answers_verified=true,verified_correct_answers=10 where id=$1',[guestExtra.result_id]);
 await scalar("select to_jsonb(r) from submit_brainilab_game_result('guest-practice','survival',now(),100,1,1,100,1000,null,null) r");
 const token='a'.repeat(64);await db.query("insert into brainilab_guest_claims(guest_user_id,token_hash,expires_at)values($1,encode(sha256(convert_to($2,'UTF8')),'hex'),now()+interval '1 hour')",[b,token]);
 await db.query('update auth.users set is_anonymous=false where id=$1',[a]);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[a]);
 const claim=await scalar('select claim_brainilab_guest_results($1)',[token]);
 check(claim.transferred===1&&claim.skipped_client_result_ids.includes('guest-other-extra'),'guest merge transfers practice but excludes a conflicting extra and duplicate main');
 check(await scalar('select game_id from brainilab_daily_choices where user_id=$1 and challenge_date=$2',[a,today])===ids[1],'account keeps its original extra after guest merge');
 check(await scalar('select daily_brain_score from player_daily_stats where user_id=$1 and stat_date=$2',[a,today])===3500,'guest merge cannot exceed two scored games or 3500 points');
 console.log(`PASS ${passed} PostgreSQL integration checks`);
}finally{await db.close();}
