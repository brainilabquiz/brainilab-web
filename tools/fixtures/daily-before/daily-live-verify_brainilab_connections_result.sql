CREATE OR REPLACE FUNCTION public.verify_brainilab_connections_result(p_client_result_id text, p_rounds jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid:=auth.uid();
  v_result_id uuid;
  v_session_id uuid;
  v_daily_number integer;
  v_daily_id uuid;
  v_expected_rounds integer;

  v_round jsonb;
  v_puzzle uuid;
  v_choices jsonb;
  v_choice_text text;
  v_choice uuid;
  v_is_correct boolean;
  v_attempts integer;
  v_score integer:=0;
  v_seen uuid[]:=array[]::uuid[];
  v_round_seen_choices uuid[];
  v_i integer;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select gs.id,gr.id,gs.daily_number
  into v_session_id,v_result_id,v_daily_number
  from public.game_sessions gs
  join public.game_results gr on gr.session_id=gs.id
  where gs.user_id=v_uid
    and gs.client_result_id=p_client_result_id
    and gs.game_id='connections'
  limit 1;

  if v_result_id is null then
    raise exception 'Connections result not found';
  end if;

  if v_daily_number is not null then
    v_expected_rounds:=3;

    select dc.id
    into v_daily_id
    from public.daily_challenges dc
    where dc.daily_number=v_daily_number
      and dc.challenge_date=current_date
      and dc.status='published'
    order by dc.generation_version desc
    limit 1;

    if v_daily_id is null
       or not ('connections'=any(public.brainilab_daily_game_ids(current_date))) then
      raise exception 'Connections is not in today''s Daily';
    end if;
  else
    v_expected_rounds:=20;
  end if;

  if jsonb_typeof(coalesce(p_rounds,'[]'::jsonb))<>'array'
     or jsonb_array_length(p_rounds)<>v_expected_rounds then
    raise exception 'Connections requires exactly % rounds in this mode',v_expected_rounds;
  end if;

  for v_round in
    select value from jsonb_array_elements(p_rounds)
  loop
    v_puzzle:=(v_round->>'puzzle_id')::uuid;

    if v_puzzle=any(v_seen) then
      raise exception 'Duplicate Connections puzzle';
    end if;
    v_seen:=array_append(v_seen,v_puzzle);

    if not exists(
      select 1
      from public.connections_puzzles
      where id=v_puzzle
    ) then
      raise exception 'Connections puzzle not found';
    end if;

    if v_daily_id is not null and not exists(
      select 1
      from public.daily_rotating_content
      where daily_challenge_id=v_daily_id
        and game_id='connections'
        and content_id=v_puzzle
        and position between 1 and 3
    ) then
      raise exception 'Connections puzzle is not assigned to today''s Daily';
    end if;

    v_choices:=coalesce(v_round->'attempted_choice_ids','[]'::jsonb);
    if jsonb_typeof(v_choices)<>'array' then
      raise exception 'Invalid Connections attempts';
    end if;

    v_round_seen_choices:=array[]::uuid[];
    v_attempts:=jsonb_array_length(v_choices);

    if v_attempts<1
       or v_attempts>4
       or v_attempts<>coalesce((v_round->>'attempts')::integer,0) then
      raise exception 'Invalid Connections attempt count';
    end if;

    for v_i in 0..v_attempts-1 loop
      v_choice_text:=v_choices->>v_i;
      v_choice:=v_choice_text::uuid;

      if v_choice=any(v_round_seen_choices) then
        raise exception 'Duplicate Connections choice attempt';
      end if;
      v_round_seen_choices:=array_append(v_round_seen_choices,v_choice);

      select cc.is_correct
      into v_is_correct
      from public.connections_choices cc
      where cc.id=v_choice
        and cc.puzzle_id=v_puzzle;

      if v_is_correct is null then
        raise exception 'Choice does not belong to Connections puzzle';
      end if;
      if v_i<v_attempts-1 and v_is_correct then
        raise exception 'A solved round cannot continue after the correct answer';
      end if;
      if v_i=v_attempts-1 and not v_is_correct then
        raise exception 'Connections round must end on the correct answer';
      end if;
    end loop;

    v_score:=v_score+case v_attempts
      when 1 then 1000
      when 2 then 700
      when 3 then 400
      else 200
    end;
  end loop;

  update public.game_results
  set
    score=v_score,
    correct_answers=v_expected_rounds,
    total_questions=v_expected_rounds,
    accuracy=100,
    answers_verified=true,
    verified_correct_answers=v_expected_rounds,
    verified_total_questions=v_expected_rounds,
    answers_verified_at=now()
  where id=v_result_id;

  return jsonb_build_object(
    'answers_verified',true,
    'correct_answers',v_expected_rounds,
    'total_questions',v_expected_rounds,
    'accuracy',100,
    'score',v_score
  );
end;
$function$

