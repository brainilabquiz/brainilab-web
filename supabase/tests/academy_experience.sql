-- Exercise production functions inside a transaction; leave no test completions or XP.
begin;
select set_config('request.jwt.claims',json_build_object('sub',(select user_id from public.admin_users where role='owner' and active limit 1),'role','authenticated','aal','aal2')::text,true);
do $$
declare uid uuid:=auth.uid();v_slug text:='multiply-by-11-in-your-head';q jsonb;answers jsonb;r jsonb;before_xp bigint;after_xp bigint;game_before jsonb;game_after jsonb;before_counts jsonb;
begin
 if uid is null then raise exception 'No test account';end if;
 if has_table_privilege('authenticated','brainilab_editor.academy_xp_awards','insert') or has_table_privilege('anon','brainilab_editor.academy_xp_awards','select') then raise exception 'XP ledger exposed';end if;
 if has_function_privilege('authenticated','public.refresh_brainilab_player_progression(uuid)','execute') then raise exception 'Privileged rebuild exposed';end if;
 -- Establish canonical game totals before comparison (all rolled back).
 perform public.refresh_brainilab_player_progression(uid);
 delete from brainilab_editor.academy_xp_awards where user_id=uid and article_slug=v_slug;
 perform public.refresh_brainilab_player_progression(uid);
 select xp,to_jsonb(pp)-'xp'-'level'-'updated_at' into before_xp,game_before from public.player_progression pp where user_id=uid;
 select jsonb_build_object('sessions',(select count(*) from public.game_sessions),'results',(select count(*) from public.game_results),'daily',(select jsonb_agg(to_jsonb(ds) order by stat_date) from public.player_daily_stats ds where user_id=uid),'period',(select jsonb_agg(to_jsonb(ps) order by period_type,period_start) from public.player_period_stats ps where user_id=uid)) into before_counts;
 select document->'quiz' into q from public.learn_publications where slug=v_slug;
 select jsonb_agg(value->'answer' order by ord) into answers from jsonb_array_elements(q->'questions') with ordinality x(value,ord);
 r:=public.complete_learn_lesson(v_slug,q->>'version',answers);
 if r->>'xp_awarded'<>'40' or r->>'ranking_points'<>'0' then raise exception 'First award incorrect: %',r;end if;
 select xp,to_jsonb(pp)-'xp'-'level'-'updated_at' into after_xp,game_after from public.player_progression pp where user_id=uid;
 if after_xp<>before_xp+40 or game_before<>game_after then raise exception 'XP or game counters incorrect';end if;
 if before_counts<>jsonb_build_object('sessions',(select count(*) from public.game_sessions),'results',(select count(*) from public.game_results),'daily',(select jsonb_agg(to_jsonb(ds) order by stat_date) from public.player_daily_stats ds where user_id=uid),'period',(select jsonb_agg(to_jsonb(ps) order by period_type,period_start) from public.player_period_stats ps where user_id=uid)) then raise exception 'Academy changed ranking/game data';end if;
 r:=public.complete_learn_lesson(v_slug,q->>'version',answers);
 if r->>'xp_awarded'<>'0' then raise exception 'Repeated lesson rewarded';end if;
 update public.learn_publications set document=jsonb_set(document,'{quiz,version}','"xp-test-new-version"') where learn_publications.slug=v_slug;
 r:=public.complete_learn_lesson(v_slug,'xp-test-new-version',answers);
 if r->>'xp_awarded'<>'0' then raise exception 'Version update rewarded twice';end if;
 begin perform public.complete_learn_lesson(v_slug,'xp-test-new-version','[]');raise exception 'Invalid answers accepted';exception when others then if sqlerrm='Invalid answers accepted' then raise;end if;end;
 perform public.refresh_brainilab_player_progression(uid);
 if (select xp from public.player_progression where user_id=uid)<>after_xp then raise exception 'Game refresh erased Academy XP';end if;
 if (public.get_my_brainilab_progression()->'progression'->>'xp')::bigint<>after_xp then raise exception 'Account summary missing Academy XP';end if;
end $$;
select set_config('request.jwt.claims','{}',true);
do $$ begin
 begin perform public.complete_learn_lesson('multiply-by-11-in-your-head','unused','[]');raise exception 'Guest granted account XP';exception when others then if sqlerrm='Guest granted account XP' then raise;end if;end;
end $$;
rollback;

