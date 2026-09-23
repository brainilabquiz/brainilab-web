create function brainilab_editor.can_edit() returns boolean language plpgsql stable security invoker set search_path='' as $$
begin
 perform public.require_brainilab_admin(array['owner','editor']);
 return true;
exception when others then return false;
end $$;
revoke all on function brainilab_editor.can_edit() from public,anon;
grant execute on function brainilab_editor.can_edit() to authenticated;
alter policy "Editors add Learn covers" on storage.objects with check (bucket_id='learn-covers' and (select brainilab_editor.can_edit()));
alter policy "Editors read Learn cover metadata" on storage.objects using (bucket_id='learn-covers' and (select brainilab_editor.can_edit()));
comment on table brainilab_editor.articles is 'Private drafts; no client table grants or RLS policies by design. Access only through authorized editor helpers.';
comment on table brainilab_editor.revisions is 'Immutable saved versions, available only through the authorized history helper.';
