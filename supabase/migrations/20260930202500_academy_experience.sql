-- Academy XP: one award per account and lesson, independent of quiz versions.
-- Existing game XP and every competitive aggregate retain their own sources.
do $guard$ begin
 if pg_get_functiondef('brainilab_editor.complete_lesson(text,text,jsonb)'::regprocedure) is distinct from $before0$CREATE OR REPLACE FUNCTION brainilab_editor.complete_lesson(p_slug text, p_version text, p_answers jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid:=auth.uid();q jsonb;v_score integer:=0;v_total integer;i integer;v_answer text;
begin
 if uid is null then raise exception 'Sign in to save account progress.';end if;
 select document->'quiz' into q from public.learn_publications where slug=p_slug for share;
 perform brainilab_editor.validate_quiz(q);
 if q->>'version' is distinct from p_version then raise exception 'This round has changed. Reload the lesson.';end if;
 v_total:=jsonb_array_length(q->'questions');
 if jsonb_typeof(p_answers) is distinct from 'array' or jsonb_array_length(p_answers)<>v_total then raise exception 'Answer every question.';end if;
 for i in 0..v_total-1 loop
  v_answer:=p_answers->>i;if v_answer is null or v_answer !~ '^[0-3]$' then raise exception 'Invalid answer.';end if;
  if v_answer=(q->'questions'->i->>'answer') then v_score:=v_score+1;end if;
 end loop;
 insert into public.learn_progress(user_id,article_slug,quiz_version,score,total) values(uid,p_slug,p_version,v_score,v_total)
 on conflict(user_id,article_slug) do update set quiz_version=excluded.quiz_version,score=case when learn_progress.quiz_version=excluded.quiz_version then greatest(learn_progress.score,excluded.score) else excluded.score end,total=excluded.total,completed_at=now();
 return jsonb_build_object('score',v_score,'total',v_total,'completed',true,'version',p_version);
end $function$
$before0$ then raise exception 'Concurrent function change: complete_lesson';end if;
end $guard$;
do $guard$ begin
 if pg_get_functiondef('public.refresh_brainilab_player_progression(uuid)'::regprocedure) is distinct from $before1$CREATE OR REPLACE FUNCTION public.refresh_brainilab_player_progression(p_user_id uuid)
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
$function$
$before1$ then raise exception 'Concurrent function change: refresh_brainilab_player_progression';end if;
end $guard$;
create table brainilab_editor.academy_xp_awards(
 user_id uuid not null references public.profiles(user_id) on delete cascade,
 article_slug text not null,
 xp integer not null default 40 check(xp=40),
 awarded_at timestamptz not null default now(),
 primary key(user_id,article_slug)
);
alter table brainilab_editor.academy_xp_awards enable row level security;
revoke all on brainilab_editor.academy_xp_awards from public,anon,authenticated;
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
perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 624021));

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

-- Learning XP is never written to game or ranking aggregates.
select v_xp + coalesce(sum(xp),0) into v_xp
from brainilab_editor.academy_xp_awards where user_id=p_user_id;

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
$function$
;
CREATE OR REPLACE FUNCTION brainilab_editor.complete_lesson(p_slug text, p_version text, p_answers jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid:=auth.uid();q jsonb;v_score integer:=0;v_total integer;i integer;v_answer text;v_awarded integer:=0;v_xp bigint;
begin
 if uid is null or not exists(select 1 from auth.users where id=uid and is_anonymous=false) then raise exception 'Sign in to save account progress.';end if;
 select document->'quiz' into q from public.learn_publications where slug=p_slug for share;
 perform brainilab_editor.validate_quiz(q);
 if q->>'version' is distinct from p_version then raise exception 'This round has changed. Reload the lesson.';end if;
 v_total:=jsonb_array_length(q->'questions');
 if jsonb_typeof(p_answers) is distinct from 'array' or jsonb_array_length(p_answers)<>v_total then raise exception 'Answer every question.';end if;
 for i in 0..v_total-1 loop
  v_answer:=p_answers->>i;if v_answer is null or v_answer !~ '^[0-3]$' then raise exception 'Invalid answer.';end if;
  if v_answer=(q->'questions'->i->>'answer') then v_score:=v_score+1;end if;
 end loop;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text,624021));
 insert into public.learn_progress(user_id,article_slug,quiz_version,score,total) values(uid,p_slug,p_version,v_score,v_total)
 on conflict(user_id,article_slug) do update set quiz_version=excluded.quiz_version,score=case when learn_progress.quiz_version=excluded.quiz_version then greatest(learn_progress.score,excluded.score) else excluded.score end,total=excluded.total,completed_at=now();
 if exists(select 1 from public.learn_paths p,jsonb_array_elements(p.document->'lessons') l where l->>'slug'=p_slug) then
  insert into brainilab_editor.academy_xp_awards(user_id,article_slug,xp) values(uid,p_slug,40) on conflict do nothing returning xp into v_awarded;
  select coalesce((select sum(xp_earned) from public.player_daily_stats where user_id=uid),0)+coalesce((select sum(xp) from brainilab_editor.academy_xp_awards where user_id=uid),0) into v_xp;
  insert into public.player_progression(user_id,xp,level) values(uid,v_xp,greatest(1,floor(sqrt(v_xp::numeric/20.0))::integer+1))
  on conflict(user_id) do update set xp=excluded.xp,level=excluded.level,updated_at=now();
 end if;
 return jsonb_build_object('score',v_score,'total',v_total,'completed',true,'version',p_version,'xp_awarded',coalesce(v_awarded,0),'ranking_points',0);
end $function$
;
-- The existing invoker RPC delegates to this identity-checked private helper.
revoke execute on function public.refresh_brainilab_player_progression(uuid) from public,anon,authenticated;
revoke execute on function brainilab_editor.complete_lesson(text,text,jsonb) from public,anon;
grant execute on function brainilab_editor.complete_lesson(text,text,jsonb) to authenticated;
-- Credit real, previously saved Academy completions once; no anonymous records.
insert into brainilab_editor.academy_xp_awards(user_id,article_slug,xp,awarded_at)
select lp.user_id,lp.article_slug,40,lp.completed_at from public.learn_progress lp join auth.users u on u.id=lp.user_id
where u.is_anonymous=false and exists(select 1 from public.learn_paths p,jsonb_array_elements(p.document->'lessons') l where l->>'slug'=lp.article_slug)
on conflict do nothing;
do $backfill$ declare uid uuid;total bigint;begin
 for uid in select distinct user_id from brainilab_editor.academy_xp_awards loop
  perform pg_advisory_xact_lock(hashtextextended(uid::text,624021));
  select coalesce((select sum(xp_earned) from public.player_daily_stats where user_id=uid),0)+coalesce((select sum(xp) from brainilab_editor.academy_xp_awards where user_id=uid),0) into total;
  insert into public.player_progression(user_id,xp,level) values(uid,total,greatest(1,floor(sqrt(total::numeric/20.0))::integer+1))
  on conflict(user_id) do update set xp=excluded.xp,level=excluded.level,updated_at=now();
 end loop;
end $backfill$;

