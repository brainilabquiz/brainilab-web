CREATE OR REPLACE FUNCTION public.ensure_brainilab_daily_games(p_daily_challenge_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_date date;
  v_word_id uuid;
begin
  select challenge_date
    into v_date
  from public.daily_challenges
  where id=p_daily_challenge_id;

  if v_date is null then
    raise exception 'Daily challenge not found';
  end if;

  if not exists(
    select 1
    from public.daily_brainiword
    where daily_challenge_id=p_daily_challenge_id
  ) then
    select bw.id
      into v_word_id
    from public.brainiword_words bw
    where bw.is_active=true
      and not exists(
        select 1
        from public.daily_brainiword dbw
        join public.daily_challenges dc
          on dc.id=dbw.daily_challenge_id
        where dbw.word_id=bw.id
          and dc.challenge_date<v_date
          and dc.challenge_date>=v_date-60
      )
    order by md5(bw.id::text||':'||v_date::text)
    limit 1;

    if v_word_id is null then
      select bw.id
        into v_word_id
      from public.brainiword_words bw
      where bw.is_active=true
      order by (
        select max(dc.challenge_date)
        from public.daily_brainiword old
        join public.daily_challenges dc
          on dc.id=old.daily_challenge_id
        where old.word_id=bw.id
      ) asc nulls first,
      md5(bw.id::text||':'||v_date::text)
      limit 1;
    end if;

    if v_word_id is null then
      raise exception 'No active BrainiWord is available';
    end if;

    insert into public.daily_brainiword(
      daily_challenge_id,
      word_id
    )
    values(
      p_daily_challenge_id,
      v_word_id
    );
  end if;
end;
$function$

