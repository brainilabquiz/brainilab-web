-- Read-only checks. Run with an authorized database connection, never in a public browser.
-- A malformed count is actionable; duplicate-visible counts require editorial review.
with banks as (
 select 'connections' bank,count(*) active,count(*) filter(where jsonb_array_length(clues) not between 4 and 8 or (select count(*) from connections_choices c where c.puzzle_id=p.id)<>4 or (select count(*) from connections_choices c where c.puzzle_id=p.id and c.is_correct)<>1) malformed from connections_puzzles p where is_active
 union all select 'sequence',count(*),count(*) filter(where cardinality(sequence_values)<2 or cardinality(options)<>4 or not(answer_value=any(options)) or (select count(distinct x) from unnest(options)x)<>4) from sequence_puzzles where is_active
 union all select 'numberroute',count(*),count(*) filter(where cardinality(numbers)<>4 or cardinality(solution)<>3) from number_route_puzzles where is_active
 union all select 'brainiword',count(*),count(*) filter(where word!~'^[A-Za-z]{5}$') from brainiword_words where is_active
 union all select 'quiz',count(*),count(*) filter(where trim(coalesce(explanation,''))='' or (select count(*) from question_options o where o.question_version_id=q.id)<>4 or (select count(*) from question_options o where o.question_version_id=q.id and o.is_correct)<>1 or (select count(distinct lower(trim(o.option_text))) from question_options o where o.question_version_id=q.id)<>4) from question_versions q where status='published'
union all select 'oddoneout',count(*),count(*) filter(where jsonb_array_length(items)<>4 or odd_index not between 0 and 3 or trim(coalesce(explanation,''))='') from odd_one_out_puzzles where is_active
 union all select 'higherlower',count(*),count(*) filter(where left_value is null or right_value is null or left_value=right_value or trim(coalesce(explanation,''))='') from higher_lower_pairs where is_active
 union all select 'topicrush',count(*),count(*) filter(where target_count<1 or target_count>(select count(*) from topic_rush_answers a where a.topic_id=t.id)) from topic_rush_topics t where is_active
 union all select 'orderup',count(*),count(*) filter(where (select count(*) from order_up_items i where i.round_id=r.id)<>10 or (select count(distinct sort_position) from order_up_items i where i.round_id=r.id and sort_position between 1 and 10)<>10) from order_up_rounds r where is_active
), days as (
 select d.challenge_date,d.status,g.game,g.position,
 case g.game when 'brainmix' then (select count(*) from daily_challenge_questions where daily_challenge_id=d.id)
 when 'brainiword' then (select count(*) from daily_brainiword b join brainiword_words w on w.id=b.word_id where b.daily_challenge_id=d.id)
 when 'orderup' then (select count(*) from daily_order_up_rounds where daily_challenge_id=d.id)
 when 'topicrush' then (select count(*) from daily_topic_rush r join topic_rush_topics t on t.id=r.topic_id where r.daily_challenge_id=d.id and (select count(*) from topic_rush_answers a where a.topic_id=t.id)>=t.target_count)
 when 'mathrush' then 1
 else (select count(*) from daily_rotating_content where daily_challenge_id=d.id and game_id=g.game) end actual,
 case g.game when 'brainmix' then 10 when 'brainiword' then 1 when 'orderup' then 2 when 'topicrush' then 1 when 'mathrush' then 1 when 'connections' then 3 when 'numberroute' then 3 else 10 end expected
 from daily_challenges d cross join lateral unnest(brainilab_daily_game_ids(d.challenge_date)) with ordinality g(game,position)
 where d.challenge_date between (now() at time zone 'UTC')::date and (now() at time zone 'UTC')::date+7
)
select jsonb_build_object(
 'banks',(select jsonb_agg(to_jsonb(b)) from banks b),
 'duplicate_visible',jsonb_build_object(
   'connections',(select count(*)-count(distinct clues) from connections_puzzles where is_active),
   'sequence',(select count(*)-count(distinct sequence_values) from sequence_puzzles where is_active)),
 'daily',(select jsonb_agg(to_jsonb(d)||jsonb_build_object('ready',actual=expected) order by challenge_date,position) from days d),
 'days_present',(select count(distinct challenge_date) from days),
 'out_of_range_verified_results',(select count(*) from game_results where answers_verified and (correct_answers<0 or correct_answers>total_questions or accuracy<0 or accuracy>100 or score<0)),
 'duplicate_result_sessions',(select count(*) from(select session_id from game_results group by session_id having count(*)>1)d),
 'daily_scores_above_cap',(select count(*) from player_daily_stats where stat_date>='2026-10-01' and daily_brain_score>3500)
) as audit;
