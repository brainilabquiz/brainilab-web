-- Private SEO workspace. Existing owner/editor authorization (including MFA) is retained.
create schema brainilab_growth;
revoke all on schema brainilab_growth from public,anon,authenticated;
create table brainilab_growth.reports (
 id text primary key, document jsonb not null, imported_at timestamptz not null default now(), imported_by uuid
);
create table brainilab_growth.opportunities (
 id bigint generated always as identity primary key, url text unique not null,
 proposal jsonb not null, baseline_report text not null references brainilab_growth.reports(id),
 state text not null default 'pending' check(state in ('pending','approved','published','monitoring','dismissed')),
 revision integer not null default 1, updated_at timestamptz not null default now(),
 published_at timestamptz, change_reference text
);
create table brainilab_growth.events (
 id bigint generated always as identity primary key,
 opportunity_id bigint not null references brainilab_growth.opportunities(id),
 from_state text, to_state text not null, note text not null, actor uuid,
 created_at timestamptz not null default now()
);
create index growth_events_opportunity on brainilab_growth.events(opportunity_id,created_at desc);
alter table brainilab_growth.reports enable row level security;
alter table brainilab_growth.opportunities enable row level security;
alter table brainilab_growth.events enable row level security;
revoke all on all tables in schema brainilab_growth from public,anon,authenticated;
revoke all on all sequences in schema brainilab_growth from public,anon,authenticated;

-- Management ingestion is separate from the authenticated browser entry point.
create function brainilab_growth.ingest(p_report jsonb,p_actor uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare report_id text; item jsonb; opportunity_id bigint; added integer:=0;
begin
 if jsonb_typeof(p_report) is distinct from 'object' or octet_length(p_report::text)>1000000
 or p_report->>'property' is distinct from 'sc-domain:brainilabgames.com'
 or jsonb_typeof(p_report->'propertySummary') is distinct from 'object'
 or jsonb_typeof(p_report->'opportunities') is distinct from 'array'
 or jsonb_typeof(p_report->'sources') is distinct from 'array'
 or coalesce(p_report->>'propertySnapshot','') !~ '^[a-f0-9]{64}$'
 then raise exception 'Invalid Growth report. Import the generated Search Console report JSON.'; end if;
 if jsonb_array_length(p_report->'opportunities')>100 or jsonb_array_length(p_report->'sources')=0 then raise exception 'Invalid report size or missing provenance';end if;
 if coalesce(p_report#>>'{availablePeriod,start}','') !~ '^\d{4}-\d{2}-\d{2}$'
 or coalesce(p_report#>>'{availablePeriod,end}','') !~ '^\d{4}-\d{2}-\d{2}$'
 or (p_report#>>'{availablePeriod,start}')::date>(p_report#>>'{availablePeriod,end}')::date then raise exception 'Invalid report period';end if;
 if coalesce(p_report#>>'{propertySummary,clicks}','') !~ '^\d+$' or coalesce(p_report#>>'{propertySummary,impressions}','') !~ '^\d+$' then raise exception 'Missing valid totals';end if;
 report_id:=md5((p_report-'generatedAt')::text);
 perform pg_advisory_xact_lock(hashtextextended('growth-report:'||report_id,0));
 insert into brainilab_growth.reports(id,document,imported_by) values(report_id,p_report,p_actor) on conflict do nothing;
 for item in select value from jsonb_array_elements(p_report->'opportunities') loop
  if coalesce(item->>'url','') !~ '^https://brainilabgames\.com/[a-z0-9/_-]*/$' or length(coalesce(item->>'name','')) not between 1 and 150 then raise exception 'Invalid opportunity page';end if;
  insert into brainilab_growth.opportunities(url,proposal,baseline_report) values(item->>'url',item,report_id) on conflict(url) do nothing returning id into opportunity_id;
  if opportunity_id is not null then
   added:=added+1;
   insert into brainilab_growth.events(opportunity_id,to_state,note,actor) values(opportunity_id,'pending','Proposal created from a dated Search Console report.',p_actor);
  end if;
 end loop;
 return jsonb_build_object('reportId',report_id,'newOpportunities',added);
end $$;

create function brainilab_growth.workspace() returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 perform public.require_brainilab_admin(array['owner','editor']);
 return jsonb_build_object(
 'report',(select jsonb_build_object('id',id,'document',document,'importedAt',imported_at) from brainilab_growth.reports order by (document#>>'{availablePeriod,end}')::date desc,imported_at desc limit 1),
 'reports',coalesce((select jsonb_agg(jsonb_build_object('id',id,'period',document->'availablePeriod','filters',document->'filters','importedAt',imported_at) order by imported_at desc) from brainilab_growth.reports),'[]'::jsonb),
 'opportunities',coalesce((select jsonb_agg(to_jsonb(o) order by o.id) from brainilab_growth.opportunities o),'[]'::jsonb),
 'events',coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at desc,e.id desc) from (select * from brainilab_growth.events order by created_at desc,id desc limit 200) e),'[]'::jsonb),
 'connection',jsonb_build_object('mode','import','status','authorization_required','message','CSV imports are available. Automatic Google API syncing requires an authorized read-only connection.'));
end $$;
create function brainilab_growth.import_report(p_report jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid;
begin
 uid:=public.require_brainilab_admin(array['owner','editor']);
 return brainilab_growth.ingest(p_report,uid);
end $$;
create function brainilab_growth.update_opportunity(p_id bigint,p_revision integer,p_state text,p_note text,p_reference text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid; current_row brainilab_growth.opportunities%rowtype;
begin
 uid:=public.require_brainilab_admin(array['owner','editor']);
 if p_state is null or p_state not in ('pending','approved','published','monitoring','dismissed') or length(trim(coalesce(p_note,''))) not between 5 and 3000 then raise exception 'Choose a status and add a meaningful note (5–3000 characters).';end if;
 select * into current_row from brainilab_growth.opportunities where id=p_id for update;
 if not found or p_revision is distinct from current_row.revision then raise exception 'This proposal changed. Reload before saving.';end if;
 if not ((current_row.state='pending' and p_state in ('approved','dismissed')) or (current_row.state='approved' and p_state in ('pending','published','dismissed')) or (current_row.state='published' and p_state='monitoring') or (current_row.state='dismissed' and p_state='pending') or current_row.state=p_state) then raise exception 'Invalid workflow transition';end if;
 if p_state='published' and current_row.published_at is null and (coalesce(p_reference,'') !~ '^https://(brainilabgames\.com/|github\.com/brainilabquiz/brainilab-web/)' or length(p_reference)>1000) then raise exception 'Add the verified page or GitHub change URL before recording publication.';end if;
 update brainilab_growth.opportunities set state=p_state,revision=revision+1,updated_at=now(),
 published_at=case when p_state='published' then coalesce(published_at,now()) else published_at end,
 change_reference=case when p_state='published' then coalesce(nullif(p_reference,''),change_reference) else change_reference end where id=p_id;
 insert into brainilab_growth.events(opportunity_id,from_state,to_state,note,actor) values(p_id,current_row.state,p_state,trim(p_note),uid);
 return jsonb_build_object('id',p_id,'revision',current_row.revision+1,'state',p_state);
end $$;

create function public.admin_get_growth_workspace() returns jsonb language sql security invoker set search_path='' as $$select brainilab_growth.workspace()$$;
create function public.admin_import_growth_report(p_report jsonb) returns jsonb language sql security invoker set search_path='' as $$select brainilab_growth.import_report(p_report)$$;
create function public.admin_update_growth_opportunity(p_id bigint,p_revision integer,p_state text,p_note text,p_reference text default null) returns jsonb language sql security invoker set search_path='' as $$select brainilab_growth.update_opportunity(p_id,p_revision,p_state,p_note,p_reference)$$;
revoke all on all functions in schema brainilab_growth from public,anon,authenticated;
revoke all on function public.admin_get_growth_workspace(),public.admin_import_growth_report(jsonb),public.admin_update_growth_opportunity(bigint,integer,text,text,text) from public,anon;
grant usage on schema brainilab_growth to authenticated;
grant execute on function brainilab_growth.workspace(),brainilab_growth.import_report(jsonb),brainilab_growth.update_opportunity(bigint,integer,text,text,text) to authenticated;
grant execute on function public.admin_get_growth_workspace(),public.admin_import_growth_report(jsonb),public.admin_update_growth_opportunity(bigint,integer,text,text,text) to authenticated;
comment on schema brainilab_growth is 'Private Growth reports and editorial decisions. No Data API table access; owner/editor RPCs enforce the existing admin/MFA gate.';
