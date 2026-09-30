CREATE OR REPLACE FUNCTION public.verify_brainilab_daily_result(p_client_result_id text, p_daily_challenge_id uuid, p_answers jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
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
$function$

