// Run with PGLITE_MODULE pointing to an installed @electric-sql/pglite module.
// Uses actual Step 2/3 schemas, Step 27 submission RPC and the Step 28 migration.
// Aggregate rebuilds are small test fixtures; production scoring formulas are unchanged.
import {readFile} from 'node:fs/promises';
import {fileURLToPath, pathToFileURL} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {PGlite}=await import(process.env.PGLITE_MODULE ? pathToFileURL(process.env.PGLITE_MODULE).href : '@electric-sql/pglite');
const db=new PGlite();
const sql=async file=>(await readFile(path.join(root,'supabase',file),'utf8')).replace(/create extension if not exists pgcrypto;/gi,'');
let passed=0;
const check=(condition,label)=>{assert.ok(condition,label);passed++;console.log('PASS',label);};
const q=async (text,args=[]) => (await db.query(text,args)).rows;
const scalar=async (text,args=[]) => Object.values((await q(text,args))[0])[0];
const actor=async id=>db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);
const rejects=async (fn,label)=>{await assert.rejects(fn);passed++;console.log('PASS',label);};
const user=async (id,guest=false)=>db.query("insert into auth.users(id,is_anonymous,email,raw_user_meta_data) values($1,$2,'private@example.test','{\"full_name\":\"Private Real Name\",\"avatar_url\":\"https://private.example/photo.png\"}')",[id,guest]);
const ids={old:'10000000-0000-4000-8000-000000000001',guest:'20000000-0000-4000-8000-000000000002',account:'30000000-0000-4000-8000-000000000003',other:'40000000-0000-4000-8000-000000000004'};
const submit=async (id,game='brainmix',score=100,daily=12)=>scalar('select to_jsonb(r) from public.submit_brainilab_game_result($1,$2,now(),$3,1,10,10,1000,null,$4,null,null,$5::jsonb) r',[id,game,score,daily,JSON.stringify({})]);
const ranks=async (game='all')=>scalar('select public.get_brainilab_individual_rankings(p_game_id=>$1)',[game]);
try{
  await db.exec(`create role anon;create role authenticated;create schema auth;
    create table auth.users(id uuid primary key,is_anonymous boolean not null default false,email text,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);
  await db.exec(await sql('step2_profiles.sql'));
  await db.exec(await sql('step3_game_sessions_results.sql'));
  // Surrounding tables that Step 28 touches; fixtures contain the real relevant constraints.
  await db.exec(`create table public.verified_question_answers(id bigint generated always as identity primary key,user_id uuid references auth.users(id),session_id uuid references public.game_sessions(id),result_id uuid references public.game_results(id));
    create table public.player_connections_history(user_id uuid references auth.users(id),puzzle_id uuid,times_played integer,first_played_at timestamptz,last_played_at timestamptz,primary key(user_id,puzzle_id));
    create table public.content_play_sessions(user_id uuid references auth.users(id),client_play_id text,unique(user_id,client_play_id));
    create table public.player_progression(user_id uuid primary key references auth.users(id),level integer default 1,current_streak integer default 0);
    create table public.admin_ranking_suspensions(entity_type text,entity_id uuid,active boolean,expires_at timestamptz);
    create function public.refresh_brainilab_player_progression(p_user_id uuid) returns void language sql as $$insert into public.player_progression(user_id) values(p_user_id) on conflict do nothing$$;
    create function public.refresh_brainilab_player_analytics(p_user_id uuid) returns void language sql as $$select$$;
    create function public.brainilab_player_rank_value(p_user_id uuid,p_period text,p_game_id text,p_metric text) returns bigint language sql stable as $$
      select coalesce(sum(gr.score),0)::bigint from public.game_sessions gs join public.game_results gr on gr.session_id=gs.id
      where gs.user_id=p_user_id and ((p_game_id='all' and gs.daily_number is not null) or gs.game_id=p_game_id)
        and (gs.completed_at at time zone 'UTC')::date=(now() at time zone 'UTC')::date$$;`);
  const step27=await sql('step27_daily_replay_stats_numberroute_connections.sql');
  await db.exec(step27.slice(step27.indexOf('create or replace function public.submit_brainilab_game_result('),step27.indexOf('\ncommit;')));
  await user(ids.old);
  check(!(await scalar('select leaderboard_enabled from profiles where user_id=$1',[ids.old])),'existing account starts with old opt-in default');
  await db.exec(await sql('step28_automatic_guest_rankings.sql'));
  await actor(ids.old);await submit('old-next-daily', 'brainmix',0);
  const profile=await scalar('select to_jsonb(p) from profiles p where user_id=$1',[ids.old]);
  check(profile.leaderboard_enabled && /^Player [A-F0-9]{10}$/.test(profile.leaderboard_display_name),'existing player becomes ranked automatically on completion');
  check(!profile.leaderboard_visibility_explicit,'automatic activation is not recorded as explicit identity sharing');
  let ranking=await ranks();
  check(ranking.user?.score===0 && ranking.user?.is_me,'zero-point completion appears with personal rank');
  check(!JSON.stringify(ranking).includes('Private Real Name') && !JSON.stringify(ranking).includes('private.example') && ranking.user.avatar_url===null,'automatic rankings do not expose private identity or photo');
  await user(ids.guest,true);await user(ids.account);await user(ids.other);
  check(await scalar('select leaderboard_enabled from profiles where user_id=$1',[ids.account]),'new registered account is ranked by default');
  check((await ranks()).total_players===1,'non-players do not fill the ranking');
  await actor(ids.guest);await submit('guest-first-daily');
  ranking=await ranks();
  check(/^Guest [A-F0-9]{10}$/.test(ranking.user.name) && ranking.total_players===2,'guest completion is public and has an own row');
  const retry=await submit('guest-first-daily');
  check(retry.already_existed && await scalar('select count(*)::int from game_sessions where user_id=$1',[ids.guest])===1,'same-result retry is idempotent');
  await submit('guest-duplicate-daily','brainmix',9999);
  check((await ranks()).user.score===100,'duplicate scored Daily cannot inflate guest score');
  await submit('guest-anytime-game','survival',75,null);
  check((await ranks('survival')).user?.score===75,'guest Play Anytime result appears in its game ranking');
  await actor(ids.old);await scalar('select set_brainilab_ranking_visibility(false)');
  await submit('old-another-game','numberroute',50,12);
  check(!(await ranks()).user,'explicit Hide survives subsequent play');
  await scalar("select set_brainilab_ranking_visibility(true,'Chosen Player')");
  check((await ranks()).user.name==='Chosen Player','player can choose a public alias');
  await db.exec(`insert into admin_ranking_suspensions values('user','${ids.old}',true,null)`);
  check(!(await ranks()).user,'moderation suspension still excludes a player');
  await actor(ids.guest);
  await rejects(()=>scalar("select prepare_brainilab_guest_claim('short')"),'weak claim token is rejected');
  const token='a'.repeat(64);
  await scalar('select prepare_brainilab_guest_claim($1)',[token]);
  await rejects(()=>scalar('select claim_brainilab_guest_results($1)',[token]),'another guest cannot claim progress');
  await actor(ids.account);await submit('account-daily','brainmix',200,12);
  await rejects(()=>scalar('select claim_brainilab_guest_results($1)',['b'.repeat(64)]),'unknown claim token is rejected');
  const merged=await scalar('select claim_brainilab_guest_results($1)',[token]);
  check(merged.transferred===1 && merged.skipped_client_result_ids.includes('guest-first-daily'),'merge transfers new games and preserves account Daily over duplicate guest Daily');
  check((await ranks()).user.score===200 && (await ranks('survival')).user.score===75,'merge neither loses unique score nor double-counts Daily');
  check(!JSON.stringify(await ranks()).includes('Guest '),'retired guest disappears from public rankings');
  check((await scalar('select claim_brainilab_guest_results($1)',[token])).already_claimed,'claim retry is idempotent');
  await actor(ids.other);
  await rejects(()=>scalar('select claim_brainilab_guest_results($1)',[token]),'claim cannot be reused by another account');
  await actor(ids.guest);
  await rejects(()=>submit('retired-guest-game','survival',30,null),'retired guest cannot submit new games');
  await rejects(()=>scalar('select set_brainilab_ranking_visibility(true)'),'retired guest cannot rejoin rankings');
  await actor(ids.account);
  await db.exec('set role authenticated');
  await rejects(()=>q('select * from brainilab_guest_claims'),'claim secrets are not directly readable');
  await rejects(()=>q('update profiles set leaderboard_enabled=false'),'direct visibility writes cannot bypass explicit-choice tracking');
  check((await q('select user_id from profiles')).every(r=>r.user_id===ids.account),'profile RLS remains private');
  await db.exec('reset role');
  console.log(`\n${passed} database checks passed.`);
}finally{await db.close();}
