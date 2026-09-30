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
end;$function$

