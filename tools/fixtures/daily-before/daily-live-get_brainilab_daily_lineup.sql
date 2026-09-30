CREATE OR REPLACE FUNCTION public.get_brainilab_daily_lineup(p_challenge_date date DEFAULT CURRENT_DATE)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object(
    'challenge_date',p_challenge_date,
    'daily_number',public.brainilab_daily_number_for_date(p_challenge_date),
    'games',to_jsonb(public.brainilab_daily_game_ids(p_challenge_date))
  );
$function$

