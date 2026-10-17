-- Pure fictional inputs through the exact proposed helper body; only data sources
-- are replaced. No auth/profile/progression/result rows are inserted or updated.
-- The temporary function disappears on ROLLBACK. Run before applying migration.
begin;
CREATE OR REPLACE FUNCTION pg_temp.achievement_avatar_fixture(p_meta jsonb,p_progress jsonb,p_bests jsonb,p_is_account boolean default true,p_exists boolean default true)
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
  if not p_exists then return null; end if;
  v_meta:=coalesce(p_meta,'{}'::jsonb); v_xp:=greatest(0,coalesce((p_progress->>'xp')::bigint,0));
  v_total_games:=(p_progress->>'total_games')::integer;
  v_best_streak:=(p_progress->>'best_streak')::integer;
  v_full_daily_count:=(p_progress->>'full_daily_count')::integer; v_is_account:=p_is_account;
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
        from pg_catalog.jsonb_to_recordset(coalesce(p_bests,'[]'::jsonb)) as pb(game_id text,result_id uuid)
        where pb.game_id=any(array['brainmix','flagdash','orderup','maphunt','topicrush','brainiword',
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

do $tests$
declare
  v_contract constant jsonb := '[{"id":"first_game","name":"First spark","description":"Complete your first saved game.","metric":"totalGames","initialTarget":1,"tiers":[{"level":1,"key":"paper","material":"Paper","requirements":{"totalGames":1}},{"level":2,"key":"bronze","material":"Bronze","requirements":{"totalGames":3}},{"level":3,"key":"silver","material":"Silver","requirements":{"totalGames":7}},{"level":4,"key":"gold","material":"Gold","requirements":{"totalGames":15}},{"level":5,"key":"platinum","material":"Platinum","requirements":{"totalGames":30}},{"level":6,"key":"diamond","material":"Diamond","requirements":{"totalGames":55}},{"level":7,"key":"titanium","material":"Titanium","requirements":{"totalGames":95}},{"level":8,"key":"emerald","material":"Emerald","requirements":{"totalGames":155}},{"level":9,"key":"obsidian","material":"Obsidian","requirements":{"totalGames":245}},{"level":10,"key":"prismatic","material":"Prismatic","requirements":{"totalGames":375}}]},{"id":"ten_games","name":"Double digits","description":"Complete 10 saved games.","metric":"totalGames","initialTarget":10,"tiers":[{"level":1,"key":"paper","material":"Paper","requirements":{"totalGames":10}},{"level":2,"key":"bronze","material":"Bronze","requirements":{"totalGames":20}},{"level":3,"key":"silver","material":"Silver","requirements":{"totalGames":40}},{"level":4,"key":"gold","material":"Gold","requirements":{"totalGames":75}},{"level":5,"key":"platinum","material":"Platinum","requirements":{"totalGames":135}},{"level":6,"key":"diamond","material":"Diamond","requirements":{"totalGames":230}},{"level":7,"key":"titanium","material":"Titanium","requirements":{"totalGames":375}},{"level":8,"key":"emerald","material":"Emerald","requirements":{"totalGames":590}},{"level":9,"key":"obsidian","material":"Obsidian","requirements":{"totalGames":900}},{"level":10,"key":"prismatic","material":"Prismatic","requirements":{"totalGames":1350}}]},{"id":"fifty_games","name":"Fifty nifty","description":"Complete 50 saved games.","metric":"totalGames","initialTarget":50,"tiers":[{"level":1,"key":"paper","material":"Paper","requirements":{"totalGames":50}},{"level":2,"key":"bronze","material":"Bronze","requirements":{"totalGames":100}},{"level":3,"key":"silver","material":"Silver","requirements":{"totalGames":175}},{"level":4,"key":"gold","material":"Gold","requirements":{"totalGames":300}},{"level":5,"key":"platinum","material":"Platinum","requirements":{"totalGames":500}},{"level":6,"key":"diamond","material":"Diamond","requirements":{"totalGames":800}},{"level":7,"key":"titanium","material":"Titanium","requirements":{"totalGames":1250}},{"level":8,"key":"emerald","material":"Emerald","requirements":{"totalGames":1900}},{"level":9,"key":"obsidian","material":"Obsidian","requirements":{"totalGames":2800}},{"level":10,"key":"prismatic","material":"Prismatic","requirements":{"totalGames":4000}}]},{"id":"personal_bests_three","name":"Mix it up","description":"Record a personal best in three different games.","metric":"personalBestGames","initialTarget":3,"tiers":[{"level":1,"key":"paper","material":"Paper","requirements":{"totalGames":0,"personalBestGames":3}},{"level":2,"key":"bronze","material":"Bronze","requirements":{"totalGames":10,"personalBestGames":3}},{"level":3,"key":"silver","material":"Silver","requirements":{"totalGames":25,"personalBestGames":4}},{"level":4,"key":"gold","material":"Gold","requirements":{"totalGames":55,"personalBestGames":4}},{"level":5,"key":"platinum","material":"Platinum","requirements":{"totalGames":110,"personalBestGames":5}},{"level":6,"key":"diamond","material":"Diamond","requirements":{"totalGames":210,"personalBestGames":5}},{"level":7,"key":"titanium","material":"Titanium","requirements":{"totalGames":385,"personalBestGames":6}},{"level":8,"key":"emerald","material":"Emerald","requirements":{"totalGames":680,"personalBestGames":6}},{"level":9,"key":"obsidian","material":"Obsidian","requirements":{"totalGames":1150,"personalBestGames":7}},{"level":10,"key":"prismatic","material":"Prismatic","requirements":{"totalGames":1900,"personalBestGames":8}}]},{"id":"daily_first","name":"Daily dose","description":"Complete your first Daily.","metric":"fullDailyCount","initialTarget":1,"tiers":[{"level":1,"key":"paper","material":"Paper","requirements":{"fullDailyCount":1}},{"level":2,"key":"bronze","material":"Bronze","requirements":{"fullDailyCount":3}},{"level":3,"key":"silver","material":"Silver","requirements":{"fullDailyCount":7}},{"level":4,"key":"gold","material":"Gold","requirements":{"fullDailyCount":15}},{"level":5,"key":"platinum","material":"Platinum","requirements":{"fullDailyCount":30}},{"level":6,"key":"diamond","material":"Diamond","requirements":{"fullDailyCount":55}},{"level":7,"key":"titanium","material":"Titanium","requirements":{"fullDailyCount":95}},{"level":8,"key":"emerald","material":"Emerald","requirements":{"fullDailyCount":155}},{"level":9,"key":"obsidian","material":"Obsidian","requirements":{"fullDailyCount":245}},{"level":10,"key":"prismatic","material":"Prismatic","requirements":{"fullDailyCount":375}}]},{"id":"daily_seven","name":"Daily regular","description":"Complete the Daily on seven different days.","metric":"fullDailyCount","initialTarget":7,"tiers":[{"level":1,"key":"paper","material":"Paper","requirements":{"fullDailyCount":7}},{"level":2,"key":"bronze","material":"Bronze","requirements":{"fullDailyCount":14}},{"level":3,"key":"silver","material":"Silver","requirements":{"fullDailyCount":28}},{"level":4,"key":"gold","material":"Gold","requirements":{"fullDailyCount":50}},{"level":5,"key":"platinum","material":"Platinum","requirements":{"fullDailyCount":85}},{"level":6,"key":"diamond","material":"Diamond","requirements":{"fullDailyCount":140}},{"level":7,"key":"titanium","material":"Titanium","requirements":{"fullDailyCount":225}},{"level":8,"key":"emerald","material":"Emerald","requirements":{"fullDailyCount":355}},{"level":9,"key":"obsidian","material":"Obsidian","requirements":{"fullDailyCount":550}},{"level":10,"key":"prismatic","material":"Prismatic","requirements":{"fullDailyCount":840}}]},{"id":"streak_three","name":"Three\u2019s a charm","description":"Reach a best Daily streak of three days.","metric":"bestStreak","initialTarget":3,"tiers":[{"level":1,"key":"paper","material":"Paper","requirements":{"bestStreak":3}},{"level":2,"key":"bronze","material":"Bronze","requirements":{"bestStreak":5}},{"level":3,"key":"silver","material":"Silver","requirements":{"bestStreak":9}},{"level":4,"key":"gold","material":"Gold","requirements":{"bestStreak":16}},{"level":5,"key":"platinum","material":"Platinum","requirements":{"bestStreak":28}},{"level":6,"key":"diamond","material":"Diamond","requirements":{"bestStreak":47}},{"level":7,"key":"titanium","material":"Titanium","requirements":{"bestStreak":77}},{"level":8,"key":"emerald","material":"Emerald","requirements":{"bestStreak":122}},{"level":9,"key":"obsidian","material":"Obsidian","requirements":{"bestStreak":187}},{"level":10,"key":"prismatic","material":"Prismatic","requirements":{"bestStreak":277}}]},{"id":"streak_seven","name":"Week streak","description":"Reach a best Daily streak of seven days.","metric":"bestStreak","initialTarget":7,"tiers":[{"level":1,"key":"paper","material":"Paper","requirements":{"bestStreak":7}},{"level":2,"key":"bronze","material":"Bronze","requirements":{"bestStreak":10}},{"level":3,"key":"silver","material":"Silver","requirements":{"bestStreak":16}},{"level":4,"key":"gold","material":"Gold","requirements":{"bestStreak":26}},{"level":5,"key":"platinum","material":"Platinum","requirements":{"bestStreak":42}},{"level":6,"key":"diamond","material":"Diamond","requirements":{"bestStreak":67}},{"level":7,"key":"titanium","material":"Titanium","requirements":{"bestStreak":105}},{"level":8,"key":"emerald","material":"Emerald","requirements":{"bestStreak":160}},{"level":9,"key":"obsidian","material":"Obsidian","requirements":{"bestStreak":240}},{"level":10,"key":"prismatic","material":"Prismatic","requirements":{"bestStreak":350}}]}]'::jsonb;
  v_badge jsonb; v_tier jsonb; v_requirements jsonb; v_requirement record;
  v_progress jsonb; v_bests jsonb; v_meta jsonb; v_result jsonb; v_expected integer; v_count integer:=0;
  v_game_count integer; v_i integer;
  v_games constant text[] := array['brainmix','flagdash','orderup','maphunt','topicrush','brainiword','worldflags','worldcapitals'];
begin
  for v_badge in select value from pg_catalog.jsonb_array_elements(v_contract) loop
    for v_tier in select value from pg_catalog.jsonb_array_elements(v_badge->'tiers') loop
      v_progress:='{"total_games":0,"best_streak":0,"full_daily_count":0,"xp":0}'::jsonb;
      v_bests:='[]'::jsonb; v_requirements:=v_tier->'requirements';
      for v_requirement in select key,value from pg_catalog.jsonb_each_text(v_requirements) loop
        case v_requirement.key
          when 'totalGames' then v_progress:=v_progress||pg_catalog.jsonb_build_object('total_games',v_requirement.value::integer);
          when 'bestStreak' then v_progress:=v_progress||pg_catalog.jsonb_build_object('best_streak',v_requirement.value::integer);
          when 'fullDailyCount' then v_progress:=v_progress||pg_catalog.jsonb_build_object('full_daily_count',v_requirement.value::integer);
          when 'personalBestGames' then
            for v_i in 1..v_requirement.value::integer loop
              v_bests:=v_bests||pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('game_id',v_games[v_i],
                'result_id','12345678-1234-4123-8123-'||pg_catalog.lpad(v_i::text,12,'0')));
            end loop;
        end case;
      end loop;
      v_meta:=pg_catalog.jsonb_build_object('brainilab_featured_achievements_v1',pg_catalog.jsonb_build_array(v_badge->>'id'));
      v_result:=pg_temp.achievement_avatar_fixture(v_meta,v_progress,v_bests);
      if v_result->'achievements' is distinct from pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('id',v_badge->>'id','tier',(v_tier->>'level')::integer)) then
        raise exception 'At-threshold tier mismatch for % tier %',v_badge->>'id',v_tier->>'level';
      end if;
      v_count:=v_count+1;
      -- Every positive requirement must independently block that same tier.
      for v_requirement in select key,value from pg_catalog.jsonb_each_text(v_requirements) where value::integer>0 loop
        case v_requirement.key
          when 'totalGames' then v_result:=pg_temp.achievement_avatar_fixture(v_meta,v_progress||pg_catalog.jsonb_build_object('total_games',v_requirement.value::integer-1),v_bests);
          when 'bestStreak' then v_result:=pg_temp.achievement_avatar_fixture(v_meta,v_progress||pg_catalog.jsonb_build_object('best_streak',v_requirement.value::integer-1),v_bests);
          when 'fullDailyCount' then v_result:=pg_temp.achievement_avatar_fixture(v_meta,v_progress||pg_catalog.jsonb_build_object('full_daily_count',v_requirement.value::integer-1),v_bests);
          when 'personalBestGames' then v_result:=pg_temp.achievement_avatar_fixture(v_meta,v_progress,v_bests-(v_requirement.value::integer-1));
        end case;
        if coalesce((v_result->'achievements'->0->>'tier')::integer,0)>=(v_tier->>'level')::integer then
          raise exception 'Below-threshold tier unlocked for % tier % requirement %',v_badge->>'id',v_tier->>'level',v_requirement.key;
        end if;
        v_count:=v_count+1;
      end loop;
    end loop;
  end loop;
  v_progress:='{"total_games":4000,"best_streak":350,"full_daily_count":840,"xp":0}'::jsonb;
  v_meta:='{"brainilab_featured_achievements_v1":["first_game","daily_first","streak_three"]}'::jsonb;
  v_result:=pg_temp.achievement_avatar_fixture(v_meta,v_progress,'[]');
  if pg_catalog.jsonb_array_length(v_result->'achievements')<>3 or v_result->'design'<>'null'::jsonb then raise exception 'Badge-only profile failed'; end if;
  if exists(select 1 from pg_catalog.jsonb_each(v_result) where key not in ('design','frame','render_xp','title','achievements')) then raise exception 'Private output field'; end if;
  if exists(select 1 from pg_catalog.jsonb_array_elements(v_result->'achievements') a(value),pg_catalog.jsonb_object_keys(a.value) k(key) where k.key not in ('id','tier')) then raise exception 'Private badge output field'; end if;
  v_result:=pg_temp.achievement_avatar_fixture('{"brainilab_featured_achievements_v1":["first_game","first_game","unknown"]}',v_progress,'[]');
  if v_result->'achievements'<>'[{"id":"first_game","tier":10}]'::jsonb then raise exception 'Duplicate/unknown selection not filtered'; end if;
  v_result:=pg_temp.achievement_avatar_fixture('{"brainilab_featured_achievements_v1":[{"id":"first_game","tier":10},true,7]}',v_progress,'[]');
  if v_result is not null then raise exception 'Raw claimed badge objects should not unlock'; end if;
  foreach v_meta in array array[
    '{"brainilab_avatar_mode_v1":"built","brainilab_featured_achievements_v1":["first_game","daily_first","streak_three","ten_games"]}'::jsonb,
    '{"brainilab_avatar_mode_v1":"built","brainilab_featured_achievements_v1":"first_game"}'::jsonb,
    '{"brainilab_avatar_mode_v1":"built","brainilab_featured_achievements_v1":null}'::jsonb
  ] loop
    v_result:=pg_temp.achievement_avatar_fixture(v_meta,v_progress,'[]');
    if v_result->'design'->>'mode'<>'built' or v_result->'achievements'<>'[]'::jsonb then raise exception 'Malformed badges changed appearance'; end if;
  end loop;
  v_meta:='{"brainilab_featured_achievements_v1":["first_game"]}'::jsonb;
  if pg_temp.achievement_avatar_fixture(v_meta,v_progress,'[]',false) is not null then raise exception 'Anonymous badge claim'; end if;
  if pg_temp.achievement_avatar_fixture(v_meta,'{}','[]') is not null then raise exception 'Missing canonical progress should not unlock'; end if;
  if pg_temp.achievement_avatar_fixture(v_meta,v_progress,'[]',true,false) is not null then raise exception 'Missing owner should not render'; end if;
  v_meta:='{"brainilab_featured_achievements_v1":["personal_bests_three"]}'::jsonb;
  v_bests:='[{"game_id":"brainmix","result_id":"12345678-1234-4123-8123-000000000001"},{"game_id":"brainiword","result_id":"12345678-1234-4123-8123-000000000001"},{"game_id":"numberroute","result_id":"00000000-0000-0000-0000-000000000000"},{"game_id":"unlisted","result_id":"12345678-1234-4123-8123-000000000003"}]'::jsonb;
  if pg_temp.achievement_avatar_fixture(v_meta,v_progress,v_bests) is not null then raise exception 'Invalid/duplicate PBs counted'; end if;
  if v_count<>169 then raise exception 'Unexpected boundary assertion count: %',v_count; end if;
  raise notice 'PASS 169 tier/AND-boundary assertions plus private output, malformed selections, anonymous/missing evidence and PB validation';
end $tests$;
select pg_catalog.jsonb_build_object('status','PASS','tierBoundaryAssertions',169,
  'fixture','pg_temp only','realPlayerWrites',0,'permanentFunctionChanges',0) as achievement_tier_test;
rollback;
