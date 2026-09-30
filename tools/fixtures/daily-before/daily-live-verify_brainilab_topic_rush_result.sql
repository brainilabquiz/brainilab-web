CREATE OR REPLACE FUNCTION public.verify_brainilab_topic_rush_result(p_client_result_id text, p_daily_challenge_id uuid, p_answers jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid:=auth.uid();
  v_session_id uuid;
  v_result_id uuid;
  v_daily_number integer;
  v_target integer;
  v_topic_id uuid;
  v_answer jsonb;
  v_norm text;
  v_answer_id uuid;
  v_valid_ids uuid[]:='{}'::uuid[];
  v_correct integer:=0;
  v_score integer:=0;
  v_accuracy numeric:=0;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if jsonb_typeof(coalesce(p_answers,'[]'::jsonb))<>'array' then
    raise exception 'Topic Rush answers must be an array';
  end if;

  if jsonb_array_length(p_answers)>120 then
    raise exception 'Too many Topic Rush submissions';
  end if;

  select
    gs.id,
    gr.id
  into
    v_session_id,
    v_result_id
  from public.game_sessions gs
  join public.game_results gr
    on gr.session_id=gs.id
  where gs.user_id=v_user_id
    and gs.client_result_id=p_client_result_id
    and gs.game_id='topicrush'
  limit 1;

  if v_result_id is null then
    raise exception 'Topic Rush result not found';
  end if;

  select
    dc.daily_number,
    dtr.topic_id,
    trt.target_count
  into
    v_daily_number,
    v_topic_id,
    v_target
  from public.daily_challenges dc
  join public.daily_topic_rush dtr
    on dtr.daily_challenge_id=dc.id
  join public.topic_rush_topics trt
    on trt.id=dtr.topic_id
  where dc.id=p_daily_challenge_id
    and dc.status in ('published','retired');

  if v_topic_id is null then
    raise exception 'Topic Rush Daily not found';
  end if;

  update public.game_sessions
  set
    daily_challenge_id=p_daily_challenge_id,
    daily_number=v_daily_number
  where id=v_session_id;

  for v_answer in
    select value
    from jsonb_array_elements(p_answers)
  loop
    v_norm:=public.brainilab_normalize_topic_rush_answer(
      coalesce(v_answer#>>'{}','')
    );

    if v_norm='' then
      continue;
    end if;

    select tra.id
      into v_answer_id
    from public.topic_rush_answers tra
    where tra.topic_id=v_topic_id
      and (
        tra.normalized_answer=v_norm
        or v_norm=any(tra.normalized_aliases)
      )
    limit 1;

    if v_answer_id is not null
       and not (v_answer_id=any(v_valid_ids)) then
      v_valid_ids:=array_append(v_valid_ids,v_answer_id);
    end if;
  end loop;

  v_correct:=coalesce(cardinality(v_valid_ids),0);
  v_score:=least(
    2500,
    greatest(
      0,
      round(
        v_correct::numeric
        / greatest(v_target,1)::numeric
        * 2500
      )::integer
    )
  );

  v_accuracy:=least(
    100,
    round(
      v_correct::numeric
      / greatest(v_target,1)::numeric
      * 100,
      2
    )
  );

  update public.game_results
  set
    score=v_score,
    correct_answers=v_correct,
    total_questions=v_target,
    accuracy=v_accuracy,
    answers_verified=true,
    verified_correct_answers=v_correct,
    verified_total_questions=v_target,
    answers_verified_at=now(),
    result_payload=
      coalesce(result_payload,'{}'::jsonb)
      || jsonb_build_object(
        'verifiedTargetCount',v_target,
        'verifiedTopicId',v_topic_id,
        'verifiedValidAnswers',v_correct
      )
  where id=v_result_id;

  return jsonb_build_object(
    'answers_verified',true,
    'daily_number',v_daily_number,
    'correct',v_correct,
    'total',v_target,
    'accuracy',v_accuracy,
    'score',v_score,
    'daily_points',v_score,
    'server_score_verified',false
  );
end;
$function$

