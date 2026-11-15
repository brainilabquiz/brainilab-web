-- Read-only reporting. Game results and content-session outcomes are separate feeds.
create or replace function public.admin_get_game_analytics(p_days integer default 30)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $function$
declare
  v_days integer := least(365, greatest(1, coalesce(p_days, 30)));
  v_since timestamptz := ((now() at time zone 'UTC')::date - (v_days - 1))::timestamp at time zone 'UTC';
  v_payload jsonb;
begin
  perform public.require_brainilab_admin(array['owner','editor']::text[]);

  with catalog(game_id, cloud_tracking) as (values
    ('brainmix', true), ('orderup', true), ('topicrush', true), ('brainiword', true),
    ('generalknowledge', true), ('worldflags', true), ('worldcapitals', true),
    ('science', true), ('history', true), ('sports', true), ('connections', true),
    ('survival', true), ('oddoneout', true), ('higherlower', true), ('mathrush', true),
    ('numberroute', true), ('sequence', true), ('cryptic', false),
    ('europeflags', false), ('gtavi', false)
  ),
  starts_raw as (
    select game_id, user_id, status, last_position, last_seen_at
    from public.content_play_sessions
    where started_at >= v_since
  ),
  starts as (
    select game_id, count(*) as starts,
      count(*) filter (where status = 'completed') as tracked_completions,
      count(*) filter (where status = 'started' and last_seen_at < now() - interval '15 minutes') as exits,
      count(*) filter (where status = 'started' and last_seen_at < now() - interval '15 minutes'
        and last_position = 1) as exits_first_checkpoint
    from starts_raw group by game_id
  ),
  completed_raw as (
    select gs.game_id, gs.user_id, gs.completed_at, gr.score, gr.accuracy, gr.duration_ms, gr.answers_verified
    from public.game_sessions gs join public.game_results gr on gr.session_id = gs.id
    where gs.status = 'completed' and gs.completed_at >= v_since
  ),
  completed as (
    select game_id, count(*) as plays, round(avg(score)::numeric, 1) as avg_score,
      round(avg(accuracy)::numeric, 1) as avg_accuracy,
      round(avg(duration_ms) / 1000.0, 1) as avg_duration_sec,
      max(completed_at) as last_played,
      round(100.0 * count(*) filter (where answers_verified) / count(*), 1) as verified_pct
    from completed_raw group by game_id
  ),
  users_by_game as (
    select game_id, count(distinct user_id) as unique_players
    from (
      select game_id, user_id from starts_raw
      union all
      select game_id, user_id from completed_raw
    ) observed_users
    group by game_id
  ),
  inventory as (
    select game_id from catalog
    union
    select game_id from users_by_game
  ),
  rates as (
    select i.game_id, ca.game_id is not null as in_catalog,
      coalesce(starts, 0) as starts, coalesce(plays, 0) as plays,
      coalesce(tracked_completions, 0) as tracked_completions,
      coalesce(exits, 0) as exits, coalesce(exits_first_checkpoint, 0) as exits_first_checkpoint,
      coalesce(unique_players, 0) as unique_players,
      avg_score, avg_accuracy, avg_duration_sec, last_played, verified_pct,
      round(100.0 * exits / nullif(tracked_completions + exits, 0), 1) as exit_rate,
      round(100.0 * tracked_completions / nullif(tracked_completions + exits, 0), 1) as completion_rate,
      max(coalesce(starts, 0)) over () as max_starts,
      case when starts is not null or plays is not null then 'observed'
        when ca.cloud_tracking then 'unobserved' else 'local_only' end as coverage
    from inventory i
    left join catalog ca using (game_id)
    left join starts s using (game_id)
    left join completed c using (game_id)
    left join users_by_game u using (game_id)
  ),
  scored as (
    select rates.*,
      case when completion_rate is not null then round(
        0.45 * completion_rate
        + 0.25 * greatest(0, least(100, coalesce(avg_accuracy, 65)))
        + 0.30 * (100.0 * starts / nullif(max_starts, 0))
      )::integer end as health_score,
      case when tracked_completions + exits = 0 then 'unavailable'
        when tracked_completions + exits < 10 then 'building' else 'established' end as sample_state
    from rates
  )
  select jsonb_build_object(
    'days', v_days,
    'summary', jsonb_build_object(
      'total_plays', (select count(*) from completed_raw),
      'unique_players', (select count(distinct user_id) from completed_raw),
      'avg_accuracy', (select round(avg(accuracy)::numeric, 1) from completed_raw),
      'top_game', (select game_id from scored where plays > 0 order by plays desc, game_id limit 1)
    ),
    'games', (select jsonb_agg(to_jsonb(scored) - 'max_starts' || jsonb_build_object(
      'health_label', case when health_score is null then 'No sample'
        when sample_state = 'building' then 'Building sample'
        when health_score >= 80 then 'Strong' when health_score >= 60 then 'Healthy'
        when health_score >= 40 then 'Watch' else 'Poor' end
    ) order by health_score, starts desc, game_id) from scored)
  ) into v_payload;
  return v_payload;
end;
$function$;

create or replace function public.admin_get_player_activity(
  p_days integer default 30,
  p_winners_only boolean default true,
  p_offset integer default 0
)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $function$
declare
  v_days integer := least(365, greatest(1, coalesce(p_days, 30)));
  v_since timestamptz := ((now() at time zone 'UTC')::date - (v_days - 1))::timestamp at time zone 'UTC';
  v_offset integer := greatest(0, coalesce(p_offset, 0));
  v_page_size constant integer := 50;
  v_payload jsonb;
begin
  perform public.require_brainilab_admin(array['owner','editor']::text[]);

  with events as (
    select user_id, (started_at at time zone 'UTC')::date as day, false as played, false as won
    from public.content_play_sessions where started_at >= v_since
    union all
    select gs.user_id, (gs.completed_at at time zone 'UTC')::date, true,
      lower(coalesce(gr.result_payload->>'won', 'false')) = 'true'
    from public.game_sessions gs join public.game_results gr on gr.session_id = gs.id
    where gs.status = 'completed' and gs.completed_at >= v_since
  ),
  player_totals as (
    select user_id, count(distinct day) as active_days,
      count(*) filter (where played) as completed_plays,
      count(*) filter (where won) as wins
    from events
    where user_id is not null
    group by user_id
  ),
  players as (
    select t.user_id, p.display_name, t.active_days, t.completed_plays, t.wins
    from player_totals t left join public.profiles p on p.user_id = t.user_id
    where p.guest_claimed_by is null
  ),
  filtered as (
    select * from players where not coalesce(p_winners_only, true) or wins > 0
  ),
  page as (
    select * from filtered
    order by active_days desc, completed_plays desc, user_id
    limit v_page_size offset v_offset
  )
  select jsonb_build_object(
    'summary', (select jsonb_build_object(
      'active_players', count(*),
      'winning_players', count(*) filter (where wins > 0),
      'avg_plays_per_winner', round(avg(completed_plays) filter (where wins > 0), 2),
      'avg_active_days', round(avg(active_days), 2)
    ) from players),
    'total', (select count(*) from filtered),
    'offset', v_offset,
    'page_size', v_page_size,
    'rows', coalesce((select jsonb_agg(to_jsonb(page)
      order by active_days desc, completed_plays desc, user_id) from page), '[]'::jsonb)
  ) into v_payload;
  return v_payload;
end;
$function$;

revoke execute on function public.admin_get_game_analytics(integer) from public, anon;
grant execute on function public.admin_get_game_analytics(integer) to authenticated;
revoke execute on function public.admin_get_player_activity(integer, boolean, integer) from public, anon;
grant execute on function public.admin_get_player_activity(integer, boolean, integer) to authenticated;
