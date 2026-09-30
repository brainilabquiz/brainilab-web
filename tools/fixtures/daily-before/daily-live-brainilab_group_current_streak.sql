CREATE OR REPLACE FUNCTION public.brainilab_group_current_streak(p_group_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_today date:=(now() at time zone 'UTC')::date;
  v_last date;
  v_prev date:=null;
  v_day record;
  v_streak integer:=0;
begin
  select max(gds.stat_date)
    into v_last
  from public.group_daily_stats gds
  where gds.group_id=p_group_id
    and gds.eligible=true
    and gds.active_members>=3;

  if v_last is null or v_last < v_today-1 then
    return 0;
  end if;

  for v_day in
    select gds.stat_date
    from public.group_daily_stats gds
    where gds.group_id=p_group_id
      and gds.eligible=true
      and gds.active_members>=3
      and gds.stat_date<=v_last
    order by gds.stat_date desc
  loop
    if v_prev is null or v_day.stat_date=v_prev-1 then
      v_streak:=v_streak+1;
      v_prev:=v_day.stat_date;
    else
      exit;
    end if;
  end loop;

  return v_streak;
end;
$function$

