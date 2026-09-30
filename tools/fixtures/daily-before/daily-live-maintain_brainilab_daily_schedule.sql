CREATE OR REPLACE FUNCTION public.maintain_brainilab_daily_schedule(p_base_date date DEFAULT CURRENT_DATE)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_lookahead integer;
  v_offset integer;
  v_id uuid;
  v_generated integer := 0;
  v_published integer := 0;
begin
  select lookahead_days
    into v_lookahead
  from public.daily_generation_settings
  where singleton = true;

  for v_offset in 0..v_lookahead loop
    if not exists (
      select 1
      from public.daily_challenges dc
      where dc.challenge_date = p_base_date + v_offset
    ) then
      v_id := public.generate_brainilab_daily_challenge(
        p_base_date + v_offset
      );
      v_generated := v_generated + 1;
    end if;
  end loop;

  update public.daily_challenges
  set
    status = 'published',
    published_at = coalesce(published_at,now())
  where challenge_date <= p_base_date
    and status = 'ready';

  get diagnostics v_published = row_count;

  return jsonb_build_object(
    'base_date',p_base_date,
    'generated',v_generated,
    'published',v_published,
    'lookahead_days',v_lookahead
  );
end;
$function$

