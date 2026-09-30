DO $$ BEGIN
IF (SELECT md5(btrim(replace(pg_get_functiondef(p.oid),chr(13),''),E' \n\t')) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='brainilab_daily_game_ids') IS DISTINCT FROM '42b292624d8ac5ff0e307dc5686bd575' THEN RAISE EXCEPTION 'Concurrent change: brainilab_daily_game_ids'; END IF;
IF (SELECT md5(btrim(replace(pg_get_functiondef(p.oid),chr(13),''),E' \n\t')) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_brainilab_daily_lineup') IS DISTINCT FROM '6d09d3fa45a95d1e77f5ec61cb58729d' THEN RAISE EXCEPTION 'Concurrent change: get_brainilab_daily_lineup'; END IF;
IF (SELECT md5(btrim(replace(pg_get_functiondef(p.oid),chr(13),''),E' \n\t')) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='submit_brainilab_game_result') IS DISTINCT FROM 'a7e310727f065a8ba85fcd0da62fdb3e' THEN RAISE EXCEPTION 'Concurrent change: submit_brainilab_game_result'; END IF;
IF (SELECT md5(btrim(replace(pg_get_functiondef(p.oid),chr(13),''),E' \n\t')) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='refresh_brainilab_player_progression') IS DISTINCT FROM '03a919b6827dc15f90b348c10a2f4e31' THEN RAISE EXCEPTION 'Concurrent change: refresh_brainilab_player_progression'; END IF;
IF (SELECT md5(btrim(replace(pg_get_functiondef(p.oid),chr(13),''),E' \n\t')) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_my_brainilab_progression') IS DISTINCT FROM '9472b3da66a6e29d96fb24bcafe22d36' THEN RAISE EXCEPTION 'Concurrent change: get_my_brainilab_progression'; END IF;
IF (SELECT md5(btrim(replace(pg_get_functiondef(p.oid),chr(13),''),E' \n\t')) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='admin_get_daily_health') IS DISTINCT FROM 'b5a8f145b20165b4a20d8deaf47cb6a9' THEN RAISE EXCEPTION 'Concurrent change: admin_get_daily_health'; END IF;
IF (SELECT md5(btrim(replace(pg_get_functiondef(p.oid),chr(13),''),E' \n\t')) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='ensure_brainilab_rotating_daily_content') IS DISTINCT FROM '714579fd01bbb094cf3ebdaff23c1b89' THEN RAISE EXCEPTION 'Concurrent change: ensure_brainilab_rotating_daily_content'; END IF;
IF (SELECT md5(btrim(replace(pg_get_functiondef(p.oid),chr(13),''),E' \n\t')) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='claim_brainilab_guest_results') IS DISTINCT FROM '9a94b618288a6e472ac9783f202b55e1' THEN RAISE EXCEPTION 'Concurrent change: claim_brainilab_guest_results'; END IF;
IF (SELECT md5(btrim(replace(pg_get_functiondef(p.oid),chr(13),''),E' \n\t')) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='verify_brainilab_daily_result') IS DISTINCT FROM 'a9844b3b3a82d3f8e0fde980bf36a6fc' THEN RAISE EXCEPTION 'Concurrent change: verify_brainilab_daily_result'; END IF;
IF (SELECT md5(btrim(replace(pg_get_functiondef(p.oid),chr(13),''),E' \n\t')) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='verify_brainilab_order_up_result') IS DISTINCT FROM 'e2d8a4978da962f2c7ba0304ac1a30f7' THEN RAISE EXCEPTION 'Concurrent change: verify_brainilab_order_up_result'; END IF;
IF (SELECT md5(btrim(replace(pg_get_functiondef(p.oid),chr(13),''),E' \n\t')) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='verify_brainilab_topic_rush_result') IS DISTINCT FROM 'f03d0fb7d20c5d04b7567d561338ad81' THEN RAISE EXCEPTION 'Concurrent change: verify_brainilab_topic_rush_result'; END IF;
IF (SELECT md5(btrim(replace(pg_get_functiondef(p.oid),chr(13),''),E' \n\t')) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='check_brainilab_brainiword_guess') IS DISTINCT FROM '5361a4b0f66a7d3a2e5717919524de59' THEN RAISE EXCEPTION 'Concurrent change: check_brainilab_brainiword_guess'; END IF;
IF (SELECT md5(btrim(replace(pg_get_functiondef(p.oid),chr(13),''),E' \n\t')) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='verify_brainilab_brainiword_result') IS DISTINCT FROM 'd8f204f5f2927db99adf41a75eedf930' THEN RAISE EXCEPTION 'Concurrent change: verify_brainilab_brainiword_result'; END IF;
END $$;
-- One main Daily plus one chosen optional extra. No historical rebuild.
-- Daily rule configuration: {"version":"daily-choice-v1","startsOn":"2026-10-01","primaryMax":2500,"bonusMax":1000,"completionXP":250,"rotation":["brainmix","connections","mathrush","brainiword","numberroute","orderup","oddoneout","topicrush","sequence","higherlower"]}
CREATE OR REPLACE FUNCTION public.brainilab_daily_choice_starts() RETURNS date LANGUAGE sql IMMUTABLE SET search_path='' AS $$ SELECT DATE '2026-10-01' $$;
REVOKE ALL ON FUNCTION public.brainilab_daily_choice_starts() FROM public,anon,authenticated;
CREATE TABLE public.brainilab_daily_choices (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 challenge_date date NOT NULL,
 game_id text NOT NULL,
 selected_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,challenge_date),
 CONSTRAINT daily_choice_game CHECK(game_id IN ('brainmix','connections','mathrush','brainiword','numberroute','orderup','oddoneout','topicrush','sequence','higherlower')),
 CONSTRAINT daily_choice_date CHECK(challenge_date>=DATE '2026-10-01')
);
ALTER TABLE public.brainilab_daily_choices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.brainilab_daily_choices FROM public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.brainilab_daily_game_ids(p_date date)
 RETURNS text[]
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
declare v_number integer; v_index integer; v_pair text[];
begin
  if p_date>=public.brainilab_daily_choice_starts() then
    v_number:=p_date-public.brainilab_daily_choice_starts(); v_index:=mod(v_number,10);
    v_pair:=array['brainmix','connections','mathrush','brainiword','numberroute','orderup','oddoneout','topicrush','sequence','higherlower'];
    return array[v_pair[v_index+1],v_pair[mod(v_index+3+mod(v_number/10,3),10)+1],v_pair[mod(v_index+7+mod(v_number/10,2),10)+1]];
  end if;
  if p_date<date '2026-08-31' then return array['brainmix','orderup','topicrush','brainiword']::text[]; end if;
  v_number:=public.brainilab_daily_number_for_date(p_date);
  v_index:=mod(v_number-3,28);
  if v_index<0 then v_index:=v_index+28; end if;
  v_pair:=case v_index
    when 0 then array['orderup','sequence']::text[]
    when 1 then array['topicrush','numberroute']::text[]
    when 2 then array['connections','mathrush']::text[]
    when 3 then array['oddoneout','higherlower']::text[]
    when 4 then array['orderup','numberroute']::text[]
    when 5 then array['sequence','mathrush']::text[]
    when 6 then array['topicrush','higherlower']::text[]
    when 7 then array['connections','oddoneout']::text[]
    when 8 then array['orderup','mathrush']::text[]
    when 9 then array['numberroute','higherlower']::text[]
    when 10 then array['sequence','oddoneout']::text[]
    when 11 then array['topicrush','connections']::text[]
    when 12 then array['orderup','higherlower']::text[]
    when 13 then array['mathrush','oddoneout']::text[]
    when 14 then array['numberroute','connections']::text[]
    when 15 then array['sequence','topicrush']::text[]
    when 16 then array['orderup','oddoneout']::text[]
    when 17 then array['higherlower','connections']::text[]
    when 18 then array['mathrush','topicrush']::text[]
    when 19 then array['numberroute','sequence']::text[]
    when 20 then array['orderup','connections']::text[]
    when 21 then array['oddoneout','topicrush']::text[]
    when 22 then array['higherlower','sequence']::text[]
    when 23 then array['mathrush','numberroute']::text[]
    when 24 then array['orderup','topicrush']::text[]
    when 25 then array['connections','sequence']::text[]
    when 26 then array['oddoneout','numberroute']::text[]
    when 27 then array['higherlower','mathrush']::text[]
    else array['orderup','sequence']::text[]
  end;
  return array['brainmix',v_pair[1],v_pair[2],'brainiword']::text[];
end;$function$;

CREATE OR REPLACE FUNCTION public.brainilab_daily_point_limit(p_game text,p_date date) RETURNS integer LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT CASE WHEN p_date<public.brainilab_daily_choice_starts() THEN 2500 WHEN p_game=(public.brainilab_daily_game_ids(p_date))[1] THEN 2500 WHEN p_game=ANY(public.brainilab_daily_game_ids(p_date)) THEN 1000 ELSE 0 END
$$;
REVOKE ALL ON FUNCTION public.brainilab_daily_point_limit(text,date) FROM public,anon,authenticated;
CREATE OR REPLACE FUNCTION public.brainilab_weighted_daily_points(p_game text,p_score integer,p_correct integer,p_payload jsonb,p_date date) RETURNS integer LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT round(public.brainilab_daily_game_points(p_game,p_score,p_correct,p_payload)::numeric*public.brainilab_daily_point_limit(p_game,p_date)/2500)::integer
$$;
REVOKE ALL ON FUNCTION public.brainilab_weighted_daily_points(text,integer,integer,jsonb,date) FROM public,anon,authenticated;
CREATE OR REPLACE FUNCTION public.choose_brainilab_daily_extra(p_game_id text,p_challenge_date date DEFAULT ((now() at time zone 'UTC')::date)) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_uid uuid:=auth.uid(); v_games text[];v_choice text;v_today date:=(now() at time zone 'UTC')::date;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 IF p_challenge_date IS NULL OR p_challenge_date<>v_today OR v_today<public.brainilab_daily_choice_starts() THEN RAISE EXCEPTION 'Choose an extra for today'; END IF;
 v_games:=public.brainilab_daily_game_ids(v_today);
 IF p_game_id IS NULL OR NOT(p_game_id=ANY(v_games[2:3])) THEN RAISE EXCEPTION 'Not one of today''s extras';END IF;
 -- Same player lock as guest claiming. Primary must have a server-verified completion.
 PERFORM pg_advisory_xact_lock(hashtextextended('brainilab-player:'||v_uid::text,0));
 IF NOT EXISTS(SELECT 1 FROM public.game_sessions s JOIN public.game_results r ON r.session_id=s.id WHERE s.user_id=v_uid AND s.game_id=v_games[1] AND s.daily_number=public.brainilab_daily_number_for_date(v_today) AND (s.completed_at at time zone 'UTC')::date=v_today AND s.status='completed' AND r.answers_verified AND coalesce(r.result_payload->>'practice','false')<>'true') THEN
  RAISE EXCEPTION 'Complete the main Daily first';
 END IF;
 INSERT INTO public.brainilab_daily_choices(user_id,challenge_date,game_id) VALUES(v_uid,v_today,p_game_id) ON CONFLICT(user_id,challenge_date) DO NOTHING;
 SELECT game_id INTO v_choice FROM public.brainilab_daily_choices WHERE user_id=v_uid AND challenge_date=v_today;
 IF v_choice<>p_game_id THEN RAISE EXCEPTION 'Your extra is already chosen'; END IF;
 RETURN jsonb_build_object('game_id',v_choice,'challenge_date',v_today,'max_points',1000);
END $$;
REVOKE ALL ON FUNCTION public.choose_brainilab_daily_extra(text,date) FROM public,anon;
GRANT EXECUTE ON FUNCTION public.choose_brainilab_daily_extra(text,date) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_brainilab_daily_lineup(p_challenge_date date DEFAULT CURRENT_DATE)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object(
    'challenge_date',p_challenge_date,
    'daily_number',public.brainilab_daily_number_for_date(p_challenge_date),
    'games',to_jsonb(public.brainilab_daily_game_ids(p_challenge_date)),
    'rules_version',case when p_challenge_date>=public.brainilab_daily_choice_starts() then 'daily-choice-v1' else 'legacy' end,
    'primary_game',(public.brainilab_daily_game_ids(p_challenge_date))[1],
    'bonus_choice',(select game_id from public.brainilab_daily_choices where user_id=auth.uid() and challenge_date=p_challenge_date),
    'primary_max',2500,'extra_max',case when p_challenge_date>=public.brainilab_daily_choice_starts() then 1000 else 2500 end,
    'max_score',case when p_challenge_date>=public.brainilab_daily_choice_starts() then 3500 else 10000 end
  );
$function$;

CREATE OR REPLACE FUNCTION public.submit_brainilab_game_result(p_client_result_id text, p_game_id text, p_played_at timestamp with time zone, p_score integer DEFAULT NULL::integer, p_correct_answers integer DEFAULT NULL::integer, p_total_questions integer DEFAULT NULL::integer, p_accuracy numeric DEFAULT NULL::numeric, p_duration_ms integer DEFAULT NULL::integer, p_client_percentile integer DEFAULT NULL::integer, p_daily_number integer DEFAULT NULL::integer, p_difficulty text DEFAULT NULL::text, p_set_number integer DEFAULT NULL::integer, p_result_payload jsonb DEFAULT '{}'::jsonb, p_answer_correctness jsonb DEFAULT '[]'::jsonb)
 RETURNS TABLE(session_id uuid, result_id uuid, already_existed boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
v_user_id uuid;
v_session_id uuid;
v_result_id uuid;
v_started_at timestamptz;
v_item jsonb;
v_position integer:=0;
v_payload jsonb;
begin
v_user_id:=auth.uid();

if v_user_id is null then
raise exception 'Authentication required';
end if;

if p_client_result_id is null
or char_length(btrim(p_client_result_id))<8
or char_length(p_client_result_id)>100 then
raise exception 'Invalid client result ID';
end if;

if p_game_id is null
or char_length(btrim(p_game_id))<2
or char_length(p_game_id)>60 then
raise exception 'Invalid game ID';
end if;

if p_difficulty is not null
and p_difficulty not in ('easy','medium','hard') then
raise exception 'Invalid difficulty';
end if;

if p_set_number is not null and p_set_number<=0 then
raise exception 'Invalid set number';
end if;

if p_accuracy is not null and (p_accuracy<0 or p_accuracy>100) then
raise exception 'Invalid accuracy';
end if;

if p_correct_answers is not null and p_correct_answers<0 then
raise exception 'Invalid correct answer count';
end if;

if p_total_questions is not null and p_total_questions<0 then
raise exception 'Invalid total question count';
end if;

if p_correct_answers is not null
and p_total_questions is not null
and p_correct_answers>p_total_questions then
raise exception 'Correct answers cannot exceed total questions';
end if;

if p_score is not null and p_score<0 then
raise exception 'Invalid score';
end if;

if p_duration_ms is not null and p_duration_ms<0 then
raise exception 'Invalid duration';
end if;

if p_client_percentile is not null
and (p_client_percentile<0 or p_client_percentile>100) then
raise exception 'Invalid percentile';
end if;

v_payload:=coalesce(p_result_payload,'{}'::jsonb);
  if lower(btrim(p_game_id)) not in ('brainmix','brainiword','orderup','topicrush','connections','oddoneout','higherlower','mathrush','numberroute','sequence','survival','worldflags','worldcapitals','generalknowledge','science','history','sports') then
    raise exception 'Unknown or retired game';
  end if;
  p_game_id:=lower(btrim(p_game_id));
  p_daily_number:=nullif(p_daily_number,0);
  if p_daily_number is not null and p_daily_number<1 then raise exception 'Invalid Daily number'; end if;
  if coalesce(v_payload->>'practice','false')='true' or coalesce(v_payload->>'tryFirst','false')='true' then raise exception 'Practice games do not award points'; end if;
  if coalesce(p_total_questions,0)>1000 or coalesce(p_score,0)>100000 or coalesce(p_duration_ms,0)>86400000 then raise exception 'Result exceeds game limits'; end if;
  -- Rankings and reward caps use the server receipt date, never a client-selected date.
  p_played_at:=now();
  perform pg_advisory_xact_lock(hashtextextended('submit:'||v_user_id::text||':'||p_client_result_id,0));


if octet_length(v_payload::text)>20000 then
raise exception 'Result payload too large';
end if;

-- Browser retry idempotency.
select gs.id,gr.id
into v_session_id,v_result_id
from public.game_sessions gs
left join public.game_results gr on gr.session_id=gs.id
where gs.user_id=v_user_id
and gs.client_result_id=p_client_result_id
limit 1;

if v_session_id is not null then
return query select v_session_id,v_result_id,true;
return;
end if;

-- New Daily contract: enforce server date, eligibility and the same extra on every device.
if p_daily_number is not null and (now() at time zone 'UTC')::date>=public.brainilab_daily_choice_starts() then
 if p_daily_number<>public.brainilab_daily_number_for_date((now() at time zone 'UTC')::date) then raise exception 'Past Daily games are practice only';end if;
 if not(p_game_id=any(public.brainilab_daily_game_ids((now() at time zone 'UTC')::date))) then raise exception 'This game is not in today''s Daily';end if;
 perform pg_advisory_xact_lock(hashtextextended('brainilab-player:'||v_user_id::text,0));
 if p_game_id<>(public.brainilab_daily_game_ids((now() at time zone 'UTC')::date))[1] then
  perform public.choose_brainilab_daily_extra(p_game_id,(now() at time zone 'UTC')::date);
 end if;
end if;
-- Daily result lock. The advisory lock closes the tiny race window where
-- two tabs could otherwise submit the same Daily game simultaneously.
if p_daily_number is not null then
perform pg_advisory_xact_lock(
hashtextextended(
v_user_id::text||':'||lower(btrim(p_game_id))||':'||p_daily_number::text,
0
)
);

select gs.id,gr.id
into v_session_id,v_result_id
from public.game_sessions gs
left join public.game_results gr on gr.session_id=gs.id
where gs.user_id=v_user_id
and gs.game_id=btrim(p_game_id)
and gs.daily_number=p_daily_number
and gs.status='completed'
order by gs.completed_at desc nulls last
limit 1;

if v_session_id is not null then
return query select v_session_id,v_result_id,true;
return;
end if;
end if;

v_started_at:=
coalesce(p_played_at,now())
-make_interval(secs=>greatest(coalesce(p_duration_ms,0),0)/1000.0);

insert into public.game_sessions(
user_id,
client_result_id,
game_id,
source,
difficulty,
set_number,
daily_number,
status,
started_at,
completed_at
)
values(
v_user_id,
btrim(p_client_result_id),
btrim(p_game_id),
'web',
p_difficulty,
p_set_number,
p_daily_number,
'completed',
v_started_at,
coalesce(p_played_at,now())
)
returning id into v_session_id;

insert into public.game_results(
session_id,
user_id,
score,
correct_answers,
total_questions,
accuracy,
duration_ms,
client_percentile,
result_payload,
server_verified
)
values(
v_session_id,
v_user_id,
p_score,
p_correct_answers,
p_total_questions,
p_accuracy,
p_duration_ms,
p_client_percentile,
v_payload,
false
)
returning id into v_result_id;

if jsonb_typeof(coalesce(p_answer_correctness,'[]'::jsonb))='array' then
for v_item in
select value
from jsonb_array_elements(coalesce(p_answer_correctness,'[]'::jsonb))
loop
v_position:=v_position+1;
if v_position>100 then exit; end if;

insert into public.game_answers(
session_id,
user_id,
position,
is_correct
)
values(
v_session_id,
v_user_id,
v_position,
case
when jsonb_typeof(v_item)='boolean'
then (v_item#>>'{}')::boolean
else null
end
);
end loop;
end if;

return query select v_session_id,v_result_id,false;
end;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_brainilab_player_progression(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
v_today date := (now() at time zone 'UTC')::date;
v_current_streak integer := 0;
v_best_streak integer := 0;
v_run integer := 0;
v_previous_date date := null;
v_last_streak_date date := null;

v_total_games integer := 0;
v_total_questions bigint := 0;
v_full_daily_count integer := 0;
v_xp bigint := 0;
v_level integer := 1;
v_favorite_game text := null;
v_last_active_at timestamptz := null;

v_day record;
v_topicrush_launch_date date;
v_orderup_launch_date date;
begin
if p_user_id is null then
return;
end if;

perform pg_advisory_xact_lock(hashtextextended('progression:'||p_user_id::text,0));
insert into public.player_progression(user_id)
values(p_user_id)
on conflict(user_id) do nothing;

select trs.launch_date
into v_topicrush_launch_date
from public.topic_rush_settings trs
where trs.singleton=true;

v_topicrush_launch_date:=coalesce(v_topicrush_launch_date,current_date);

select ous.launch_date
into v_orderup_launch_date
from public.order_up_settings ous
where ous.singleton=true;

v_orderup_launch_date:=coalesce(v_orderup_launch_date,current_date);

-- ----------------------------------------------------------
-- Rebuild daily stats for this user.
-- ----------------------------------------------------------

delete from public.player_daily_stats
where user_id = p_user_id;

insert into public.player_daily_stats(
user_id,
stat_date,
games_played,
questions_answered,
daily_games_completed,
full_daily,
brainmix_points,
flagdash_points,
orderup_points,
maphunt_points,
topicrush_points,
brainiword_points,
connections_points,
oddoneout_points,
higherlower_points,
mathrush_points,
numberroute_points,
sequence_points,
daily_brain_score,
xp_earned,
updated_at
)
with base as (
select
gs.user_id,
(gs.completed_at at time zone 'UTC')::date as stat_date,
gs.game_id,
gs.daily_number,
gr.id as result_id,
gr.created_at < public.brainilab_rewards_started_at() as legacy_reward,
count(*) filter(where gr.created_at >= public.brainilab_rewards_started_at()) over(partition by gs.game_id,(gs.completed_at at time zone 'UTC')::date order by gr.created_at,gr.id) as reward_attempt,
coalesce(gr.score,0) as score,
coalesce(gr.verified_correct_answers,gr.correct_answers,0) as correct_answers,
coalesce(gr.verified_total_questions,gr.total_questions,0) as total_questions,
gr.result_payload,
coalesce(gr.answers_verified,false) as answers_verified,
public.brainilab_weighted_daily_points(
gs.game_id,
gr.score,
coalesce(gr.verified_correct_answers,gr.correct_answers),
gr.result_payload,(gs.completed_at at time zone 'UTC')::date
) as daily_points
from public.game_sessions gs
join public.game_results gr on gr.session_id=gs.id
where gs.user_id=p_user_id
and gs.status='completed' and (gr.created_at < public.brainilab_rewards_started_at() or (gr.answers_verified=true and coalesce(gr.result_payload->>'practice','false')<>'true' and coalesce(gr.result_payload->>'tryFirst','false')<>'true'))
),
marked as (
select b.*,
(
b.daily_number is not null
and b.daily_number=public.brainilab_daily_number_for_date(b.stat_date)
and b.game_id=any(public.brainilab_daily_game_ids(b.stat_date))
and (b.stat_date<public.brainilab_daily_choice_starts() or b.game_id=(public.brainilab_daily_game_ids(b.stat_date))[1] or exists(select 1 from public.brainilab_daily_choices c where c.user_id=b.user_id and c.challenge_date=b.stat_date and c.game_id=b.game_id))
and (
b.game_id not in ('connections','oddoneout','higherlower','mathrush','numberroute','sequence')
or b.answers_verified=true
)
) as valid_daily
from base b
),
daily as (
select
user_id,
stat_date,
count(*)::integer as games_played,
coalesce(sum(total_questions),0)::integer as questions_answered,
count(distinct game_id) filter(where valid_daily)::integer as daily_games_completed,
bool_or(valid_daily and game_id=(public.brainilab_daily_game_ids(stat_date))[1]) as primary_completed,
coalesce(max(daily_points) filter(where valid_daily and game_id='brainmix'),0)::integer as brainmix_points,
coalesce(max(daily_points) filter(where valid_daily and game_id='flagdash'),0)::integer as flagdash_points,
coalesce(max(daily_points) filter(where valid_daily and game_id='orderup'),0)::integer as orderup_points,
coalesce(max(daily_points) filter(where valid_daily and game_id='maphunt'),0)::integer as maphunt_points,
coalesce(max(daily_points) filter(where valid_daily and game_id='topicrush'),0)::integer as topicrush_points,
coalesce(max(daily_points) filter(where valid_daily and game_id='brainiword'),0)::integer as brainiword_points,
coalesce(max(daily_points) filter(where valid_daily and game_id='connections'),0)::integer as connections_points,
coalesce(max(daily_points) filter(where valid_daily and game_id='oddoneout'),0)::integer as oddoneout_points,
coalesce(max(daily_points) filter(where valid_daily and game_id='higherlower'),0)::integer as higherlower_points,
coalesce(max(daily_points) filter(where valid_daily and game_id='mathrush'),0)::integer as mathrush_points,
coalesce(max(daily_points) filter(where valid_daily and game_id='numberroute'),0)::integer as numberroute_points,
coalesce(max(daily_points) filter(where valid_daily and game_id='sequence'),0)::integer as sequence_points,
coalesce(sum(case when legacy_reward or reward_attempt<=3 then 50+least(correct_answers,50)*5 else 0 end),0)::integer as base_xp
from marked
group by user_id,stat_date
)
select
user_id,
stat_date,
games_played,
questions_answered,
least(case when stat_date>=public.brainilab_daily_choice_starts() then 2 else 4 end,daily_games_completed),
case when stat_date>=public.brainilab_daily_choice_starts() then primary_completed else daily_games_completed>=4 end,
brainmix_points,
flagdash_points,
orderup_points,
maphunt_points,
topicrush_points,
brainiword_points,
connections_points,
oddoneout_points,
higherlower_points,
mathrush_points,
numberroute_points,
sequence_points,
least(case when stat_date>=public.brainilab_daily_choice_starts() then 3500 else 10000 end,
brainmix_points+flagdash_points+orderup_points+maphunt_points+topicrush_points+brainiword_points+
connections_points+oddoneout_points+higherlower_points+mathrush_points+numberroute_points+sequence_points
),
base_xp+case when (stat_date>=public.brainilab_daily_choice_starts() and primary_completed) or (stat_date<public.brainilab_daily_choice_starts() and daily_games_completed>=4) then 250 else 0 end,
now()
from daily;


-- ----------------------------------------------------------
-- Rebuild generic week/month aggregates.
-- ----------------------------------------------------------

delete from public.player_period_stats
where user_id = p_user_id;

insert into public.player_period_stats(
user_id,
period_type,
period_start,
games_played,
questions_answered,
daily_brain_score,
full_daily_count,
active_days,
xp_earned,
updated_at
)
select
p_user_id,
periods.period_type,
periods.period_start,
sum(ds.games_played)::integer,
sum(ds.questions_answered)::bigint,
sum(ds.daily_brain_score)::integer,
count(*) filter(where ds.full_daily)::integer,
count(*) filter(where ds.daily_games_completed > 0)::integer,
sum(ds.xp_earned)::bigint,
now()
from public.player_daily_stats ds
cross join lateral (
values
(
'week'::text,
date_trunc('week',ds.stat_date::timestamp)::date
),
(
'month'::text,
date_trunc('month',ds.stat_date::timestamp)::date
)
) as periods(period_type,period_start)
where ds.user_id = p_user_id
group by periods.period_type,periods.period_start;


-- ----------------------------------------------------------
-- Rebuild per-game day/week/month aggregates.
-- ----------------------------------------------------------

delete from public.player_game_period_stats
where user_id = p_user_id;

insert into public.player_game_period_stats(
user_id,
game_id,
period_type,
period_start,
games_played,
total_score,
best_score,
total_correct,
total_questions,
average_accuracy,
best_daily_points,
metric_name,
best_metric_value,
updated_at
)
with base as (
select
gs.user_id,
gs.game_id,
(gs.completed_at at time zone 'UTC')::date as stat_date,
gr.score,
coalesce(
gr.verified_correct_answers,
gr.correct_answers,
0
) as correct_answers,
coalesce(
gr.verified_total_questions,
gr.total_questions,
0
) as total_questions,
gr.accuracy,
gr.result_payload,

public.brainilab_daily_game_points(
gs.game_id,
gr.score,
coalesce(
gr.verified_correct_answers,
gr.correct_answers
),
gr.result_payload
) as daily_points,

case
when gs.game_id='brainiword'
and lower(coalesce(gr.result_payload ->> 'won','false'))='true'
then nullif(gr.result_payload ->> 'attempts','')::numeric
when gs.game_id='flagdash'
then coalesce(
gr.verified_correct_answers,
gr.correct_answers
)::numeric
else gr.score::numeric
end as metric_value
from public.game_sessions gs
join public.game_results gr
on gr.session_id=gs.id
where gs.user_id=p_user_id
and gs.status='completed' and (gr.created_at < public.brainilab_rewards_started_at() or (gr.answers_verified=true and coalesce(gr.result_payload->>'practice','false')<>'true' and coalesce(gr.result_payload->>'tryFirst','false')<>'true'))
),
expanded as (
select
b.*,
periods.period_type,
periods.period_start
from base b
cross join lateral (
values
('day'::text,b.stat_date),
(
'week'::text,
date_trunc('week',b.stat_date::timestamp)::date
),
(
'month'::text,
date_trunc('month',b.stat_date::timestamp)::date
)
) as periods(period_type,period_start)
)
select
p_user_id,
game_id,
period_type,
period_start,

count(*)::integer,
coalesce(sum(score),0)::bigint,
max(score),
coalesce(sum(correct_answers),0)::integer,
coalesce(sum(total_questions),0)::integer,
round(avg(accuracy)::numeric,2),
coalesce(max(daily_points),0)::integer,

case
when game_id='brainiword' then 'attempts'
when game_id='flagdash' then 'correct'
else 'score'
end,

case
when game_id='brainiword' then min(metric_value)
else max(metric_value)
end,

now()
from expanded
group by
game_id,
period_type,
period_start;


-- ----------------------------------------------------------
-- Rebuild personal bests.
-- ----------------------------------------------------------

delete from public.player_personal_bests
where user_id = p_user_id;

insert into public.player_personal_bests(
user_id,
game_id,
result_id,
metric_name,
metric_value,
score,
correct_answers,
total_questions,
accuracy,
duration_ms,
result_payload,
achieved_at,
updated_at
)
with ranked as (
select
gs.game_id,
gr.id as result_id,
gr.score,
coalesce(
gr.verified_correct_answers,
gr.correct_answers
) as correct_answers,
coalesce(
gr.verified_total_questions,
gr.total_questions
) as total_questions,
gr.accuracy,
gr.duration_ms,
gr.result_payload,
gs.completed_at,

case
when gs.game_id='brainiword'
then 'attempts'
when gs.game_id='flagdash'
then 'correct'
else 'score'
end as metric_name,

case
when gs.game_id='brainiword'
and lower(coalesce(gr.result_payload ->> 'won','false'))='true'
then nullif(gr.result_payload ->> 'attempts','')::numeric
when gs.game_id='flagdash'
then coalesce(
gr.verified_correct_answers,
gr.correct_answers
)::numeric
else gr.score::numeric
end as metric_value,

row_number() over(
partition by gs.game_id
order by
case
when gs.game_id='brainiword'
then case
when lower(coalesce(gr.result_payload ->> 'won','false'))='true'
then 0
else 1
end
else 0
end asc,

case
when gs.game_id='brainiword'
and lower(coalesce(gr.result_payload ->> 'won','false'))='true'
then nullif(gr.result_payload ->> 'attempts','')::numeric
else null
end asc nulls last,

case
when gs.game_id='flagdash'
then coalesce(
gr.verified_correct_answers,
gr.correct_answers
)::numeric
when gs.game_id<>'brainiword'
then gr.score::numeric
else null
end desc nulls last,

gr.accuracy desc nulls last,
gr.duration_ms asc nulls last,
gs.completed_at asc
) as rn
from public.game_sessions gs
join public.game_results gr
on gr.session_id=gs.id
where gs.user_id=p_user_id
and gs.status='completed' and (gr.created_at < public.brainilab_rewards_started_at() or (gr.answers_verified=true and coalesce(gr.result_payload->>'practice','false')<>'true' and coalesce(gr.result_payload->>'tryFirst','false')<>'true'))
)
select
p_user_id,
game_id,
result_id,
metric_name,
coalesce(metric_value,0),
score,
correct_answers,
total_questions,
accuracy,
duration_ms,
result_payload,
completed_at,
now()
from ranked
where rn=1
and metric_value is not null;


-- ----------------------------------------------------------
-- Progression totals.
-- ----------------------------------------------------------

select
count(*)::integer,
coalesce(sum(
coalesce(
gr.verified_total_questions,
gr.total_questions,
0
)
),0)::bigint,
max(gs.completed_at)
into
v_total_games,
v_total_questions,
v_last_active_at
from public.game_sessions gs
join public.game_results gr
on gr.session_id=gs.id
where gs.user_id=p_user_id
and gs.status='completed' and (gr.created_at < public.brainilab_rewards_started_at() or (gr.answers_verified=true and coalesce(gr.result_payload->>'practice','false')<>'true' and coalesce(gr.result_payload->>'tryFirst','false')<>'true'));

select count(*)::integer
into v_full_daily_count
from public.player_daily_stats
where user_id=p_user_id
and full_daily=true;

select coalesce(sum(xp_earned),0)::bigint
into v_xp
from public.player_daily_stats
where user_id=p_user_id;

v_level := greatest(
1,
floor(sqrt(v_xp::numeric / 20.0))::integer + 1
);

select gs.game_id
into v_favorite_game
from public.game_sessions gs join public.game_results gr on gr.session_id=gs.id
where gs.user_id=p_user_id
and gs.status='completed' and (gr.created_at < public.brainilab_rewards_started_at() or (gr.answers_verified=true and coalesce(gr.result_payload->>'practice','false')<>'true' and coalesce(gr.result_payload->>'tryFirst','false')<>'true'))
group by gs.game_id
order by count(*) desc,gs.game_id
limit 1;


-- ----------------------------------------------------------
-- Streaks: at least one Daily Game on a UTC date.
-- ----------------------------------------------------------

for v_day in
select stat_date
from public.player_daily_stats
where user_id=p_user_id
and daily_games_completed > 0
and (stat_date<public.brainilab_daily_choice_starts() or full_daily)
order by stat_date
loop
if v_previous_date is null
or v_day.stat_date = v_previous_date + 1 then
v_run := v_run + 1;
else
v_run := 1;
end if;

v_best_streak := greatest(v_best_streak,v_run);
v_previous_date := v_day.stat_date;
v_last_streak_date := v_day.stat_date;
end loop;

if v_last_streak_date is not null
and v_last_streak_date >= v_today - 1 then

v_current_streak := 0;
v_previous_date := null;

for v_day in
select stat_date
from public.player_daily_stats
where user_id=p_user_id
and daily_games_completed > 0
and (stat_date<public.brainilab_daily_choice_starts() or full_daily)
and stat_date <= v_last_streak_date
order by stat_date desc
loop
if v_previous_date is null
or v_day.stat_date = v_previous_date - 1 then
v_current_streak := v_current_streak + 1;
v_previous_date := v_day.stat_date;
else
exit;
end if;
end loop;
else
v_current_streak := 0;
end if;

update public.player_progression
set
current_streak=v_current_streak,
best_streak=v_best_streak,
full_daily_count=v_full_daily_count,
xp=v_xp,
level=v_level,
total_games=v_total_games,
total_questions=v_total_questions,
favorite_game_id=v_favorite_game,
last_streak_date=v_last_streak_date,
last_active_at=v_last_active_at,
updated_at=now()
where user_id=p_user_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_brainilab_progression()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
v_user_id uuid := auth.uid();
v_today date := (now() at time zone 'UTC')::date;
v_week date := date_trunc('week',(now() at time zone 'UTC'))::date;
v_month date := date_trunc('month',(now() at time zone 'UTC'))::date;

v_daily_number integer;
v_daily_games text[];
v_completed_daily_games text[] := array[]::text[];

v_progression jsonb;
v_today_stats jsonb;
v_week_stats jsonb;
v_month_stats jsonb;
v_personal_bests jsonb;
begin
if v_user_id is null then
raise exception 'Authentication required';
end if;

select dc.daily_number
into v_daily_number
from public.daily_challenges dc
where dc.challenge_date=v_today
order by dc.generation_version desc
limit 1;

v_daily_number:=coalesce(
v_daily_number,
public.brainilab_daily_number_for_date(v_today)
);
v_daily_games:=public.brainilab_daily_game_ids(v_today);

select coalesce(array_agg(distinct gs.game_id order by gs.game_id),array[]::text[])
into v_completed_daily_games
from public.game_sessions gs
join public.game_results gr
on gr.session_id=gs.id
where gs.user_id=v_user_id
and gs.status='completed' and (gr.created_at < public.brainilab_rewards_started_at() or (gr.answers_verified=true and coalesce(gr.result_payload->>'practice','false')<>'true' and coalesce(gr.result_payload->>'tryFirst','false')<>'true'))
and gs.daily_number=v_daily_number
and (gs.completed_at at time zone 'UTC')::date=v_today
and gs.game_id=any(v_daily_games)
and (v_today<public.brainilab_daily_choice_starts() or gs.game_id=v_daily_games[1] or exists(select 1 from public.brainilab_daily_choices c where c.user_id=v_user_id and c.challenge_date=v_today and c.game_id=gs.game_id))
and (
gs.game_id not in ('connections','oddoneout','higherlower','mathrush','numberroute','sequence')
or coalesce(gr.answers_verified,false)=true
);

select to_jsonb(pp) || jsonb_build_object('current_streak',case when pp.last_streak_date between (now() at time zone 'UTC')::date-1 and (now() at time zone 'UTC')::date then coalesce(pp.current_streak,0) else 0 end)
into v_progression
from public.player_progression pp
where pp.user_id=v_user_id;

select
coalesce(to_jsonb(ds),'{}'::jsonb)
|| jsonb_build_object(
'stat_date',v_today,
'daily_number',v_daily_number,
'daily_game_ids',to_jsonb(v_daily_games),
'bonus_choice',(select game_id from public.brainilab_daily_choices where user_id=v_user_id and challenge_date=v_today),
'daily_rules',public.get_brainilab_daily_lineup(v_today),
'completed_game_ids',to_jsonb(v_completed_daily_games),

'games_played',coalesce(ds.games_played,0),
'questions_answered',coalesce(ds.questions_answered,0),
'daily_games_completed',coalesce(ds.daily_games_completed,0),
'full_daily',coalesce(ds.full_daily,false),

'brainmix_points',coalesce(ds.brainmix_points,0),
'flagdash_points',coalesce(ds.flagdash_points,0),
'orderup_points',coalesce(ds.orderup_points,0),
'maphunt_points',coalesce(ds.maphunt_points,0),
'topicrush_points',coalesce(ds.topicrush_points,0),
'brainiword_points',coalesce(ds.brainiword_points,0),
'connections_points',coalesce(ds.connections_points,0),
'oddoneout_points',coalesce(ds.oddoneout_points,0),
'higherlower_points',coalesce(ds.higherlower_points,0),
'mathrush_points',coalesce(ds.mathrush_points,0),
'numberroute_points',coalesce(ds.numberroute_points,0),
'sequence_points',coalesce(ds.sequence_points,0),

'brainmix_played','brainmix'=any(v_completed_daily_games),
'flagdash_played','flagdash'=any(v_completed_daily_games),
'orderup_played','orderup'=any(v_completed_daily_games),
'maphunt_played','maphunt'=any(v_completed_daily_games),
'topicrush_played','topicrush'=any(v_completed_daily_games),
'brainiword_played','brainiword'=any(v_completed_daily_games),
'connections_played','connections'=any(v_completed_daily_games),
'oddoneout_played','oddoneout'=any(v_completed_daily_games),
'higherlower_played','higherlower'=any(v_completed_daily_games),
'mathrush_played','mathrush'=any(v_completed_daily_games),
'numberroute_played','numberroute'=any(v_completed_daily_games),
'sequence_played','sequence'=any(v_completed_daily_games),

'daily_brain_score',coalesce(ds.daily_brain_score,0),
'xp_earned',coalesce(ds.xp_earned,0)
)
into v_today_stats
from (select 1) seed
left join public.player_daily_stats ds
on ds.user_id=v_user_id
and ds.stat_date=v_today;

select coalesce(
to_jsonb(ps),
jsonb_build_object(
'period_type','week',
'period_start',v_week,
'games_played',0,
'questions_answered',0,
'daily_brain_score',0,
'full_daily_count',0,
'active_days',0,
'xp_earned',0
)
)
into v_week_stats
from (select 1) seed
left join public.player_period_stats ps
on ps.user_id=v_user_id
and ps.period_type='week'
and ps.period_start=v_week;

select coalesce(
to_jsonb(ps),
jsonb_build_object(
'period_type','month',
'period_start',v_month,
'games_played',0,
'questions_answered',0,
'daily_brain_score',0,
'full_daily_count',0,
'active_days',0,
'xp_earned',0
)
)
into v_month_stats
from (select 1) seed
left join public.player_period_stats ps
on ps.user_id=v_user_id
and ps.period_type='month'
and ps.period_start=v_month;

select coalesce(
jsonb_agg(
jsonb_build_object(
'game_id',pb.game_id,
'result_id',pb.result_id,
'metric_name',pb.metric_name,
'metric_value',pb.metric_value,
'score',pb.score,
'correct_answers',pb.correct_answers,
'total_questions',pb.total_questions,
'accuracy',pb.accuracy,
'duration_ms',pb.duration_ms,
'result_payload',pb.result_payload,
'achieved_at',pb.achieved_at
)
order by pb.game_id
),
'[]'::jsonb
)
into v_personal_bests
from public.player_personal_bests pb
where pb.user_id=v_user_id;

return jsonb_build_object(
'progression',coalesce(
v_progression,
jsonb_build_object(
'user_id',v_user_id,
'current_streak',0,
'best_streak',0,
'full_daily_count',0,
'xp',0,
'level',1,
'total_games',0,
'total_questions',0,
'favorite_game_id',null
)
),
'today',v_today_stats,
'week',v_week_stats,
'month',v_month_stats,
'personal_bests',v_personal_bests,
 'continuity',jsonb_build_object(
          'today',v_today,'reset_at',((v_today+1)::timestamp at time zone 'UTC'),
          'completed_today',case when v_today>=public.brainilab_daily_choice_starts() then v_daily_games[1]=any(v_completed_daily_games) else cardinality(v_completed_daily_games)>0 end,
          'days',coalesce((select jsonb_agg(jsonb_build_object('date',d.day::date,'completed',coalesce(ds.daily_games_completed,0)>0 and (d.day::date<public.brainilab_daily_choice_starts() or coalesce(ds.full_daily,false))) order by d.day)
            from generate_series(v_today-6,v_today,interval '1 day') d(day)
            left join public.player_daily_stats ds on ds.user_id=v_user_id and ds.stat_date=d.day::date),'[]'::jsonb)),
        'recent_rewards',coalesce((select jsonb_agg(jsonb_build_object('client_result_id',r.client_result_id,'verified',r.eligible,'xp',case when r.eligible and (r.legacy or r.reward_attempt<=3) then 50+least(r.correct,50)*5 else 0 end,'daily_limit_reached',r.eligible and not r.legacy and r.reward_attempt>3) order by r.created_at desc,r.id desc) from (
          select gs.client_result_id,gr.id,gr.created_at,gr.created_at<public.brainilab_rewards_started_at() as legacy,
            (gr.created_at<public.brainilab_rewards_started_at() or gr.answers_verified=true) as eligible,
            coalesce(gr.verified_correct_answers,gr.correct_answers,0) as correct,
            count(*) filter(where gr.created_at>=public.brainilab_rewards_started_at() and gr.answers_verified=true) over(partition by gs.game_id,(gs.completed_at at time zone 'UTC')::date order by gr.created_at,gr.id) as reward_attempt
          from public.game_sessions gs join public.game_results gr on gr.session_id=gs.id
          where gs.user_id=v_user_id and gs.status='completed' and coalesce(gr.result_payload->>'practice','false')<>'true' and coalesce(gr.result_payload->>'tryFirst','false')<>'true'
          order by gr.created_at desc,gr.id desc limit 10
        )r),'[]'::jsonb),
        'reward_rules',jsonb_build_object('per_game_daily_limit',3,'base_xp',50,'correct_xp',5,'full_daily_xp',250),
        'generated_at',now()
);
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_daily_health(p_date date DEFAULT CURRENT_DATE)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid;
  v_daily record;
  v_sessions integer:=0;
  v_brainmix integer:=0;
  v_flags integer:=0;
  v_map integer:=0;
  v_word integer:=0;
  v_easy integer:=0;
  v_medium integer:=0;
  v_hard integer:=0;
  v_game_health jsonb;
begin
  v_uid:=public.require_brainilab_admin(
    array['owner','editor']::text[]
  );

  select *
    into v_daily
  from public.daily_challenges
  where challenge_date=p_date;

  if v_daily.id is null then
    return jsonb_build_object(
      'date',p_date,
      'exists',false,
      'healthy',false,
      'issues',jsonb_build_array('Daily challenge does not exist')
    );
  end if;

  select count(*)::integer into v_sessions
  from public.game_sessions gs
  where gs.daily_challenge_id=v_daily.id
    and gs.status='completed';

  select count(*)::integer into v_brainmix
  from public.daily_challenge_questions
  where daily_challenge_id=v_daily.id;

  select count(*)::integer into v_flags
  from public.daily_flag_dash_questions
  where daily_challenge_id=v_daily.id;

  select count(*)::integer into v_map
  from public.daily_map_hunt_questions
  where daily_challenge_id=v_daily.id;

  select count(*)::integer into v_word
  from public.daily_brainiword
  where daily_challenge_id=v_daily.id;

  select
    count(*) filter(where qv.difficulty='easy')::integer,
    count(*) filter(where qv.difficulty='medium')::integer,
    count(*) filter(where qv.difficulty='hard')::integer
  into
    v_easy,
    v_medium,
    v_hard
  from public.daily_challenge_questions dcq
  join public.question_versions qv
    on qv.id=dcq.question_version_id
  where dcq.daily_challenge_id=v_daily.id;

  select jsonb_agg(jsonb_build_object('game_id',g.game,'role',case when p_date>=public.brainilab_daily_choice_starts() then case when g.position=1 then 'Main Daily' else 'Optional extra' end else 'Daily game' end,'max_points',public.brainilab_daily_point_limit(g.game,p_date),'count',g.actual,'expected',g.expected,'ready',g.actual=g.expected) order by g.position)
  into v_game_health from (
    select games.game,games.position,
      case games.game when 'brainmix' then v_brainmix when 'brainiword' then v_word
        when 'orderup' then (select count(*) from public.daily_order_up_rounds where daily_challenge_id=v_daily.id)
        when 'topicrush' then (select count(*) from public.daily_topic_rush d join public.topic_rush_topics t on t.id=d.topic_id where d.daily_challenge_id=v_daily.id and (select count(*) from public.topic_rush_answers a where a.topic_id=t.id)>=t.target_count)
        when 'mathrush' then 1
        else (select count(*) from public.daily_rotating_content r where r.daily_challenge_id=v_daily.id and r.game_id=games.game) end as actual,
      case games.game when 'brainmix' then 10 when 'brainiword' then 1 when 'orderup' then 2 when 'topicrush' then 1 when 'mathrush' then 1 when 'connections' then 3 when 'numberroute' then 3 else 10 end as expected
    from unnest(public.brainilab_daily_game_ids(p_date)) with ordinality games(game,position)
  )g;

  return jsonb_build_object(
    'exists',true,
    'healthy',
      (not('brainmix'=any(public.brainilab_daily_game_ids(p_date))) or (v_easy=4 and v_medium=4 and v_hard=2)) and cardinality(public.brainilab_daily_game_ids(p_date))=case when p_date>=public.brainilab_daily_choice_starts() then 3 else 4 end and not exists(select 1 from jsonb_array_elements(v_game_health) g where not (g->>'ready')::boolean),
    'game_health',v_game_health,
    'daily_rules',public.get_brainilab_daily_lineup(p_date),

    'id',v_daily.id,
    'date',v_daily.challenge_date,
    'daily_number',v_daily.daily_number,
    'status',v_daily.status,
    'generation_version',v_daily.generation_version,
    'generated_at',v_daily.generated_at,
    'published_at',v_daily.published_at,

    'completed_sessions',v_sessions,
    'content_locked',v_sessions>0,

    'brainmix',jsonb_build_object(
      'count',v_brainmix,
      'easy',v_easy,
      'medium',v_medium,
      'hard',v_hard,
      'questions',(
        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'position',dcq.position,
              'question_version_id',qv.id,
              'prompt',qv.prompt,
              'difficulty',qv.difficulty,
              'topic',t.slug
            )
            order by dcq.position
          ),
          '[]'::jsonb
        )
        from public.daily_challenge_questions dcq
        join public.question_versions qv
          on qv.id=dcq.question_version_id
        join public.topics t
          on t.id=qv.primary_topic_id
        where dcq.daily_challenge_id=v_daily.id
      )
    ),

    'flagdash',jsonb_build_object(
      'count',v_flags,
      'items',(
        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'position',fd.position,
              'country',c.country_name,
              'iso2',c.iso2
            )
            order by fd.position
          ),
          '[]'::jsonb
        )
        from public.daily_flag_dash_questions fd
        join public.daily_countries c
          on c.id=fd.country_id
        where fd.daily_challenge_id=v_daily.id
      )
    ),

    'maphunt',jsonb_build_object(
      'count',v_map,
      'items',(
        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'position',mhq.position,
              'clue',mh.clue,
              'country',c.country_name,
              'iso2',c.iso2
            )
            order by mhq.position
          ),
          '[]'::jsonb
        )
        from public.daily_map_hunt_questions mhq
        join public.map_hunt_clues mh
          on mh.id=mhq.clue_id
        join public.daily_countries c
          on c.id=mh.country_id
        where mhq.daily_challenge_id=v_daily.id
      )
    ),

    'brainiword',jsonb_build_object(
      'count',v_word,
      'word',(
        select bw.word
        from public.daily_brainiword dbw
        join public.brainiword_words bw
          on bw.id=dbw.word_id
        where dbw.daily_challenge_id=v_daily.id
        limit 1
      )
    )
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.ensure_brainilab_rotating_daily_content(p_daily_challenge_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_date date; v_games text[];
begin
  select challenge_date into v_date from public.daily_challenges where id=p_daily_challenge_id;
  if v_date is null then raise exception 'Daily Challenge not found'; end if;
  if v_date<date '2026-08-31' then return; end if;
  v_games:=public.brainilab_daily_game_ids(v_date);

  if 'connections'=any(v_games) and not exists(select 1 from public.daily_rotating_content where daily_challenge_id=p_daily_challenge_id and game_id='connections') then
    insert into public.daily_rotating_content(daily_challenge_id,game_id,position,content_id)
    select p_daily_challenge_id,'connections',row_number() over(order by usage_count,hash_key)::integer,id from (
      select p.id,(select count(*) from public.daily_rotating_content d where d.game_id='connections' and d.content_id=p.id) usage_count,md5(p.id::text||':'||v_date::text) hash_key
      from public.connections_puzzles p where p.is_active=true order by usage_count,hash_key limit 3
    ) q;
  end if;
  if 'oddoneout'=any(v_games) and not exists(select 1 from public.daily_rotating_content where daily_challenge_id=p_daily_challenge_id and game_id='oddoneout') then
    insert into public.daily_rotating_content(daily_challenge_id,game_id,position,content_id)
    select p_daily_challenge_id,'oddoneout',row_number() over(order by usage_count,hash_key)::integer,id from (
      select p.id,(select count(*) from public.daily_rotating_content d where d.game_id='oddoneout' and d.content_id=p.id) usage_count,md5(p.id::text||':'||v_date::text) hash_key
      from public.odd_one_out_puzzles p where p.is_active=true order by usage_count,hash_key limit 10
    ) q;
  end if;
  if 'higherlower'=any(v_games) and not exists(select 1 from public.daily_rotating_content where daily_challenge_id=p_daily_challenge_id and game_id='higherlower') then
    insert into public.daily_rotating_content(daily_challenge_id,game_id,position,content_id)
    select p_daily_challenge_id,'higherlower',row_number() over(order by usage_count,hash_key)::integer,id from (
      select p.id,(select count(*) from public.daily_rotating_content d where d.game_id='higherlower' and d.content_id=p.id) usage_count,md5(p.id::text||':'||v_date::text) hash_key
      from public.higher_lower_pairs p where p.is_active=true order by usage_count,hash_key limit 10
    ) q;
  end if;
  if 'numberroute'=any(v_games) and not exists(select 1 from public.daily_rotating_content where daily_challenge_id=p_daily_challenge_id and game_id='numberroute') then
    insert into public.daily_rotating_content(daily_challenge_id,game_id,position,content_id)
    select p_daily_challenge_id,'numberroute',row_number() over(order by usage_count,hash_key)::integer,id from (
      select p.id,(select count(*) from public.daily_rotating_content d where d.game_id='numberroute' and d.content_id=p.id) usage_count,md5(p.id::text||':'||v_date::text) hash_key
      from public.number_route_puzzles p where p.is_active=true order by usage_count,hash_key limit 3
    ) q;
  end if;
  if 'sequence'=any(v_games) and not exists(select 1 from public.daily_rotating_content where daily_challenge_id=p_daily_challenge_id and game_id='sequence') then
    insert into public.daily_rotating_content(daily_challenge_id,game_id,position,content_id)
    select p_daily_challenge_id,'sequence',row_number() over(order by usage_count,hash_key)::integer,id from (
      select p.id,(select count(*) from public.daily_rotating_content d where d.game_id='sequence' and d.content_id=p.id) usage_count,md5(p.id::text||':'||v_date::text) hash_key
      from public.sequence_puzzles p where p.is_active=true order by usage_count,hash_key limit 10
    ) q;
  end if;
end;$function$;

CREATE OR REPLACE FUNCTION public.claim_brainilab_guest_results(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
v_uid uuid:=auth.uid();
v_claim public.brainilab_guest_claims%rowtype;
v_sessions uuid[];
v_skipped text[];
begin
if not exists(select 1 from auth.users where id=v_uid and is_anonymous=false)
or p_token is null or p_token !~ '^[a-f0-9]{64}$' then
raise exception 'Sign in to link guest progress';
end if;
select * into v_claim from public.brainilab_guest_claims
where token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') for update;
if not found then raise exception 'Guest claim not found'; end if;
if v_claim.claimed_by is not null then
if v_claim.claimed_by=v_uid then return jsonb_build_object('claimed',true,'already_claimed',true); end if;
raise exception 'Guest progress belongs to another account';
end if;
if v_claim.expires_at<now() then raise exception 'Guest claim expired'; end if;
if not exists(select 1 from auth.users where id=v_claim.guest_user_id and is_anonymous=true) then
raise exception 'Only guest progress can be linked';
end if;
-- Deterministic order also prevents two claims deadlocking over one account.
perform pg_advisory_xact_lock(hashtextextended('brainilab-player:'||least(v_uid::text,v_claim.guest_user_id::text),0));
perform pg_advisory_xact_lock(hashtextextended('brainilab-player:'||greatest(v_uid::text,v_claim.guest_user_id::text),0));

insert into public.brainilab_daily_choices(user_id,challenge_date,game_id,selected_at)
select v_uid,challenge_date,game_id,selected_at from public.brainilab_daily_choices where user_id=v_claim.guest_user_id
on conflict(user_id,challenge_date) do nothing;
select coalesce(array_agg(gs.id),array[]::uuid[]) into v_sessions
from public.game_sessions gs where gs.user_id=v_claim.guest_user_id
and (gs.daily_number is null or (gs.completed_at at time zone 'UTC')::date<public.brainilab_daily_choice_starts() or gs.game_id=(public.brainilab_daily_game_ids((gs.completed_at at time zone 'UTC')::date))[1] or exists(select 1 from public.brainilab_daily_choices c where c.user_id=v_uid and c.challenge_date=(gs.completed_at at time zone 'UTC')::date and c.game_id=gs.game_id))
and not exists(select 1 from public.game_sessions target where target.user_id=v_uid
and (target.client_result_id=gs.client_result_id or
(gs.daily_number is not null and target.daily_number=gs.daily_number
and target.game_id=gs.game_id and target.status='completed')));
select coalesce(array_agg(gs.client_result_id),array[]::text[]) into v_skipped
from public.game_sessions gs where gs.user_id=v_claim.guest_user_id and not(gs.id=any(v_sessions));

-- The signed-in account's already-completed Daily wins. Duplicate guest rows
-- remain as history on the retired guest, rather than scoring twice.
update public.game_sessions set user_id=v_uid where id=any(v_sessions);
update public.game_answers set user_id=v_uid where session_id=any(v_sessions);
update public.verified_question_answers set user_id=v_uid where session_id=any(v_sessions);
update public.game_results set user_id=v_uid where session_id=any(v_sessions);
insert into public.player_connections_history(user_id,puzzle_id,times_played,first_played_at,last_played_at)
select v_uid,puzzle_id,times_played,first_played_at,last_played_at
from public.player_connections_history where user_id=v_claim.guest_user_id
on conflict(user_id,puzzle_id) do update set
times_played=player_connections_history.times_played+excluded.times_played,
first_played_at=least(player_connections_history.first_played_at,excluded.first_played_at),
last_played_at=greatest(player_connections_history.last_played_at,excluded.last_played_at);
update public.content_play_sessions cps set user_id=v_uid
where cps.user_id=v_claim.guest_user_id and not exists(
select 1 from public.content_play_sessions target
where target.user_id=v_uid and target.client_play_id=cps.client_play_id);

update public.profiles set leaderboard_enabled=false,guest_claimed_by=v_uid
where user_id=v_claim.guest_user_id;
if cardinality(v_sessions)>0 then
update public.profiles set leaderboard_enabled=true
where user_id=v_uid and not leaderboard_enabled and not leaderboard_visibility_explicit;
end if;
perform public.refresh_brainilab_player_progression(v_claim.guest_user_id);
perform public.refresh_brainilab_player_progression(v_uid);
perform public.refresh_brainilab_player_analytics(v_claim.guest_user_id);
perform public.refresh_brainilab_player_analytics(v_uid);
update public.brainilab_guest_claims set claimed_by=v_uid,claimed_at=now()
where guest_user_id=v_claim.guest_user_id;
return jsonb_build_object('claimed',true,'transferred',cardinality(v_sessions),'skipped_client_result_ids',v_skipped);
end $function$;
CREATE OR REPLACE FUNCTION public.brainilab_assert_daily_verification(p_session uuid,p_daily uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s public.game_sessions%rowtype;d public.daily_challenges%rowtype;
BEGIN
 SELECT * INTO s FROM public.game_sessions WHERE id=p_session AND user_id=auth.uid();
 SELECT * INTO d FROM public.daily_challenges WHERE id=p_daily;
 IF s.id IS NULL OR d.id IS NULL THEN RAISE EXCEPTION 'Daily session not found';END IF;
 IF (s.completed_at at time zone 'UTC')::date>=public.brainilab_daily_choice_starts() THEN
  IF s.daily_number IS DISTINCT FROM d.daily_number OR d.challenge_date IS DISTINCT FROM (s.completed_at at time zone 'UTC')::date OR NOT(s.game_id=ANY(public.brainilab_daily_game_ids(d.challenge_date))) THEN RAISE EXCEPTION 'Daily session does not match this challenge';END IF;
  IF s.game_id<>(public.brainilab_daily_game_ids(d.challenge_date))[1] AND NOT EXISTS(SELECT 1 FROM public.brainilab_daily_choices c WHERE c.user_id=s.user_id AND c.challenge_date=d.challenge_date AND c.game_id=s.game_id) THEN RAISE EXCEPTION 'Extra choice does not match';END IF;
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.brainilab_assert_daily_verification(uuid,uuid) FROM public,anon,authenticated;
CREATE OR REPLACE FUNCTION public.brainilab_protect_verified_daily() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF OLD.answers_verified AND EXISTS(SELECT 1 FROM public.game_sessions s WHERE s.id=OLD.session_id AND s.daily_number IS NOT NULL AND (s.completed_at at time zone 'UTC')::date>=public.brainilab_daily_choice_starts()) AND
  (NEW.score,NEW.correct_answers,NEW.total_questions,NEW.verified_correct_answers,NEW.verified_total_questions,NEW.accuracy,NEW.result_payload) IS DISTINCT FROM
  (OLD.score,OLD.correct_answers,OLD.total_questions,OLD.verified_correct_answers,OLD.verified_total_questions,OLD.accuracy,OLD.result_payload) THEN
  RAISE EXCEPTION 'This verified Daily result is locked';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.brainilab_protect_verified_daily() FROM public,anon,authenticated;
CREATE TRIGGER brainilab_protect_verified_daily BEFORE UPDATE ON public.game_results FOR EACH ROW EXECUTE FUNCTION public.brainilab_protect_verified_daily();

CREATE OR REPLACE FUNCTION public.verify_brainilab_daily_result(p_client_result_id text, p_daily_challenge_id uuid, p_answers jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
v_user_id uuid;
v_session_id uuid;
v_result_id uuid;
v_daily_number integer;
v_challenge_count integer;
v_answer_count integer;
v_correct integer := 0;
v_daily_question record;
v_answer jsonb;
v_selected_option_id uuid;
v_is_correct boolean;
begin
v_user_id := auth.uid();

if v_user_id is null then
raise exception 'Authentication required';
end if;

if jsonb_typeof(coalesce(p_answers,'[]'::jsonb)) <> 'array' then
raise exception 'Answers must be an array';
end if;

select
gs.id,
gr.id
into
v_session_id,
v_result_id
from public.game_sessions gs
join public.game_results gr
on gr.session_id = gs.id
where gs.user_id = v_user_id
and gs.client_result_id = p_client_result_id
and gs.game_id='brainmix'
limit 1;

if v_result_id is null then
raise exception 'Game result not found';
end if;
perform public.brainilab_assert_daily_verification(v_session_id,p_daily_challenge_id);

select dc.daily_number
into v_daily_number
from public.daily_challenges dc
where dc.id = p_daily_challenge_id
and dc.status in ('published','retired');

if v_daily_number is null then
raise exception 'Daily challenge not found';
end if;

select count(*)
into v_challenge_count
from public.daily_challenge_questions dcq
where dcq.daily_challenge_id = p_daily_challenge_id;

if v_challenge_count <> 10 then
raise exception 'Daily challenge is not valid';
end if;

v_answer_count := jsonb_array_length(p_answers);

if v_answer_count <> 10 then
raise exception 'Expected 10 submitted answers, got %',v_answer_count;
end if;

for v_daily_question in
select
dcq.position,
dcq.question_version_id
from public.daily_challenge_questions dcq
where dcq.daily_challenge_id = p_daily_challenge_id
order by dcq.position
loop

select value
into v_answer
from jsonb_array_elements(p_answers)
where value ->> 'question_version_id'
= v_daily_question.question_version_id::text
limit 1;

if v_answer is null then
raise exception
'Missing answer for Daily position %',
v_daily_question.position;
end if;

if nullif(v_answer ->> 'selected_option_id','') is null then
v_selected_option_id := null;
v_is_correct := false;
else
begin
v_selected_option_id :=
(v_answer ->> 'selected_option_id')::uuid;
exception when others then
raise exception
'Invalid selected option ID at Daily position %',
v_daily_question.position;
end;

select qo.is_correct
into v_is_correct
from public.question_options qo
where qo.id = v_selected_option_id
and qo.question_version_id =
v_daily_question.question_version_id;

if v_is_correct is null then
raise exception
'Option does not belong to Daily question at position %',
v_daily_question.position;
end if;
end if;

if v_is_correct then
v_correct := v_correct + 1;
end if;
end loop;

update public.game_sessions
set
daily_number = v_daily_number,
daily_challenge_id = p_daily_challenge_id
where id = v_session_id;

update public.game_results
set
score=case when created_at>=public.brainilab_rewards_started_at() then v_correct*1000 else score end,
correct_answers = v_correct,
total_questions = 10,
accuracy = round((v_correct::numeric / 10::numeric) * 100,2),
answers_verified = true,
verified_correct_answers = v_correct,
verified_total_questions = 10,
answers_verified_at = now()
where id = v_result_id;

return jsonb_build_object(
'answers_verified',true,
'daily_number',v_daily_number,
'correct_answers',v_correct,
'total_questions',10,
'accuracy',round((v_correct::numeric / 10::numeric) * 100,2),
'server_score_verified',false
);
end;
$function$;

CREATE OR REPLACE FUNCTION public.verify_brainilab_order_up_result(p_client_result_id text, p_daily_challenge_id uuid, p_rounds jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid:=auth.uid();
  v_session_id uuid;
  v_result_id uuid;
  v_daily_number integer;
  v_round record;
  v_submission jsonb;
  v_eval jsonb;
  v_score integer:=0;
  v_exact integer:=0;
  v_pairs integer:=0;
  v_accuracy numeric:=0;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if jsonb_typeof(coalesce(p_rounds,'[]'::jsonb))<>'array'
     or jsonb_array_length(p_rounds)<>2 then
    raise exception 'Order Up verification requires exactly 2 rounds';
  end if;

  select
    gs.id,
    gr.id
  into
    v_session_id,
    v_result_id
  from public.game_sessions gs
  join public.game_results gr
    on gr.session_id=gs.id
  where gs.user_id=v_user_id
    and gs.client_result_id=p_client_result_id
    and gs.game_id='orderup'
  limit 1;

  if v_result_id is null then
    raise exception 'Order Up result not found';
  end if;
perform public.brainilab_assert_daily_verification(v_session_id,p_daily_challenge_id);

  select dc.daily_number
    into v_daily_number
  from public.daily_challenges dc
  where dc.id=p_daily_challenge_id
    and dc.status in ('published','retired');

  if v_daily_number is null then
    raise exception 'Order Up Daily not found';
  end if;

  if (
    select count(*)
    from public.daily_order_up_rounds dour
    where dour.daily_challenge_id=p_daily_challenge_id
  )<>2 then
    raise exception 'Order Up Daily does not contain exactly 2 rounds';
  end if;

  for v_round in
    select
      dour.position,
      dour.round_id
    from public.daily_order_up_rounds dour
    where dour.daily_challenge_id=p_daily_challenge_id
    order by dour.position
  loop
    select x.value
      into v_submission
    from jsonb_array_elements(p_rounds) x(value)
    where x.value->>'round_id'=v_round.round_id::text
    limit 1;

    if v_submission is null then
      raise exception 'Missing Order Up round %',v_round.position;
    end if;

    v_eval:=public.brainilab_score_order_up_round(
      v_round.round_id,
      v_submission->'item_ids'
    );

    v_score:=v_score+coalesce((v_eval->>'score')::integer,0);
    v_exact:=v_exact+coalesce((v_eval->>'exact_positions')::integer,0);
    v_pairs:=v_pairs+coalesce((v_eval->>'correct_pairs')::integer,0);
  end loop;

  v_score:=least(2500,greatest(0,v_score));
  v_accuracy:=round(v_pairs::numeric/90.0*100,2);

  update public.game_sessions
  set
    daily_challenge_id=p_daily_challenge_id,
    daily_number=v_daily_number
  where id=v_session_id;

  update public.game_results
  set
    score=v_score,
    correct_answers=v_exact,
    total_questions=20,
    accuracy=v_accuracy,
    answers_verified=true,
    verified_correct_answers=v_exact,
    verified_total_questions=20,
    answers_verified_at=now(),
    result_payload=
      coalesce(result_payload,'{}'::jsonb)
      || jsonb_build_object(
        'verifiedOrderPairsCorrect',v_pairs,
        'verifiedOrderPairsTotal',90,
        'verifiedOrderAccuracy',v_accuracy,
        'verifiedOrderUpRounds',2
      )
  where id=v_result_id;

  return jsonb_build_object(
    'answers_verified',true,
    'daily_number',v_daily_number,
    'correct',v_exact,
    'total',20,
    'accuracy',v_accuracy,
    'score',v_score,
    'daily_points',v_score,
    'correct_pairs',v_pairs,
    'total_pairs',90,
    'server_score_verified',false
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.verify_brainilab_topic_rush_result(p_client_result_id text, p_daily_challenge_id uuid, p_answers jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid:=auth.uid();
  v_session_id uuid;
  v_result_id uuid;
  v_daily_number integer;
  v_target integer;
  v_topic_id uuid;
  v_answer jsonb;
  v_norm text;
  v_answer_id uuid;
  v_valid_ids uuid[]:='{}'::uuid[];
  v_correct integer:=0;
  v_score integer:=0;
  v_accuracy numeric:=0;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if jsonb_typeof(coalesce(p_answers,'[]'::jsonb))<>'array' then
    raise exception 'Topic Rush answers must be an array';
  end if;

  if jsonb_array_length(p_answers)>120 then
    raise exception 'Too many Topic Rush submissions';
  end if;

  select
    gs.id,
    gr.id
  into
    v_session_id,
    v_result_id
  from public.game_sessions gs
  join public.game_results gr
    on gr.session_id=gs.id
  where gs.user_id=v_user_id
    and gs.client_result_id=p_client_result_id
    and gs.game_id='topicrush'
  limit 1;

  if v_result_id is null then
    raise exception 'Topic Rush result not found';
  end if;
perform public.brainilab_assert_daily_verification(v_session_id,p_daily_challenge_id);

  select
    dc.daily_number,
    dtr.topic_id,
    trt.target_count
  into
    v_daily_number,
    v_topic_id,
    v_target
  from public.daily_challenges dc
  join public.daily_topic_rush dtr
    on dtr.daily_challenge_id=dc.id
  join public.topic_rush_topics trt
    on trt.id=dtr.topic_id
  where dc.id=p_daily_challenge_id
    and dc.status in ('published','retired');

  if v_topic_id is null then
    raise exception 'Topic Rush Daily not found';
  end if;

  update public.game_sessions
  set
    daily_challenge_id=p_daily_challenge_id,
    daily_number=v_daily_number
  where id=v_session_id;

  for v_answer in
    select value
    from jsonb_array_elements(p_answers)
  loop
    v_norm:=public.brainilab_normalize_topic_rush_answer(
      coalesce(v_answer#>>'{}','')
    );

    if v_norm='' then
      continue;
    end if;

    select tra.id
      into v_answer_id
    from public.topic_rush_answers tra
    where tra.topic_id=v_topic_id
      and (
        tra.normalized_answer=v_norm
        or v_norm=any(tra.normalized_aliases)
      )
    limit 1;

    if v_answer_id is not null
       and not (v_answer_id=any(v_valid_ids)) then
      v_valid_ids:=array_append(v_valid_ids,v_answer_id);
    end if;
  end loop;

  v_correct:=coalesce(cardinality(v_valid_ids),0);
  v_score:=least(
    2500,
    greatest(
      0,
      round(
        v_correct::numeric
        / greatest(v_target,1)::numeric
        * 2500
      )::integer
    )
  );

  v_accuracy:=least(
    100,
    round(
      v_correct::numeric
      / greatest(v_target,1)::numeric
      * 100,
      2
    )
  );

  update public.game_results
  set
    score=v_score,
    correct_answers=v_correct,
    total_questions=v_target,
    accuracy=v_accuracy,
    answers_verified=true,
    verified_correct_answers=v_correct,
    verified_total_questions=v_target,
    answers_verified_at=now(),
    result_payload=
      coalesce(result_payload,'{}'::jsonb)
      || jsonb_build_object(
        'verifiedTargetCount',v_target,
        'verifiedTopicId',v_topic_id,
        'verifiedValidAnswers',v_correct
      )
  where id=v_result_id;

  return jsonb_build_object(
    'answers_verified',true,
    'daily_number',v_daily_number,
    'correct',v_correct,
    'total',v_target,
    'accuracy',v_accuracy,
    'score',v_score,
    'daily_points',v_score,
    'server_score_verified',false
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.is_brainilab_english_guess(p_guess text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce(upper(btrim(p_guess)) ~ '^[A-Z]{5}$' AND EXISTS(SELECT 1 FROM public.brainiword_valid_guesses WHERE word=upper(btrim(p_guess))),false)
$$;
REVOKE ALL ON FUNCTION public.is_brainilab_english_guess(text) FROM public;
GRANT EXECUTE ON FUNCTION public.is_brainilab_english_guess(text) TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.check_brainilab_brainiword_guess(p_daily_challenge_id uuid, p_guess text, p_attempt integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_answer text;
  v_guess text:=upper(trim(p_guess));
  v_answer_chars text[];
  v_guess_chars text[];
  v_states text[]:=array[
    'absent',
    'absent',
    'absent',
    'absent',
    'absent'
  ];
  v_used boolean[]:=array[
    false,
    false,
    false,
    false,
    false
  ];
  i integer;
  j integer;
  v_won boolean;
  v_finished boolean;
begin
  if v_guess is null or v_guess !~ '^[A-Z]{5}$' then
    raise exception 'Guess must contain exactly five letters';
  end if;

  if p_attempt is null or p_attempt not between 1 and 5 then
    raise exception 'Invalid attempt';
  end if;

  if not public.is_brainilab_english_guess(v_guess) then return jsonb_build_object('valid_word',false,'message','Not in the English word list. Your attempt has not been used.','states','[]'::jsonb,'won',false,'finished',false);end if;

  select bw.word
  into v_answer
  from public.daily_brainiword dbw
  join public.daily_challenges dc
    on dc.id=dbw.daily_challenge_id
  join public.brainiword_words bw
    on bw.id=dbw.word_id
  where dbw.daily_challenge_id=p_daily_challenge_id
    and dc.challenge_date<=current_date
    and dc.status='published';

  if v_answer is null then
    raise exception 'BrainiWord Daily not available';
  end if;

  v_answer_chars:=array[
    substr(v_answer,1,1),
    substr(v_answer,2,1),
    substr(v_answer,3,1),
    substr(v_answer,4,1),
    substr(v_answer,5,1)
  ];

  v_guess_chars:=array[
    substr(v_guess,1,1),
    substr(v_guess,2,1),
    substr(v_guess,3,1),
    substr(v_guess,4,1),
    substr(v_guess,5,1)
  ];

  for i in 1..5 loop
    if v_guess_chars[i]=v_answer_chars[i] then
      v_states[i]:='correct';
      v_used[i]:=true;
    end if;
  end loop;

  for i in 1..5 loop
    if v_states[i]='correct' then
      continue;
    end if;

    for j in 1..5 loop
      if not v_used[j]
         and v_guess_chars[i]=v_answer_chars[j] then
        v_states[i]:='present';
        v_used[j]:=true;
        exit;
      end if;
    end loop;
  end loop;

  v_won:=v_guess=v_answer;
  v_finished:=v_won or p_attempt=5;

  return jsonb_build_object(
    'valid_word',true,
    'states',to_jsonb(v_states),
    'won',v_won,
    'finished',v_finished,
    'answer',
      case
        when v_finished then v_answer
        else null
      end
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.verify_brainilab_brainiword_result(p_client_result_id text, p_daily_challenge_id uuid, p_guesses jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user uuid:=auth.uid();
  v_result_id uuid;
  v_session_id uuid;
  v_daily_number integer;
  v_answer text;
  v_guess text;
  v_index integer:=0;
  v_win_attempt integer:=null;
  v_won boolean:=false;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(coalesce(p_guesses,'[]'::jsonb))<>'array' then
    raise exception 'Guesses must be an array';
  end if;

  select gs.id,gr.id
    into v_session_id,v_result_id
  from public.game_sessions gs
  join public.game_results gr on gr.session_id=gs.id
  where gs.user_id=v_user
    and gs.client_result_id=p_client_result_id
    and gs.game_id='brainiword';

  if v_result_id is null then raise exception 'BrainiWord result not found'; end if;
perform public.brainilab_assert_daily_verification(v_session_id,p_daily_challenge_id);

  select dc.daily_number,bw.word
    into v_daily_number,v_answer
  from public.daily_brainiword dbw
  join public.daily_challenges dc on dc.id=dbw.daily_challenge_id
  join public.brainiword_words bw on bw.id=dbw.word_id
  where dbw.daily_challenge_id=p_daily_challenge_id;

  if v_answer is null then raise exception 'BrainiWord Daily not found'; end if;
  if jsonb_array_length(p_guesses) not between 1 and 5 then raise exception 'Too many guesses'; end if;

  for v_guess in
    select upper(value #>> '{}')
    from jsonb_array_elements(p_guesses)
  loop
    if v_guess is null or v_guess !~ '^[A-Z]{5}$' or not exists(
      select 1
      from public.brainiword_valid_guesses d
      where d.word=v_guess
    ) then
      raise exception 'BrainiWord result contains an invalid English guess';
    end if;

    v_index:=v_index+1;
    if v_guess=v_answer and v_win_attempt is null then
      v_win_attempt:=v_index;
      v_won:=true;
    end if;
  end loop;

  if (v_won and v_win_attempt<>v_index) or (not v_won and v_index<>5) then raise exception 'BrainiWord round is not complete';end if;

  update public.game_sessions
  set daily_challenge_id=p_daily_challenge_id,
      daily_number=v_daily_number
  where id=v_session_id;

  update public.game_results
  set correct_answers=case when v_won then 1 else 0 end,
      total_questions=1,
      accuracy=case when v_won then 100 else 0 end,
      server_verified=false,
      answers_verified=true,
      verified_correct_answers=case when v_won then 1 else 0 end,
      verified_total_questions=1,
      answers_verified_at=now(),
      result_payload=jsonb_set(
        jsonb_set(
          jsonb_set(result_payload,'{won}',to_jsonb(v_won),true),
          '{attempts}',to_jsonb(coalesce(v_win_attempt,5)),true
        ),
        '{verifiedDailyGame}','true'::jsonb,true
      )
  where id=v_result_id;

  return jsonb_build_object(
    'verified',true,
    'won',v_won,
    'attempts',coalesce(v_win_attempt,5),
    'daily_number',v_daily_number
  );
end;
$function$;

DO $$ DECLARE d record; BEGIN
 FOR d IN SELECT id,challenge_date FROM public.daily_challenges WHERE challenge_date>=greatest((now() at time zone 'UTC')::date,public.brainilab_daily_choice_starts()) AND challenge_date<=(now() at time zone 'UTC')::date+14 LOOP
  IF 'orderup'=ANY(public.brainilab_daily_game_ids(d.challenge_date)) THEN PERFORM public.ensure_brainilab_order_up(d.id);END IF;
  IF 'topicrush'=ANY(public.brainilab_daily_game_ids(d.challenge_date)) THEN PERFORM public.ensure_brainilab_topic_rush(d.id);END IF;
  PERFORM public.ensure_brainilab_rotating_daily_content(d.id);
 END LOOP;
END $$;
NOTIFY pgrst,'reload schema';
