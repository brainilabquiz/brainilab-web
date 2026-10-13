-- Add an optional historical ranking without changing saved scores or access.
-- Atomic regression checks abort the migration if existing results change.
DO $guard$ BEGIN
IF (SELECT md5(pg_get_functiondef(oid)) FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname='brainilab_player_rank_value') IS DISTINCT FROM 'b864910d13c0997c0d2c766f0be6f1c9' THEN RAISE EXCEPTION 'Concurrent ranking function change: brainilab_player_rank_value'; END IF;
IF (SELECT md5(pg_get_functiondef(oid)) FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname='get_brainilab_group_rankings') IS DISTINCT FROM 'e4098c0882680e6f46dbdb235419abd1' THEN RAISE EXCEPTION 'Concurrent ranking function change: get_brainilab_group_rankings'; END IF;
IF (SELECT md5(pg_get_functiondef(oid)) FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname='get_brainilab_individual_rankings') IS DISTINCT FROM '4136942e99fea57158ab421ee039539f' THEN RAISE EXCEPTION 'Concurrent ranking function change: get_brainilab_individual_rankings'; END IF;
IF (SELECT md5(pg_get_functiondef(oid)) FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname='get_my_brainilab_friends_ranking') IS DISTINCT FROM '8e049432c2944d3d9706dda1f306d858' THEN RAISE EXCEPTION 'Concurrent ranking function change: get_my_brainilab_friends_ranking'; END IF;
END $guard$;

CREATE TEMP TABLE ranking_security_before ON COMMIT DROP AS
SELECT oid,proacl,prosecdef,proconfig,proowner FROM pg_proc
WHERE pronamespace='public'::regnamespace AND proname IN ('get_brainilab_group_rankings','get_brainilab_individual_rankings','brainilab_player_rank_value','get_my_brainilab_friends_ranking');
CREATE TEMP TABLE ranking_values_before ON COMMIT DROP AS
SELECT p.user_id,period,game,metric,
public.brainilab_player_rank_value(p.user_id,period,game,metric) AS score
FROM public.profiles p
CROSS JOIN unnest(ARRAY['daily','weekly','monthly']) AS period
CROSS JOIN unnest(ARRAY['all','brainmix','flagdash','orderup','maphunt','topicrush','brainiword','connections','mathrush','sequence','numberroute','oddoneout','higherlower','science','history','survival','worldcapitals','worldflags','generalknowledge']) AS game
CROSS JOIN unnest(ARRAY['score','streak']) AS metric;
CREATE TEMP TABLE ranking_public_before ON COMMIT DROP AS
SELECT region,period,game,metric,
public.get_brainilab_individual_rankings(region,'ES',period,game,metric,100)-'generated_at' AS result
FROM unnest(ARRAY['global','country']) AS region
CROSS JOIN unnest(ARRAY['daily','weekly','monthly']) AS period
CROSS JOIN unnest(ARRAY['all','brainmix','flagdash','orderup','maphunt','topicrush','brainiword','connections','mathrush','sequence','numberroute','oddoneout','higherlower','science','history','survival','worldcapitals','worldflags','generalknowledge']) AS game
CROSS JOIN unnest(ARRAY['score','streak']) AS metric;
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

if v_period not in ('daily','weekly','monthly','alltime') then
return 0;
end if;

-- All games: Daily Brain Score.
if v_game='all' then
if v_period='alltime' then
select coalesce(sum(ds.daily_brain_score),0)::bigint
into v_value
from public.player_daily_stats ds
where ds.user_id=p_user_id and ds.stat_date<=v_today;
elsif v_period='daily' then
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
or (v_period='alltime' and ds.stat_date<=v_today)
);

return coalesce(v_value,0);
end if;

-- Sum day records only: week/month records already include the same points.
if v_period='alltime' then
select coalesce(sum(gps.total_score),0)::bigint into v_value
from public.player_game_period_stats gps
where gps.user_id=p_user_id and gps.game_id=v_game
and gps.period_type='day' and gps.period_start<=v_today;
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

if v_period not in ('daily','weekly','monthly','alltime') then
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
when 'alltime' then '-infinity'::date
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

if v_period not in ('daily','weekly','monthly','alltime') then
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

if v_period not in ('daily','weekly','monthly','alltime') then
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

-- Historical team scores retain the top-three contribution saved each day.
when v_period='alltime' and v_game='all'
then (select coalesce(sum(history.group_score),0)::bigint
from public.group_daily_stats history
where history.group_id=gb.id and history.stat_date<=v_today)

when v_period='alltime'
then (select coalesce(sum(history.group_score),0)::bigint
from public.group_game_period_stats history
where history.group_id=gb.id and history.game_id=v_game
and history.period_type='day' and history.period_start<=v_today)

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

DO $checks$
DECLARE r record; actual bigint; expected bigint; rejected boolean;
BEGIN
IF EXISTS(SELECT 1 FROM ranking_security_before b JOIN pg_proc p ON p.oid=b.oid
WHERE p.proacl IS DISTINCT FROM b.proacl OR p.prosecdef IS DISTINCT FROM b.prosecdef
OR p.proconfig IS DISTINCT FROM b.proconfig OR p.proowner IS DISTINCT FROM b.proowner)
THEN RAISE EXCEPTION 'Ranking access settings changed'; END IF;
IF EXISTS(SELECT 1 FROM ranking_values_before b
WHERE public.brainilab_player_rank_value(b.user_id,b.period,b.game,b.metric) IS DISTINCT FROM b.score)
THEN RAISE EXCEPTION 'Existing player scores changed'; END IF;
IF EXISTS(SELECT 1 FROM ranking_public_before b
WHERE public.get_brainilab_individual_rankings(b.region,'ES',b.period,b.game,b.metric,100)-'generated_at' IS DISTINCT FROM b.result)
THEN RAISE EXCEPTION 'Existing public rankings changed'; END IF;

FOR r IN SELECT p.user_id,game FROM public.profiles p CROSS JOIN unnest(ARRAY['all','brainmix','flagdash','orderup','maphunt','topicrush','brainiword','connections','mathrush','sequence','numberroute','oddoneout','higherlower','science','history','survival','worldcapitals','worldflags','generalknowledge']) AS game LOOP
  IF r.game='all' THEN
    SELECT coalesce(sum(ds.daily_brain_score),0)::bigint INTO expected FROM public.player_daily_stats ds
    WHERE ds.user_id=r.user_id AND ds.stat_date<=(now() at time zone 'UTC')::date;
  ELSIF r.game IN ('brainmix','flagdash','orderup','maphunt','topicrush','brainiword') THEN
    SELECT coalesce(sum(CASE r.game
      WHEN 'brainmix' THEN ds.brainmix_points WHEN 'flagdash' THEN ds.flagdash_points
      WHEN 'orderup' THEN ds.orderup_points WHEN 'maphunt' THEN ds.maphunt_points
      WHEN 'topicrush' THEN CASE WHEN ds.stat_date>=(SELECT launch_date FROM public.topic_rush_settings WHERE singleton=true) THEN greatest(ds.topicrush_points,ds.maphunt_points) ELSE 0 END
      WHEN 'brainiword' THEN ds.brainiword_points ELSE 0 END),0)::bigint INTO expected
    FROM public.player_daily_stats ds WHERE ds.user_id=r.user_id AND ds.stat_date<=(now() at time zone 'UTC')::date;
  ELSE
    SELECT coalesce(sum(total_score),0)::bigint INTO expected FROM public.player_game_period_stats
    WHERE user_id=r.user_id AND game_id=r.game AND period_type='day' AND period_start<=(now() at time zone 'UTC')::date;
  END IF;
  actual:=public.brainilab_player_rank_value(r.user_id,'alltime',r.game,'score');
  IF actual IS DISTINCT FROM expected THEN RAISE EXCEPTION 'All-time total mismatch'; END IF;
  IF public.brainilab_player_rank_value(r.user_id,'alltime',r.game,'streak') IS DISTINCT FROM public.brainilab_player_rank_value(r.user_id,'daily',r.game,'streak') THEN RAISE EXCEPTION 'Current streak changed'; END IF;
END LOOP;

-- Anonymous access must not reveal friends or teams after adding a period.
IF auth.uid() IS NULL THEN
 rejected:=false;
 BEGIN PERFORM public.get_my_brainilab_friends_ranking('alltime','all','score');
 EXCEPTION WHEN OTHERS THEN IF SQLERRM='Authentication required' THEN rejected:=true; ELSE RAISE; END IF; END;
 IF NOT rejected THEN RAISE EXCEPTION 'Friends authentication guard changed'; END IF;
 rejected:=false;
 BEGIN PERFORM public.get_brainilab_group_rankings('global',NULL,'alltime','all','score',100);
 EXCEPTION WHEN OTHERS THEN IF SQLERRM='Authentication required' THEN rejected:=true; ELSE RAISE; END IF; END;
 IF NOT rejected THEN RAISE EXCEPTION 'Group authentication guard changed'; END IF;
END IF;
rejected:=false;
BEGIN PERFORM public.get_brainilab_individual_rankings('global',NULL,'invalid','all','score',100);
EXCEPTION WHEN OTHERS THEN IF SQLERRM='Invalid ranking period' THEN rejected:=true; ELSE RAISE; END IF; END;
IF NOT rejected THEN RAISE EXCEPTION 'Period validation removed'; END IF;
PERFORM public.get_brainilab_individual_rankings('global',NULL,'alltime','all','score',100);
END $checks$;
