CREATE OR REPLACE FUNCTION public.ensure_brainilab_rotating_daily_content(p_daily_challenge_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_date date; v_games text[];
begin
  select challenge_date into v_date from public.daily_challenges where id=p_daily_challenge_id;
  if v_date is null then raise exception 'Daily Challenge not found'; end if;
  if v_date<date '2026-08-31' then return; end if;
  v_games:=public.brainilab_daily_game_ids(v_date);

  if 'connections'=any(v_games) and not exists(select 1 from public.daily_rotating_content where daily_challenge_id=p_daily_challenge_id and game_id='connections') then
    insert into public.daily_rotating_content(daily_challenge_id,game_id,position,content_id)
    select p_daily_challenge_id,'connections',row_number() over(order by usage_count,hash_key)::integer,id from (
      select p.id,(select count(*) from public.daily_rotating_content d where d.game_id='connections' and d.content_id=p.id) usage_count,md5(p.id::text||':'||v_date::text) hash_key
      from public.connections_puzzles p where p.is_active=true order by usage_count,hash_key limit 3
    ) q;
  end if;
  if 'oddoneout'=any(v_games) and not exists(select 1 from public.daily_rotating_content where daily_challenge_id=p_daily_challenge_id and game_id='oddoneout') then
    insert into public.daily_rotating_content(daily_challenge_id,game_id,position,content_id)
    select p_daily_challenge_id,'oddoneout',row_number() over(order by usage_count,hash_key)::integer,id from (
      select p.id,(select count(*) from public.daily_rotating_content d where d.game_id='oddoneout' and d.content_id=p.id) usage_count,md5(p.id::text||':'||v_date::text) hash_key
      from public.odd_one_out_puzzles p where p.is_active=true order by usage_count,hash_key limit 10
    ) q;
  end if;
  if 'higherlower'=any(v_games) and not exists(select 1 from public.daily_rotating_content where daily_challenge_id=p_daily_challenge_id and game_id='higherlower') then
    insert into public.daily_rotating_content(daily_challenge_id,game_id,position,content_id)
    select p_daily_challenge_id,'higherlower',row_number() over(order by usage_count,hash_key)::integer,id from (
      select p.id,(select count(*) from public.daily_rotating_content d where d.game_id='higherlower' and d.content_id=p.id) usage_count,md5(p.id::text||':'||v_date::text) hash_key
      from public.higher_lower_pairs p where p.is_active=true order by usage_count,hash_key limit 10
    ) q;
  end if;
  if 'numberroute'=any(v_games) and not exists(select 1 from public.daily_rotating_content where daily_challenge_id=p_daily_challenge_id and game_id='numberroute') then
    insert into public.daily_rotating_content(daily_challenge_id,game_id,position,content_id)
    select p_daily_challenge_id,'numberroute',row_number() over(order by usage_count,hash_key)::integer,id from (
      select p.id,(select count(*) from public.daily_rotating_content d where d.game_id='numberroute' and d.content_id=p.id) usage_count,md5(p.id::text||':'||v_date::text) hash_key
      from public.number_route_puzzles p where p.is_active=true order by usage_count,hash_key limit 10
    ) q;
  end if;
  if 'sequence'=any(v_games) and not exists(select 1 from public.daily_rotating_content where daily_challenge_id=p_daily_challenge_id and game_id='sequence') then
    insert into public.daily_rotating_content(daily_challenge_id,game_id,position,content_id)
    select p_daily_challenge_id,'sequence',row_number() over(order by usage_count,hash_key)::integer,id from (
      select p.id,(select count(*) from public.daily_rotating_content d where d.game_id='sequence' and d.content_id=p.id) usage_count,md5(p.id::text||':'||v_date::text) hash_key
      from public.sequence_puzzles p where p.is_active=true order by usage_count,hash_key limit 10
    ) q;
  end if;
end;$function$

