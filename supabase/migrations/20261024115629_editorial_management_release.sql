-- Unattended editorial publication through the existing authenticated management connection.
-- No HTTP endpoint, JWT impersonation, browser token or public EXECUTE grant.
-- Existing browser CMS entry points, role/MFA checks and player tables are unchanged.
create table brainilab_editor.automation_releases (
 id text primary key,
 payload_hash text not null,
 receipt jsonb not null,
 created_at timestamptz not null default now()
);
alter table brainilab_editor.automation_releases enable row level security;
revoke all on brainilab_editor.automation_releases from public,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION brainilab_editor.automation_save_article(p_slug text, p_document jsonb, p_revision integer, p_action text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO ''
AS $function$
declare v_uid uuid; v_current integer; v_revision integer; v_document jsonb; v_section jsonb; v_link jsonb; v_first timestamptz; v_ids text[]:=array[]::text[];
begin
 if current_user<>'postgres' then raise exception 'Management connection required'; end if;
 v_uid:=null;
 if p_slug is null or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(p_slug)>120 then raise exception 'Use a short URL with lowercase letters, numbers and hyphens.'; end if;
 if p_action not in ('draft','publish','unpublish') or p_action is null then raise exception 'Invalid action'; end if;
 if p_document is null or jsonb_typeof(p_document)<>'object' or octet_length(p_document::text)>190000 then raise exception 'Article is too large or invalid'; end if;
 if length(trim(coalesce(p_document->>'title','')))=0 or length(p_document->>'title')>180 then raise exception 'Add a title (maximum 180 characters).'; end if;
 if length(coalesce(p_document->>'description',''))>400 or length(coalesce(p_document->>'topic',''))>60 then raise exception 'Description or topic is too long.'; end if;
 if coalesce(jsonb_typeof(p_document->'sections'),'null')<>'array' or jsonb_array_length(p_document->'sections')>40 then raise exception 'Use up to 40 sections.'; end if;
 for v_section in select value from jsonb_array_elements(p_document->'sections') loop
  if coalesce(v_section->>'id','') !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or v_section->>'id'=any(v_ids) or v_section->>'id'='sources' then raise exception 'Section IDs must be unique.'; end if;
  v_ids:=array_append(v_ids,v_section->>'id');
 end loop;
 if p_action='publish' then
  for v_section in select value from jsonb_array_elements(p_document->'sections') loop
   if trim(coalesce(v_section->>'title',''))='' or trim(regexp_replace(coalesce(v_section->>'html',''),'<[^>]*>','','g'))='' then raise exception 'Each section needs a heading and text.'; end if;
  end loop;
  if trim(coalesce(p_document->>'description',''))='' or trim(coalesce(p_document->>'topic',''))='' or jsonb_array_length(p_document->'sections')=0 or trim(coalesce(p_document->>'practice',''))='' then raise exception 'Add a description, topic, article sections and game invitation before publishing.'; end if;
  if trim(coalesce(p_document#>>'{cover,alt}',''))='' or trim(coalesce(p_document#>>'{cover,credit}',''))='' or coalesce(p_document#>>'{cover,src}','') !~ '^(/assets/images/learn/[a-z0-9-]+\.webp|https://wvgcdlxebbybthyuajgb\.supabase\.co/storage/v1/object/public/learn-covers/[a-zA-Z0-9_./-]+\.(webp|png|jpg|jpeg))$' then raise exception 'Choose an article cover and add its description and credit.'; end if;
  for v_link in select p_document->'game' union all select p_document->'hub' loop
   if trim(coalesce(v_link->>'name',''))='' or coalesce(v_link->>'url','') !~ '^/[a-z0-9][a-z0-9/-]*/$' then raise exception 'Choose valid game and topic links.'; end if;
  end loop;
  if coalesce(jsonb_typeof(p_document->'sources'),'null')<>'array' or jsonb_array_length(p_document->'sources')=0 then raise exception 'Add at least one source.'; end if;
  for v_link in select value from jsonb_array_elements(p_document->'sources') loop
   if trim(coalesce(v_link->>'name',''))='' or coalesce(v_link->>'url','') !~ '^(https://[^[:space:]<>]+|/[a-z0-9][a-z0-9/._-]*)$' then raise exception 'Each source needs a name and an HTTPS or internal link.'; end if;
  end loop;
 end if;
 -- A transaction-level lock also covers simultaneous first saves.
 perform pg_advisory_xact_lock(hashtextextended('learn:'||p_slug,0));
 select revision into v_current from brainilab_editor.articles where slug=p_slug for update;
 if coalesce(v_current,0)<>coalesce(p_revision,-1) then raise exception 'This article changed in another session. Reload the saved version before saving again.'; end if;
 v_revision:=coalesce(v_current,0)+1;
 select published_at into v_first from public.learn_publications where slug=p_slug;
 v_first:=coalesce(v_first,now());
 v_document:=p_document||jsonb_build_object('slug',p_slug,'status',case when p_action='publish' then 'published' else 'draft' end);
 if p_action='publish' then v_document:=v_document||jsonb_build_object('publishedAt',v_first,'updatedAt',now()); end if;
 insert into brainilab_editor.articles(slug,document,revision,updated_by) values(p_slug,v_document,v_revision,v_uid)
 on conflict(slug) do update set document=excluded.document,revision=excluded.revision,updated_at=now(),updated_by=v_uid;
 insert into brainilab_editor.revisions(slug,revision,document,action,created_by) values(p_slug,v_revision,v_document,p_action,v_uid);
 if p_action='publish' then
  insert into public.learn_publications(slug,document,revision,published_at) values(p_slug,v_document,v_revision,v_first)
  on conflict(slug) do update set document=excluded.document,revision=excluded.revision,updated_at=now();
 elsif p_action='unpublish' then delete from public.learn_publications where slug=p_slug;
 end if;
 return jsonb_build_object('slug',p_slug,'revision',v_revision,'document',v_document,'action',p_action);
end $function$;

CREATE OR REPLACE FUNCTION brainilab_editor.automation_save_path(p_kind text, p_slug text, p_document jsonb, p_revision integer, p_action text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO ''
AS $function$
declare current_row brainilab_editor.learning_entities%rowtype; doc jsonb;pub jsonb; item jsonb; lesson jsonb; rev integer;uid uuid;author_doc jsonb;
begin
 if current_user<>'postgres' or p_kind<>'path' or p_action<>'publish' then raise exception 'Management path publication only'; end if;
 uid:=null;
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
 return jsonb_build_object('slug',p_slug,'document',doc,'revision',rev);
end $function$;


revoke all on function brainilab_editor.automation_save_article(text,jsonb,integer,text) from public,anon,authenticated,service_role;
revoke all on function brainilab_editor.automation_save_path(text,text,jsonb,integer,text) from public,anon,authenticated,service_role;

create function brainilab_editor.publish_reviewed_release(p_payload text)
returns jsonb language plpgsql security invoker set search_path='' as $release$
#variable_conflict use_variable
declare
 m jsonb; e jsonb; d jsonb; q jsonb; a jsonb; r jsonb; evidence jsonb;
 id text; h text; slug text; k text; gate text; saved jsonb;
 result jsonb:='[]'::jsonb; existing brainilab_editor.automation_releases%rowtype;
 current_rev integer; public_rev integer; snapshot_hash text; old_doc jsonb;
 known text[]:=array[]::text[]; members text[]; member text; changed integer:=0;
 local_day date:=(now() at time zone 'Europe/Madrid')::date;
begin
 if current_user<>'postgres' then raise exception 'Management connection required';end if;
 if p_payload is null or octet_length(p_payload)>2000000 then raise exception 'Invalid release size';end if;
 m:=p_payload::jsonb; id:=m->>'id'; h:=encode(sha256(convert_to(p_payload,'UTF8')),'hex');
 if jsonb_typeof(m)<>'object' or id is null or id !~ '^[a-z0-9-]{1,100}$' then raise exception 'Invalid release ID';end if;
 perform pg_advisory_xact_lock(hashtextextended('brainilab-reviewed-editorial-release',0));
 select * into existing from brainilab_editor.automation_releases where automation_releases.id=id;
 if found then
  if existing.payload_hash<>h then raise exception 'Release ID reused with changed content';end if;
  return existing.receipt||jsonb_build_object('replayed',true);
 end if;
 if coalesce(m->>'authorisation','')<>'owner-authorised-editorial-publication-2026-10-24' then raise exception 'Missing publication authorisation';end if;
 if md5(pg_get_functiondef('brainilab_editor.save_article(text,jsonb,integer,text)'::regprocedure))<>'6896029eda07ac64421dd53b76af0503'
 or md5(pg_get_functiondef('brainilab_editor.save_learning_entity(text,text,jsonb,integer,text)'::regprocedure))<>'ee3e2ec63f40882ab4509f8cf9f761f2'
 then raise exception 'CMS validation changed; review publisher compatibility';end if;
 if m->>'backupSha256' !~ '^[a-f0-9]{64}$' or m->>'backupSha256' is null then raise exception 'Private backup proof required';end if;
 if jsonb_typeof(m->'entries') is distinct from 'array' or jsonb_array_length(m->'entries') not between 1 and 30 then raise exception 'Use 1–30 entries';end if;
 -- Lock the same per-record keys used by the manual CMS, in stable order.
 for e in select value from jsonb_array_elements(m->'entries') order by value->>'kind',value->>'slug' loop
  slug:=e->>'slug'; k:=e->>'kind';
  if k not in ('article','lesson','hub','links','path') or k is null or slug is null or slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(slug)>100 then raise exception 'Invalid release entry';end if;
  if slug=any(known) then raise exception 'Duplicate release slug';end if;
  known:=array_append(known,slug);
  perform pg_advisory_xact_lock(hashtextextended(case when k='path' then 'learn-entity:path:' else 'learn:' end||slug,0));
  d:=(e->>'documentText')::jsonb;
  if d->>'slug' is distinct from slug then raise exception 'Document slug mismatch';end if;
  if encode(sha256(convert_to(e->>'documentText','UTF8')),'hex') is distinct from e->>'documentSha256' then raise exception 'Document hash mismatch';end if;
  if k='path' then
   select revision,md5(document::text),document into current_rev,snapshot_hash,old_doc from brainilab_editor.learning_entities where kind='path' and learning_entities.slug=slug for update;
   select revision into public_rev from public.learn_paths where learn_paths.slug=slug for update;
  else
   select revision,md5(document::text),document into current_rev,snapshot_hash,old_doc from brainilab_editor.articles where articles.slug=slug for update;
   select revision into public_rev from public.learn_publications where learn_publications.slug=slug for update;
  end if;
  if coalesce(current_rev,0) is distinct from (e->>'expectedRevision')::integer
   or coalesce(public_rev,0) is distinct from (e->>'expectedPublishedRevision')::integer
   or coalesce(snapshot_hash,'missing') is distinct from e->>'expectedSnapshotHash'
  then raise exception 'Concurrent edit detected for %; refresh backup and review',slug;end if;
  if k='links' then
   if old_doc is null or public_rev is null then raise exception 'Link updates require a published article';end if;
   if (d-array['related','sections','status','updatedAt']::text[]) is distinct from (old_doc-array['related','sections','status','updatedAt']::text[]) then raise exception 'Link update changed other metadata';end if;
   if jsonb_array_length(d->'sections')<>jsonb_array_length(old_doc->'sections') then raise exception 'Link update changed section count';end if;
   -- Text may gain contextual hub links; a reviewed diff is required below.
  end if;
  if old_doc ? 'publishedAt' and d->>'publishedAt' is distinct from old_doc->>'publishedAt' then raise exception 'Preserve original publication date';end if;
  if k='path' and old_doc is not null then
   -- Existing lessons retain relative order; insertions can extend the route.
   if exists(select 1 from jsonb_array_elements(old_doc->'lessons') with ordinality o(v,n)
    left join lateral (select n from jsonb_array_elements(d->'lessons') with ordinality t(v,n) where t.v->>'slug'=o.v->>'slug') nn on true
    where nn.n is null) then raise exception 'Do not remove existing path lessons';end if;
   if (select array_agg(v->>'slug' order by n) from jsonb_array_elements(d->'lessons') with ordinality t(v,n) where exists(select 1 from jsonb_array_elements(old_doc->'lessons') o where o->>'slug'=t.v->>'slug'))
    is distinct from (select array_agg(v->>'slug' order by n) from jsonb_array_elements(old_doc->'lessons') with ordinality t(v,n)) then raise exception 'Do not reorder existing lessons';end if;
  end if;
  r:=e->'review';
  foreach gate in array array['intent','novelty','sources','examples','english','metadata','links','mobile','desktop','validators'] loop
   if r#>>array[gate,'status'] is distinct from 'verified' or coalesce(r#>>array[gate,'proofSha256'],'') !~ '^[a-f0-9]{64}$' then raise exception 'Unverified % review for %',gate,slug;end if;
  end loop;
  if (r->>'checkedAt')::timestamptz not between now()-interval '24 hours' and now()+interval '5 minutes' or r->>'checkedAt' is null then raise exception 'Review expired';end if;
  if k<>'links' then
   evidence:=r->'demand';
   if evidence->>'status' is distinct from 'verified' or coalesce(evidence->>'type','') not in ('search-console','external-estimate')
    or nullif(trim(evidence->>'query'),'') is null or nullif(trim(evidence->>'market'),'') is null
    or evidence->>'language' is distinct from 'en' or coalesce(evidence->>'proofSha256','') !~ '^[a-f0-9]{64}$'
    or (evidence->>'checkedAt')::timestamptz not between now()-interval '30 days' and now()+interval '5 minutes'
    or evidence->>'checkedAt' is null then raise exception 'Specific demand evidence required for %',slug;end if;
  end if;
  if k<>'path' then
   if d->>'authorId' is null or not exists(select 1 from public.learn_authors where learn_authors.slug=d->>'authorId' and document->>'active'='true') then raise exception 'Active author required';end if;
   if d ? 'quiz' and d->'quiz'<>'null'::jsonb then
    perform brainilab_editor.validate_quiz(d->'quiz');
    if r#>>'{quiz,status}' is distinct from 'verified' or coalesce((r#>>'{quiz,allCorrect}')::integer,-1)<>jsonb_array_length(d#>'{quiz,questions}') or coalesce((r#>>'{quiz,allWrong}')::integer,-1)<>0
      or coalesce(r#>>'{quiz,proofSha256}','') !~ '^[a-f0-9]{64}$' then raise exception 'Renderer quiz tests required';end if;
   end if;
   if jsonb_typeof(e->'assets') is distinct from 'array' or jsonb_array_length(e->'assets')<>3 then raise exception 'Three cover variants required';end if;
   if (select array_agg((value->>'width')::integer order by (value->>'width')::integer) from jsonb_array_elements(e->'assets'))<>array[240,480,960] then raise exception 'Cover widths must be 960/480/240';end if;
   for a in select value from jsonb_array_elements(e->'assets') loop
    if a->>'status' is distinct from 'verified' or coalesce(a->>'sha256','') !~ '^[a-f0-9]{64}$'
      or (a->>'checkedAt')::timestamptz not between now()-interval '24 hours' and now()+interval '5 minutes'
      or a->>'checkedAt' is null
      or a->>'url' is distinct from ('https://brainilabgames.com'||(case (a->>'width')::integer when 960 then d#>>'{cover,src}' when 480 then d#>>'{cover,small}' else d#>>'{cover,thumbnail}' end))
     then raise exception 'Cover must be deployed and verified';end if;
   end loop;
  end if;
 end loop;
 -- Budget across manual and automated publications, not just this runner.
 if (select count(*) from public.learn_publications where (published_at at time zone 'Europe/Madrid')::date=local_day)
   +(select count(*) from jsonb_array_elements(m->'entries') v where v->>'kind' in ('article','lesson') and (v->>'expectedPublishedRevision')::integer=0)>2
 then raise exception 'Daily publication allowance exhausted';end if;
 -- Articles first, paths last. Any error rolls back the whole release.
 for e in select value from jsonb_array_elements(m->'entries') order by (value->>'kind'='path'),value->>'slug' loop
  d:=(e->>'documentText')::jsonb; slug:=e->>'slug';k:=e->>'kind';
  if k='path' then
   saved:=brainilab_editor.automation_save_path('path',slug,d,(e->>'expectedRevision')::integer,'publish');
  else
   saved:=brainilab_editor.automation_save_article(slug,d,(e->>'expectedRevision')::integer,'publish');
  end if;
  result:=result||jsonb_build_array(jsonb_build_object('slug',slug,'kind',k,'revision',saved->'revision','url','https://brainilabgames.com/learn/'||case when k='path' then 'paths/' else '' end||slug||'/'));
 end loop;
 -- Complete hubs have exactly ten distinct published supports and real return links.
 for e in select value from jsonb_array_elements(m->'entries') where value->>'kind'='hub' loop
  if jsonb_typeof(e->'supportingSlugs') is distinct from 'array' or jsonb_array_length(e->'supportingSlugs')<>10
   or (select count(distinct value) from jsonb_array_elements(e->'supportingSlugs'))<>10 then raise exception 'Hub requires ten distinct supports';end if;
  for member in select jsonb_array_elements_text(e->'supportingSlugs') loop
   if not exists(select 1 from public.learn_publications p where p.slug=member
      and p.document::text like '%/learn/'||(e->>'slug')||'/%')
     or ((e->>'documentText')::jsonb)::text not like '%/learn/'||member||'/%'
     or member=e->>'slug' then raise exception 'Missing hub member or return link: %',member;end if;
  end loop;
 end loop;
 saved:=jsonb_build_object('id',id,'payloadHash',h,'state','published-pending-public-verification','entries',result,'publishedAt',now(),'replayed',false);
 insert into brainilab_editor.automation_releases values(id,h,saved,now());
 return saved;
end $release$;
revoke all on function brainilab_editor.publish_reviewed_release(text) from public,anon,authenticated,service_role;
comment on function brainilab_editor.publish_reviewed_release(text) is 'Owner-authorised, management-only editorial release. Requires fresh review and assets, exact revisions, private backup, immutable receipt. No browser credentials.';
