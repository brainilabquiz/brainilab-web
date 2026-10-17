-- Copy the deployed policy expression onto isolated fictional rows. No real
-- account, collection, XP or study-history writes; everything rolls back.
begin;
create temporary table academy_rls_fixture(user_id uuid,reward_id text);
alter table academy_rls_fixture enable row level security;
revoke all on pg_temp.academy_rls_fixture from public,anon,authenticated;
grant select on pg_temp.academy_rls_fixture to authenticated;
do $$declare policy_expression text;begin
 select qual into strict policy_expression from pg_policies where schemaname='public' and tablename='learn_avatar_unlocks' and policyname='Own Academy avatar collection';
 execute format('create policy fixture_owner_read on pg_temp.academy_rls_fixture for select to authenticated using (%s)',policy_expression);
end $$;
insert into pg_temp.academy_rls_fixture values
 ('00000000-0000-4000-8000-000000000011','academy_pie'),
 ('00000000-0000-4000-8000-000000000012','academy_moon');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000011","is_anonymous":false,"role":"authenticated"}',true);
do $$begin
 if (select array_agg(reward_id) from pg_temp.academy_rls_fixture) is distinct from array['academy_pie'] then raise exception 'Owner row missing or another owner exposed';end if;
 begin insert into pg_temp.academy_rls_fixture values('00000000-0000-4000-8000-000000000011','forged');raise exception 'Client insert allowed';exception when insufficient_privilege then null;end;
 begin update pg_temp.academy_rls_fixture set reward_id='forged';raise exception 'Client update allowed';exception when insufficient_privilege then null;end;
 begin delete from pg_temp.academy_rls_fixture;raise exception 'Client delete allowed';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000012","is_anonymous":false,"role":"authenticated"}',true);
do $$begin if (select array_agg(reward_id) from pg_temp.academy_rls_fixture) is distinct from array['academy_moon'] then raise exception 'Second-owner isolation failed';end if;end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000011","is_anonymous":true,"role":"authenticated"}',true);
do $$begin if exists(select 1 from pg_temp.academy_rls_fixture) then raise exception 'Anonymous Auth read allowed';end if;end $$;
select set_config('request.jwt.claims','{}',true);
do $$begin if exists(select 1 from pg_temp.academy_rls_fixture) then raise exception 'Missing identity read allowed';end if;end $$;
set local role anon;
do $$begin
 begin perform 1 from pg_temp.academy_rls_fixture;raise exception 'Signed-out select allowed';exception when insufficient_privilege then null;end;
 begin insert into pg_temp.academy_rls_fixture values('00000000-0000-4000-8000-000000000011','forged');raise exception 'Signed-out insert allowed';exception when insufficient_privilege then null;end;
 begin update pg_temp.academy_rls_fixture set reward_id='forged';raise exception 'Signed-out update allowed';exception when insufficient_privilege then null;end;
 begin delete from pg_temp.academy_rls_fixture;raise exception 'Signed-out delete allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
select jsonb_build_object('ownerAndOtherOwner',true,'anonymousAndMissingIdentityDenied',true,'clientInsertUpdateDeleteDenied',true,'deployedPolicyExpression',true,'realPlayerWrites',0) as rls_verification;
rollback;
