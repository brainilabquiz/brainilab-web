CREATE OR REPLACE FUNCTION public.check_brainilab_brainiword_guess(p_daily_challenge_id uuid, p_guess text, p_attempt integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_answer text;
  v_guess text:=upper(trim(p_guess));
  v_answer_chars text[];
  v_guess_chars text[];
  v_states text[]:=array[
    'absent',
    'absent',
    'absent',
    'absent',
    'absent'
  ];
  v_used boolean[]:=array[
    false,
    false,
    false,
    false,
    false
  ];
  i integer;
  j integer;
  v_won boolean;
  v_finished boolean;
begin
  if v_guess !~ '^[A-Z]{5}$' then
    raise exception 'Guess must contain exactly five letters';
  end if;

  if p_attempt not between 1 and 5 then
    raise exception 'Invalid attempt';
  end if;

  select bw.word
  into v_answer
  from public.daily_brainiword dbw
  join public.daily_challenges dc
    on dc.id=dbw.daily_challenge_id
  join public.brainiword_words bw
    on bw.id=dbw.word_id
  where dbw.daily_challenge_id=p_daily_challenge_id
    and dc.challenge_date<=current_date
    and dc.status='published';

  if v_answer is null then
    raise exception 'BrainiWord Daily not available';
  end if;

  v_answer_chars:=array[
    substr(v_answer,1,1),
    substr(v_answer,2,1),
    substr(v_answer,3,1),
    substr(v_answer,4,1),
    substr(v_answer,5,1)
  ];

  v_guess_chars:=array[
    substr(v_guess,1,1),
    substr(v_guess,2,1),
    substr(v_guess,3,1),
    substr(v_guess,4,1),
    substr(v_guess,5,1)
  ];

  for i in 1..5 loop
    if v_guess_chars[i]=v_answer_chars[i] then
      v_states[i]:='correct';
      v_used[i]:=true;
    end if;
  end loop;

  for i in 1..5 loop
    if v_states[i]='correct' then
      continue;
    end if;

    for j in 1..5 loop
      if not v_used[j]
         and v_guess_chars[i]=v_answer_chars[j] then
        v_states[i]:='present';
        v_used[j]:=true;
        exit;
      end if;
    end loop;
  end loop;

  v_won:=v_guess=v_answer;
  v_finished:=v_won or p_attempt=5;

  return jsonb_build_object(
    'states',to_jsonb(v_states),
    'won',v_won,
    'finished',v_finished,
    'answer',
      case
        when v_finished then v_answer
        else null
      end
  );
end;
$function$

