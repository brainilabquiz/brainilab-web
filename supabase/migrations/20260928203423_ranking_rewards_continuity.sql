-- Fair positions, live streaks and verified, bounded XP.
-- Historical totals are retained; new rules begin at the recorded deployment timestamp.

DO $migration$
BEGIN
  IF to_regprocedure('public.brainilab_rewards_started_at()') IS NULL THEN
    EXECUTE format('CREATE FUNCTION public.brainilab_rewards_started_at() RETURNS timestamptz LANGUAGE sql IMMUTABLE SET search_path = %L AS %L', '', 'SELECT ' || quote_literal(now()) || '::timestamptz');
  END IF;
END;
$migration$;
REVOKE ALL ON FUNCTION public.brainilab_rewards_started_at() FROM public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.brainilab_player_rank_value(p_user_id uuid, p_period text, p_game_id text, p_metric text)
RETURNS bigint
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
v_period text:=lower(coalesce(p_period,'daily'));
v_game text:=lower(coalesce(p_game_id,'all'));
v_metric text:=lower(coalesce(p_metric,'score'));

v_today date:=(now() at time zone 'UTC')::date;
v_week date:=date_trunc(
'week',
(now() at time zone 'UTC')
)::date;
v_month date:=date_trunc(
'month',
(now() at time zone 'UTC')
)::date;

v_value bigint:=0;
v_period_type text;
v_period_start date;
begin
if p_user_id is null then
return 0;
end if;

if v_metric='streak' then
select case when pp.last_streak_date between (now() at time zone 'UTC')::date-1 and (now() at time zone 'UTC')::date then coalesce(pp.current_streak,0) else 0 end::bigint
into v_value
from public.player_progression pp
where pp.user_id=p_user_id;

return coalesce(v_value,0);
end if;

if v_period not in ('daily','weekly','monthly') then
return 0;
end if;

-- All games: Daily Brain Score.
if v_game='all' then
if v_period='daily' then
select coalesce(ds.daily_brain_score,0)::bigint
into v_value
from public.player_daily_stats ds
where ds.user_id=p_user_id
and ds.stat_date=v_today;
elsif v_period='weekly' then
select coalesce(ps.daily_brain_score,0)::bigint
into v_value
from public.player_period_stats ps
where ps.user_id=p_user_id
and ps.period_type='week'
and ps.period_start=v_week;
else
select coalesce(ps.daily_brain_score,0)::bigint
into v_value
from public.player_period_stats ps
where ps.user_id=p_user_id
and ps.period_type='month'
and ps.period_start=v_month;
end if;

return coalesce(v_value,0);
end if;

-- Daily games use normalized Daily Brain Score contribution points.
if v_game in ('brainmix','flagdash','orderup','maphunt','topicrush','brainiword') then
select coalesce(
sum(
case v_game
when 'brainmix' then ds.brainmix_points
when 'flagdash' then ds.flagdash_points
when 'orderup' then ds.orderup_points
when 'maphunt' then ds.maphunt_points
when 'topicrush' then case
when ds.stat_date >= (
select trs.launch_date
from public.topic_rush_settings trs
where trs.singleton=true
)
then greatest(ds.topicrush_points,ds.maphunt_points)
else 0
end
when 'brainiword' then ds.brainiword_points
else 0
end
),
0
)::bigint
into v_value
from public.player_daily_stats ds
where ds.user_id=p_user_id
and (
(v_period='daily' and ds.stat_date=v_today)
or
(
v_period='weekly'
and ds.stat_date between v_week and v_today
)
or
(
v_period='monthly'
and ds.stat_date between v_month and v_today
)
);

return coalesce(v_value,0);
end if;

-- Evergreen game score.
if v_period='daily' then
v_period_type:='day';
v_period_start:=v_today;
elsif v_period='weekly' then
v_period_type:='week';
v_period_start:=v_week;
else
v_period_type:='month';
v_period_start:=v_month;
end if;

select coalesce(gps.total_score,0)::bigint
into v_value
from public.player_game_period_stats gps
where gps.user_id=p_user_id
and gps.game_id=v_game
and gps.period_type=v_period_type
and gps.period_start=v_period_start;

return coalesce(v_value,0);
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_brainilab_individual_rankings(p_region text DEFAULT 'global'::text, p_country_code text DEFAULT NULL::text, p_period text DEFAULT 'daily'::text, p_game_id text DEFAULT 'all'::text, p_metric text DEFAULT 'score'::text, p_limit integer DEFAULT 100)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
v_me uuid:=auth.uid();
v_region text:=lower(coalesce(p_region,'global'));
v_country text:=upper(nullif(btrim(coalesce(p_country_code,'')),''));
v_period text:=lower(coalesce(p_period,'daily'));
v_game text:=lower(coalesce(p_game_id,'all'));
v_metric text:=lower(coalesce(p_metric,'score'));
v_limit integer:=least(100,greatest(10,coalesce(p_limit,100)));
v_my_country text;
v_my_enabled boolean:=false;
v_my_public_name text;
v_rows jsonb;
v_user jsonb;
v_total integer:=0;
v_user_eligible boolean:=false;
begin
if v_region not in ('global','country') then
raise exception 'Invalid ranking region';
end if;

if v_period not in ('daily','weekly','monthly') then
raise exception 'Invalid ranking period';
end if;

if v_metric not in ('score','streak') then
raise exception 'Invalid ranking metric';
end if;

if v_me is not null then
select
p.country_code,
p.leaderboard_enabled,
p.leaderboard_display_name
into
v_my_country,
v_my_enabled,
v_my_public_name
from public.profiles p
where p.user_id=v_me;

if v_country is null then
v_country:=v_my_country;
end if;
end if;

if v_region='country'
and (v_country is null or v_country !~ '^[A-Z]{2}$') then
return jsonb_build_object(
'rows','[]'::jsonb,
'user',null,
'total_players',0,
'metric_label',case
when v_metric='streak' then 'Streak'
when v_game='all' then 'Brain Score'
when v_game in ('brainmix','flagdash','maphunt','topicrush','brainiword')
then 'Daily points'
else 'Points'
end,
'leaderboard_enabled',v_my_enabled,
'leaderboard_display_name',v_my_public_name,
'user_eligible',false,
'country_required',true,
'my_country',v_my_country,
'generated_at',now()
);
end if;

with candidates as (
select
p.user_id,
p.leaderboard_display_name as public_name,
p.country_code,
case when p.leaderboard_visibility_explicit then p.avatar_url else null end as avatar_url,
public.brainilab_player_rank_value(
p.user_id,
v_period,
v_game,
v_metric
) as rank_value
from public.profiles p
where p.leaderboard_enabled=true
and p.guest_claimed_by is null
and p.leaderboard_display_name is not null
and char_length(btrim(p.leaderboard_display_name))>=2
and (
v_region='global'
or p.country_code=v_country
)
and not exists(
select 1
from public.admin_ranking_suspensions ars
where ars.entity_type='user'
and ars.entity_id=p.user_id
and ars.active=true
and (
ars.expires_at is null
or ars.expires_at>now()
)
)
),
eligible as (
select *
from candidates
where rank_value>0 or (v_metric='score' and exists(
select 1 from public.game_sessions gs
join public.game_results gr on gr.session_id=gs.id
where gs.user_id=candidates.user_id and gs.status='completed'
and coalesce(gr.result_payload->>'practice','false')<>'true' and (gr.created_at < public.brainilab_rewards_started_at() or (gr.answers_verified=true and coalesce(gr.result_payload->>'practice','false')<>'true' and coalesce(gr.result_payload->>'tryFirst','false')<>'true'))
and (gs.completed_at at time zone 'UTC')::date between
case v_period when 'weekly' then date_trunc('week',now() at time zone 'UTC')::date
when 'monthly' then date_trunc('month',now() at time zone 'UTC')::date
else (now() at time zone 'UTC')::date end
and (now() at time zone 'UTC')::date
and ((v_game='all' and gs.daily_number is not null) or gs.game_id=v_game)
))
),
ranked as (
select
e.*,
rank() over(order by e.rank_value desc) as rank,
row_number() over(
order by
e.rank_value desc,
lower(e.public_name),
e.user_id
) as display_order
from eligible e
)
select
coalesce(
jsonb_agg(
jsonb_build_object(
'rank',r.rank,
'name',r.public_name,
'country',r.country_code,
'avatar_url',r.avatar_url,
'avatar',upper(left(r.public_name,1)),
'score',r.rank_value,
'level',coalesce((
select pp_level.level
from public.player_progression pp_level
where pp_level.user_id=r.user_id
),1),
'streak',case
when v_metric='streak' then r.rank_value
else (
select case when pp.last_streak_date between (now() at time zone 'UTC')::date-1 and (now() at time zone 'UTC')::date then coalesce(pp.current_streak,0) else 0 end
from public.player_progression pp
where pp.user_id=r.user_id
)
end,
'display_value',case
when v_metric='streak'
then r.rank_value::text||' days'
else to_char(r.rank_value,'FM999G999G999G990')
end,
'is_me',r.user_id=v_me
)
order by r.display_order
) filter(where r.display_order<=v_limit),
'[]'::jsonb
),
count(*)::integer,
(
select jsonb_build_object(
'rank',mine.rank,
'name',mine.public_name,
'country',mine.country_code,
'avatar_url',mine.avatar_url,
'avatar',upper(left(mine.public_name,1)),
'score',mine.rank_value,
'level',coalesce((
select pp_level.level
from public.player_progression pp_level
where pp_level.user_id=mine.user_id
),1),
'streak',case
when v_metric='streak' then mine.rank_value
else (
select case when pp.last_streak_date between (now() at time zone 'UTC')::date-1 and (now() at time zone 'UTC')::date then coalesce(pp.current_streak,0) else 0 end
from public.player_progression pp
where pp.user_id=mine.user_id
)
end,
'display_value',case
when v_metric='streak'
then mine.rank_value::text||' days'
else to_char(mine.rank_value,'FM999G999G999G990')
end,
'is_me',true
)
from ranked mine
where mine.user_id=v_me
limit 1
),
exists(
select 1 from ranked mine
where mine.user_id=v_me
)
into
v_rows,
v_total,
v_user,
v_user_eligible
from ranked r;

return jsonb_build_object(
'rows',v_rows,
'user',v_user,
'total_players',v_total,
'metric_label',case
when v_metric='streak' then 'Streak'
when v_game='all' then 'Brain Score'
when v_game in ('brainmix','flagdash','maphunt','topicrush','brainiword')
then 'Daily points'
else 'Points'
end,
'leaderboard_enabled',v_my_enabled,
'leaderboard_display_name',v_my_public_name,
'user_eligible',v_user_eligible,
'region',v_region,
'country',v_country,
'my_country',v_my_country,
'period',v_period,
'game_id',v_game,
'generated_at',now()
);
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_brainilab_friends_ranking(p_period text DEFAULT 'daily'::text, p_game_id text DEFAULT 'all'::text, p_metric text DEFAULT 'score'::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
v_me uuid:=auth.uid();
v_period text:=lower(coalesce(p_period,'daily'));
v_game text:=lower(coalesce(p_game_id,'all'));
v_metric text:=lower(coalesce(p_metric,'score'));

v_rows jsonb;
v_me_row jsonb;
begin
if v_me is null then
raise exception 'Authentication required';
end if;

if v_period not in ('daily','weekly','monthly') then
raise exception 'Invalid ranking period';
end if;

if v_metric not in ('score','streak') then
raise exception 'Invalid ranking metric';
end if;

with members as (
select v_me as user_id

union

select
case
when f.user_a=v_me then f.user_b
else f.user_a
end
from public.friendships f
where f.user_a=v_me or f.user_b=v_me
),
values_by_member as (
select
m.user_id,
p.display_name,
p.country_code,
p.avatar_url,

case when pp.last_streak_date between (now() at time zone 'UTC')::date-1 and (now() at time zone 'UTC')::date then coalesce(pp.current_streak,0) else 0 end as streak,

public.brainilab_player_rank_value(
m.user_id,
v_period,
v_game,
v_metric
) as rank_value

from members m

join public.profiles p
on p.user_id=m.user_id

left join public.player_progression pp
on pp.user_id=m.user_id
),
ranked as (
select
v.*,
rank() over(order by v.rank_value desc) as rank,
row_number() over(
order by
v.rank_value desc,
lower(v.display_name),
v.user_id
) as display_order
from values_by_member v
)
select
coalesce(
jsonb_agg(
jsonb_build_object(
'rank',r.rank,
'user_id',r.user_id,
'name',r.display_name,
'country',r.country_code,
'avatar_url',r.avatar_url,
'avatar',upper(left(r.display_name,1)),
'score',r.rank_value,
'streak',r.streak,
'level',coalesce((
select pp2.level
from public.player_progression pp2
where pp2.user_id=r.user_id
),1),
'display_value',case
when v_metric='streak'
then r.rank_value::text || ' days'
else to_char(
r.rank_value,
'FM999G999G999G990'
)
end,
'is_me',r.user_id=v_me
)
order by r.display_order
),
'[]'::jsonb
),

(
select jsonb_build_object(
'rank',mine.rank,
'user_id',mine.user_id,
'name',mine.display_name,
'country',mine.country_code,
'avatar_url',mine.avatar_url,
'avatar',upper(left(mine.display_name,1)),
'score',mine.rank_value,
'streak',mine.streak,
'level',coalesce((
select pp2.level
from public.player_progression pp2
where pp2.user_id=mine.user_id
),1),
'display_value',case
when v_metric='streak'
then mine.rank_value::text || ' days'
else to_char(
mine.rank_value,
'FM999G999G999G990'
)
end,
'is_me',true
)
from ranked mine
where mine.user_id=v_me
)

into v_rows,v_me_row
from ranked r;

return jsonb_build_object(
'rows',v_rows,
'user',v_me_row,

'metric_label',case
when v_metric='streak' then 'Streak'
when v_game='all' then 'Brain Score'
when v_game in (
'brainmix','flagdash','orderup','maphunt','topicrush','brainiword'
) then 'Daily points'
else 'Points'
end,

'total_players',jsonb_array_length(v_rows),
'period',v_period,
'game_id',v_game,
'generated_at',now()
);
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_brainilab_group_rankings(p_region text DEFAULT 'global'::text, p_country_code text DEFAULT NULL::text, p_period text DEFAULT 'daily'::text, p_game_id text DEFAULT 'all'::text, p_metric text DEFAULT 'score'::text, p_limit integer DEFAULT 100)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
v_me uuid:=auth.uid();

v_region text:=lower(coalesce(p_region,'global'));
v_country text:=upper(
nullif(btrim(coalesce(p_country_code,'')),'')
);
v_period text:=lower(coalesce(p_period,'daily'));
v_game text:=lower(coalesce(p_game_id,'all'));
v_metric text:=lower(coalesce(p_metric,'score'));

v_today date:=(now() at time zone 'UTC')::date;
v_week date:=date_trunc(
'week',
(now() at time zone 'UTC')
)::date;
v_month date:=date_trunc(
'month',
(now() at time zone 'UTC')
)::date;

v_period_type text;
v_period_start date;

v_limit integer:=least(
100,
greatest(10,coalesce(p_limit,100))
);

v_rows jsonb;
v_user jsonb;
v_my_groups jsonb;
v_total integer;
begin
if v_me is null then
raise exception 'Authentication required';
end if;

if v_region not in ('global','country') then
raise exception 'Invalid group ranking region';
end if;

if v_period not in ('daily','weekly','monthly') then
raise exception 'Invalid group ranking period';
end if;

if v_metric not in ('score','streak') then
raise exception 'Invalid group ranking metric';
end if;

if v_region='country'
and (v_country is null or v_country !~ '^[A-Z]{2}$') then

return jsonb_build_object(
'rows','[]'::jsonb,
'user',null,
'my_groups','[]'::jsonb,
'total_players',0,
'metric_label',case
when v_metric='streak' then 'Group streak'
when v_game='all' then 'Group Brain Score'
when v_game in (
'brainmix','flagdash','orderup','maphunt','topicrush','brainiword'
) then 'Group Daily points'
else 'Group points'
end,
'country_required',true
);
end if;

if v_period='daily' then
v_period_type:='day';
v_period_start:=v_today;
elsif v_period='weekly' then
v_period_type:='week';
v_period_start:=v_week;
else
v_period_type:='month';
v_period_start:=v_month;
end if;

with group_base as (
select
g.id,
g.name,
g.country_code,
g.crest_icon,
g.crest_color,

(
select count(*)::integer
from public.group_members gm
where gm.group_id=g.id
) as member_count,

exists(
select 1
from public.group_members mine
where mine.group_id=g.id
and mine.user_id=v_me
) as is_mine

from public.groups g

where g.status='active'
and (
v_region='global'
or g.country_code=v_country
)
and not exists(
select 1
from public.admin_ranking_suspensions ars
where ars.entity_type='group'
and ars.entity_id=g.id
and ars.active=true
and (
ars.expires_at is null
or ars.expires_at>now()
)
)
),
scored as (
select
gb.*,

case
when v_metric='streak'
then public.brainilab_group_current_streak(
gb.id
)::bigint

when v_game='all'
and v_period='daily'
then coalesce(gds.group_score,0)

when v_game='all'
and v_period in ('weekly','monthly')
then coalesce(gps.group_score,0)

else coalesce(ggps.group_score,0)
end as score

from group_base gb

left join public.group_daily_stats gds
on gds.group_id=gb.id
and gds.stat_date=v_today

left join public.group_period_stats gps
on gps.group_id=gb.id
and gps.period_type=case
when v_period='weekly' then 'week'
else 'month'
end
and gps.period_start=case
when v_period='weekly' then v_week
else v_month
end

left join public.group_game_period_stats ggps
on ggps.group_id=gb.id
and ggps.game_id=v_game
and ggps.period_type=v_period_type
and ggps.period_start=v_period_start

where gb.member_count>=3
),
eligible as (
select *
from scored
where score>0
),
ranked as (
select
s.*,
rank() over(order by s.score desc) as rank,
row_number() over(
order by
s.score desc,
lower(s.name),
s.id
) as display_order
from eligible s
)
select
coalesce(
jsonb_agg(
jsonb_build_object(
'rank',r.rank,
'group_id',r.id,
'name',r.name,
'country',r.country_code,

'crest',jsonb_build_object(
'icon',r.crest_icon,
'color',r.crest_color
),

'members',r.member_count,
'score',r.score,

'streak',case
when v_metric='streak' then r.score
else public.brainilab_group_current_streak(
r.id
)
end,

'display_value',case
when v_metric='streak'
then r.score::text || ' days'
else to_char(
r.score,
'FM999G999G999G990'
)
end,

'is_me',r.is_mine
)
order by r.display_order
) filter(where r.display_order<=v_limit),
'[]'::jsonb
),

count(*)::integer,

(
select jsonb_build_object(
'rank',mine.rank,
'group_id',mine.id,
'name',mine.name,
'country',mine.country_code,

'crest',jsonb_build_object(
'icon',mine.crest_icon,
'color',mine.crest_color
),

'members',mine.member_count,
'score',mine.score,

'streak',case
when v_metric='streak' then mine.score
else public.brainilab_group_current_streak(
mine.id
)
end,

'display_value',case
when v_metric='streak'
then mine.score::text || ' days'
else to_char(
mine.score,
'FM999G999G999G990'
)
end,

'is_me',true
)
from ranked mine
where mine.is_mine=true
order by mine.rank
limit 1
)

into v_rows,v_total,v_user
from ranked r;


select coalesce(
jsonb_agg(
jsonb_build_object(
'group_id',g.id,
'name',g.name,
'country',g.country_code,

'crest',jsonb_build_object(
'icon',g.crest_icon,
'color',g.crest_color
),

'members',(
select count(*)
from public.group_members cgm
where cgm.group_id=g.id
),

'eligible',(
select count(*)>=3
from public.group_members cgm
where cgm.group_id=g.id
)
)
order by g.created_at desc
),
'[]'::jsonb
)
into v_my_groups
from public.group_members gm
join public.groups g
on g.id=gm.group_id
and g.status='active'
where gm.user_id=v_me;


return jsonb_build_object(
'rows',v_rows,
'user',v_user,
'my_groups',v_my_groups,
'total_players',v_total,

'metric_label',case
when v_metric='streak' then 'Group streak'
when v_game='all' then 'Group Brain Score'
when v_game in (
'brainmix','flagdash','orderup','maphunt','topicrush','brainiword'
) then 'Group Daily points'
else 'Group points'
end,

'period',v_period,
'game_id',v_game,
'region',v_region,
'country',v_country,
'generated_at',now()
);
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
          'completed_today',cardinality(v_completed_daily_games)>0,
          'days',coalesce((select jsonb_agg(jsonb_build_object('date',d.day::date,'completed',coalesce(ds.daily_games_completed,0)>0) order by d.day)
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

CREATE OR REPLACE FUNCTION public.verify_brainilab_quiz_result(p_client_result_id text, p_quiz_pack_id uuid, p_answers jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
v_user_id uuid;
v_session_id uuid;
v_result_id uuid;
v_pack_count integer;
v_answer_count integer;
v_correct integer := 0;
v_pack_question record;
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

select gs.id,gr.id
into v_session_id,v_result_id
from public.game_sessions gs
join public.game_results gr on gr.session_id=gs.id
where gs.user_id=v_user_id
and gs.client_result_id=p_client_result_id
and exists(select 1 from public.quiz_packs qp join public.topics t on t.id=qp.topic_id where qp.id=p_quiz_pack_id and gs.game_id=replace(t.slug,'-',''))
limit 1;

if v_result_id is null then
raise exception 'Game result not found';
end if;

select count(*)
into v_pack_count
from public.quiz_pack_questions qpq
join public.quiz_packs qp on qp.id=qpq.quiz_pack_id
where qpq.quiz_pack_id=p_quiz_pack_id
and qp.status='published';

if v_pack_count <> 20 then
raise exception 'Published quiz pack is not valid';
end if;

v_answer_count := jsonb_array_length(p_answers);

if v_answer_count <> v_pack_count then
raise exception 'Expected % submitted answers, got %',v_pack_count,v_answer_count;
end if;

for v_pack_question in
select
qpq.position,
qpq.question_version_id
from public.quiz_pack_questions qpq
where qpq.quiz_pack_id=p_quiz_pack_id
order by qpq.position
loop
select value
into v_answer
from jsonb_array_elements(p_answers)
where value ->> 'question_version_id'
= v_pack_question.question_version_id::text
limit 1;

if v_answer is null then
raise exception 'Missing answer for pack position %',v_pack_question.position;
end if;

-- Null is a valid skip.
if nullif(v_answer ->> 'selected_option_id','') is null then
v_selected_option_id := null;
v_is_correct := false;
else
begin
v_selected_option_id := (v_answer ->> 'selected_option_id')::uuid;
exception when others then
raise exception 'Invalid option ID at position %',v_pack_question.position;
end;

select qo.is_correct
into v_is_correct
from public.question_options qo
where qo.id=v_selected_option_id
and qo.question_version_id=v_pack_question.question_version_id;

if v_is_correct is null then
raise exception 'Option does not belong to question at position %',v_pack_question.position;
end if;
end if;

if v_is_correct then
v_correct := v_correct + 1;
end if;
end loop;

update public.game_results
set
score=case when created_at>=public.brainilab_rewards_started_at() then v_correct*500 else score end,
correct_answers=v_correct,
total_questions=v_pack_count,
accuracy=round((v_correct::numeric / v_pack_count::numeric)*100,2),
answers_verified=true,
verified_correct_answers=v_correct,
verified_total_questions=v_pack_count,
answers_verified_at=now()
where id=v_result_id;

return jsonb_build_object(
'answers_verified',true,
'correct_answers',v_correct,
'total_questions',v_pack_count,
'accuracy',round((v_correct::numeric / v_pack_count::numeric)*100,2),
'server_score_verified',false
);
end;
$function$;

CREATE OR REPLACE FUNCTION public.verify_brainilab_anytime_quiz_result(p_client_result_id text, p_topic_slug text, p_difficulty text, p_answers jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
v_uid uuid:=auth.uid();
v_topic_id uuid;
v_session_id uuid;
v_result_id uuid;
v_item jsonb;
v_qv uuid;
v_selected uuid;
v_is_correct boolean;
v_correct integer:=0;
v_total integer;
v_seen uuid[]:=array[]::uuid[];
begin
if v_uid is null then raise exception 'Authentication required'; end if;
if p_difficulty not in ('easy','medium','hard') then raise exception 'Invalid difficulty'; end if;
if jsonb_typeof(coalesce(p_answers,'[]'::jsonb))<>'array' then raise exception 'Answers must be an array'; end if;

v_total:=jsonb_array_length(p_answers);
if v_total<1 or v_total>20 then raise exception 'Invalid answer count'; end if;

select t.id into v_topic_id from public.topics t where t.slug=p_topic_slug and t.is_active=true;
if v_topic_id is null then raise exception 'Topic not found'; end if;

select gs.id,gr.id into v_session_id,v_result_id
from public.game_sessions gs
join public.game_results gr on gr.session_id=gs.id
where gs.user_id=v_uid and gs.client_result_id=p_client_result_id
and gs.game_id=replace(p_topic_slug,'-','')
and gs.game_id in ('worldflags','worldcapitals','generalknowledge','science','history','sports')
limit 1;

if v_result_id is null then raise exception 'Game result not found'; end if;

for v_item in select value from jsonb_array_elements(p_answers) loop
begin v_qv:=(v_item->>'question_version_id')::uuid;
exception when others then raise exception 'Invalid question version ID'; end;

if v_qv=any(v_seen) then raise exception 'Duplicate question in result'; end if;
v_seen:=array_append(v_seen,v_qv);

if not exists(
select 1
from public.question_versions qv
join public.questions q on q.id=qv.question_id
where qv.id=v_qv
and qv.primary_topic_id=v_topic_id
and qv.difficulty=p_difficulty
and qv.status='published'
and q.status='active'
) then
raise exception 'Question does not belong to this Play Anytime pool';
end if;

if nullif(v_item->>'selected_option_id','') is null then
v_selected:=null; v_is_correct:=false;
else
begin v_selected:=(v_item->>'selected_option_id')::uuid;
exception when others then raise exception 'Invalid selected option ID'; end;
select qo.is_correct into v_is_correct
from public.question_options qo
where qo.id=v_selected and qo.question_version_id=v_qv;
if v_is_correct is null then raise exception 'Option does not belong to question'; end if;
end if;

if v_is_correct then v_correct:=v_correct+1; end if;

insert into public.verified_question_answers(
result_id,session_id,user_id,question_version_id,selected_option_id,
is_correct,response_time_ms,context_type,context_id
) values(
v_result_id,v_session_id,v_uid,v_qv,v_selected,coalesce(v_is_correct,false),
case when nullif(v_item->>'response_time_ms','') is null then null else greatest(0,(v_item->>'response_time_ms')::integer) end,
'anytime',v_topic_id
) on conflict(result_id,question_version_id) do nothing;
end loop;

update public.game_results
set score=case when created_at>=public.brainilab_rewards_started_at() then v_correct*500 else score end,
correct_answers=v_correct,
total_questions=v_total,
accuracy=round((v_correct::numeric/v_total::numeric)*100,2),
answers_verified=true,
verified_correct_answers=v_correct,
verified_total_questions=v_total,
answers_verified_at=now()
where id=v_result_id;

return jsonb_build_object(
'answers_verified',true,
'correct_answers',v_correct,
'total_questions',v_total,
'accuracy',round((v_correct::numeric/v_total::numeric)*100,2),
'server_score_verified',false
);
end;
$function$;
