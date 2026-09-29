CREATE OR REPLACE FUNCTION public.brainilab_daily_number_for_date(p_date date)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  select 1 + (p_date-date '2026-08-29')::integer;
$function$;

CREATE OR REPLACE FUNCTION public.brainilab_daily_game_points(p_game_id text, p_score integer, p_correct integer, p_payload jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
declare v_points integer:=0; v_attempts integer; v_won boolean:=false; v_best_combo integer:=0;
begin
  if p_game_id='brainmix' then v_points:=least(2500,greatest(0,round(coalesce(p_score,0)*0.25)::integer));
  elsif p_game_id='flagdash' then begin v_best_combo:=coalesce((p_payload->>'bestCombo')::integer,0); exception when others then v_best_combo:=0; end; v_points:=least(2500,greatest(0,coalesce(p_correct,0)*70+v_best_combo*15));
  elsif p_game_id in ('orderup','topicrush','mathrush','numberroute','sequence') then v_points:=least(2500,greatest(0,coalesce(p_score,0)));
  elsif p_game_id='connections' then v_points:=least(2500,greatest(0,round(coalesce(p_score,0)/3000.0*2500)::integer));
  elsif p_game_id='oddoneout' then v_points:=least(2500,greatest(0,round(coalesce(p_score,0)/1000.0*2500)::integer));
  elsif p_game_id='higherlower' then v_points:=least(2500,greatest(0,round(coalesce(p_score,0)/1700.0*2500)::integer));
  elsif p_game_id='maphunt' then v_points:=least(2500,greatest(0,round(coalesce(p_score,0)*0.42)::integer));
  elsif p_game_id='brainiword' then
    v_won:=lower(coalesce(p_payload->>'won','false'))='true'; begin v_attempts:=(p_payload->>'attempts')::integer; exception when others then v_attempts:=null; end;
    if not v_won then v_points:=250; else v_points:=case v_attempts when 1 then 2500 when 2 then 2250 when 3 then 2000 when 4 then 1750 when 5 then 1500 else 1000 end; end if;
  end if;
  return least(2500,greatest(0,coalesce(v_points,0)));
end;$function$;

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
$function$;

CREATE OR REPLACE FUNCTION public.brainilab_daily_game_ids(p_date date)
 RETURNS text[]
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
declare v_number integer; v_index integer; v_pair text[];
begin
  if p_date<date '2026-08-31' then return array['brainmix','orderup','topicrush','brainiword']::text[]; end if;
  v_number:=public.brainilab_daily_number_for_date(p_date);
  v_index:=mod(v_number-3,28);
  if v_index<0 then v_index:=v_index+28; end if;
  v_pair:=case v_index
    when 0 then array['orderup','sequence']::text[]
    when 1 then array['topicrush','numberroute']::text[]
    when 2 then array['connections','mathrush']::text[]
    when 3 then array['oddoneout','higherlower']::text[]
    when 4 then array['orderup','numberroute']::text[]
    when 5 then array['sequence','mathrush']::text[]
    when 6 then array['topicrush','higherlower']::text[]
    when 7 then array['connections','oddoneout']::text[]
    when 8 then array['orderup','mathrush']::text[]
    when 9 then array['numberroute','higherlower']::text[]
    when 10 then array['sequence','oddoneout']::text[]
    when 11 then array['topicrush','connections']::text[]
    when 12 then array['orderup','higherlower']::text[]
    when 13 then array['mathrush','oddoneout']::text[]
    when 14 then array['numberroute','connections']::text[]
    when 15 then array['sequence','topicrush']::text[]
    when 16 then array['orderup','oddoneout']::text[]
    when 17 then array['higherlower','connections']::text[]
    when 18 then array['mathrush','topicrush']::text[]
    when 19 then array['numberroute','sequence']::text[]
    when 20 then array['orderup','connections']::text[]
    when 21 then array['oddoneout','topicrush']::text[]
    when 22 then array['higherlower','sequence']::text[]
    when 23 then array['mathrush','numberroute']::text[]
    when 24 then array['orderup','topicrush']::text[]
    when 25 then array['connections','sequence']::text[]
    when 26 then array['oddoneout','numberroute']::text[]
    when 27 then array['higherlower','mathrush']::text[]
    else array['orderup','sequence']::text[]
  end;
  return array['brainmix',v_pair[1],v_pair[2],'brainiword']::text[];
end;$function$;
