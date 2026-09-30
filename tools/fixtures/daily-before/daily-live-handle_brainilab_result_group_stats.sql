CREATE OR REPLACE FUNCTION public.handle_brainilab_result_group_stats()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_group record;
begin
  for v_group in
    select gm.group_id
    from public.group_members gm
    where gm.user_id=new.user_id
  loop
    perform public.refresh_brainilab_group_stats(
      v_group.group_id
    );

    perform public.refresh_brainilab_group_game_rank_stats(
      v_group.group_id
    );
  end loop;

  return new;
end;
$function$

