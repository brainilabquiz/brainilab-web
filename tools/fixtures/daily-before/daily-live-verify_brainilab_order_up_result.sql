CREATE OR REPLACE FUNCTION public.verify_brainilab_order_up_result(p_client_result_id text, p_daily_challenge_id uuid, p_rounds jsonb)
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
  v_round record;
  v_submission jsonb;
  v_eval jsonb;
  v_score integer:=0;
  v_exact integer:=0;
  v_pairs integer:=0;
  v_accuracy numeric:=0;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if jsonb_typeof(coalesce(p_rounds,'[]'::jsonb))<>'array'
     or jsonb_array_length(p_rounds)<>2 then
    raise exception 'Order Up verification requires exactly 2 rounds';
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
    and gs.game_id='orderup'
  limit 1;

  if v_result_id is null then
    raise exception 'Order Up result not found';
  end if;

  select dc.daily_number
    into v_daily_number
  from public.daily_challenges dc
  where dc.id=p_daily_challenge_id
    and dc.status in ('published','retired');

  if v_daily_number is null then
    raise exception 'Order Up Daily not found';
  end if;

  if (
    select count(*)
    from public.daily_order_up_rounds dour
    where dour.daily_challenge_id=p_daily_challenge_id
  )<>2 then
    raise exception 'Order Up Daily does not contain exactly 2 rounds';
  end if;

  for v_round in
    select
      dour.position,
      dour.round_id
    from public.daily_order_up_rounds dour
    where dour.daily_challenge_id=p_daily_challenge_id
    order by dour.position
  loop
    select x.value
      into v_submission
    from jsonb_array_elements(p_rounds) x(value)
    where x.value->>'round_id'=v_round.round_id::text
    limit 1;

    if v_submission is null then
      raise exception 'Missing Order Up round %',v_round.position;
    end if;

    v_eval:=public.brainilab_score_order_up_round(
      v_round.round_id,
      v_submission->'item_ids'
    );

    v_score:=v_score+coalesce((v_eval->>'score')::integer,0);
    v_exact:=v_exact+coalesce((v_eval->>'exact_positions')::integer,0);
    v_pairs:=v_pairs+coalesce((v_eval->>'correct_pairs')::integer,0);
  end loop;

  v_score:=least(2500,greatest(0,v_score));
  v_accuracy:=round(v_pairs::numeric/90.0*100,2);

  update public.game_sessions
  set
    daily_challenge_id=p_daily_challenge_id,
    daily_number=v_daily_number
  where id=v_session_id;

  update public.game_results
  set
    score=v_score,
    correct_answers=v_exact,
    total_questions=20,
    accuracy=v_accuracy,
    answers_verified=true,
    verified_correct_answers=v_exact,
    verified_total_questions=20,
    answers_verified_at=now(),
    result_payload=
      coalesce(result_payload,'{}'::jsonb)
      || jsonb_build_object(
        'verifiedOrderPairsCorrect',v_pairs,
        'verifiedOrderPairsTotal',90,
        'verifiedOrderAccuracy',v_accuracy,
        'verifiedOrderUpRounds',2
      )
  where id=v_result_id;

  return jsonb_build_object(
    'answers_verified',true,
    'daily_number',v_daily_number,
    'correct',v_exact,
    'total',20,
    'accuracy',v_accuracy,
    'score',v_score,
    'daily_points',v_score,
    'correct_pairs',v_pairs,
    'total_pairs',90,
    'server_score_verified',false
  );
end;
$function$

