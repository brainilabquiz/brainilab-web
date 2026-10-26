-- Owner instruction of 26 October 2026: no daily ceiling on published articles.
-- Review freshness, evidence, exact revisions, locks, receipts and ACLs remain intact.
-- Refuse to overwrite a concurrently changed publisher; replaying this migration is safe.
do $compatibility$
begin
 if md5(pg_get_functiondef('brainilab_editor.publish_reviewed_release(text)'::regprocedure))
   not in ('d8654d5ceb927a9a53f04e5a9252470c','ed4dde8d6c8b8b36845b44a897353280') then
  raise exception 'Publisher changed; review the no-daily-cap migration before applying';
 end if;
end $compatibility$;

CREATE OR REPLACE FUNCTION brainilab_editor.publish_reviewed_release(p_payload text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
#variable_conflict use_variable
declare
 m jsonb; e jsonb; d jsonb; q jsonb; a jsonb; r jsonb; evidence jsonb;
 id text; h text; slug text; k text; gate text; saved jsonb;
 result jsonb:='[]'::jsonb; existing brainilab_editor.automation_releases%rowtype;
 current_rev integer; public_rev integer; snapshot_hash text; old_doc jsonb;
 known text[]:=array[]::text[]; members text[]; member text; changed integer:=0;
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
 -- Publication volume is owner-directed; all review and integrity checks above remain mandatory.
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
end $function$;

