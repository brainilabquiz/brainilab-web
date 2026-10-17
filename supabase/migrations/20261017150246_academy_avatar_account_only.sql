-- Anonymous Auth sessions also use the authenticated database role.
-- Course collections are explicitly for permanent signed-in accounts only.
begin;
alter policy "Own Academy avatar collection" on public.learn_avatar_unlocks
using ((select auth.uid())=user_id and ((select auth.jwt())->>'is_anonymous')::boolean is false);
commit;
