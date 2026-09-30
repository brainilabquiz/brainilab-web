-- Private editable directory and immutable revisions. Public tables are projections.
create table brainilab_editor.learning_entities (
 kind text not null check(kind in ('author','path')), slug text not null check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 document jsonb not null, revision integer not null default 1, updated_at timestamptz not null default now(), primary key(kind,slug)
);
create table brainilab_editor.learning_entity_revisions (
 kind text not null,slug text not null,revision integer not null,document jsonb not null,action text not null,created_at timestamptz not null default now(),
 primary key(kind,slug,revision),foreign key(kind,slug) references brainilab_editor.learning_entities(kind,slug)
);
create table public.learn_authors(slug text primary key,document jsonb not null,revision integer not null);
create table public.learn_paths(slug text primary key,document jsonb not null,revision integer not null);
create table public.learn_progress (
 user_id uuid not null references auth.users(id) on delete cascade,article_slug text not null references brainilab_editor.articles(slug),
 quiz_version text not null,score integer not null,total integer not null,completed_at timestamptz not null default now(),
 primary key(user_id,article_slug),check(total between 2 and 8 and score between 0 and total)
);
alter table brainilab_editor.learning_entities enable row level security;
alter table brainilab_editor.learning_entity_revisions enable row level security;
alter table public.learn_authors enable row level security;
alter table public.learn_paths enable row level security;
alter table public.learn_progress enable row level security;
revoke all on brainilab_editor.learning_entities,brainilab_editor.learning_entity_revisions,public.learn_authors,public.learn_paths,public.learn_progress from public,anon,authenticated;
grant select on public.learn_authors,public.learn_paths to anon,authenticated;
grant select on public.learn_progress to authenticated;
create policy "Published bylines" on public.learn_authors for select to anon,authenticated using(true);
create policy "Published learning paths" on public.learn_paths for select to anon,authenticated using(true);
create policy "Own learning progress" on public.learn_progress for select to authenticated using((select auth.uid())=user_id);
create index learn_progress_article_idx on public.learn_progress(article_slug);

create function brainilab_editor.validate_quiz(q jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare item jsonb; opt jsonb;
begin
 if q is null or jsonb_typeof(q)<>'object' or coalesce(q->>'version','') !~ '^[a-zA-Z0-9-]{1,80}$' or jsonb_typeof(q->'questions') is distinct from 'array' then raise exception 'A round needs a version and questions.'; end if;
 if jsonb_array_length(q->'questions') not between 2 and 8 then raise exception 'Use between 2 and 8 questions.'; end if;
 for item in select value from jsonb_array_elements(q->'questions') loop
  if length(trim(coalesce(item->>'prompt',''))) not between 1 and 600 or length(trim(coalesce(item->>'explanation',''))) not between 1 and 1500 or jsonb_typeof(item->'options') is distinct from 'array' or coalesce(item->>'answer','') !~ '^[0-3]$' then raise exception 'Each question needs four choices, a correct answer and an explanation.'; end if;
  if jsonb_array_length(item->'options')<>4 or (select count(distinct value) from jsonb_array_elements(item->'options'))<>4 then raise exception 'Use four distinct choices.'; end if;
  for opt in select value from jsonb_array_elements(item->'options') loop
   if jsonb_typeof(opt)<>'string' or length(trim(opt#>>'{}')) not between 1 and 500 then raise exception 'Each choice needs text (up to 500 characters).'; end if;
  end loop;
 end loop;
end $$;

-- Validation applies even when existing article RPCs are used by another client.
create function brainilab_editor.check_learning_article() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='DELETE' then
  if exists(select 1 from public.learn_paths p,jsonb_array_elements(p.document->'lessons') l where l->>'slug'=old.slug) then raise exception 'Remove this lesson from published learning paths before withdrawing it.';end if;return old;
 end if;
 if new.document ? 'authorId' and nullif(new.document->>'authorId','') is not null and not exists(select 1 from public.learn_authors where slug=new.document->>'authorId') then raise exception 'Choose an existing author.';end if;
 if new.document->'quiz' is not null and new.document->'quiz'<>'null'::jsonb then perform brainilab_editor.validate_quiz(new.document->'quiz');
 elsif exists(select 1 from public.learn_paths p,jsonb_array_elements(p.document->'lessons') l where l->>'slug'=new.slug) then raise exception 'A published path lesson needs a quick round.';end if;
 if tg_op='UPDATE' and new.document#>'{quiz,questions}' is distinct from old.document#>'{quiz,questions}' and new.document#>>'{quiz,version}'=old.document#>>'{quiz,version}' then raise exception 'Change the quiz version when its questions change.';end if;
 return new;
end $$;
create trigger check_learning_article before insert or update or delete on public.learn_publications for each row execute function brainilab_editor.check_learning_article();

create function brainilab_editor.list_learning_entities(p_kind text) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform public.require_brainilab_admin(array['owner','editor']);
 return coalesce((select jsonb_agg(jsonb_build_object('slug',e.slug,'document',e.document,'revision',e.revision,'published_revision',case when e.kind='path' then p.revision else a.revision end) order by e.slug) from brainilab_editor.learning_entities e left join public.learn_paths p on e.kind='path' and e.slug=p.slug left join public.learn_authors a on e.kind='author' and e.slug=a.slug where e.kind=p_kind),'[]'::jsonb);
end $$;
create function brainilab_editor.save_learning_entity(p_kind text,p_slug text,p_document jsonb,p_revision integer,p_action text) returns jsonb language plpgsql security definer set search_path='' as $$
declare current_row brainilab_editor.learning_entities%rowtype; doc jsonb;pub jsonb; item jsonb; lesson jsonb; rev integer;uid uuid;author_doc jsonb;
begin
 uid:=public.require_brainilab_admin(array['owner','editor']);
 if p_kind not in ('author','path') or p_kind is null or p_slug is null or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(p_slug)>100 then raise exception 'Invalid type or URL.';end if;
 if p_action is null or p_action not in ('draft','publish','unpublish','archive') or jsonb_typeof(p_document) is distinct from 'object' or octet_length(p_document::text)>100000 then raise exception 'Invalid action or document.';end if;
 perform pg_advisory_xact_lock(hashtextextended('learn-entity:'||p_kind||':'||p_slug,0));
 select * into current_row from brainilab_editor.learning_entities where kind=p_kind and slug=p_slug for update;
 if coalesce(current_row.revision,0)<>coalesce(p_revision,-1) then raise exception 'This record changed in another session. Reload before saving.';end if;
 rev:=coalesce(current_row.revision,0)+1;doc:=p_document||jsonb_build_object('slug',p_slug,'updatedAt',now());
 if p_kind='author' then
  if p_action not in ('publish','archive') then raise exception 'Save or archive a person.';end if;
  if length(trim(coalesce(doc->>'name',''))) not between 1 and 120 or length(coalesce(doc->>'role',''))>180 or length(coalesce(doc->>'biography',''))>4000 then raise exception 'Add a name and keep the biography under 4000 characters.';end if;
  if coalesce(doc->>'photo','')<>'' and coalesce(doc->>'photo','') !~ '^(/assets/images/learn/[a-z0-9-]+\.webp|https://wvgcdlxebbybthyuajgb\.supabase\.co/storage/v1/object/public/learn-covers/[a-zA-Z0-9_./-]+\.(webp|png|jpg|jpeg))$' then raise exception 'Upload a JPG, PNG or WebP photo.';end if;
  if jsonb_typeof(doc->'socials') is distinct from 'array' or jsonb_array_length(doc->'socials')>10 then raise exception 'Use up to ten social profiles.';end if;
  for item in select value from jsonb_array_elements(doc->'socials') loop
   if length(trim(coalesce(item->>'name','')))=0 or coalesce(item->>'url','') !~ '^https://[^[:space:]<>"\\]+$' then raise exception 'Each social profile needs a label and HTTPS URL.';end if;
  end loop;
  if p_action='archive' then doc:=doc||'{"active":false,"visible":false}'::jsonb;end if;
  -- A collaborator has a public credit, but no exposed biography, photo or social profiles.
  pub:=jsonb_build_object('slug',p_slug,'name',doc->>'name','active',coalesce((doc->>'active')::boolean,true),'visible',coalesce((doc->>'visible')::boolean,false) and coalesce((doc->>'active')::boolean,true));
  if (pub->>'visible')::boolean then pub:=pub||jsonb_build_object('role',doc->>'role','biography',doc->>'biography','photo',doc->>'photo','socials',doc->'socials');end if;
  insert into public.learn_authors values(p_slug,pub,rev) on conflict(slug) do update set document=excluded.document,revision=excluded.revision;
 else
  if p_action='archive' then raise exception 'Move a path to draft instead.';end if;
  if length(trim(coalesce(doc->>'title',''))) not between 1 and 180 then raise exception 'Add a path title.';end if;
  if p_action='publish' then
   if trim(coalesce(doc->>'description',''))='' or trim(coalesce(doc->>'introduction',''))='' or trim(coalesce(doc->>'topic',''))='' then raise exception 'Add a description, introduction and topic.';end if;
   select document into author_doc from public.learn_authors where slug=doc->>'authorId';
   if author_doc is null or not coalesce((author_doc->>'active')::boolean,false) then raise exception 'Choose an active author.';end if;
   if jsonb_typeof(doc->'lessons') is distinct from 'array' or jsonb_array_length(doc->'lessons') not between 2 and 30 then raise exception 'Use between 2 and 30 published lessons.';end if;
   if (select count(distinct value->>'slug') from jsonb_array_elements(doc->'lessons'))<>jsonb_array_length(doc->'lessons') then raise exception 'Do not repeat a lesson.';end if;
   for item in select value from jsonb_array_elements(doc->'lessons') loop
    select document into lesson from public.learn_publications where slug=item->>'slug' for share;
    if lesson is null then raise exception 'Publish every lesson before this path.';end if;
    perform brainilab_editor.validate_quiz(lesson->'quiz');
    if trim(coalesce(item->>'objective',''))='' then raise exception 'Explain what each lesson teaches.';end if;
   end loop;
   if jsonb_typeof(doc->'sources') is distinct from 'array' or jsonb_array_length(doc->'sources')=0 then raise exception 'Add reliable named sources.';end if;
   for item in select value from jsonb_array_elements(doc->'sources') loop
    if trim(coalesce(item->>'name',''))='' or coalesce(item->>'url','') !~ '^https://[^[:space:]<>"\\]+$' then raise exception 'Each source needs a name and HTTPS URL.';end if;
   end loop;
   if jsonb_typeof(doc->'outcomes') is distinct from 'array' or jsonb_array_length(doc->'outcomes')=0 or jsonb_typeof(doc->'glossary') is distinct from 'array' then raise exception 'Add learning outcomes and a glossary list.';end if;
   doc:=doc||jsonb_build_object('status','published','publishedAt',coalesce(current_row.document->>'publishedAt',now()::text));
   insert into public.learn_paths values(p_slug,doc,rev) on conflict(slug) do update set document=excluded.document,revision=excluded.revision;
  else
   doc:=doc||'{"status":"draft"}'::jsonb;
   if p_action='unpublish' then delete from public.learn_paths where slug=p_slug;end if;
  end if;
 end if;
 insert into brainilab_editor.learning_entities(kind,slug,document,revision) values(p_kind,p_slug,doc,rev) on conflict(kind,slug) do update set document=excluded.document,revision=excluded.revision,updated_at=now();
 insert into brainilab_editor.learning_entity_revisions values(p_kind,p_slug,rev,doc,p_action,now());
 perform public.log_brainilab_admin_action('learning_'||p_action,p_kind,p_slug,jsonb_build_object('revision',rev));
 return jsonb_build_object('slug',p_slug,'document',doc,'revision',rev);
end $$;

create function brainilab_editor.complete_lesson(p_slug text,p_version text,p_answers jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();q jsonb;v_score integer:=0;v_total integer;i integer;v_answer text;
begin
 if uid is null then raise exception 'Sign in to save account progress.';end if;
 select document->'quiz' into q from public.learn_publications where slug=p_slug for share;
 perform brainilab_editor.validate_quiz(q);
 if q->>'version' is distinct from p_version then raise exception 'This round has changed. Reload the lesson.';end if;
 v_total:=jsonb_array_length(q->'questions');
 if jsonb_typeof(p_answers) is distinct from 'array' or jsonb_array_length(p_answers)<>v_total then raise exception 'Answer every question.';end if;
 for i in 0..v_total-1 loop
  v_answer:=p_answers->>i;if v_answer is null or v_answer !~ '^[0-3]$' then raise exception 'Invalid answer.';end if;
  if v_answer=(q->'questions'->i->>'answer') then v_score:=v_score+1;end if;
 end loop;
 insert into public.learn_progress(user_id,article_slug,quiz_version,score,total) values(uid,p_slug,p_version,v_score,v_total)
 on conflict(user_id,article_slug) do update set quiz_version=excluded.quiz_version,score=case when learn_progress.quiz_version=excluded.quiz_version then greatest(learn_progress.score,excluded.score) else excluded.score end,total=excluded.total,completed_at=now();
 return jsonb_build_object('score',v_score,'total',v_total,'completed',true,'version',p_version);
end $$;
-- Invoker wrappers expose only narrow operations; helpers enforce identity/role.
create function public.admin_list_learning_entities(p_kind text) returns jsonb language sql security invoker set search_path='' as $$select brainilab_editor.list_learning_entities(p_kind)$$;
create function public.admin_save_learning_entity(p_kind text,p_slug text,p_document jsonb,p_revision integer,p_action text) returns jsonb language sql security invoker set search_path='' as $$select brainilab_editor.save_learning_entity(p_kind,p_slug,p_document,p_revision,p_action)$$;
create function public.complete_learn_lesson(p_slug text,p_version text,p_answers jsonb) returns jsonb language sql security invoker set search_path='' as $$select brainilab_editor.complete_lesson(p_slug,p_version,p_answers)$$;
revoke all on function brainilab_editor.validate_quiz(jsonb),brainilab_editor.check_learning_article(),brainilab_editor.list_learning_entities(text),brainilab_editor.save_learning_entity(text,text,jsonb,integer,text),brainilab_editor.complete_lesson(text,text,jsonb),public.admin_list_learning_entities(text),public.admin_save_learning_entity(text,text,jsonb,integer,text),public.complete_learn_lesson(text,text,jsonb) from public,anon,authenticated;
grant execute on function brainilab_editor.list_learning_entities(text),brainilab_editor.save_learning_entity(text,text,jsonb,integer,text),brainilab_editor.complete_lesson(text,text,jsonb),public.admin_list_learning_entities(text),public.admin_save_learning_entity(text,text,jsonb,integer,text),public.complete_learn_lesson(text,text,jsonb) to authenticated;
-- User-specified name only; the team will add its own biography, role and portrait.
insert into brainilab_editor.learning_entities(kind,slug,document) values('author','biel-sarda','{"slug":"biel-sarda","name":"Biel Sardà","role":"","biography":"","photo":"","socials":[],"visible":true,"active":true}');
insert into public.learn_authors select slug,document,revision from brainilab_editor.learning_entities where kind='author';
insert into brainilab_editor.learning_entity_revisions select kind,slug,revision,document,'seed',now() from brainilab_editor.learning_entities where kind='author';
