-- Only appearance projections are added to the existing authorized responses.
-- No player, score, XP, membership, visibility or ranking calculation is updated.
begin;
-- Abort instead of overwriting a concurrent RPC edit.
do $cas$ begin
  if (select md5(pg_get_functiondef(p.oid)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='get_brainilab_individual_rankings') is distinct from '636ce0ef707964e0e6a0717427fd6aee' then raise exception 'Concurrent RPC edit: get_brainilab_individual_rankings'; end if;
  if (select md5(pg_get_functiondef(p.oid)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='get_my_brainilab_friends') is distinct from '88c46e6339cbf49546eafd86bab0e1f3' then raise exception 'Concurrent RPC edit: get_my_brainilab_friends'; end if;
  if (select md5(pg_get_functiondef(p.oid)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='get_my_brainilab_friends_ranking') is distinct from '63f7127df47811f236a873e843a3a292' then raise exception 'Concurrent RPC edit: get_my_brainilab_friends_ranking'; end if;
  if (select md5(pg_get_functiondef(p.oid)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='get_my_brainilab_groups') is distinct from '593bef295084b1748c3fecaebbcb654a' then raise exception 'Concurrent RPC edit: get_my_brainilab_groups'; end if;
end $cas$;
create schema if not exists brainilab_private;
revoke all on schema brainilab_private from public, anon, authenticated;

-- Invoked only by the existing definer RPCs after their authorization/filtering.
-- Auth metadata is untrusted cosmetic input, never an authorization or XP source.
create or replace function brainilab_private.player_avatar(p_user_id uuid)
returns jsonb language plpgsql stable security invoker set search_path = '' as $avatar$
declare
  v_catalog constant jsonb := '{"mode":[["picture",0],["built",0]],"skin":[["sand",0],["peach",0],["honey",0],["cocoa",0],["umber",0],["ebony",0]],"hair":[["sweep",0],["curls",0],["bob",0],["crop",0],["bald",0],["ponytail",0],["waves",0],["braids",0]],"hairColor":[["brown",0],["black",0],["blond",0],["auburn",0],["silver",0]],"shirt":[["navy",0],["green",0],["orange",0],["blue",0],["berry",0]],"background":[["lilac",0],["sky",0],["sage",0],["sunshine",0],["coral",0]],"glasses":[["none",0],["round",150],["square",600],["sun",1000],["star",3500],["visor",5000]],"hat":[["none",0],["beanie",500],["egg",1200],["cap",1500],["cloud",4000],["wizard",6000],["graduate",8000]],"prop":[["none",0],["cookie",300],["icepop",800],["peas",1800],["bulb",2500],["pencil",4500],["rocket",7000],["book",9000]],"frame":[["level",0],["blue",100],["green",500],["copper",1500],["gold",3000],["orbit",6000]]}'::jsonb;
  v_meta jsonb; v_xp bigint; v_key text; v_choices jsonb; v_item jsonb;
  v_value text; v_default text; v_cost integer; v_render_xp integer := 0; v_frame_cost integer := 0;
  v_design jsonb := '{}'::jsonb; v_frame text := 'level';
begin
  select coalesce(u.raw_user_meta_data,'{}'::jsonb),greatest(0,coalesce(pp.xp,0))
  into v_meta,v_xp from auth.users u left join public.player_progression pp on pp.user_id=u.id
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
  if v_design->>'mode'<>'built' and v_frame='level' then return null; end if;
  if v_design->>'mode'<>'built' then v_render_xp:=v_frame_cost; end if;
  -- render_xp is only the minimum threshold needed to render these unlocked items.
  -- The public ranking receives neither total XP, auth metadata, email nor user ID.
  return pg_catalog.jsonb_build_object('design',case when v_design->>'mode'='built' then v_design else null end,
    'frame',v_frame,'render_xp',v_render_xp);
end;
$avatar$;
revoke all on function brainilab_private.player_avatar(uuid) from public, anon, authenticated;
comment on function brainilab_private.player_avatar(uuid) is 'Allowlisted XP-gated cosmetics for existing authorized social RPCs; no direct client access.';

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
p.leaderboard_visibility_explicit,
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
'avatar_style',case when r.leaderboard_visibility_explicit then brainilab_private.player_avatar(r.user_id) else null end,
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
'avatar_style',case when mine.leaderboard_visibility_explicit then brainilab_private.player_avatar(mine.user_id) else null end,
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_my_brainilab_friends()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid:=auth.uid();
  v_today date:=(now() at time zone 'UTC')::date;
  v_week date:=date_trunc('week',(now() at time zone 'UTC'))::date;
  v_month date:=date_trunc('month',(now() at time zone 'UTC'))::date;
  v_code text;
  v_friends jsonb;
  v_incoming jsonb;
  v_outgoing jsonb;
begin
  if v_me is null then
    raise exception 'Authentication required';
  end if;

  select p.friend_code
    into v_code
  from public.profiles p
  where p.user_id=v_me;

  with friend_ids as (
    select
      case
        when f.user_a=v_me then f.user_b
        else f.user_a
      end as friend_user_id,
      f.created_at
    from public.friendships f
    where f.user_a=v_me or f.user_b=v_me
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'user_id',fi.friend_user_id,
        'name',p.display_name,
        'avatar_url',p.avatar_url,
        'avatar_style',brainilab_private.player_avatar(p.user_id),
        'avatar',upper(left(p.display_name,1)),
        'country',p.country_code,

        'current_streak',coalesce(pp.current_streak,0),
        'best_streak',coalesce(pp.best_streak,0),
        'xp',coalesce(pp.xp,0),
        'level',coalesce(pp.level,1),

        'daily_score',coalesce(ds.daily_brain_score,0),
        'daily_games_completed',coalesce(ds.daily_games_completed,0),
        'full_daily',coalesce(ds.full_daily,false),

        'weekly_score',coalesce(ws.daily_brain_score,0),
        'monthly_score',coalesce(ms.daily_brain_score,0),

        'friends_since',fi.created_at
      )
      order by
        coalesce(ds.daily_brain_score,0) desc,
        p.display_name
    ),
    '[]'::jsonb
  )
  into v_friends
  from friend_ids fi
  join public.profiles p
    on p.user_id=fi.friend_user_id
  left join public.player_progression pp
    on pp.user_id=fi.friend_user_id
  left join public.player_daily_stats ds
    on ds.user_id=fi.friend_user_id
   and ds.stat_date=v_today
  left join public.player_period_stats ws
    on ws.user_id=fi.friend_user_id
   and ws.period_type='week'
   and ws.period_start=v_week
  left join public.player_period_stats ms
    on ms.user_id=fi.friend_user_id
   and ms.period_type='month'
   and ms.period_start=v_month;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',fr.id,
        'user_id',fr.sender_id,
        'name',p.display_name,
        'avatar_url',p.avatar_url,
        'avatar_style',brainilab_private.player_avatar(p.user_id),
        'avatar',upper(left(p.display_name,1)),
        'country',p.country_code,
        'direction','incoming',
        'created_at',fr.created_at
      )
      order by fr.created_at desc
    ),
    '[]'::jsonb
  )
  into v_incoming
  from public.friend_requests fr
  join public.profiles p
    on p.user_id=fr.sender_id
  where fr.receiver_id=v_me
    and fr.status='pending';

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',fr.id,
        'user_id',fr.receiver_id,
        'name',p.display_name,
        'avatar_url',p.avatar_url,
        'avatar_style',brainilab_private.player_avatar(p.user_id),
        'avatar',upper(left(p.display_name,1)),
        'country',p.country_code,
        'direction','outgoing',
        'created_at',fr.created_at
      )
      order by fr.created_at desc
    ),
    '[]'::jsonb
  )
  into v_outgoing
  from public.friend_requests fr
  join public.profiles p
    on p.user_id=fr.receiver_id
  where fr.sender_id=v_me
    and fr.status='pending';

  return jsonb_build_object(
    'friend_code',v_code,
    'friends',v_friends,
    'incoming',v_incoming,
    'outgoing',v_outgoing,
    'friend_count',jsonb_array_length(v_friends),
    'incoming_count',jsonb_array_length(v_incoming),
    'outgoing_count',jsonb_array_length(v_outgoing),
    'generated_at',now()
  );
end;
$function$
;

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
'avatar_style',brainilab_private.player_avatar(r.user_id),
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
'avatar_style',brainilab_private.player_avatar(mine.user_id),
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_my_brainilab_groups()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid:=auth.uid();
  v_today date:=(now() at time zone 'UTC')::date;
  v_week date:=date_trunc(
    'week',
    (now() at time zone 'UTC')
  )::date;
  v_month date:=date_trunc(
    'month',
    (now() at time zone 'UTC')
  )::date;

  v_groups jsonb;
  v_received jsonb;
begin
  if v_me is null then
    raise exception 'Authentication required';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',g.id,
        'name',g.name,
        'country',g.country_code,
        'owner_id',g.owner_id,
        'my_role',my_gm.role,

        'crest',jsonb_build_object(
          'icon',g.crest_icon,
          'color',g.crest_color
        ),

        'invite_code',case
          when my_gm.role in ('owner','admin')
            then g.invite_code
          else null
        end,

        'member_count',(
          select count(*)
          from public.group_members count_gm
          where count_gm.group_id=g.id
        ),

        'eligible',(
          select count(*)>=3
          from public.group_members count_gm
          where count_gm.group_id=g.id
        ),

        'current_streak',
          public.brainilab_group_current_streak(g.id),

        'daily_score',coalesce(gds.group_score,0),
        'daily_active_members',coalesce(gds.active_members,0),

        'weekly_score',coalesce(gws.group_score,0),
        'monthly_score',coalesce(gms.group_score,0),

        'members',coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'user_id',gm.user_id,
              'name',p.display_name,
              'avatar',upper(left(p.display_name,1)),
              'avatar_url',p.avatar_url,
                    'avatar_style',brainilab_private.player_avatar(p.user_id),
              'country',p.country_code,
              'role',gm.role,

              'current_streak',coalesce(pp.current_streak,0),
              'xp',coalesce(pp.xp,0),
              'level',coalesce(pp.level,1),
              'daily_score',coalesce(ds.daily_brain_score,0),

              'joined_at',gm.joined_at
            )
            order by
              case gm.role
                when 'owner' then 1
                when 'admin' then 2
                else 3
              end,
              p.display_name
          )
          from public.group_members gm
          join public.profiles p
            on p.user_id=gm.user_id
          left join public.player_progression pp
            on pp.user_id=gm.user_id
          left join public.player_daily_stats ds
            on ds.user_id=gm.user_id
           and ds.stat_date=v_today
          where gm.group_id=g.id
        ),'[]'::jsonb),

        'pending_invites',coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id',gi.id,
              'user_id',gi.target_user_id,
              'name',p.display_name,
              'avatar',upper(left(p.display_name,1)),
              'country',p.country_code,
              'created_at',gi.created_at
            )
            order by gi.created_at desc
          )
          from public.group_invites gi
          join public.profiles p
            on p.user_id=gi.target_user_id
          where gi.group_id=g.id
            and gi.status='pending'
            and gi.target_user_id is not null
        ),'[]'::jsonb),

        'created_at',g.created_at
      )
      order by g.created_at desc
    ),
    '[]'::jsonb
  )
  into v_groups
  from public.group_members my_gm
  join public.groups g
    on g.id=my_gm.group_id
   and g.status='active'

  left join public.group_daily_stats gds
    on gds.group_id=g.id
   and gds.stat_date=v_today

  left join public.group_period_stats gws
    on gws.group_id=g.id
   and gws.period_type='week'
   and gws.period_start=v_week

  left join public.group_period_stats gms
    on gms.group_id=g.id
   and gms.period_type='month'
   and gms.period_start=v_month

  where my_gm.user_id=v_me;


  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',gi.id,
        'group_id',g.id,
        'group_name',g.name,
        'country',g.country_code,

        'crest',jsonb_build_object(
          'icon',g.crest_icon,
          'color',g.crest_color
        ),

        'inviter_id',gi.inviter_id,
        'inviter_name',p.display_name,

        'member_count',(
          select count(*)
          from public.group_members gm
          where gm.group_id=g.id
        ),

        'created_at',gi.created_at
      )
      order by gi.created_at desc
    ),
    '[]'::jsonb
  )
  into v_received
  from public.group_invites gi
  join public.groups g
    on g.id=gi.group_id
   and g.status='active'
  join public.profiles p
    on p.user_id=gi.inviter_id
  where gi.target_user_id=v_me
    and gi.status='pending';


  return jsonb_build_object(
    'groups',v_groups,
    'received_invites',v_received,
    'group_count',jsonb_array_length(v_groups),
    'generated_at',now()
  );
end;
$function$
;

-- CREATE OR REPLACE retains each existing RPC owner and EXECUTE ACL.
commit;
