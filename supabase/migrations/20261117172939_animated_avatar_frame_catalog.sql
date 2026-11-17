-- Extend the cosmetic allowlist without changing the existing tier thresholds,
-- seasonal entitlements, share checks or the function's access privileges.
do $avatar_frame_catalog$
declare
  previous_frames constant text := '["gold",3000],["orbit",6000]]}';
  expanded_frames constant text := '["prism",2500],["gold",3000],["aurora",4750],["orbit",6000],["nova",8500]]}';
  definition text := pg_catalog.pg_get_functiondef('brainilab_private.player_avatar(uuid)'::regprocedure);
begin
  if pg_catalog.strpos(definition, expanded_frames) > 0 then
    return;
  end if;
  if pg_catalog.length(definition) - pg_catalog.length(pg_catalog.replace(definition, previous_frames, ''))
     <> pg_catalog.length(previous_frames) then
    raise exception 'Avatar frame catalogue changed; review the active definition';
  end if;
  execute pg_catalog.replace(definition, previous_frames, expanded_frames);
end;
$avatar_frame_catalog$;
