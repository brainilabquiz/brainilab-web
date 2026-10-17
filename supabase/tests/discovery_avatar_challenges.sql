-- Exact proposed bodies, fictional temporary relations only. No real game,
-- score, XP, auth, profile, preference or Academy rows are written.
begin;
create temporary table users(id uuid,is_anonymous bool,raw_user_meta_data jsonb);
create temporary table player_progression(user_id uuid,xp bigint,total_games int default 0,best_streak int default 0,full_daily_count int default 0);
create temporary table player_personal_bests(user_id uuid,result_id uuid,game_id text);
create temporary table learn_avatar_unlocks(user_id uuid,reward_id text);
create temporary table game_sessions(id uuid primary key,user_id uuid,game_id text,status text,completed_at timestamptz);
create temporary table game_results(id uuid primary key,session_id uuid,user_id uuid,answers_verified bool,created_at timestamptz,result_payload jsonb);
alter table pg_temp.game_sessions enable row level security;
alter table pg_temp.game_results enable row level security;
create policy sessions_owner on pg_temp.game_sessions for select to authenticated using ((select auth.uid())=user_id);
create policy results_owner on pg_temp.game_results for select to authenticated using ((select auth.uid())=user_id);
grant select on pg_temp.game_sessions,pg_temp.game_results to authenticated;
create function pg_temp.discovery_snapshot() returns jsonb
language sql stable security invoker set search_path='' as $discovery$
  select jsonb_build_object('owner',(select auth.uid()),'games',coalesce((
    select jsonb_agg(g.game_id order by g.game_id) from (
      select distinct gs.game_id from pg_temp.game_sessions gs join pg_temp.game_results gr on gr.session_id=gs.id
    where gs.user_id=(select auth.uid()) and gr.user_id=(select auth.uid()) and gs.status='completed' and gs.completed_at is not null
      and gs.game_id=any(array['brainmix','brainiword','connections','numberroute','mathrush','sequence','worldflags','worldcapitals','science','history','sports','generalknowledge','orderup','topicrush','oddoneout','higherlower','survival']::text[])
      and (gr.answers_verified=true or gr.created_at<'2026-09-29 05:28:13.066031+00'::timestamptz)
      and coalesce(gr.result_payload->>'practice','false')<>'true'
      and coalesce(gr.result_payload->>'tryFirst','false')<>'true'
        and ((select auth.jwt())->>'is_anonymous')::boolean is false
    )g
  ),'[]'::jsonb));
$discovery$;
CREATE OR REPLACE FUNCTION pg_temp.discovery_avatar(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$

declare

  v_catalog constant jsonb := '{"mode":[["picture",0],["built",0]],"skin":[["sand",0],["peach",0],["honey",0],["cocoa",0],["umber",0],["ebony",0]],"hair":[["sweep",0],["curls",0],["bob",0],["crop",0],["bald",0],["ponytail",0],["waves",0],["braids",0]],"hairColor":[["brown",0],["black",0],["blond",0],["auburn",0],["silver",0]],"shirt":[["navy",0],["green",0],["orange",0],["blue",0],["berry",0]],"background":[["lilac",0],["sky",0],["sage",0],["sunshine",0],["coral",0]],"glasses":[["none",0],["round",150],["square",600],["sun",1000],["monocle",2250],["heart",2750],["star",3500],["visor",5000],["doughnut",6500],["camera",8250],["academy_mathspecs",0],["discovery_gameface",0]],"hat":[["none",0],["beanie",500],["egg",1200],["cap",1500],["corn",2200],["toast",2800],["cloud",4000],["coffee",4750],["wave",5500],["wizard",6000],["graduate",8000],["academy_calendar",0],["academy_detective",0],["academy_rainbow",0],["discovery_paperhat",0],["discovery_crunch",0]],"prop":[["none",0],["cookie",300],["icepop",800],["peas",1800],["bulb",2500],["train",3200],["owl",3800],["pencil",4500],["nacho",5750],["rocket",7000],["roll",7500],["book",9000],["academy_abacus",0],["academy_moon",0],["academy_pie",0],["academy_puzzle",0],["discovery_trailmix",0],["discovery_globe",0]],"frame":[["level",0],["blue",100],["green",500],["copper",1500],["gold",3000],["orbit",6000]]}'::jsonb;

  v_titles constant jsonb := '[["none",0],["explorer",250],["curious",750],["detective",2000],["thinker",4500],["sage",10000]]'::jsonb;

  v_discovery_catalog constant jsonb := '{"discovery_trailmix":{"target":3},"discovery_gameface":{"target":8},"discovery_paperhat":{"games":["brainiword","connections"]},"discovery_crunch":{"games":["numberroute","mathrush","sequence"]},"discovery_globe":{"games":["worldflags","worldcapitals"]}}'::jsonb;
  v_discovered text[] := array[]::text[]; v_discovery_earned text[] := array[]::text[];
  v_reward_id text; v_requirement jsonb;
  v_title text := 'none';

  v_meta jsonb; v_xp bigint; v_key text; v_choices jsonb; v_item jsonb;

  v_value text; v_default text; v_cost integer; v_render_xp integer := 0; v_frame_cost integer := 0;

  v_design jsonb := '{}'::jsonb; v_frame text := 'level';

  v_badge_catalog constant jsonb := '{"first_game":[{"totalGames":1},{"totalGames":3},{"totalGames":7},{"totalGames":15},{"totalGames":30},{"totalGames":55},{"totalGames":95},{"totalGames":155},{"totalGames":245},{"totalGames":375}],"ten_games":[{"totalGames":10},{"totalGames":20},{"totalGames":40},{"totalGames":75},{"totalGames":135},{"totalGames":230},{"totalGames":375},{"totalGames":590},{"totalGames":900},{"totalGames":1350}],"fifty_games":[{"totalGames":50},{"totalGames":100},{"totalGames":175},{"totalGames":300},{"totalGames":500},{"totalGames":800},{"totalGames":1250},{"totalGames":1900},{"totalGames":2800},{"totalGames":4000}],"personal_bests_three":[{"totalGames":0,"personalBestGames":3},{"totalGames":10,"personalBestGames":3},{"totalGames":25,"personalBestGames":4},{"totalGames":55,"personalBestGames":4},{"totalGames":110,"personalBestGames":5},{"totalGames":210,"personalBestGames":5},{"totalGames":385,"personalBestGames":6},{"totalGames":680,"personalBestGames":6},{"totalGames":1150,"personalBestGames":7},{"totalGames":1900,"personalBestGames":8}],"daily_first":[{"fullDailyCount":1},{"fullDailyCount":3},{"fullDailyCount":7},{"fullDailyCount":15},{"fullDailyCount":30},{"fullDailyCount":55},{"fullDailyCount":95},{"fullDailyCount":155},{"fullDailyCount":245},{"fullDailyCount":375}],"daily_seven":[{"fullDailyCount":7},{"fullDailyCount":14},{"fullDailyCount":28},{"fullDailyCount":50},{"fullDailyCount":85},{"fullDailyCount":140},{"fullDailyCount":225},{"fullDailyCount":355},{"fullDailyCount":550},{"fullDailyCount":840}],"streak_three":[{"bestStreak":3},{"bestStreak":5},{"bestStreak":9},{"bestStreak":16},{"bestStreak":28},{"bestStreak":47},{"bestStreak":77},{"bestStreak":122},{"bestStreak":187},{"bestStreak":277}],"streak_seven":[{"bestStreak":7},{"bestStreak":10},{"bestStreak":16},{"bestStreak":26},{"bestStreak":42},{"bestStreak":67},{"bestStreak":105},{"bestStreak":160},{"bestStreak":240},{"bestStreak":350}]}'::jsonb;

  v_total_games integer; v_best_streak integer; v_full_daily_count integer; v_personal_best_games integer := 0;

  v_is_account boolean; v_metrics jsonb; v_selection jsonb; v_badge_id text; v_badge_tiers jsonb;

  v_badge_tier integer; v_tier_index integer; v_selected_item jsonb;

  v_seen text[] := array[]::text[]; v_achievements jsonb := '[]'::jsonb;

begin

  select coalesce(u.raw_user_meta_data,'{}'::jsonb),greatest(0,coalesce(pp.xp,0)),

    pp.total_games,pp.best_streak,pp.full_daily_count,not coalesce(u.is_anonymous,false)

  into v_meta,v_xp,v_total_games,v_best_streak,v_full_daily_count,v_is_account from pg_temp.users u left join pg_temp.player_progression pp on pp.user_id=u.id

  where u.id=p_user_id;

  if not found then return null; end if;

  -- The same canonical completed-round rule as the owner-only read RPC.
  -- Unselected discovery collections are never looked up or exposed socially.
  if v_is_account and (v_meta->>'brainilab_avatar_hat_v1'=any(array['discovery_trailmix','discovery_gameface','discovery_paperhat','discovery_crunch','discovery_globe']::text[]) or v_meta->>'brainilab_avatar_glasses_v1'=any(array['discovery_trailmix','discovery_gameface','discovery_paperhat','discovery_crunch','discovery_globe']::text[]) or v_meta->>'brainilab_avatar_prop_v1'=any(array['discovery_trailmix','discovery_gameface','discovery_paperhat','discovery_crunch','discovery_globe']::text[])) then
    select coalesce(array_agg(distinct gs.game_id),array[]::text[]) into v_discovered from pg_temp.game_sessions gs join pg_temp.game_results gr on gr.session_id=gs.id
    where gs.user_id=p_user_id and gr.user_id=p_user_id and gs.status='completed' and gs.completed_at is not null
      and gs.game_id=any(array['brainmix','brainiword','connections','numberroute','mathrush','sequence','worldflags','worldcapitals','science','history','sports','generalknowledge','orderup','topicrush','oddoneout','higherlower','survival']::text[])
      and (gr.answers_verified=true or gr.created_at<'2026-09-29 05:28:13.066031+00'::timestamptz)
      and coalesce(gr.result_payload->>'practice','false')<>'true'
      and coalesce(gr.result_payload->>'tryFirst','false')<>'true';
    for v_reward_id,v_requirement in select key,value from jsonb_each(v_discovery_catalog) loop
      if (v_requirement ? 'target' and cardinality(v_discovered)>=(v_requirement->>'target')::integer)
        or (v_requirement ? 'games' and not exists(select 1 from jsonb_array_elements_text(v_requirement->'games') g where not(g.value=any(v_discovered)))) then
        v_discovery_earned:=array_append(v_discovery_earned,v_reward_id);
      end if;
    end loop;
  end if;
  for v_key,v_choices in select key,value from pg_catalog.jsonb_each(v_catalog) loop

    v_default:=v_choices->0->>0;

    v_value:=v_meta->>case when v_key='frame' then 'brainilab_avatar_frame_v1'

      when v_key='hairColor' then 'brainilab_avatar_hair_color_v1'

      else 'brainilab_avatar_'||v_key||'_v1' end;

    v_cost:=null;

    for v_item in select value from pg_catalog.jsonb_array_elements(v_choices) loop

      if v_item->>0=v_value then v_cost:=(v_item->>1)::integer; exit; end if;

    end loop;

    if v_cost is null or v_cost>v_xp or (v_discovery_catalog ? v_value and not(v_value=any(v_discovery_earned))) or (v_value=any(array['academy_calendar','academy_abacus','academy_mathspecs','academy_moon','academy_detective','academy_pie','academy_puzzle','academy_rainbow']::text[]) and not exists(select 1 from pg_temp.learn_avatar_unlocks au where au.user_id=p_user_id and au.reward_id=v_value)) then v_value:=v_default; v_cost:=0; end if;

    v_render_xp:=greatest(v_render_xp,v_cost);

    if v_key='frame' then v_frame:=v_value; v_frame_cost:=v_cost;

    else v_design:=v_design||pg_catalog.jsonb_build_object(v_key,v_value); end if;

  end loop;

  -- A title is a cosmetic selection; only canonical earned XP can unlock it.

  for v_item in select value from pg_catalog.jsonb_array_elements(v_titles) loop

    if v_item->>0=v_meta->>'brainilab_profile_title_v1' and (v_item->>1)::integer<=v_xp then

      v_title:=v_item->>0; exit;

    end if;

  end loop;

  -- Selected IDs are editable preferences, never proof of an earned tier.

  -- Reject malformed/oversized badge lists without changing avatar appearance.

  v_selection:=v_meta->'brainilab_featured_achievements_v1';

  if v_is_account and v_total_games>=0 and v_best_streak>=0 and v_full_daily_count>=0

    and pg_catalog.jsonb_typeof(v_selection)='array' then

    if pg_catalog.jsonb_array_length(v_selection) between 1 and 3 then

      if v_selection ? 'personal_bests_three' then

        select count(distinct pb.result_id)::integer into v_personal_best_games

        from pg_temp.player_personal_bests pb

        where pb.user_id=p_user_id and pb.game_id=any(array['brainmix','flagdash','orderup','maphunt','topicrush','brainiword',

          'worldflags','worldcapitals','science','history','sports','generalknowledge','connections','survival','oddoneout',

          'higherlower','mathrush','numberroute','sequence']::text[])

          and pb.result_id is not null and pb.result_id<>'00000000-0000-0000-0000-000000000000'::uuid;

      end if;

      v_metrics:=pg_catalog.jsonb_build_object('totalGames',v_total_games,'bestStreak',v_best_streak,

        'fullDailyCount',v_full_daily_count,'personalBestGames',v_personal_best_games);

      for v_selected_item in select value from pg_catalog.jsonb_array_elements(v_selection) loop

        if pg_catalog.jsonb_typeof(v_selected_item)<>'string' then continue; end if;

        v_badge_id:=v_selected_item#>>'{}';

        if v_badge_id=any(v_seen) or not (v_badge_catalog ? v_badge_id) then continue; end if;

        v_seen:=pg_catalog.array_append(v_seen,v_badge_id);

        v_badge_tiers:=v_badge_catalog->v_badge_id; v_badge_tier:=0;

        for v_tier_index in 0..9 loop

          if not exists(select 1 from pg_catalog.jsonb_each_text(v_badge_tiers->v_tier_index) requirement

            where (v_metrics->>requirement.key)::integer<requirement.value::integer) then

            v_badge_tier:=v_tier_index+1;

          end if;

        end loop;

        if v_badge_tier>0 then

          v_achievements:=v_achievements||pg_catalog.jsonb_build_array(

            pg_catalog.jsonb_build_object('id',v_badge_id,'tier',v_badge_tier));

        end if;

      end loop;

    end if;

  end if;

  if v_design->>'mode'<>'built' and v_frame='level' and v_title='none' and v_achievements='[]'::jsonb then return null; end if;

  if v_design->>'mode'<>'built' then v_render_xp:=v_frame_cost; end if;

  -- render_xp is only the minimum threshold needed to render these unlocked items.

  -- The public ranking receives neither total XP, auth metadata, email nor user ID.

  return pg_catalog.jsonb_build_object('design',case when v_design->>'mode'='built' then v_design else null end,

    'frame',v_frame,'render_xp',v_render_xp,'title',v_title,'achievements',v_achievements);

end;

$function$;

create function pg_temp.add_discovery_game(p_owner uuid,p_game text,p_verified boolean default true,p_created timestamptz default now(),p_payload jsonb default '{}'::jsonb,p_status text default 'completed',p_has_time boolean default true,p_result_owner uuid default null) returns void language plpgsql as $$declare sid uuid:=gen_random_uuid();begin
 insert into pg_temp.game_sessions values(sid,p_owner,p_game,p_status,case when p_has_time then now() else null end);
 insert into pg_temp.game_results values(gen_random_uuid(),sid,coalesce(p_result_owner,p_owner),p_verified,p_created,p_payload);
end $$;
insert into pg_temp.users values('00000000-0000-4000-8000-000000000011',false,'{}'),('00000000-0000-4000-8000-000000000012',false,'{}'),('00000000-0000-4000-8000-000000000013',true,'{}');
insert into pg_temp.player_progression(user_id,xp) values('00000000-0000-4000-8000-000000000011',0),('00000000-0000-4000-8000-000000000012',100000),('00000000-0000-4000-8000-000000000013',100000);
do $tests$
declare uid uuid:='00000000-0000-4000-8000-000000000011';other_uid uuid:='00000000-0000-4000-8000-000000000012';anon_uid uuid:='00000000-0000-4000-8000-000000000013';rules jsonb:='{"discovery_trailmix":{"target":3},"discovery_gameface":{"target":8},"discovery_paperhat":{"games":["brainiword","connections"]},"discovery_crunch":{"games":["numberroute","mathrush","sequence"]},"discovery_globe":{"games":["worldflags","worldcapitals"]}}'::jsonb;all_games text[]:=array['brainmix','brainiword','connections','numberroute','mathrush','sequence','worldflags','worldcapitals','science','history','sports','generalknowledge','orderup','topicrush','oddoneout','higherlower','survival'];rid text;rule jsonb;required text[];game text;target int;kind text;v jsonb;cases int:=0;
begin
 perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'is_anonymous',false,'role','authenticated')::text,true);
 for rid,rule in select key,value from jsonb_each(rules) loop
  truncate pg_temp.game_sessions,pg_temp.game_results;
  required:=case when rule ? 'target' then all_games[1:(rule->>'target')::integer] else array(select jsonb_array_elements_text(rule->'games')) end;
  target:=cardinality(required);kind:=case when rid='discovery_gameface' then 'glasses' when rid in ('discovery_paperhat','discovery_crunch') then 'hat' else 'prop' end;
  update pg_temp.users set raw_user_meta_data=jsonb_build_object('brainilab_avatar_mode_v1','built','brainilab_avatar_'||kind||'_v1',rid) where id in(uid,other_uid);
  if pg_temp.discovery_avatar(uid)->'design'->>kind is distinct from 'none' then raise exception 'Unplayed reward exposed';end if;
  foreach game in array required[1:target-1] loop perform pg_temp.add_discovery_game(uid,game);end loop;
  perform pg_temp.add_discovery_game(uid,required[1]);
  perform pg_temp.add_discovery_game(uid,'unknown');
  perform pg_temp.add_discovery_game(other_uid,required[target]);
  perform pg_temp.add_discovery_game(uid,required[target],false,'2026-09-29 05:28:13.066031+00');
  perform pg_temp.add_discovery_game(uid,required[target],false,'2026-09-01','{"practice":true}');
  perform pg_temp.add_discovery_game(uid,required[target],true,now(),'{"tryFirst":true}');
  perform pg_temp.add_discovery_game(uid,required[target],true,now(),'{}','started');
  perform pg_temp.add_discovery_game(uid,required[target],true,now(),'{}','completed',false);
  perform pg_temp.add_discovery_game(uid,required[target],true,now(),'{}','completed',true,other_uid);
  v:=pg_temp.discovery_snapshot();
  if jsonb_array_length(v->'games')<>target-1 then raise exception 'Duplicate/invalid/cross-owner round counted: %',rid;end if;
  if pg_temp.discovery_avatar(uid)->'design'->>kind is distinct from 'none' then raise exception 'Incomplete challenge exposed: %',rid;end if;
  -- A canonical pre-verification legacy completion counts, even at zero XP.
  perform pg_temp.add_discovery_game(uid,required[target],false,'2026-09-29 05:28:13.066030+00');
  if jsonb_array_length(pg_temp.discovery_snapshot()->'games')<>target then raise exception 'Legacy round not counted';end if;
  if pg_temp.discovery_avatar(uid)->'design'->>kind is distinct from rid then raise exception 'Earned challenge missing: %',rid;end if;
  if pg_temp.discovery_avatar(other_uid)->'design'->>kind is distinct from 'none' then raise exception 'Other owner borrowed progress';end if;
  -- Only cosmetics are returned to public views, never played-game history.
  if (pg_temp.discovery_avatar(uid)-'design'-'frame'-'render_xp'-'title'-'achievements')<>'{}'::jsonb then raise exception 'Public progress leak';end if;
  cases:=cases+1;
 end loop;
 if cases<>5 then raise exception 'Expected all five rules';end if;
 -- Leave a known owner/other-owner data set for invoker and RLS checks.
 truncate pg_temp.game_sessions,pg_temp.game_results;
 perform pg_temp.add_discovery_game(uid,'brainiword');perform pg_temp.add_discovery_game(uid,'connections');perform pg_temp.add_discovery_game(other_uid,'numberroute');
end $tests$;
grant execute on function pg_temp.discovery_snapshot() to authenticated;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000011","is_anonymous":false,"role":"authenticated"}',true);
do $$begin if pg_temp.discovery_snapshot()->'games' is distinct from '["brainiword","connections"]'::jsonb then raise exception 'Invoker owner read/RLS failed';end if;end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000012","is_anonymous":false,"role":"authenticated"}',true);
do $$begin if pg_temp.discovery_snapshot()->'games' is distinct from '["numberroute"]'::jsonb then raise exception 'Invoker other-owner isolation failed';end if;end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000011","is_anonymous":true,"role":"authenticated"}',true);
do $$begin if pg_temp.discovery_snapshot()->'games'<>'[]'::jsonb then raise exception 'Anonymous Auth read allowed';end if;end $$;
select set_config('request.jwt.claims','{}',true);
do $$begin if pg_temp.discovery_snapshot()->'games'<>'[]'::jsonb then raise exception 'Missing identity read allowed';end if;end $$;
reset role;
select jsonb_build_object('challengeContracts',5,'currentAndLegacyBoundary',true,'invalidDuplicatePracticeIncompleteAndCrossOwnerExcluded',true,'invokerAndRLS',true,'realPlayerWrites',0,'transaction','rollback') as discovery_verification;
rollback;
