-- Equip up to three server-earned achievement tiers through existing avatar_style.
-- No score/XP/player writes, public RPC edits, new functions, policies or grants.
begin;
do $guard$ begin
  if (select md5(pg_get_functiondef('brainilab_private.player_avatar(uuid)'::regprocedure))) is distinct from 'ef67f28d81589f0918465d679764a479' then
    raise exception 'Concurrent avatar helper edit';
  end if;
  if (select md5(pg_get_functiondef('public.get_brainilab_individual_rankings(text,text,text,text,text,integer)'::regprocedure))) is distinct from '40504cc846dccf7faf7e89319e86270e' then raise exception 'Concurrent social RPC edit: get_brainilab_individual_rankings'; end if;
  if (select md5(pg_get_functiondef('public.get_my_brainilab_friends()'::regprocedure))) is distinct from '1100f83badee67553371b3f49d0c3d06' then raise exception 'Concurrent social RPC edit: get_my_brainilab_friends'; end if;
  if (select md5(pg_get_functiondef('public.get_my_brainilab_friends_ranking(text,text,text)'::regprocedure))) is distinct from '9261020afe887ca2447ef2e3ab158400' then raise exception 'Concurrent social RPC edit: get_my_brainilab_friends_ranking'; end if;
  if (select md5(pg_get_functiondef('public.get_my_brainilab_groups()'::regprocedure))) is distinct from '979d2cc309c0b7e87d58a63d85bb9966' then raise exception 'Concurrent social RPC edit: get_my_brainilab_groups'; end if;
  if exists(select 1 from pg_catalog.pg_proc p where p.oid='brainilab_private.player_avatar(uuid)'::regprocedure
    and (p.prosecdef or p.provolatile<>'s' or p.proconfig is distinct from array['search_path=""']::text[]
      or p.proacl::text is distinct from '{postgres=X/postgres}' or pg_catalog.pg_get_userbyid(p.proowner)<>'postgres')) then
    raise exception 'Unexpected private avatar security/ACL';
  end if;
  if pg_catalog.has_function_privilege('anon','brainilab_private.player_avatar(uuid)','EXECUTE')
    or pg_catalog.has_function_privilege('authenticated','brainilab_private.player_avatar(uuid)','EXECUTE') then
    raise exception 'Private avatar helper must not be publicly executable';
  end if;
end $guard$;
CREATE OR REPLACE FUNCTION brainilab_private.player_avatar(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  v_catalog constant jsonb := '{"mode":[["picture",0],["built",0]],"skin":[["sand",0],["peach",0],["honey",0],["cocoa",0],["umber",0],["ebony",0]],"hair":[["sweep",0],["curls",0],["bob",0],["crop",0],["bald",0],["ponytail",0],["waves",0],["braids",0]],"hairColor":[["brown",0],["black",0],["blond",0],["auburn",0],["silver",0]],"shirt":[["navy",0],["green",0],["orange",0],["blue",0],["berry",0]],"background":[["lilac",0],["sky",0],["sage",0],["sunshine",0],["coral",0]],"glasses":[["none",0],["round",150],["square",600],["sun",1000],["monocle",2250],["heart",2750],["star",3500],["visor",5000],["doughnut",6500],["camera",8250]],"hat":[["none",0],["beanie",500],["egg",1200],["cap",1500],["corn",2200],["toast",2800],["cloud",4000],["coffee",4750],["wave",5500],["wizard",6000],["graduate",8000]],"prop":[["none",0],["cookie",300],["icepop",800],["peas",1800],["bulb",2500],["train",3200],["owl",3800],["pencil",4500],["nacho",5750],["rocket",7000],["roll",7500],["book",9000]],"frame":[["level",0],["blue",100],["green",500],["copper",1500],["gold",3000],["orbit",6000]]}'::jsonb;
  v_titles constant jsonb := '[["none",0],["explorer",250],["curious",750],["detective",2000],["thinker",4500],["sage",10000]]'::jsonb;
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
  into v_meta,v_xp,v_total_games,v_best_streak,v_full_daily_count,v_is_account from auth.users u left join public.player_progression pp on pp.user_id=u.id
  where u.id=p_user_id;
  if not found then return null; end if;
  for v_key,v_choices in select key,value from pg_catalog.jsonb_each(v_catalog) loop
    v_default:=v_choices->0->>0;
    v_value:=v_meta->>case when v_key='frame' then 'brainilab_avatar_frame_v1'
      when v_key='hairColor' then 'brainilab_avatar_hair_color_v1'
      else 'brainilab_avatar_'||v_key||'_v1' end;
    v_cost:=null;
    for v_item in select value from pg_catalog.jsonb_array_elements(v_choices) loop
      if v_item->>0=v_value then v_cost:=(v_item->>1)::integer; exit; end if;
    end loop;
    if v_cost is null or v_cost>v_xp then v_value:=v_default; v_cost:=0; end if;
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
        from public.player_personal_bests pb
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

-- CREATE OR REPLACE preserves the existing private invoker ACL.

do $verify$ begin
  if (select md5(pg_get_functiondef('public.get_brainilab_individual_rankings(text,text,text,text,text,integer)'::regprocedure))) is distinct from '40504cc846dccf7faf7e89319e86270e' then raise exception 'Concurrent social RPC edit: get_brainilab_individual_rankings'; end if;
  if (select md5(pg_get_functiondef('public.get_my_brainilab_friends()'::regprocedure))) is distinct from '1100f83badee67553371b3f49d0c3d06' then raise exception 'Concurrent social RPC edit: get_my_brainilab_friends'; end if;
  if (select md5(pg_get_functiondef('public.get_my_brainilab_friends_ranking(text,text,text)'::regprocedure))) is distinct from '9261020afe887ca2447ef2e3ab158400' then raise exception 'Concurrent social RPC edit: get_my_brainilab_friends_ranking'; end if;
  if (select md5(pg_get_functiondef('public.get_my_brainilab_groups()'::regprocedure))) is distinct from '979d2cc309c0b7e87d58a63d85bb9966' then raise exception 'Concurrent social RPC edit: get_my_brainilab_groups'; end if;
  if exists(select 1 from pg_catalog.pg_proc p where p.oid='brainilab_private.player_avatar(uuid)'::regprocedure
    and (p.prosecdef or p.provolatile<>'s' or p.proconfig is distinct from array['search_path=""']::text[]
      or p.proacl::text is distinct from '{postgres=X/postgres}' or pg_catalog.pg_get_userbyid(p.proowner)<>'postgres')) then
    raise exception 'Unexpected private avatar security/ACL';
  end if;
  if pg_catalog.has_function_privilege('anon','brainilab_private.player_avatar(uuid)','EXECUTE')
    or pg_catalog.has_function_privilege('authenticated','brainilab_private.player_avatar(uuid)','EXECUTE') then
    raise exception 'Private avatar helper must not be publicly executable';
  end if;
end $verify$;
commit;
