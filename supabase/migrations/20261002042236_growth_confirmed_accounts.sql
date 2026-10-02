-- Operational confirmation ledger and optional first-party arrival attribution.
-- No GA4 identifiers, emails, tokens, full URLs or search terms are stored here.
set local lock_timeout='5s';
-- Keep the initial snapshot and trigger installation atomic with account writes.
lock table auth.users in share row exclusive mode;
create table brainilab_growth.confirmation_settings (
 singleton boolean primary key default true check(singleton), started_at timestamptz not null default now()
);
insert into brainilab_growth.confirmation_settings default values;
create table brainilab_growth.confirmed_accounts (
 user_id uuid primary key references auth.users(id) on delete cascade,
 confirmed_at timestamptz not null, observed_at timestamptz not null default now(), baseline boolean not null
);
create table brainilab_growth.account_arrivals (
 user_id uuid primary key references brainilab_growth.confirmed_accounts(user_id) on delete cascade,
 channel text not null check(channel in ('organic_search','paid','social','referral','direct','unknown')),
 landing_path text not null check(length(landing_path)<180 and landing_path ~ '^/([a-z0-9-]+/)*$' and landing_path !~ '^/(admin|auth|profile)(/|$)'),
 started_at timestamptz not null, requested_at timestamptz not null, recorded_at timestamptz not null default now(),
 check(started_at<=requested_at)
);
alter table brainilab_growth.confirmation_settings enable row level security;
alter table brainilab_growth.confirmed_accounts enable row level security;
alter table brainilab_growth.account_arrivals enable row level security;
revoke all on brainilab_growth.confirmation_settings,brainilab_growth.confirmed_accounts,brainilab_growth.account_arrivals from public,anon,authenticated;
create index growth_confirmed_time on brainilab_growth.confirmed_accounts(confirmed_at) where not baseline;
-- Existing accounts are a snapshot, never reported as acquisitions after rollout.
insert into brainilab_growth.confirmed_accounts(user_id,confirmed_at,baseline)
select id,email_confirmed_at,true from auth.users
where not coalesce(is_anonymous,false) and email_confirmed_at is not null and deleted_at is null;

create function brainilab_growth.capture_confirmation() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.deleted_at is not null or coalesce(new.is_anonymous,false) or new.email_confirmed_at is null then return new;end if;
 if tg_op='UPDATE' then
  if not coalesce(old.is_anonymous,false) and old.email_confirmed_at is not null then return new;end if;
 end if;
 insert into brainilab_growth.confirmed_accounts(user_id,confirmed_at,baseline)
 values(new.id,new.email_confirmed_at,false) on conflict(user_id) do nothing;
 return new;
exception when others then
 -- Measurement must not prevent registration. The admin coverage count surfaces gaps.
 raise warning 'BrainiLab confirmation capture failed (SQLSTATE %)',sqlstate;
 return new;
end $$;
revoke all on function brainilab_growth.capture_confirmation() from public,anon,authenticated;
create trigger brainilab_growth_confirmation after insert or update of email_confirmed_at,is_anonymous on auth.users
for each row execute function brainilab_growth.capture_confirmation();

create function brainilab_growth.record_arrival(p_channel text,p_path text,p_started_at timestamptz,p_requested_at timestamptz) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); confirmation timestamptz; added integer;
begin
 if uid is null then raise exception 'Authentication required';end if;
 select c.confirmed_at into confirmation from brainilab_growth.confirmed_accounts c join auth.users u on u.id=c.user_id
 where c.user_id=uid and not c.baseline and not coalesce(u.is_anonymous,false) and u.deleted_at is null and u.email_confirmed_at is not null
 and not exists(select 1 from public.admin_users a where a.user_id=uid);
 if confirmation is null then return jsonb_build_object('status','ineligible');end if;
 if p_channel is null or p_channel not in ('organic_search','paid','social','referral','direct','unknown')
 or p_path is null or length(p_path)>=180 or p_path !~ '^/([a-z0-9-]+/)*$' or p_path ~ '^/(admin|auth|profile)(/|$)'
 or p_started_at is null or p_requested_at is null or not isfinite(p_started_at) or not isfinite(p_requested_at)
 or p_started_at>p_requested_at or p_requested_at>confirmation or confirmation-p_requested_at>interval '7 days'
 or now()-p_requested_at>interval '7 days' or p_requested_at-p_started_at>interval '1 day'
 or p_requested_at<(select started_at from brainilab_growth.confirmation_settings)
 then return jsonb_build_object('status','ineligible');end if;
 insert into brainilab_growth.account_arrivals(user_id,channel,landing_path,started_at,requested_at)
 values(uid,p_channel,p_path,p_started_at,p_requested_at) on conflict(user_id) do nothing;
 get diagnostics added=row_count;
 return jsonb_build_object('status',case when added=1 then 'recorded' else 'already_recorded' end);
end $$;
create function brainilab_growth.withdraw_arrival() returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 delete from brainilab_growth.account_arrivals where user_id=auth.uid();
end $$;
create function brainilab_growth.confirmation_report() returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb; period_start timestamptz:=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC'-interval '29 days';
begin
 perform public.require_brainilab_admin(array['owner','editor']);
 with current_accounts as (
  select u.id,c.confirmed_at,c.baseline,a.channel,a.landing_path from auth.users u
  left join brainilab_growth.confirmed_accounts c on c.user_id=u.id
  left join brainilab_growth.account_arrivals a on a.user_id=u.id
  where not coalesce(u.is_anonymous,false) and u.email_confirmed_at is not null and u.deleted_at is null
  and not exists(select 1 from public.admin_users staff where staff.user_id=u.id)
 ), recent as(select * from current_accounts where baseline=false and confirmed_at>=period_start)
 select jsonb_build_object('source','Supabase Auth confirmation ledger','observedAt',now(),
 'captureStartedAt',(select started_at from brainilab_growth.confirmation_settings),'periodStart',period_start,'periodEnd',now(),'timezone','UTC',
 'currentConfirmed',(select count(*) from current_accounts),'baselineAccounts',(select count(*) from current_accounts where baseline),
 'coverageGaps',(select count(*) from current_accounts where confirmed_at is null),'newConfirmed',(select count(*) from recent),
 'attributed',(select count(*) from recent where channel is not null),'unattributed',(select count(*) from recent where channel is null),
 'channels',coalesce((select jsonb_agg(to_jsonb(x)) from(select channel,count(*) as accounts from recent where channel is not null group by channel order by channel)x),'[]'::jsonb),
 'landings',coalesce((select jsonb_agg(to_jsonb(x)) from(select landing_path as path,count(*) as accounts from recent where channel is not null group by landing_path order by count(*) desc,landing_path limit 20)x),'[]'::jsonb)) into result;
 return result;
end $$;
-- Exposed RPCs are invokers; privileged implementations live in the private schema.
create function public.record_brainilab_account_arrival(p_channel text,p_path text,p_started_at timestamptz,p_requested_at timestamptz) returns jsonb
language sql security invoker set search_path='' as $$select brainilab_growth.record_arrival(p_channel,p_path,p_started_at,p_requested_at)$$;
create function public.withdraw_brainilab_account_arrival() returns void
language sql security invoker set search_path='' as $$select brainilab_growth.withdraw_arrival()$$;
create or replace function public.admin_get_growth_workspace() returns jsonb
language sql security invoker set search_path='' as $$select brainilab_growth.workspace()||jsonb_build_object('confirmedAccounts',brainilab_growth.confirmation_report())$$;
revoke all on function brainilab_growth.record_arrival(text,text,timestamptz,timestamptz),brainilab_growth.withdraw_arrival(),brainilab_growth.confirmation_report(),public.record_brainilab_account_arrival(text,text,timestamptz,timestamptz),public.withdraw_brainilab_account_arrival() from public,anon,authenticated;
grant execute on function brainilab_growth.record_arrival(text,text,timestamptz,timestamptz),brainilab_growth.withdraw_arrival(),brainilab_growth.confirmation_report(),public.record_brainilab_account_arrival(text,text,timestamptz,timestamptz),public.withdraw_brainilab_account_arrival() to authenticated;
