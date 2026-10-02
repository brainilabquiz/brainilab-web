-- Runs inside a rolled-back transaction. Auth users are NEVER inserted/updated.
begin;
create temp table confirmation_fixture(id uuid,is_anonymous boolean,email_confirmed_at timestamptz,deleted_at timestamptz);
create trigger capture_fixture after insert or update of email_confirmed_at,is_anonymous on confirmation_fixture
for each row execute function brainilab_growth.capture_confirmation();
create temp table confirmation_test_result(check_name text);
do $$
declare uid uuid; req timestamptz:=clock_timestamp(); first_time timestamptz; result jsonb;
begin
 select u.id into uid from auth.users u where not coalesce(u.is_anonymous,false) and u.email_confirmed_at is not null and u.deleted_at is null
 and not exists(select 1 from public.admin_users a where a.user_id=u.id) limit 1;
 if uid is null then raise exception 'Need one existing nonstaff confirmed account for rolled-back fixture';end if;
 delete from brainilab_growth.confirmed_accounts where user_id=uid;
 insert into confirmation_fixture values(uid,true,null,null);
 if exists(select 1 from brainilab_growth.confirmed_accounts where user_id=uid) then raise exception 'Anonymous account captured';end if;
 update confirmation_fixture set is_anonymous=false,email_confirmed_at=clock_timestamp() where id=uid;
 select confirmed_at into first_time from brainilab_growth.confirmed_accounts where user_id=uid;
 if first_time is null then raise exception 'Confirmation not captured';end if;
 update confirmation_fixture set email_confirmed_at=clock_timestamp() where id=uid;
 if (select confirmed_at from brainilab_growth.confirmed_accounts where user_id=uid)<>first_time then raise exception 'Duplicate rewrote confirmation';end if;
 perform set_config('request.jwt.claim.sub',uid::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated','aal','aal1')::text,true);
 perform set_config('role','authenticated',true);
 result:=public.record_brainilab_account_arrival('organic_search','/geography/',req-interval '10 minutes',req);
 if result->>'status'<>'recorded' then raise exception 'Valid arrival not recorded: %',result;end if;
 result:=public.record_brainilab_account_arrival('direct','/',req,req);
 if result->>'status'<>'already_recorded' then raise exception 'Not deduplicated';end if;
 result:=public.record_brainilab_account_arrival('organic_search','/profile/',req,req);
 if result->>'status'<>'ineligible' then raise exception 'Private path accepted';end if;
 result:=public.record_brainilab_account_arrival('organic_search','/geography/',req,req+interval '1 day');
 if result->>'status'<>'ineligible' then raise exception 'Post-confirmation arrival accepted';end if;
 begin perform public.admin_get_growth_workspace();raise exception 'Nonadmin read Growth';exception when raise_exception then if sqlerrm<>'Admin access required' then raise;end if;end;
 begin perform count(*) from brainilab_growth.confirmed_accounts;raise exception 'Private table readable';exception when insufficient_privilege then null;end;
 perform public.withdraw_brainilab_account_arrival();
 perform set_config('role','none',true);
 if exists(select 1 from brainilab_growth.account_arrivals where user_id=uid) then raise exception 'Withdrawal failed';end if;
 update brainilab_growth.confirmed_accounts set baseline=true where user_id=uid;
 result:=public.record_brainilab_account_arrival('organic_search','/geography/',req,req);
 if result->>'status'<>'ineligible' then raise exception 'Existing baseline account accepted';end if;
 if has_function_privilege('anon','public.record_brainilab_account_arrival(text,text,timestamptz,timestamptz)','execute') then raise exception 'Anonymous endpoint access';end if;
 insert into confirmation_test_result values('PASS: anonymous exclusion, confirmation transition, deduplication, own-user arrival, baseline and private-path rejection, admin guard, table isolation, withdrawal');
end $$;
select * from confirmation_test_result;
rollback;
