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
end;$function$

