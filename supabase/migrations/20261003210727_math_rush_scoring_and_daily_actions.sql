-- New games only; verified historical results remain immutable.
DO $$ BEGIN
 IF (select md5(pg_get_functiondef(oid)) from pg_proc where pronamespace='public'::regnamespace and proname='brainilab_daily_game_points') IS DISTINCT FROM '54e2b3d0d9f240616bb2592502b90e31' THEN RAISE EXCEPTION 'Concurrent change: brainilab_daily_game_points';END IF;
 IF (select md5(pg_get_functiondef(oid)) from pg_proc where pronamespace='public'::regnamespace and proname='brainilab_math_rush_operation') IS DISTINCT FROM '45a970110a17d4dfd7f57d4af51c7c52' THEN RAISE EXCEPTION 'Concurrent change: brainilab_math_rush_operation';END IF;
 IF (select md5(pg_get_functiondef(oid)) from pg_proc where pronamespace='public'::regnamespace and proname='get_brainilab_math_rush_game') IS DISTINCT FROM '7bb4f9c4e564b5d6a10b14a01b0ffcc0' THEN RAISE EXCEPTION 'Concurrent change: get_brainilab_math_rush_game';END IF;
 IF (select md5(pg_get_functiondef(oid)) from pg_proc where pronamespace='public'::regnamespace and proname='verify_brainilab_math_rush_result') IS DISTINCT FROM 'c85bd4a0d13b838d54ebca7575d69013' THEN RAISE EXCEPTION 'Concurrent change: verify_brainilab_math_rush_result';END IF;
 IF (select md5(pg_get_functiondef(oid)) from pg_proc where pronamespace='public'::regnamespace and proname='verify_brainilab_number_route_result') IS DISTINCT FROM '10d43eafb529f1e47f5ce162e8c8b8fe' THEN RAISE EXCEPTION 'Concurrent change: verify_brainilab_number_route_result';END IF;
END;$$;
CREATE OR REPLACE FUNCTION public.brainilab_math_hash_v2(p_text text)
RETURNS bigint LANGUAGE plpgsql IMMUTABLE STRICT SET search_path=public AS $$
DECLARE h bigint:=2166136261;i integer;
BEGIN
 FOR i IN 1..length(p_text) LOOP h:=((h # ascii(substr(p_text,i,1)))*16777619)%4294967296;END LOOP;
 h:=(h # (h<<13)) & 4294967295;h:=h # (h>>17);h:=(h # (h<<5)) & 4294967295;
 RETURN h;
END;$$;
CREATE OR REPLACE FUNCTION public.brainilab_math_operations_v2(p_seed text)
RETURNS jsonb LANGUAGE sql IMMUTABLE STRICT SET search_path=public AS $$
 WITH pool AS (
 SELECT 0 k,a,b,'+' op,a+b answer FROM generate_series(2,19)a CROSS JOIN generate_series(2,19)b WHERE b>=a
 UNION ALL SELECT 1,a,b,'−',a-b FROM generate_series(3,20)a CROSS JOIN generate_series(2,19)b WHERE b<a
 UNION ALL SELECT 2,a,b,'×',a*b FROM generate_series(2,12)a CROSS JOIN generate_series(2,12)b WHERE b>=a
 UNION ALL SELECT 3,b*q,b,'÷',q FROM generate_series(2,12)b CROSS JOIN generate_series(2,12)q
 ), ranked AS (
 SELECT *,row_number() OVER(PARTITION BY k ORDER BY public.brainilab_math_hash_v2(p_seed||':pool:'||k||':'||a||':'||b),a,b) r FROM pool
 ), ordered AS (
 SELECT *,row_number() OVER(ORDER BY r,public.brainilab_math_hash_v2(p_seed||':block:'||r||':'||k),k) pos FROM ranked WHERE r<=15
 ) SELECT jsonb_agg(jsonb_build_object('position',pos,'operation_id',p_seed||':'||pos,'a',a,'b',b,'operator',op,'answer',answer) ORDER BY pos) FROM ordered;
$$;
REVOKE ALL ON FUNCTION public.brainilab_math_hash_v2(text),public.brainilab_math_operations_v2(text) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.brainilab_daily_game_points(p_game_id text, p_score integer, p_correct integer, p_payload jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
declare v_points integer:=0; v_attempts integer; v_won boolean:=false; v_best_combo integer:=0;
begin
  if p_game_id='brainmix' then v_points:=least(2500,greatest(0,round(coalesce(p_score,0)*0.25)::integer));
  elsif p_game_id='flagdash' then begin v_best_combo:=coalesce((p_payload->>'bestCombo')::integer,0); exception when others then v_best_combo:=0; end; v_points:=least(2500,greatest(0,coalesce(p_correct,0)*70+v_best_combo*15));
  elsif p_game_id='mathrush' and (p_payload->>'scoringVersion'='mathrush-v2' or left(p_payload->>'seed',3)='v2:') then v_points:=least(2500,greatest(0,round(coalesce(p_score,0)/6000.0*2500)::integer));
  elsif p_game_id in ('orderup','topicrush','mathrush','numberroute','sequence') then v_points:=least(2500,greatest(0,coalesce(p_score,0)));
  elsif p_game_id='connections' then v_points:=least(2500,greatest(0,round(coalesce(p_score,0)/3000.0*2500)::integer));
  elsif p_game_id='oddoneout' then v_points:=least(2500,greatest(0,round(coalesce(p_score,0)/1000.0*2500)::integer));
  elsif p_game_id='higherlower' then v_points:=least(2500,greatest(0,round(coalesce(p_score,0)/1700.0*2500)::integer));
  elsif p_game_id='maphunt' then v_points:=least(2500,greatest(0,round(coalesce(p_score,0)*0.42)::integer));
  elsif p_game_id='brainiword' then
    v_won:=lower(coalesce(p_payload->>'won','false'))='true'; begin v_attempts:=(p_payload->>'attempts')::integer; exception when others then v_attempts:=null; end;
    if not v_won then v_points:=250; else v_points:=case v_attempts when 1 then 2500 when 2 then 2250 when 3 then 2000 when 4 then 1750 when 5 then 1500 else 1000 end; end if;
  end if;
  return least(2500,greatest(0,coalesce(v_points,0)));
end;$function$;
CREATE OR REPLACE FUNCTION public.brainilab_math_rush_operation(p_seed text, p_position integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
declare
  v_kind integer;
  v_a integer; v_b integer; v_q integer; v_answer integer; v_op text;
  h bytea;
begin
  if left(p_seed,3)='v2:' then
    if p_position not between 1 and 60 or length(p_seed)>140 then raise exception 'Invalid Math Rush position or seed';end if;
    return public.brainilab_math_operations_v2(p_seed)->(p_position-1);
  end if;
  if char_length(coalesce(p_seed,'')) not between 3 and 140 or p_position not between 1 and 60 then
    raise exception 'Invalid Math Rush operation request';
  end if;
  h:=decode(md5(p_seed||':'||p_position::text),'hex');
  v_kind:=get_byte(h,0)%4;
  if v_kind=0 then
    v_a:=1+(get_byte(h,1)%9); v_b:=1+(get_byte(h,2)%9); v_op:='+'; v_answer:=v_a+v_b;
  elsif v_kind=1 then
    v_a:=1+(get_byte(h,1)%9); v_b:=1+(get_byte(h,2)%9);
    if v_b>v_a then v_q:=v_a; v_a:=v_b; v_b:=v_q; end if;
    v_op:='âˆ’'; v_answer:=v_a-v_b;
  elsif v_kind=2 then
    v_a:=1+(get_byte(h,1)%9); v_b:=1+(get_byte(h,2)%9); v_op:='Ã—'; v_answer:=v_a*v_b;
  else
    v_b:=1+(get_byte(h,1)%9); v_q:=1+(get_byte(h,2)%(9/v_b)); v_a:=v_b*v_q; v_op:='Ã·'; v_answer:=v_q;
  end if;
  return jsonb_build_object('position',p_position,'operation_id',p_seed||':'||p_position::text,'a',v_a,'b',v_b,'operator',v_op,'answer',v_answer);
end;$function$;
CREATE OR REPLACE FUNCTION public.get_brainilab_math_rush_game(p_seed text, p_challenge_date date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_seed text; v_ops jsonb;
begin
  if p_challenge_date is not null then
    if not ('mathrush'=any(public.brainilab_daily_game_ids(p_challenge_date))) then return null; end if;
    if not exists(select 1 from public.daily_challenges where challenge_date=p_challenge_date and status='published') then return null; end if;
    v_seed:=case when left(p_seed,3)='v2:' then 'v2:daily:' else 'daily:' end||p_challenge_date::text||':mathrush';
  else
    v_seed:=left(coalesce(nullif(btrim(p_seed),''),'anytime:'||gen_random_uuid()::text),140);
  end if;
  if left(v_seed,3)='v2:' then
    select jsonb_agg(value-'answer' order by ordinality) into v_ops from jsonb_array_elements(public.brainilab_math_operations_v2(v_seed)) with ordinality;
  else
  select jsonb_agg((public.brainilab_math_rush_operation(v_seed,g.pos)-'answer') order by g.pos)
    into v_ops from generate_series(1,60) g(pos);
  end if;
  return jsonb_build_object('seed',v_seed,'challenge_date',p_challenge_date,'operations',v_ops);
end;$function$;
CREATE OR REPLACE FUNCTION public.verify_brainilab_math_rush_result(p_client_result_id text, p_seed text, p_answers jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid:=auth.uid(); v_result uuid; v_daily_number integer; v_expected_seed text; v_existing public.game_results%rowtype; v_ops jsonb; v_v2 boolean:=left(p_seed,3)='v2:';
  v_row jsonb; v_pos integer; v_given integer; v_skipped boolean; v_op jsonb; v_answer integer;
  v_correct integer:=0; v_total integer:=0; v_combo integer:=0; v_score integer:=0; v_seen integer[]:=array[]::integer[];
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if char_length(coalesce(p_seed,'')) not between 3 and 140 then raise exception 'Invalid Math Rush seed'; end if;
  if p_answers is null or jsonb_typeof(p_answers) is distinct from 'array' or jsonb_array_length(p_answers) not between 1 and 60 then raise exception 'Invalid Math Rush answers'; end if;
  select gr.id,gs.daily_number into v_result,v_daily_number from public.game_sessions gs join public.game_results gr on gr.session_id=gs.id
    where gs.user_id=v_uid and gs.client_result_id=p_client_result_id and gs.game_id='mathrush' limit 1 for update of gr;
  if v_result is null then raise exception 'Math Rush result not found'; end if;
  select * into v_existing from public.game_results where id=v_result;
  if v_existing.answers_verified then
    return jsonb_build_object('answers_verified',true,'correct_answers',v_existing.correct_answers,'total_questions',v_existing.total_questions,'accuracy',v_existing.accuracy,'score',v_existing.score);
  end if;
  if v_existing.result_payload->>'seed' is not null and v_existing.result_payload->>'seed'<>p_seed then raise exception 'Math Rush saved seed mismatch';end if;
  if v_v2 then v_ops:=public.brainilab_math_operations_v2(p_seed);end if;
  if v_daily_number is not null then
    if not ('mathrush'=any(public.brainilab_daily_game_ids(current_date))) then raise exception 'Math Rush is not in today''s Daily'; end if;
    v_expected_seed:=case when v_v2 then 'v2:daily:' else 'daily:' end||current_date::text||':mathrush';
    if not exists(select 1 from public.daily_challenges where daily_number=v_daily_number and challenge_date=current_date and status='published') then raise exception 'Math Rush Daily date mismatch';end if;
    if p_seed<>v_expected_seed then raise exception 'Math Rush Daily seed mismatch'; end if;
  end if;
  for v_row in select value from jsonb_array_elements(p_answers) loop
    v_pos:=(v_row->>'position')::integer;
    if v_pos is null or v_pos<>cardinality(v_seen)+1 or v_pos not between 1 and 60 or v_pos=any(v_seen) then raise exception 'Invalid or duplicate Math Rush position'; end if;
    v_seen:=array_append(v_seen,v_pos); v_skipped:=coalesce((v_row->>'skipped')::boolean,false);
    v_op:=case when v_v2 then v_ops->(v_pos-1) else public.brainilab_math_rush_operation(p_seed,v_pos) end; v_answer:=(v_op->>'answer')::integer;
    if v_skipped then v_combo:=0; continue; end if;
    v_total:=v_total+1; v_given:=(v_row->>'answer')::integer;
    if v_given=v_answer then v_correct:=v_correct+1; v_combo:=v_combo+1; v_score:=v_score+100+least(100,greatest(0,v_combo-1)*10); else v_combo:=0; end if;
  end loop;
  if v_v2 then v_score:=greatest(0,v_correct*100-(v_total-v_correct)*50);end if;
  update public.game_results set result_payload=coalesce(result_payload,'{}'::jsonb)||jsonb_build_object('scoringVersion',case when v_v2 then 'mathrush-v2' else 'mathrush-v1' end,'seed',p_seed),score=v_score,correct_answers=v_correct,total_questions=v_total,
    accuracy=case when v_total>0 then round(v_correct::numeric/v_total*100,2) else 0 end,
    answers_verified=true,verified_correct_answers=v_correct,verified_total_questions=v_total,answers_verified_at=now()
    where id=v_result;
  return jsonb_build_object('answers_verified',true,'correct_answers',v_correct,'total_questions',v_total,'accuracy',case when v_total>0 then round(v_correct::numeric/v_total*100,2) else 0 end,'score',v_score);
end;$function$;
CREATE OR REPLACE FUNCTION public.verify_brainilab_number_route_result(p_client_result_id text, p_rounds jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid:=auth.uid();
  v_result uuid;
  v_existing public.game_results%rowtype;
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
  limit 1 for update of gr;

  if v_result is null then
    raise exception 'Number Route result not found';
  end if;

  select * into v_existing from public.game_results where id=v_result;
  if v_existing.answers_verified then return jsonb_build_object('answers_verified',true,'correct_answers',v_existing.correct_answers,'total_questions',v_existing.total_questions,'accuracy',v_existing.accuracy,'score',v_existing.score);end if;
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
        -- also costs 100 points per failed route, even inside the first 5 seconds.
        v_round_cap:=case when v_round_index=1 then 834 else 833 end;
        v_round_score:=greatest(
          200,
          v_round_cap-(v_attempts-1)*100
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
    'scoring',case when v_daily_number is not null then 'speed-and-attempts' else 'attempts' end
  );
end;
$function$;
