-- Use the actual four-game rotation, preserving admin authorization and existing fields.
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

  select jsonb_agg(jsonb_build_object('game_id',g.game,'count',g.actual,'expected',g.expected,'ready',g.actual=g.expected) order by g.position)
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
      v_easy=4 and v_medium=4 and v_hard=2 and not exists(select 1 from jsonb_array_elements(v_game_health) g where not (g->>'ready')::boolean),
    'game_health',v_game_health,

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
