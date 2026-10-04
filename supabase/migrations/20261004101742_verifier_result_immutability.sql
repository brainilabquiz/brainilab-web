-- Freeze verified results under a row lock. Preserve scores, player data and existing grants.
begin;
do $guard$ begin
 if exists(select 1 from (values ('verify_brainilab_quiz_result','c52f591686e3f2f81504145c2fc019d5'),('verify_brainilab_daily_result','bee8014578898cdd493c44961b430939'),('verify_brainilab_brainiword_result','6da944be3c2dccf3cabd10dde86a5b92'),('verify_brainilab_topic_rush_result','a08024dde0375ad8613bc1f52c94d964'),('verify_brainilab_order_up_result','35ea391d299dc09b2010fddec92217a4'),('verify_brainilab_anytime_quiz_result','ff4ef8ab81f660b0cac72e9042d94c1e'),('verify_brainilab_survival_result','35afd8bac17bb17f2e508bd475f3548a'),('verify_brainilab_odd_one_out_result','74747c17dd8232779d7ee7637bf71b76'),('verify_brainilab_higher_lower_result','ded6fe226367c1981b2d1d36941b6b1f'),('verify_brainilab_sequence_result','0727b94c8d5a26382e2564f6ac8d5434')) expected(name,fingerprint)
 left join pg_proc p on p.proname=expected.name and p.pronamespace='public'::regnamespace
 where p.oid is null or md5(pg_get_functiondef(p.oid))<>expected.fingerprint)
 then raise exception 'Game verifier changed since audit; rebase this migration';end if;
end;$guard$;

CREATE OR REPLACE FUNCTION public.verify_brainilab_quiz_result(p_client_result_id text, p_quiz_pack_id uuid, p_answers jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_frozen record;
v_user_id uuid;
v_session_id uuid;
v_result_id uuid;
v_pack_count integer;
v_answer_count integer;
v_correct integer := 0;
v_pack_question record;
v_answer jsonb;
v_selected_option_id uuid;
v_is_correct boolean;
begin
  -- Serialize retries before reading the canonical result. Never rescore a verified game.
  if auth.uid() is null then raise exception 'Authentication required';end if;
  select gr.*,gs.daily_number into v_frozen
  from public.game_sessions gs join public.game_results gr on gr.session_id=gs.id
  where gs.user_id=auth.uid() and gs.client_result_id=p_client_result_id
    and gs.game_id in ('worldflags','europeflags','worldcapitals','generalknowledge','science','history','sports')
  for update of gr;
  if not found then raise exception 'Game result not found';end if;
  if v_frozen.answers_verified then
    return jsonb_strip_nulls(jsonb_build_object('answers_verified',true,'verified',true,'correct_answers',v_frozen.correct_answers,'total_questions',v_frozen.total_questions,'correct',v_frozen.correct_answers,'total',v_frozen.total_questions,'accuracy',v_frozen.accuracy,'score',v_frozen.score,'daily_number',v_frozen.daily_number,'correct_pairs',v_frozen.result_payload->'verifiedOrderPairsCorrect','total_pairs',v_frozen.result_payload->'verifiedOrderPairsTotal'));
  end if;
  if p_answers is null or jsonb_typeof(p_answers) is distinct from 'array' then
    raise exception 'Answers must be an array';
  end if;
v_user_id := auth.uid();

if v_user_id is null then
raise exception 'Authentication required';
end if;

if jsonb_typeof(coalesce(p_answers,'[]'::jsonb)) <> 'array' then
raise exception 'Answers must be an array';
end if;

select gs.id,gr.id
into v_session_id,v_result_id
from public.game_sessions gs
join public.game_results gr on gr.session_id=gs.id
where gs.user_id=v_user_id
and gs.client_result_id=p_client_result_id
and exists(select 1 from public.quiz_packs qp join public.topics t on t.id=qp.topic_id where qp.id=p_quiz_pack_id and gs.game_id=replace(t.slug,'-',''))
limit 1;

if v_result_id is null then
raise exception 'Game result not found';
end if;

select count(*)
into v_pack_count
from public.quiz_pack_questions qpq
join public.quiz_packs qp on qp.id=qpq.quiz_pack_id
where qpq.quiz_pack_id=p_quiz_pack_id
and qp.status='published';

if v_pack_count <> 20 then
raise exception 'Published quiz pack is not valid';
end if;

v_answer_count := jsonb_array_length(p_answers);

if v_answer_count <> v_pack_count then
raise exception 'Expected % submitted answers, got %',v_pack_count,v_answer_count;
end if;

for v_pack_question in
select
qpq.position,
qpq.question_version_id
from public.quiz_pack_questions qpq
where qpq.quiz_pack_id=p_quiz_pack_id
order by qpq.position
loop
select value
into v_answer
from jsonb_array_elements(p_answers)
where value ->> 'question_version_id'
= v_pack_question.question_version_id::text
limit 1;

if v_answer is null then
raise exception 'Missing answer for pack position %',v_pack_question.position;
end if;

-- Null is a valid skip.
if nullif(v_answer ->> 'selected_option_id','') is null then
v_selected_option_id := null;
v_is_correct := false;
else
begin
v_selected_option_id := (v_answer ->> 'selected_option_id')::uuid;
exception when others then
raise exception 'Invalid option ID at position %',v_pack_question.position;
end;

select qo.is_correct
into v_is_correct
from public.question_options qo
where qo.id=v_selected_option_id
and qo.question_version_id=v_pack_question.question_version_id;

if v_is_correct is null then
raise exception 'Option does not belong to question at position %',v_pack_question.position;
end if;
end if;

if v_is_correct then
v_correct := v_correct + 1;
end if;
end loop;

update public.game_results
set
score=case when created_at>=public.brainilab_rewards_started_at() then v_correct*500 else score end,
correct_answers=v_correct,
total_questions=v_pack_count,
accuracy=round((v_correct::numeric / v_pack_count::numeric)*100,2),
answers_verified=true,
verified_correct_answers=v_correct,
verified_total_questions=v_pack_count,
answers_verified_at=now()
where id=v_result_id;

return jsonb_build_object(
'answers_verified',true,
'correct_answers',v_correct,
'total_questions',v_pack_count,
'accuracy',round((v_correct::numeric / v_pack_count::numeric)*100,2),
'server_score_verified',false
);
end;
$function$;

CREATE OR REPLACE FUNCTION public.verify_brainilab_daily_result(p_client_result_id text, p_daily_challenge_id uuid, p_answers jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_frozen record;
v_user_id uuid;
v_session_id uuid;
v_result_id uuid;
v_daily_number integer;
v_challenge_count integer;
v_answer_count integer;
v_correct integer := 0;
v_daily_question record;
v_answer jsonb;
v_selected_option_id uuid;
v_is_correct boolean;
begin
  -- Serialize retries before reading the canonical result. Never rescore a verified game.
  if auth.uid() is null then raise exception 'Authentication required';end if;
  select gr.*,gs.daily_number into v_frozen
  from public.game_sessions gs join public.game_results gr on gr.session_id=gs.id
  where gs.user_id=auth.uid() and gs.client_result_id=p_client_result_id
    and gs.game_id in ('brainmix')
  for update of gr;
  if not found then raise exception 'Game result not found';end if;
  if v_frozen.answers_verified then
    return jsonb_strip_nulls(jsonb_build_object('answers_verified',true,'verified',true,'correct_answers',v_frozen.correct_answers,'total_questions',v_frozen.total_questions,'correct',v_frozen.correct_answers,'total',v_frozen.total_questions,'accuracy',v_frozen.accuracy,'score',v_frozen.score,'daily_number',v_frozen.daily_number,'correct_pairs',v_frozen.result_payload->'verifiedOrderPairsCorrect','total_pairs',v_frozen.result_payload->'verifiedOrderPairsTotal'));
  end if;
  if p_answers is null or jsonb_typeof(p_answers) is distinct from 'array' then
    raise exception 'Answers must be an array';
  end if;
v_user_id := auth.uid();

if v_user_id is null then
raise exception 'Authentication required';
end if;

if jsonb_typeof(coalesce(p_answers,'[]'::jsonb)) <> 'array' then
raise exception 'Answers must be an array';
end if;

select
gs.id,
gr.id
into
v_session_id,
v_result_id
from public.game_sessions gs
join public.game_results gr
on gr.session_id = gs.id
where gs.user_id = v_user_id
and gs.client_result_id = p_client_result_id
and gs.game_id='brainmix'
limit 1;

if v_result_id is null then
raise exception 'Game result not found';
end if;
perform public.brainilab_assert_daily_verification(v_session_id,p_daily_challenge_id);

select dc.daily_number
into v_daily_number
from public.daily_challenges dc
where dc.id = p_daily_challenge_id
and dc.status in ('published','retired');

if v_daily_number is null then
raise exception 'Daily challenge not found';
end if;

select count(*)
into v_challenge_count
from public.daily_challenge_questions dcq
where dcq.daily_challenge_id = p_daily_challenge_id;

if v_challenge_count <> 10 then
raise exception 'Daily challenge is not valid';
end if;

v_answer_count := jsonb_array_length(p_answers);

if v_answer_count <> 10 then
raise exception 'Expected 10 submitted answers, got %',v_answer_count;
end if;

for v_daily_question in
select
dcq.position,
dcq.question_version_id
from public.daily_challenge_questions dcq
where dcq.daily_challenge_id = p_daily_challenge_id
order by dcq.position
loop

select value
into v_answer
from jsonb_array_elements(p_answers)
where value ->> 'question_version_id'
= v_daily_question.question_version_id::text
limit 1;

if v_answer is null then
raise exception
'Missing answer for Daily position %',
v_daily_question.position;
end if;

if nullif(v_answer ->> 'selected_option_id','') is null then
v_selected_option_id := null;
v_is_correct := false;
else
begin
v_selected_option_id :=
(v_answer ->> 'selected_option_id')::uuid;
exception when others then
raise exception
'Invalid selected option ID at Daily position %',
v_daily_question.position;
end;

select qo.is_correct
into v_is_correct
from public.question_options qo
where qo.id = v_selected_option_id
and qo.question_version_id =
v_daily_question.question_version_id;

if v_is_correct is null then
raise exception
'Option does not belong to Daily question at position %',
v_daily_question.position;
end if;
end if;

if v_is_correct then
v_correct := v_correct + 1;
end if;
end loop;

update public.game_sessions
set
daily_number = v_daily_number,
daily_challenge_id = p_daily_challenge_id
where id = v_session_id;

update public.game_results
set
score=case when created_at>=public.brainilab_rewards_started_at() then v_correct*1000 else score end,
correct_answers = v_correct,
total_questions = 10,
accuracy = round((v_correct::numeric / 10::numeric) * 100,2),
answers_verified = true,
verified_correct_answers = v_correct,
verified_total_questions = 10,
answers_verified_at = now()
where id = v_result_id;

return jsonb_build_object(
'answers_verified',true,
'daily_number',v_daily_number,
'correct_answers',v_correct,
'total_questions',10,
'accuracy',round((v_correct::numeric / 10::numeric) * 100,2),
'server_score_verified',false
);
end;
$function$;

CREATE OR REPLACE FUNCTION public.verify_brainilab_brainiword_result(p_client_result_id text, p_daily_challenge_id uuid, p_guesses jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_frozen record;
  v_user uuid:=auth.uid();
  v_result_id uuid;
  v_session_id uuid;
  v_daily_number integer;
  v_answer text;
  v_guess text;
  v_index integer:=0;
  v_win_attempt integer:=null;
  v_won boolean:=false;
begin
  -- Serialize retries before reading the canonical result. Never rescore a verified game.
  if auth.uid() is null then raise exception 'Authentication required';end if;
  select gr.*,gs.daily_number into v_frozen
  from public.game_sessions gs join public.game_results gr on gr.session_id=gs.id
  where gs.user_id=auth.uid() and gs.client_result_id=p_client_result_id
    and gs.game_id in ('brainiword')
  for update of gr;
  if not found then raise exception 'Game result not found';end if;
  if v_frozen.answers_verified then
    return jsonb_strip_nulls(jsonb_build_object('verified',true,'won',(v_frozen.result_payload->>'won')::boolean,'attempts',(v_frozen.result_payload->>'attempts')::integer,'daily_number',v_frozen.daily_number));
  end if;
  if p_guesses is null or jsonb_typeof(p_guesses) is distinct from 'array' then
    raise exception 'Answers must be an array';
  end if;
  if v_user is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(coalesce(p_guesses,'[]'::jsonb))<>'array' then
    raise exception 'Guesses must be an array';
  end if;

  select gs.id,gr.id
    into v_session_id,v_result_id
  from public.game_sessions gs
  join public.game_results gr on gr.session_id=gs.id
  where gs.user_id=v_user
    and gs.client_result_id=p_client_result_id
    and gs.game_id='brainiword';

  if v_result_id is null then raise exception 'BrainiWord result not found'; end if;
perform public.brainilab_assert_daily_verification(v_session_id,p_daily_challenge_id);

  select dc.daily_number,bw.word
    into v_daily_number,v_answer
  from public.daily_brainiword dbw
  join public.daily_challenges dc on dc.id=dbw.daily_challenge_id
  join public.brainiword_words bw on bw.id=dbw.word_id
  where dbw.daily_challenge_id=p_daily_challenge_id;

  if v_answer is null then raise exception 'BrainiWord Daily not found'; end if;
  if jsonb_array_length(p_guesses) not between 1 and 5 then raise exception 'Too many guesses'; end if;

  for v_guess in
    select upper(value #>> '{}')
    from jsonb_array_elements(p_guesses)
  loop
    if v_guess is null or v_guess !~ '^[A-Z]{5}$' or not exists(
      select 1
      from public.brainiword_valid_guesses d
      where d.word=v_guess
    ) then
      raise exception 'BrainiWord result contains an invalid English guess';
    end if;

    v_index:=v_index+1;
    if v_guess=v_answer and v_win_attempt is null then
      v_win_attempt:=v_index;
      v_won:=true;
    end if;
  end loop;

  if (v_won and v_win_attempt<>v_index) or (not v_won and v_index<>5) then raise exception 'BrainiWord round is not complete';end if;

  update public.game_sessions
  set daily_challenge_id=p_daily_challenge_id,
      daily_number=v_daily_number
  where id=v_session_id;

  update public.game_results
  set correct_answers=case when v_won then 1 else 0 end,
      total_questions=1,
      accuracy=case when v_won then 100 else 0 end,
      server_verified=false,
      answers_verified=true,
      verified_correct_answers=case when v_won then 1 else 0 end,
      verified_total_questions=1,
      answers_verified_at=now(),
      result_payload=jsonb_set(
        jsonb_set(
          jsonb_set(result_payload,'{won}',to_jsonb(v_won),true),
          '{attempts}',to_jsonb(coalesce(v_win_attempt,5)),true
        ),
        '{verifiedDailyGame}','true'::jsonb,true
      )
  where id=v_result_id;

  return jsonb_build_object(
    'verified',true,
    'won',v_won,
    'attempts',coalesce(v_win_attempt,5),
    'daily_number',v_daily_number
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
  v_frozen record;
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
  -- Serialize retries before reading the canonical result. Never rescore a verified game.
  if auth.uid() is null then raise exception 'Authentication required';end if;
  select gr.*,gs.daily_number into v_frozen
  from public.game_sessions gs join public.game_results gr on gr.session_id=gs.id
  where gs.user_id=auth.uid() and gs.client_result_id=p_client_result_id
    and gs.game_id in ('topicrush')
  for update of gr;
  if not found then raise exception 'Game result not found';end if;
  if v_frozen.answers_verified then
    return jsonb_strip_nulls(jsonb_build_object('answers_verified',true,'verified',true,'correct_answers',v_frozen.correct_answers,'total_questions',v_frozen.total_questions,'correct',v_frozen.correct_answers,'total',v_frozen.total_questions,'accuracy',v_frozen.accuracy,'score',v_frozen.score,'daily_number',v_frozen.daily_number,'correct_pairs',v_frozen.result_payload->'verifiedOrderPairsCorrect','total_pairs',v_frozen.result_payload->'verifiedOrderPairsTotal'));
  end if;
  if p_answers is null or jsonb_typeof(p_answers) is distinct from 'array' then
    raise exception 'Answers must be an array';
  end if;
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

CREATE OR REPLACE FUNCTION public.verify_brainilab_order_up_result(p_client_result_id text, p_daily_challenge_id uuid, p_rounds jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_frozen record;
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
  -- Serialize retries before reading the canonical result. Never rescore a verified game.
  if auth.uid() is null then raise exception 'Authentication required';end if;
  select gr.*,gs.daily_number into v_frozen
  from public.game_sessions gs join public.game_results gr on gr.session_id=gs.id
  where gs.user_id=auth.uid() and gs.client_result_id=p_client_result_id
    and gs.game_id in ('orderup')
  for update of gr;
  if not found then raise exception 'Game result not found';end if;
  if v_frozen.answers_verified then
    return jsonb_strip_nulls(jsonb_build_object('answers_verified',true,'verified',true,'correct_answers',v_frozen.correct_answers,'total_questions',v_frozen.total_questions,'correct',v_frozen.correct_answers,'total',v_frozen.total_questions,'accuracy',v_frozen.accuracy,'score',v_frozen.score,'daily_number',v_frozen.daily_number,'correct_pairs',v_frozen.result_payload->'verifiedOrderPairsCorrect','total_pairs',v_frozen.result_payload->'verifiedOrderPairsTotal'));
  end if;
  if p_rounds is null or jsonb_typeof(p_rounds) is distinct from 'array' then
    raise exception 'Answers must be an array';
  end if;
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
perform public.brainilab_assert_daily_verification(v_session_id,p_daily_challenge_id);

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
$function$;

CREATE OR REPLACE FUNCTION public.verify_brainilab_anytime_quiz_result(p_client_result_id text, p_topic_slug text, p_difficulty text, p_answers jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_frozen record;
v_uid uuid:=auth.uid();
v_topic_id uuid;
v_session_id uuid;
v_result_id uuid;
v_item jsonb;
v_qv uuid;
v_selected uuid;
v_is_correct boolean;
v_correct integer:=0;
v_total integer;
v_seen uuid[]:=array[]::uuid[];
begin
  -- Serialize retries before reading the canonical result. Never rescore a verified game.
  if auth.uid() is null then raise exception 'Authentication required';end if;
  select gr.*,gs.daily_number into v_frozen
  from public.game_sessions gs join public.game_results gr on gr.session_id=gs.id
  where gs.user_id=auth.uid() and gs.client_result_id=p_client_result_id
    and gs.game_id in ('worldflags','worldcapitals','generalknowledge','science','history','sports')
  for update of gr;
  if not found then raise exception 'Game result not found';end if;
  if v_frozen.answers_verified then
    return jsonb_strip_nulls(jsonb_build_object('answers_verified',true,'verified',true,'correct_answers',v_frozen.correct_answers,'total_questions',v_frozen.total_questions,'correct',v_frozen.correct_answers,'total',v_frozen.total_questions,'accuracy',v_frozen.accuracy,'score',v_frozen.score,'daily_number',v_frozen.daily_number,'correct_pairs',v_frozen.result_payload->'verifiedOrderPairsCorrect','total_pairs',v_frozen.result_payload->'verifiedOrderPairsTotal'));
  end if;
  if p_answers is null or jsonb_typeof(p_answers) is distinct from 'array' then
    raise exception 'Answers must be an array';
  end if;
if v_uid is null then raise exception 'Authentication required'; end if;
if p_difficulty not in ('easy','medium','hard') then raise exception 'Invalid difficulty'; end if;
if jsonb_typeof(coalesce(p_answers,'[]'::jsonb))<>'array' then raise exception 'Answers must be an array'; end if;

v_total:=jsonb_array_length(p_answers);
if v_total<1 or v_total>20 then raise exception 'Invalid answer count'; end if;

select t.id into v_topic_id from public.topics t where t.slug=p_topic_slug and t.is_active=true;
if v_topic_id is null then raise exception 'Topic not found'; end if;

select gs.id,gr.id into v_session_id,v_result_id
from public.game_sessions gs
join public.game_results gr on gr.session_id=gs.id
where gs.user_id=v_uid and gs.client_result_id=p_client_result_id
and gs.game_id=replace(p_topic_slug,'-','')
and gs.game_id in ('worldflags','worldcapitals','generalknowledge','science','history','sports')
limit 1;

if v_result_id is null then raise exception 'Game result not found'; end if;

for v_item in select value from jsonb_array_elements(p_answers) loop
begin v_qv:=(v_item->>'question_version_id')::uuid;
exception when others then raise exception 'Invalid question version ID'; end;

if v_qv=any(v_seen) then raise exception 'Duplicate question in result'; end if;
v_seen:=array_append(v_seen,v_qv);

if not exists(
select 1
from public.question_versions qv
join public.questions q on q.id=qv.question_id
where qv.id=v_qv
and qv.primary_topic_id=v_topic_id
and qv.difficulty=p_difficulty
and qv.status='published'
and q.status='active'
) then
raise exception 'Question does not belong to this Play Anytime pool';
end if;

if nullif(v_item->>'selected_option_id','') is null then
v_selected:=null; v_is_correct:=false;
else
begin v_selected:=(v_item->>'selected_option_id')::uuid;
exception when others then raise exception 'Invalid selected option ID'; end;
select qo.is_correct into v_is_correct
from public.question_options qo
where qo.id=v_selected and qo.question_version_id=v_qv;
if v_is_correct is null then raise exception 'Option does not belong to question'; end if;
end if;

if v_is_correct then v_correct:=v_correct+1; end if;

insert into public.verified_question_answers(
result_id,session_id,user_id,question_version_id,selected_option_id,
is_correct,response_time_ms,context_type,context_id
) values(
v_result_id,v_session_id,v_uid,v_qv,v_selected,coalesce(v_is_correct,false),
case when nullif(v_item->>'response_time_ms','') is null then null else greatest(0,(v_item->>'response_time_ms')::integer) end,
'anytime',v_topic_id
) on conflict(result_id,question_version_id) do nothing;
end loop;

update public.game_results
set score=case when created_at>=public.brainilab_rewards_started_at() then v_correct*500 else score end,
correct_answers=v_correct,
total_questions=v_total,
accuracy=round((v_correct::numeric/v_total::numeric)*100,2),
answers_verified=true,
verified_correct_answers=v_correct,
verified_total_questions=v_total,
answers_verified_at=now()
where id=v_result_id;

return jsonb_build_object(
'answers_verified',true,
'correct_answers',v_correct,
'total_questions',v_total,
'accuracy',round((v_correct::numeric/v_total::numeric)*100,2),
'server_score_verified',false
);
end;
$function$;

CREATE OR REPLACE FUNCTION public.verify_brainilab_survival_result(p_client_result_id text, p_answers jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_frozen record;
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
  -- Serialize retries before reading the canonical result. Never rescore a verified game.
  if auth.uid() is null then raise exception 'Authentication required';end if;
  select gr.*,gs.daily_number into v_frozen
  from public.game_sessions gs join public.game_results gr on gr.session_id=gs.id
  where gs.user_id=auth.uid() and gs.client_result_id=p_client_result_id
    and gs.game_id in ('survival')
  for update of gr;
  if not found then raise exception 'Game result not found';end if;
  if v_frozen.answers_verified then
    return jsonb_strip_nulls(jsonb_build_object('answers_verified',true,'verified',true,'correct_answers',v_frozen.correct_answers,'total_questions',v_frozen.total_questions,'correct',v_frozen.correct_answers,'total',v_frozen.total_questions,'accuracy',v_frozen.accuracy,'score',v_frozen.score,'daily_number',v_frozen.daily_number,'correct_pairs',v_frozen.result_payload->'verifiedOrderPairsCorrect','total_pairs',v_frozen.result_payload->'verifiedOrderPairsTotal'));
  end if;
  if p_answers is null or jsonb_typeof(p_answers) is distinct from 'array' then
    raise exception 'Answers must be an array';
  end if;

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

CREATE OR REPLACE FUNCTION public.verify_brainilab_odd_one_out_result(p_client_result_id text, p_rounds jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_frozen record;
  v_uid uuid:=auth.uid(); v_result uuid; v_daily_number integer; v_daily_id uuid;
  v_row jsonb; v_id uuid; v_selected integer; v_odd integer; v_correct integer:=0; v_seen uuid[]:=array[]::uuid[];
begin
  -- Serialize retries before reading the canonical result. Never rescore a verified game.
  if auth.uid() is null then raise exception 'Authentication required';end if;
  select gr.*,gs.daily_number into v_frozen
  from public.game_sessions gs join public.game_results gr on gr.session_id=gs.id
  where gs.user_id=auth.uid() and gs.client_result_id=p_client_result_id
    and gs.game_id in ('oddoneout')
  for update of gr;
  if not found then raise exception 'Game result not found';end if;
  if v_frozen.answers_verified then
    return jsonb_strip_nulls(jsonb_build_object('answers_verified',true,'verified',true,'correct_answers',v_frozen.correct_answers,'total_questions',v_frozen.total_questions,'correct',v_frozen.correct_answers,'total',v_frozen.total_questions,'accuracy',v_frozen.accuracy,'score',v_frozen.score,'daily_number',v_frozen.daily_number,'correct_pairs',v_frozen.result_payload->'verifiedOrderPairsCorrect','total_pairs',v_frozen.result_payload->'verifiedOrderPairsTotal'));
  end if;
  if p_rounds is null or jsonb_typeof(p_rounds) is distinct from 'array' then
    raise exception 'Answers must be an array';
  end if;
  if v_uid is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(coalesce(p_rounds,'[]'::jsonb))<>'array' or jsonb_array_length(p_rounds)<>10 then raise exception 'Odd One Out requires exactly 10 rounds'; end if;
  select gr.id,gs.daily_number into v_result,v_daily_number
  from public.game_sessions gs join public.game_results gr on gr.session_id=gs.id
  where gs.user_id=v_uid and gs.client_result_id=p_client_result_id and gs.game_id='oddoneout' limit 1;
  if v_result is null then raise exception 'Odd One Out result not found'; end if;
  if v_daily_number is not null then
    select dc.id into v_daily_id from public.daily_challenges dc where dc.daily_number=v_daily_number and dc.challenge_date=current_date and dc.status='published' limit 1;
    if v_daily_id is null or not ('oddoneout'=any(public.brainilab_daily_game_ids(current_date))) then raise exception 'Odd One Out is not in today''s Daily'; end if;
  end if;
  for v_row in select value from jsonb_array_elements(p_rounds) loop
    v_id:=(v_row->>'puzzle_id')::uuid; v_selected:=(v_row->>'selected_index')::integer;
    if v_id=any(v_seen) then raise exception 'Duplicate Odd One Out puzzle'; end if; v_seen:=array_append(v_seen,v_id);
    if v_daily_id is not null and not exists(select 1 from public.daily_rotating_content where daily_challenge_id=v_daily_id and game_id='oddoneout' and content_id=v_id) then raise exception 'Odd One Out puzzle is not assigned to today''s Daily'; end if;
    select odd_index into v_odd from public.odd_one_out_puzzles where id=v_id;
    if v_odd is null or v_selected is null or v_selected not between 0 and 3 then raise exception 'Invalid Odd One Out round'; end if;
    if v_selected=v_odd then v_correct:=v_correct+1; end if;
  end loop;
  update public.game_results set score=v_correct*100,correct_answers=v_correct,total_questions=10,accuracy=v_correct*10,
    answers_verified=true,verified_correct_answers=v_correct,verified_total_questions=10,answers_verified_at=now() where id=v_result;
  return jsonb_build_object('answers_verified',true,'correct_answers',v_correct,'total_questions',10,'accuracy',v_correct*10,'score',v_correct*100);
end;$function$;

CREATE OR REPLACE FUNCTION public.verify_brainilab_higher_lower_result(p_client_result_id text, p_rounds jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_frozen record;
  v_uid uuid:=auth.uid(); v_result uuid; v_daily_number integer; v_daily_id uuid;
  v_row jsonb; v_id uuid; v_choice text; v_left numeric; v_right numeric; v_type text; v_direction text;
  v_correct integer:=0; v_combo integer:=0; v_score integer:=0; v_seen uuid[]:=array[]::uuid[];
begin
  -- Serialize retries before reading the canonical result. Never rescore a verified game.
  if auth.uid() is null then raise exception 'Authentication required';end if;
  select gr.*,gs.daily_number into v_frozen
  from public.game_sessions gs join public.game_results gr on gr.session_id=gs.id
  where gs.user_id=auth.uid() and gs.client_result_id=p_client_result_id
    and gs.game_id in ('higherlower')
  for update of gr;
  if not found then raise exception 'Game result not found';end if;
  if v_frozen.answers_verified then
    return jsonb_strip_nulls(jsonb_build_object('answers_verified',true,'verified',true,'correct_answers',v_frozen.correct_answers,'total_questions',v_frozen.total_questions,'correct',v_frozen.correct_answers,'total',v_frozen.total_questions,'accuracy',v_frozen.accuracy,'score',v_frozen.score,'daily_number',v_frozen.daily_number,'correct_pairs',v_frozen.result_payload->'verifiedOrderPairsCorrect','total_pairs',v_frozen.result_payload->'verifiedOrderPairsTotal'));
  end if;
  if p_rounds is null or jsonb_typeof(p_rounds) is distinct from 'array' then
    raise exception 'Answers must be an array';
  end if;
  if v_uid is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(coalesce(p_rounds,'[]'::jsonb))<>'array' or jsonb_array_length(p_rounds)<>10 then raise exception 'Higher or Lower requires exactly 10 rounds'; end if;
  select gr.id,gs.daily_number into v_result,v_daily_number
  from public.game_sessions gs join public.game_results gr on gr.session_id=gs.id
  where gs.user_id=v_uid and gs.client_result_id=p_client_result_id and gs.game_id='higherlower' limit 1;
  if v_result is null then raise exception 'Higher or Lower result not found'; end if;
  if v_daily_number is not null then
    select dc.id into v_daily_id from public.daily_challenges dc where dc.daily_number=v_daily_number and dc.challenge_date=current_date and dc.status='published' limit 1;
    if v_daily_id is null or not ('higherlower'=any(public.brainilab_daily_game_ids(current_date))) then raise exception 'Higher or Lower is not in today''s Daily'; end if;
  end if;
  for v_row in select value from jsonb_array_elements(p_rounds) loop
    v_id:=(v_row->>'pair_id')::uuid; v_choice:=lower(btrim(v_row->>'choice'));
    if v_id=any(v_seen) then raise exception 'Duplicate Higher or Lower pair'; end if; v_seen:=array_append(v_seen,v_id);
    if v_choice is null or v_choice not in ('first','second') then raise exception 'Invalid Higher or Lower choice'; end if;
    if v_daily_id is not null and not exists(select 1 from public.daily_rotating_content where daily_challenge_id=v_daily_id and game_id='higherlower' and content_id=v_id) then raise exception 'Higher or Lower pair is not assigned to today''s Daily'; end if;
    select left_value,right_value,comparison_type into v_left,v_right,v_type from public.higher_lower_pairs where id=v_id;
    if v_left is null then raise exception 'Higher or Lower pair not found'; end if;
    v_direction:=public.brainilab_higher_lower_direction(v_type,v_left,v_right);
    if v_choice=v_direction then v_correct:=v_correct+1; v_combo:=v_combo+1; v_score:=v_score+100+least(100,greatest(0,v_combo-1)*20); else v_combo:=0; end if;
  end loop;
  update public.game_results set score=v_score,correct_answers=v_correct,total_questions=10,accuracy=v_correct*10,
    answers_verified=true,verified_correct_answers=v_correct,verified_total_questions=10,answers_verified_at=now() where id=v_result;
  return jsonb_build_object('answers_verified',true,'correct_answers',v_correct,'total_questions',10,'accuracy',v_correct*10,'score',v_score);
end;$function$;

CREATE OR REPLACE FUNCTION public.verify_brainilab_sequence_result(p_client_result_id text, p_rounds jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_frozen record;
  v_uid uuid:=auth.uid(); v_result uuid; v_daily_number integer; v_daily_id uuid;
  v_row jsonb; v_id uuid; v_given numeric; v_answer numeric; v_correct integer:=0; v_seen uuid[]:=array[]::uuid[];
begin
  -- Serialize retries before reading the canonical result. Never rescore a verified game.
  if auth.uid() is null then raise exception 'Authentication required';end if;
  select gr.*,gs.daily_number into v_frozen
  from public.game_sessions gs join public.game_results gr on gr.session_id=gs.id
  where gs.user_id=auth.uid() and gs.client_result_id=p_client_result_id
    and gs.game_id in ('sequence')
  for update of gr;
  if not found then raise exception 'Game result not found';end if;
  if v_frozen.answers_verified then
    return jsonb_strip_nulls(jsonb_build_object('answers_verified',true,'verified',true,'correct_answers',v_frozen.correct_answers,'total_questions',v_frozen.total_questions,'correct',v_frozen.correct_answers,'total',v_frozen.total_questions,'accuracy',v_frozen.accuracy,'score',v_frozen.score,'daily_number',v_frozen.daily_number,'correct_pairs',v_frozen.result_payload->'verifiedOrderPairsCorrect','total_pairs',v_frozen.result_payload->'verifiedOrderPairsTotal'));
  end if;
  if p_rounds is null or jsonb_typeof(p_rounds) is distinct from 'array' then
    raise exception 'Answers must be an array';
  end if;
  if v_uid is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(coalesce(p_rounds,'[]'::jsonb))<>'array' or jsonb_array_length(p_rounds)<>10 then raise exception 'Sequence requires exactly 10 rounds'; end if;
  select gr.id,gs.daily_number into v_result,v_daily_number from public.game_sessions gs join public.game_results gr on gr.session_id=gs.id
    where gs.user_id=v_uid and gs.client_result_id=p_client_result_id and gs.game_id='sequence' limit 1;
  if v_result is null then raise exception 'Sequence result not found'; end if;
  if v_daily_number is not null then
    select id into v_daily_id from public.daily_challenges where daily_number=v_daily_number and challenge_date=current_date and status='published' limit 1;
    if v_daily_id is null or not ('sequence'=any(public.brainilab_daily_game_ids(current_date))) then raise exception 'Sequence is not in today''s Daily'; end if;
  end if;
  for v_row in select value from jsonb_array_elements(p_rounds) loop
    v_id:=(v_row->>'puzzle_id')::uuid; v_given:=(v_row->>'answer')::numeric;
    if v_id=any(v_seen) then raise exception 'Duplicate Sequence puzzle'; end if; v_seen:=array_append(v_seen,v_id);
    if v_daily_id is not null and not exists(select 1 from public.daily_rotating_content where daily_challenge_id=v_daily_id and game_id='sequence' and content_id=v_id) then raise exception 'Sequence puzzle is not assigned to today''s Daily'; end if;
    select answer_value into v_answer from public.sequence_puzzles where id=v_id; if v_answer is null then raise exception 'Sequence puzzle not found'; end if;
    if v_given is null or v_given::text in ('NaN','Infinity','-Infinity') then raise exception 'Invalid Sequence answer';end if;
    if v_given=v_answer then v_correct:=v_correct+1; end if;
  end loop;
  update public.game_results set score=v_correct*250,correct_answers=v_correct,total_questions=10,accuracy=v_correct*10,
    answers_verified=true,verified_correct_answers=v_correct,verified_total_questions=10,answers_verified_at=now() where id=v_result;
  return jsonb_build_object('answers_verified',true,'correct_answers',v_correct,'total_questions',10,'accuracy',v_correct*10,'score',v_correct*250);
end;$function$;

commit;
