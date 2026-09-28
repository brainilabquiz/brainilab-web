-- Restore the existing owner/editor upload authorization through a private wrapper.
-- The caller cannot execute require_brainilab_admin directly. It still checks
-- auth.uid(), active membership, role and the account's MFA requirement.
alter function brainilab_editor.can_edit() security definer;
alter function brainilab_editor.can_edit() set search_path = '';
revoke all on function brainilab_editor.can_edit() from public, anon;
grant execute on function brainilab_editor.can_edit() to authenticated;
