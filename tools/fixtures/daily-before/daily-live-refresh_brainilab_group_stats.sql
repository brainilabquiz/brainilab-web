CREATE OR REPLACE FUNCTION public.refresh_brainilab_group_stats(p_group_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if p_group_id is null then
    return;
  end if;

  -- ----------------------------------------------------------
  -- All-game Daily.
  -- ----------------------------------------------------------

  delete from public.group_daily_stats
  where group_id=p_group_id;

  insert into public.group_daily_stats(
    group_id,
    stat_date,
    member_count,
    active_members,
    group_score,
    eligible,
    top_contributors,
    updated_at
  )
  with members as (
    select gm.user_id
    from public.group_members gm
    where gm.group_id=p_group_id
  ),
  dates as (
    select distinct ds.stat_date
    from public.player_daily_stats ds
    join members m on m.user_id=ds.user_id
  ),
  ranked as (
    select
      d.stat_date,
      m.user_id,
      p.display_name,
      coalesce(ds.daily_brain_score,0)::bigint as score,

      row_number() over(
        partition by d.stat_date
        order by
          coalesce(ds.daily_brain_score,0) desc,
          m.user_id
      ) as rn,

      count(*) over(
        partition by d.stat_date
      )::integer as member_count,

      count(*) filter(
        where coalesce(ds.daily_games_completed,0)>0
      ) over(
        partition by d.stat_date
      )::integer as active_members

    from dates d
    cross join members m
    join public.profiles p
      on p.user_id=m.user_id
    left join public.player_daily_stats ds
      on ds.user_id=m.user_id
     and ds.stat_date=d.stat_date
  )
  select
    p_group_id,
    r.stat_date,
    max(r.member_count),
    max(r.active_members),

    coalesce(
      sum(r.score) filter(where r.rn<=3),
      0
    )::bigint,

    max(r.member_count)>=3,

    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'user_id',r.user_id,
          'name',r.display_name,
          'score',r.score
        )
        order by r.rn
      ) filter(where r.rn<=3),
      '[]'::jsonb
    ),

    now()
  from ranked r
  group by r.stat_date;


  -- ----------------------------------------------------------
  -- All-game Week / Month.
  -- ----------------------------------------------------------

  delete from public.group_period_stats
  where group_id=p_group_id;

  insert into public.group_period_stats(
    group_id,
    period_type,
    period_start,
    member_count,
    active_members,
    group_score,
    eligible,
    top_contributors,
    updated_at
  )
  with members as (
    select gm.user_id
    from public.group_members gm
    where gm.group_id=p_group_id
  ),
  periods as (
    select distinct
      ps.period_type,
      ps.period_start
    from public.player_period_stats ps
    join members m on m.user_id=ps.user_id
  ),
  ranked as (
    select
      periods.period_type,
      periods.period_start,
      m.user_id,
      p.display_name,
      coalesce(ps.daily_brain_score,0)::bigint as score,

      row_number() over(
        partition by periods.period_type,periods.period_start
        order by
          coalesce(ps.daily_brain_score,0) desc,
          m.user_id
      ) as rn,

      count(*) over(
        partition by periods.period_type,periods.period_start
      )::integer as member_count,

      count(*) filter(
        where coalesce(ps.active_days,0)>0
      ) over(
        partition by periods.period_type,periods.period_start
      )::integer as active_members

    from periods
    cross join members m
    join public.profiles p
      on p.user_id=m.user_id
    left join public.player_period_stats ps
      on ps.user_id=m.user_id
     and ps.period_type=periods.period_type
     and ps.period_start=periods.period_start
  )
  select
    p_group_id,
    r.period_type,
    r.period_start,
    max(r.member_count),
    max(r.active_members),

    coalesce(
      sum(r.score) filter(where r.rn<=3),
      0
    )::bigint,

    max(r.member_count)>=3,

    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'user_id',r.user_id,
          'name',r.display_name,
          'score',r.score
        )
        order by r.rn
      ) filter(where r.rn<=3),
      '[]'::jsonb
    ),

    now()
  from ranked r
  group by r.period_type,r.period_start;


  -- ----------------------------------------------------------
  -- Per-game Day / Week / Month.
  --
  -- BrainiWord uses its BrainiLab Daily contribution points rather than
  -- raw attempt counts, so "higher is better" remains consistent.
  -- ----------------------------------------------------------

  delete from public.group_game_period_stats
  where group_id=p_group_id;

  insert into public.group_game_period_stats(
    group_id,
    game_id,
    period_type,
    period_start,
    member_count,
    active_members,
    group_score,
    eligible,
    top_contributors,
    updated_at
  )
  with members as (
    select gm.user_id
    from public.group_members gm
    where gm.group_id=p_group_id
  ),
  periods as (
    select distinct
      gps.game_id,
      gps.period_type,
      gps.period_start
    from public.player_game_period_stats gps
    join members m on m.user_id=gps.user_id
  ),
  ranked as (
    select
      periods.game_id,
      periods.period_type,
      periods.period_start,
      m.user_id,
      p.display_name,

      case
        when periods.game_id='brainiword'
          then coalesce(gps.best_daily_points,0)::bigint
        else coalesce(gps.total_score,0)::bigint
      end as score,

      row_number() over(
        partition by
          periods.game_id,
          periods.period_type,
          periods.period_start
        order by
          case
            when periods.game_id='brainiword'
              then coalesce(gps.best_daily_points,0)
            else coalesce(gps.total_score,0)
          end desc,
          m.user_id
      ) as rn,

      count(*) over(
        partition by
          periods.game_id,
          periods.period_type,
          periods.period_start
      )::integer as member_count,

      count(*) filter(
        where coalesce(gps.games_played,0)>0
      ) over(
        partition by
          periods.game_id,
          periods.period_type,
          periods.period_start
      )::integer as active_members

    from periods
    cross join members m
    join public.profiles p
      on p.user_id=m.user_id
    left join public.player_game_period_stats gps
      on gps.user_id=m.user_id
     and gps.game_id=periods.game_id
     and gps.period_type=periods.period_type
     and gps.period_start=periods.period_start
  )
  select
    p_group_id,
    r.game_id,
    r.period_type,
    r.period_start,
    max(r.member_count),
    max(r.active_members),

    coalesce(
      sum(r.score) filter(where r.rn<=3),
      0
    )::bigint,

    max(r.member_count)>=3,

    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'user_id',r.user_id,
          'name',r.display_name,
          'score',r.score
        )
        order by r.rn
      ) filter(where r.rn<=3),
      '[]'::jsonb
    ),

    now()
  from ranked r
  group by
    r.game_id,
    r.period_type,
    r.period_start;
end;
$function$

