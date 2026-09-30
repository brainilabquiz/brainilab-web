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
public.brainilab_daily_game_points(
gs.game_id,
gr.score,
coalesce(gr.verified_correct_answers,gr.correct_answers),
gr.result_payload
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
least(4,daily_games_completed),
daily_games_completed>=4,
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
least(10000,
brainmix_points+flagdash_points+orderup_points+maphunt_points+topicrush_points+brainiword_points+
connections_points+oddoneout_points+higherlower_points+mathrush_points+numberroute_points+sequence_points
),
base_xp+case when daily_games_completed>=4 then 250 else 0 end,
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

