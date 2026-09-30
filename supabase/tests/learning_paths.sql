-- All writes below are rolled back; production records remain unchanged.
begin;
do $$ begin
 if has_table_privilege('anon','brainilab_editor.learning_entities','select') or has_table_privilege('authenticated','brainilab_editor.learning_entities','update') then raise exception 'Private directory exposed';end if;
 if has_table_privilege('anon','public.learn_progress','select') or has_table_privilege('authenticated','public.learn_progress','insert') then raise exception 'Progress write/read grants too broad';end if;
 if has_function_privilege('anon','public.admin_save_learning_entity(text,text,jsonb,integer,text)','execute') then raise exception 'Anonymous admin execution';end if;
end $$;
select set_config('request.jwt.claims',json_build_object('sub',(select user_id from public.admin_users where role='owner' and active limit 1),'aal','aal2','role','authenticated')::text,true);
set local role authenticated;
select public.admin_save_learning_entity('author','test-learning-person','{"name":"Test person","role":"Tester","biography":"PRIVATE BIO","photo":"","socials":[{"name":"Example","url":"https://example.com/profile"}],"visible":false,"active":true}',0,'publish');
do $$ begin
 if exists(select 1 from public.learn_authors where slug='test-learning-person' and (document ? 'biography' or document ? 'socials')) then raise exception 'Hidden contributor biography exposed';end if;
 begin
  perform public.admin_save_learning_entity('author','test-learning-person','{"name":"Conflict"}',0,'publish');raise exception 'Conflict accepted';
 exception when others then if sqlerrm='Conflict accepted' then raise;end if;end;
end $$;
reset role;
-- Prepare a test quiz on two existing lessons, only inside this transaction.
update public.learn_publications set document=document||'{"quiz":{"version":"test-round","questions":[{"prompt":"One plus one?","options":["1","2","3","4"],"answer":1,"explanation":"One and one make two."},{"prompt":"Two plus two?","options":["1","2","3","4"],"answer":3,"explanation":"Two and two make four."}]}}' where slug in ('mental-math-round-and-adjust','multiply-by-11-in-your-head');
set local role authenticated;
select public.admin_save_learning_entity('path','test-learning-path','{"title":"Test path","description":"Two lessons","topic":"Test","introduction":"<p>Read these.</p>","authorId":"biel-sarda","outcomes":["Try a round"],"glossary":[],"sources":[{"name":"Example","url":"https://example.com"}],"lessons":[{"slug":"mental-math-round-and-adjust","objective":"Adjust"},{"slug":"multiply-by-11-in-your-head","objective":"Multiply"}]}',0,'draft');
do $$ begin if exists(select 1 from public.learn_paths where slug='test-learning-path') then raise exception 'Draft leaked';end if;end $$;
select public.admin_save_learning_entity('path','test-learning-path',(select value->'document' from jsonb_array_elements(public.admin_list_learning_entities('path')) where value->>'slug'='test-learning-path'),1,'publish');
select public.complete_learn_lesson('mental-math-round-and-adjust','test-round','[1,0]');
do $$ begin
 if not exists(select 1 from public.learn_progress where article_slug='mental-math-round-and-adjust' and score=1 and total=2 and user_id=auth.uid()) then raise exception 'Score not validated/saved';end if;
 begin perform public.complete_learn_lesson('mental-math-round-and-adjust','old-version','[1,3]');raise exception 'Old version accepted';exception when others then if sqlerrm='Old version accepted' then raise;end if;end;
 begin perform public.complete_learn_lesson('mental-math-round-and-adjust','test-round','[1]');raise exception 'Incomplete round accepted';exception when others then if sqlerrm='Incomplete round accepted' then raise;end if;end;
end $$;
reset role;
do $$ begin
 begin delete from public.learn_publications where slug='mental-math-round-and-adjust';raise exception 'Referenced lesson withdrawn';exception when others then if sqlerrm='Referenced lesson withdrawn' then raise;end if;end;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000099","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;
do $$ begin
 if exists(select 1 from public.learn_progress) then raise exception 'Another user progress exposed';end if;
 begin perform public.admin_list_learning_entities('author');raise exception 'Non-admin allowed';exception when others then if sqlerrm='Non-admin allowed' then raise;end if;end;
end $$;
reset role;
rollback;
select 'PASS: private drafts, contributor projection, revision conflicts, publication, scored completion, stale/incomplete answers, withdrawal guard, own-row RLS, non-admin denial; all test writes rolled back.' as result;
