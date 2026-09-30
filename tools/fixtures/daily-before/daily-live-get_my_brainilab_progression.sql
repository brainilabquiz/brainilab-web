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
$function$

