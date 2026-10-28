-- Prompt-only full inventory for the six documented topic selectors. READ ONLY.
-- No get_* quiz RPC is called; no options, answer keys or player tables are read.
begin transaction read only;
with target(slug) as (values ('general-knowledge'),('world-capitals'),('world-flags'),('history'),('science'),('sports')),
eligible as (
  select t.slug,qv.prompt from public.topics t join target on target.slug=t.slug
  join public.question_versions qv on qv.primary_topic_id=t.id
  join public.questions q on q.id=qv.question_id
  where t.is_active=true and qv.status='published' and q.status='active'
    and qv.difficulty in ('easy','medium','hard')
), latest as (
  select distinct on(t.slug,p.difficulty,p.set_number) t.slug,p.id
  from public.quiz_packs p join public.topics t on t.id=p.topic_id join target on target.slug=t.slug
  where p.status='published' and p.difficulty in ('easy','medium','hard')
  order by t.slug,p.difficulty,p.set_number,p.version desc
), fixed as (
  select p.slug,qv.prompt from latest p join public.quiz_pack_questions pq on pq.quiz_pack_id=p.id
  join public.question_versions qv on qv.id=pq.question_version_id join public.questions q on q.id=qv.question_id
  where qv.status='published' and q.status='active'
), observed as (
  select to_char(current_timestamp at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as at
)
select jsonb_build_object('schemaVersion',1,'domain','brainilabgames.com','pages','[]'::jsonb,'banks',
 jsonb_agg(jsonb_build_object('topic',target.slug,'source','published-question-tables','providers',
  jsonb_build_array(
   jsonb_build_object('name','anytime','complete',true,'observedAt',observed.at,'prompts',
    coalesce((select jsonb_agg(prompt order by prompt) from (select distinct prompt from eligible where slug=target.slug) x),'[]'::jsonb)),
   jsonb_build_object('name','fixed','complete',true,'observedAt',observed.at,'prompts',
    coalesce((select jsonb_agg(prompt order by prompt) from (select distinct prompt from fixed where slug=target.slug) x),'[]'::jsonb))
  )) order by target.slug)) as quiz_schema_snapshot
from target cross join observed;
commit;
