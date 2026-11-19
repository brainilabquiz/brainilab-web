-- Explicit owner approval on 19 November 2026, limited to these exact documents.
-- The authenticated management publisher retains every other review, author, asset,
-- revision, original-date and player-progress safeguard. No public permission added.
create table brainilab_editor.editorial_demand_exceptions (
 release_id text not null, slug text not null, document_sha256 text not null check(document_sha256 ~ '^[a-f0-9]{64}$'),
 author_id text not null, approval_sha256 text not null check(approval_sha256 ~ '^[a-f0-9]{64}$'),
 recorded_at timestamptz not null default now(), primary key(release_id,slug)
);
alter table brainilab_editor.editorial_demand_exceptions enable row level security;
revoke all on brainilab_editor.editorial_demand_exceptions from public,anon,authenticated,service_role;
insert into brainilab_editor.editorial_demand_exceptions(release_id,slug,document_sha256,author_id,approval_sha256) values
('opinion-first-editorials-2026-11-19','a-good-quiz-should-explain-the-answer','4a2f2c390874e69274000eb272e89f8ed5053f64fcae11527b463ffc74e33562','biel-sarda','8cbdb3fb2f071b1e054a69d35384113afa5a10cef4d28139b6ea4c5d8fbba69b'),
('opinion-first-editorials-2026-11-19','a-daily-streak-should-leave-room-for-real-life','45036c7fd613f018d6f483673f417c77e008c62f1accc8f077ab3d21890d2bd4','biel-sarda','8cbdb3fb2f071b1e054a69d35384113afa5a10cef4d28139b6ea4c5d8fbba69b'),
('opinion-first-editorials-2026-11-19','ai-news-summaries-should-show-their-sources','e46aca2757d6d4121adc545e1d50c38c7d6f7e0a2cf1ed55327b449dcf7807f0','biel-sarda','8cbdb3fb2f071b1e054a69d35384113afa5a10cef4d28139b6ea4c5d8fbba69b');

do $migration$
declare definition text;
begin
 select pg_get_functiondef('brainilab_editor.publish_reviewed_release(text)'::regprocedure) into definition;
 if md5(definition)<>'ed4dde8d6c8b8b36845b44a897353280' then raise exception 'Publisher changed; review before applying this scoped exception';end if;
 if position($old$  if k<>'links' then
   evidence:=r->'demand';
   if evidence->>'status' is distinct from 'verified' or coalesce(evidence->>'type','') not in ('search-console','external-estimate')
    or nullif(trim(evidence->>'query'),'') is null or nullif(trim(evidence->>'market'),'') is null
    or evidence->>'language' is distinct from 'en' or coalesce(evidence->>'proofSha256','') !~ '^[a-f0-9]{64}$'
    or (evidence->>'checkedAt')::timestamptz not between now()-interval '30 days' and now()+interval '5 minutes'
    or evidence->>'checkedAt' is null then raise exception 'Specific demand evidence required for %',slug;end if;
  end if;
$old$ in definition)=0 then raise exception 'Expected demand block missing';end if;
 execute replace(definition,$old$  if k<>'links' then
   evidence:=r->'demand';
   if evidence->>'status' is distinct from 'verified' or coalesce(evidence->>'type','') not in ('search-console','external-estimate')
    or nullif(trim(evidence->>'query'),'') is null or nullif(trim(evidence->>'market'),'') is null
    or evidence->>'language' is distinct from 'en' or coalesce(evidence->>'proofSha256','') !~ '^[a-f0-9]{64}$'
    or (evidence->>'checkedAt')::timestamptz not between now()-interval '30 days' and now()+interval '5 minutes'
    or evidence->>'checkedAt' is null then raise exception 'Specific demand evidence required for %',slug;end if;
  end if;
$old$,$new$  if k<>'links' then
   evidence:=r->'demand';
   if evidence->>'type'='owner-opinion-exception' then
    if k<>'article' or d->>'articleKind' is distinct from 'opinion'
     or evidence->>'status' is distinct from 'verified' or evidence->>'authorizationId' is distinct from m->>'id'
     or (evidence->>'checkedAt')::timestamptz not between now()-interval '24 hours' and now()+interval '5 minutes'
     or evidence->>'checkedAt' is null
     or not exists(select 1 from brainilab_editor.editorial_demand_exceptions approval
      where approval.release_id=m->>'id' and approval.slug=d->>'slug'
       and approval.document_sha256=e->>'documentSha256' and approval.author_id=d->>'authorId'
       and approval.approval_sha256=evidence->>'proofSha256')
     then raise exception 'Specific registered owner opinion exception required for %',slug;end if;
   else
   if evidence->>'status' is distinct from 'verified' or coalesce(evidence->>'type','') not in ('search-console','external-estimate')
    or nullif(trim(evidence->>'query'),'') is null or nullif(trim(evidence->>'market'),'') is null
    or evidence->>'language' is distinct from 'en' or coalesce(evidence->>'proofSha256','') !~ '^[a-f0-9]{64}$'
    or (evidence->>'checkedAt')::timestamptz not between now()-interval '30 days' and now()+interval '5 minutes'
    or evidence->>'checkedAt' is null then raise exception 'Specific demand evidence required for %',slug;end if;
   end if;
  end if;
$new$);
end;
$migration$;
