-- One answer per Connections round; coherent zero, overflow and completed-game validation.
-- No historical scores, player rows, grants or policies are changed.
begin;

-- Abort rather than overwrite a concurrently updated function.
do $guard$ begin
 if exists(select 1 from (values ('check_brainilab_connections_guess','13d4545b004c0fd42103d9a00296c001'),('verify_brainilab_connections_result','6c81b30466a833830c4019fdd4cedce8'),('verify_brainilab_math_rush_result','3a5b245b9ca77fbb98b54689616d71af'),('verify_brainilab_number_route_result','0a26fb56629d8129ad0ff2b42e354384'),('verify_brainilab_survival_result','101c1ccca8ccdbfdd63f13a048059334'),('verify_brainilab_topic_rush_result','c9fae08b4622aea5f0a47f99f03061f9')) expected(name,fingerprint)
   join pg_proc p on p.proname=expected.name join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and md5(pg_get_functiondef(p.oid))<>expected.fingerprint)
 then raise exception 'Game verifier changed since audit; rebase this migration';end if;
end;$guard$;
CREATE OR REPLACE FUNCTION public.check_brainilab_connections_guess(p_puzzle_id uuid, p_choice_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_correct boolean;
  v_answer text;
  v_explanation text;
begin
  select cc.is_correct into v_correct
  from public.connections_choices cc
  join public.connections_puzzles cp on cp.id=cc.puzzle_id
  where cc.id=p_choice_id and cc.puzzle_id=p_puzzle_id and cp.is_active=true;

  if v_correct is null then raise exception 'Connection choice not available'; end if;

    select cc.choice_text,cp.explanation into v_answer,v_explanation
    from public.connections_choices cc
    join public.connections_puzzles cp on cp.id=cc.puzzle_id
    where cc.puzzle_id=p_puzzle_id and cc.is_correct=true;

  return jsonb_build_object('correct',v_correct,'answer',v_answer,'explanation',v_explanation,'correct_choice_id',(select id from public.connections_choices where puzzle_id=p_puzzle_id and is_correct=true limit 1));
end;
$function$;

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
  v_correct integer:=0;
  v_first_correct boolean;
  v_existing jsonb;
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
  limit 1 for update of gr;

  if v_result_id is null then
    raise exception 'Connections result not found';
  end if;

  select jsonb_build_object('answers_verified',true,'correct_answers',correct_answers,'total_questions',total_questions,'accuracy',accuracy,'score',score)
    into v_existing from public.game_results where id=v_result_id and answers_verified=true;
  if v_existing is not null then return v_existing; end if;

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

  if p_rounds is null or jsonb_typeof(p_rounds) is distinct from 'array'
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

    v_first_correct:=false;
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
      v_first_correct:=false;
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
      if v_i=0 then v_first_correct:=v_is_correct; end if;
    end loop;

    -- Old open tabs may send multiple attempts. Only the first answer counts.
    if v_first_correct then v_correct:=v_correct+1;v_score:=v_score+1000;end if;
  end loop;

  update public.game_results
  set
    score=v_score,
    correct_answers=v_correct,
    total_questions=v_expected_rounds,
    accuracy=round(v_correct::numeric/v_expected_rounds*100,2),
    answers_verified=true,
    verified_correct_answers=v_correct,
    verified_total_questions=v_expected_rounds,
    answers_verified_at=now()
  where id=v_result_id;

  return jsonb_build_object(
    'answers_verified',true,
    'correct_answers',v_correct,
    'total_questions',v_expected_rounds,
    'accuracy',round(v_correct::numeric/v_expected_rounds*100,2),
    'score',v_score
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.verify_brainilab_number_route_result(p_client_result_id text, p_rounds jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid:=auth.uid();
  v_result uuid;
  v_daily_number integer;
  v_daily_id uuid;
  v_expected_rounds integer;

  v_row jsonb;
  v_id uuid;
  v_ops text[];
  v_solution text[];
  v_attempts integer;
  v_skipped boolean;
  v_response_ms integer;
  v_round_index integer:=0;
  v_round_cap integer;
  v_round_score integer;

  v_correct integer:=0;
  v_score integer:=0;
  v_seen uuid[]:=array[]::uuid[];
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select gr.id,gs.daily_number
  into v_result,v_daily_number
  from public.game_sessions gs
  join public.game_results gr on gr.session_id=gs.id
  where gs.user_id=v_uid
    and gs.client_result_id=p_client_result_id
    and gs.game_id='numberroute'
  limit 1;

  if v_result is null then
    raise exception 'Number Route result not found';
  end if;

  if v_daily_number is not null then
    v_expected_rounds:=3;

    select id
    into v_daily_id
    from public.daily_challenges
    where daily_number=v_daily_number
      and challenge_date=current_date
      and status='published'
    order by generation_version desc
    limit 1;

    if v_daily_id is null
       or not ('numberroute'=any(public.brainilab_daily_game_ids(current_date))) then
      raise exception 'Number Route is not in today''s Daily';
    end if;
  else
    v_expected_rounds:=10;
  end if;

  if p_rounds is null or jsonb_typeof(p_rounds) is distinct from 'array'
     or jsonb_array_length(p_rounds)<>v_expected_rounds then
    raise exception 'Number Route requires exactly % rounds in this mode',v_expected_rounds;
  end if;

  for v_row in
    select value from jsonb_array_elements(p_rounds)
  loop
    v_round_index:=v_round_index+1;
    v_id:=(v_row->>'puzzle_id')::uuid;

    if v_id=any(v_seen) then
      raise exception 'Duplicate Number Route puzzle';
    end if;
    v_seen:=array_append(v_seen,v_id);

    if v_daily_id is not null and not exists(
      select 1
      from public.daily_rotating_content
      where daily_challenge_id=v_daily_id
        and game_id='numberroute'
        and content_id=v_id
        and position between 1 and 3
    ) then
      raise exception 'Number Route puzzle is not assigned to today''s Daily';
    end if;

    select solution
    into v_solution
    from public.number_route_puzzles
    where id=v_id;

    if v_solution is null then
      raise exception 'Number Route puzzle not found';
    end if;

    v_skipped:=coalesce((v_row->>'skipped')::boolean,false);
    v_attempts:=greatest(1,least(100,coalesce((v_row->>'attempts')::integer,1)));
    v_response_ms:=greatest(0,least(600000,coalesce((v_row->>'response_time_ms')::integer,0)));

    if not v_skipped then
      if jsonb_typeof(v_row->'operators') is distinct from 'array' then raise exception 'Invalid Number Route operators';end if;
      select array_agg(value order by ordinality)
      into v_ops
      from jsonb_array_elements_text(
        coalesce(v_row->'operators','[]'::jsonb)
      ) with ordinality;

      if cardinality(v_ops) is distinct from 3 or v_ops is distinct from v_solution then
        raise exception 'Invalid Number Route solved route';
      end if;

      v_correct:=v_correct+1;

      if v_daily_number is not null then
        -- 834 + 833 + 833 = exactly 2,500 maximum Daily points.
        -- First 5 seconds are full value. Then lose 10 points per completed
        -- second, with a 200-point floor for a solved route. Trial-and-error
        -- naturally costs points because all attempts consume the same timer.
        v_round_cap:=case when v_round_index=1 then 834 else 833 end;
        v_round_score:=greatest(
          200,
          v_round_cap
            -floor(greatest((v_response_ms::numeric/1000)-5,0))::integer*10
        );
      else
        v_round_score:=case v_attempts
          when 1 then 250
          when 2 then 180
          when 3 then 120
          else 80
        end;
      end if;

      v_score:=v_score+v_round_score;
    end if;
  end loop;

  update public.game_results
  set
    score=v_score,
    correct_answers=v_correct,
    total_questions=v_expected_rounds,
    accuracy=round(v_correct::numeric/v_expected_rounds::numeric*100,2),
    answers_verified=true,
    verified_correct_answers=v_correct,
    verified_total_questions=v_expected_rounds,
    answers_verified_at=now()
  where id=v_result;

  return jsonb_build_object(
    'answers_verified',true,
    'correct_answers',v_correct,
    'total_questions',v_expected_rounds,
    'accuracy',round(v_correct::numeric/v_expected_rounds::numeric*100,2),
    'score',v_score,
    'scoring',case when v_daily_number is not null then 'speed' else 'attempts' end
  );
end;
$function$;

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
perform public.brainilab_assert_daily_verification(v_session_id,p_daily_challenge_id);

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
    total_questions=greatest(v_target,v_correct),
    accuracy=v_accuracy,
    answers_verified=true,
    verified_correct_answers=v_correct,
    verified_total_questions=greatest(v_target,v_correct),
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
    'total',greatest(v_target,v_correct),
    'accuracy',v_accuracy,
    'score',v_score,
    'daily_points',v_score,
    'server_score_verified',false
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.verify_brainilab_math_rush_result(p_client_result_id text, p_seed text, p_answers jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid:=auth.uid(); v_result uuid; v_daily_number integer; v_expected_seed text;
  v_row jsonb; v_pos integer; v_given integer; v_skipped boolean; v_op jsonb; v_answer integer;
  v_correct integer:=0; v_total integer:=0; v_combo integer:=0; v_score integer:=0; v_seen integer[]:=array[]::integer[];
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if char_length(coalesce(p_seed,'')) not between 3 and 140 then raise exception 'Invalid Math Rush seed'; end if;
  if p_answers is null or jsonb_typeof(p_answers) is distinct from 'array' or jsonb_array_length(p_answers) not between 1 and 60 then raise exception 'Invalid Math Rush answers'; end if;
  select gr.id,gs.daily_number into v_result,v_daily_number from public.game_sessions gs join public.game_results gr on gr.session_id=gs.id
    where gs.user_id=v_uid and gs.client_result_id=p_client_result_id and gs.game_id='mathrush' limit 1;
  if v_result is null then raise exception 'Math Rush result not found'; end if;
  if v_daily_number is not null then
    if not ('mathrush'=any(public.brainilab_daily_game_ids(current_date))) then raise exception 'Math Rush is not in today''s Daily'; end if;
    v_expected_seed:='daily:'||current_date::text||':mathrush';
    if p_seed<>v_expected_seed then raise exception 'Math Rush Daily seed mismatch'; end if;
  end if;
  for v_row in select value from jsonb_array_elements(p_answers) loop
    v_pos:=(v_row->>'position')::integer;
    if v_pos is null or v_pos<>cardinality(v_seen)+1 or v_pos not between 1 and 60 or v_pos=any(v_seen) then raise exception 'Invalid or duplicate Math Rush position'; end if;
    v_seen:=array_append(v_seen,v_pos); v_skipped:=coalesce((v_row->>'skipped')::boolean,false);
    v_op:=public.brainilab_math_rush_operation(p_seed,v_pos); v_answer:=(v_op->>'answer')::integer;
    if v_skipped then v_combo:=0; continue; end if;
    v_total:=v_total+1; v_given:=(v_row->>'answer')::integer;
    if v_given=v_answer then v_correct:=v_correct+1; v_combo:=v_combo+1; v_score:=v_score+100+least(100,greatest(0,v_combo-1)*10); else v_combo:=0; end if;
  end loop;
  update public.game_results set score=v_score,correct_answers=v_correct,total_questions=v_total,
    accuracy=case when v_total>0 then round(v_correct::numeric/v_total*100,2) else 0 end,
    answers_verified=true,verified_correct_answers=v_correct,verified_total_questions=v_total,answers_verified_at=now()
    where id=v_result;
  return jsonb_build_object('answers_verified',true,'correct_answers',v_correct,'total_questions',v_total,'accuracy',case when v_total>0 then round(v_correct::numeric/v_total*100,2) else 0 end,'score',v_score);
end;$function$;

CREATE OR REPLACE FUNCTION public.verify_brainilab_survival_result(p_client_result_id text, p_answers jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid:=auth.uid();

  v_session_id uuid;
  v_result_id uuid;

  v_item jsonb;
  v_qv uuid;
  v_selected uuid;
  v_topic_id uuid;
  v_difficulty text;

  v_is_correct boolean;
  v_response integer;

  v_correct integer:=0;
  v_total integer;
  v_mistakes integer:=0;
  v_combo integer:=0;

  v_score integer:=0;
  v_base integer;

  v_index integer:=0;

  v_seen uuid[]:=array[]::uuid[];
begin

  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if jsonb_typeof(
    coalesce(
      p_answers,
      '[]'::jsonb
    )
  )<>'array'
  then
    raise exception 'Answers must be an array';
  end if;

  v_total:=jsonb_array_length(p_answers);

  if v_total<1 or v_total>30 then
    raise exception 'Invalid Survival answer count';
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

  where gs.user_id=v_uid
    and gs.client_result_id=p_client_result_id
    and gs.game_id='survival'

  limit 1;

  if v_result_id is null then
    raise exception 'Survival result not found';
  end if;

  for v_item in
    select value
    from jsonb_array_elements(p_answers)
  loop

    v_index:=v_index+1;

    v_qv:=
      (v_item->>'question_version_id')::uuid;

    if v_qv=any(v_seen) then
      raise exception 'Duplicate Survival question';
    end if;

    v_seen:=array_append(
      v_seen,
      v_qv
    );

    select
      qv.primary_topic_id,
      qv.difficulty
    into
      v_topic_id,
      v_difficulty
    from public.question_versions qv

    join public.questions q
      on q.id=qv.question_id

    where qv.id=v_qv
      and qv.status='published'
      and q.status='active';

    if v_topic_id is null then
      raise exception 'Survival question unavailable';
    end if;

    if nullif(
      v_item->>'selected_option_id',
      ''
    ) is null
    then

      v_selected:=null;
      v_is_correct:=false;

    else

      v_selected:=
        (v_item->>'selected_option_id')::uuid;

      select qo.is_correct
      into v_is_correct
      from public.question_options qo
      where qo.id=v_selected
        and qo.question_version_id=v_qv;

      if v_is_correct is null then
        raise exception 'Option does not belong to Survival question';
      end if;

    end if;

    v_response:=
      case
        when nullif(
          v_item->>'response_time_ms',
          ''
        ) is null
          then null
        else greatest(
          0,
          (v_item->>'response_time_ms')::integer
        )
      end;

    if v_is_correct then

      v_correct:=v_correct+1;
      v_combo:=v_combo+1;

      v_base:=
        case v_difficulty
          when 'hard' then 200
          when 'medium' then 150
          else 100
        end;

      v_score:=
        v_score
        +v_base
        +least(
          200,
          greatest(
            0,
            v_combo-1
          )*25
        );

    else

      v_mistakes:=v_mistakes+1;
      v_combo:=0;

    end if;

    insert into public.verified_question_answers(
      result_id,
      session_id,
      user_id,
      question_version_id,
      selected_option_id,
      is_correct,
      response_time_ms,
      context_type,
      context_id
    )
    values(
      v_result_id,
      v_session_id,
      v_uid,
      v_qv,
      v_selected,
      coalesce(
        v_is_correct,
        false
      ),
      v_response,
      'anytime',
      v_topic_id
    )
    on conflict(
      result_id,
      question_version_id
    )
    do nothing;

    if v_mistakes>=3
       and v_index<v_total
    then
      raise exception 'Survival answers continue after third lost life';
    end if;

  end loop;

  if v_total<30 and v_mistakes<3 then raise exception 'Survival round is not complete';end if;

  update public.game_results
  set
    score=v_score,
    correct_answers=v_correct,
    total_questions=v_total,

    accuracy=round(
      (
        v_correct::numeric
        /v_total::numeric
      )*100,
      2
    ),

    answers_verified=true,
    verified_correct_answers=v_correct,
    verified_total_questions=v_total,
    answers_verified_at=now()

  where id=v_result_id;

  return jsonb_build_object(
    'answers_verified',
    true,

    'correct_answers',
    v_correct,

    'total_questions',
    v_total,

    'score',
    v_score,

    'accuracy',
    round(
      (
        v_correct::numeric
        /v_total::numeric
      )*100,
      2
    )
  );

end;
$function$;
commit;
