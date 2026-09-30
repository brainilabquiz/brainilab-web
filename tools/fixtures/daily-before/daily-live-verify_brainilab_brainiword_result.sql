CREATE OR REPLACE FUNCTION public.verify_brainilab_brainiword_result(p_client_result_id text, p_daily_challenge_id uuid, p_guesses jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
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

  select dc.daily_number,bw.word
    into v_daily_number,v_answer
  from public.daily_brainiword dbw
  join public.daily_challenges dc on dc.id=dbw.daily_challenge_id
  join public.brainiword_words bw on bw.id=dbw.word_id
  where dbw.daily_challenge_id=p_daily_challenge_id;

  if v_answer is null then raise exception 'BrainiWord Daily not found'; end if;
  if jsonb_array_length(p_guesses)>5 then raise exception 'Too many guesses'; end if;

  for v_guess in
    select upper(value #>> '{}')
    from jsonb_array_elements(p_guesses)
  loop
    if v_guess !~ '^[A-Z]{5}$' or not exists(
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
$function$

