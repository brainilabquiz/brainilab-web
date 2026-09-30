CREATE OR REPLACE FUNCTION public.submit_brainilab_game_result(p_client_result_id text, p_game_id text, p_played_at timestamp with time zone, p_score integer DEFAULT NULL::integer, p_correct_answers integer DEFAULT NULL::integer, p_total_questions integer DEFAULT NULL::integer, p_accuracy numeric DEFAULT NULL::numeric, p_duration_ms integer DEFAULT NULL::integer, p_client_percentile integer DEFAULT NULL::integer, p_daily_number integer DEFAULT NULL::integer, p_difficulty text DEFAULT NULL::text, p_set_number integer DEFAULT NULL::integer, p_result_payload jsonb DEFAULT '{}'::jsonb, p_answer_correctness jsonb DEFAULT '[]'::jsonb)
 RETURNS TABLE(session_id uuid, result_id uuid, already_existed boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
v_user_id uuid;
v_session_id uuid;
v_result_id uuid;
v_started_at timestamptz;
v_item jsonb;
v_position integer:=0;
v_payload jsonb;
begin
v_user_id:=auth.uid();

if v_user_id is null then
raise exception 'Authentication required';
end if;

if p_client_result_id is null
or char_length(btrim(p_client_result_id))<8
or char_length(p_client_result_id)>100 then
raise exception 'Invalid client result ID';
end if;

if p_game_id is null
or char_length(btrim(p_game_id))<2
or char_length(p_game_id)>60 then
raise exception 'Invalid game ID';
end if;

if p_difficulty is not null
and p_difficulty not in ('easy','medium','hard') then
raise exception 'Invalid difficulty';
end if;

if p_set_number is not null and p_set_number<=0 then
raise exception 'Invalid set number';
end if;

if p_accuracy is not null and (p_accuracy<0 or p_accuracy>100) then
raise exception 'Invalid accuracy';
end if;

if p_correct_answers is not null and p_correct_answers<0 then
raise exception 'Invalid correct answer count';
end if;

if p_total_questions is not null and p_total_questions<0 then
raise exception 'Invalid total question count';
end if;

if p_correct_answers is not null
and p_total_questions is not null
and p_correct_answers>p_total_questions then
raise exception 'Correct answers cannot exceed total questions';
end if;

if p_score is not null and p_score<0 then
raise exception 'Invalid score';
end if;

if p_duration_ms is not null and p_duration_ms<0 then
raise exception 'Invalid duration';
end if;

if p_client_percentile is not null
and (p_client_percentile<0 or p_client_percentile>100) then
raise exception 'Invalid percentile';
end if;

v_payload:=coalesce(p_result_payload,'{}'::jsonb);
  if lower(btrim(p_game_id)) not in ('brainmix','brainiword','orderup','topicrush','connections','oddoneout','higherlower','mathrush','numberroute','sequence','survival','worldflags','worldcapitals','generalknowledge','science','history','sports') then
    raise exception 'Unknown or retired game';
  end if;
  p_game_id:=lower(btrim(p_game_id));
  p_daily_number:=nullif(p_daily_number,0);
  if p_daily_number is not null and p_daily_number<1 then raise exception 'Invalid Daily number'; end if;
  if coalesce(v_payload->>'practice','false')='true' or coalesce(v_payload->>'tryFirst','false')='true' then raise exception 'Practice games do not award points'; end if;
  if coalesce(p_total_questions,0)>1000 or coalesce(p_score,0)>100000 or coalesce(p_duration_ms,0)>86400000 then raise exception 'Result exceeds game limits'; end if;
  -- Rankings and reward caps use the server receipt date, never a client-selected date.
  p_played_at:=now();
  perform pg_advisory_xact_lock(hashtextextended('submit:'||v_user_id::text||':'||p_client_result_id,0));


if octet_length(v_payload::text)>20000 then
raise exception 'Result payload too large';
end if;

-- Browser retry idempotency.
select gs.id,gr.id
into v_session_id,v_result_id
from public.game_sessions gs
left join public.game_results gr on gr.session_id=gs.id
where gs.user_id=v_user_id
and gs.client_result_id=p_client_result_id
limit 1;

if v_session_id is not null then
return query select v_session_id,v_result_id,true;
return;
end if;

-- Daily result lock. The advisory lock closes the tiny race window where
-- two tabs could otherwise submit the same Daily game simultaneously.
if p_daily_number is not null then
perform pg_advisory_xact_lock(
hashtextextended(
v_user_id::text||':'||lower(btrim(p_game_id))||':'||p_daily_number::text,
0
)
);

select gs.id,gr.id
into v_session_id,v_result_id
from public.game_sessions gs
left join public.game_results gr on gr.session_id=gs.id
where gs.user_id=v_user_id
and gs.game_id=btrim(p_game_id)
and gs.daily_number=p_daily_number
and gs.status='completed'
order by gs.completed_at desc nulls last
limit 1;

if v_session_id is not null then
return query select v_session_id,v_result_id,true;
return;
end if;
end if;

v_started_at:=
coalesce(p_played_at,now())
-make_interval(secs=>greatest(coalesce(p_duration_ms,0),0)/1000.0);

insert into public.game_sessions(
user_id,
client_result_id,
game_id,
source,
difficulty,
set_number,
daily_number,
status,
started_at,
completed_at
)
values(
v_user_id,
btrim(p_client_result_id),
btrim(p_game_id),
'web',
p_difficulty,
p_set_number,
p_daily_number,
'completed',
v_started_at,
coalesce(p_played_at,now())
)
returning id into v_session_id;

insert into public.game_results(
session_id,
user_id,
score,
correct_answers,
total_questions,
accuracy,
duration_ms,
client_percentile,
result_payload,
server_verified
)
values(
v_session_id,
v_user_id,
p_score,
p_correct_answers,
p_total_questions,
p_accuracy,
p_duration_ms,
p_client_percentile,
v_payload,
false
)
returning id into v_result_id;

if jsonb_typeof(coalesce(p_answer_correctness,'[]'::jsonb))='array' then
for v_item in
select value
from jsonb_array_elements(coalesce(p_answer_correctness,'[]'::jsonb))
loop
v_position:=v_position+1;
if v_position>100 then exit; end if;

insert into public.game_answers(
session_id,
user_id,
position,
is_correct
)
values(
v_session_id,
v_user_id,
v_position,
case
when jsonb_typeof(v_item)='boolean'
then (v_item#>>'{}')::boolean
else null
end
);
end loop;
end if;

return query select v_session_id,v_result_id,false;
end;
$function$

