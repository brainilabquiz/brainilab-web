create or replace function brainilab_editor.save_article(p_slug text,p_document jsonb,p_revision integer,p_action text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid; v_current integer; v_revision integer; v_document jsonb; v_section jsonb; v_link jsonb; v_first timestamptz; v_ids text[]:=array[]::text[];
begin
 v_uid:=public.require_brainilab_admin(array['owner','editor']);
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
 perform public.log_brainilab_admin_action('article_'||p_action,'learn_article',p_slug,jsonb_build_object('revision',v_revision));
 return jsonb_build_object('slug',p_slug,'revision',v_revision,'document',v_document,'action',p_action);
end $$;
