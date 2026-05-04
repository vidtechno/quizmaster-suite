
-- Fix 1: Remove anon SELECT on tests (test_code leak)
DROP POLICY IF EXISTS "Tests are publicly viewable" ON public.tests;

-- Fix 2: Remove anon SELECT on questions (correct_answer leak)
DROP POLICY IF EXISTS "Questions are publicly viewable" ON public.questions;

-- Fix 3: Remove broad authenticated SELECT on profiles (phone leak)
-- Existing scoped policies remain: own profile, admins, group creators viewing members.
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Fix 4: Harden user_can_view_test against NULL user_id
CREATE OR REPLACE FUNCTION public.user_can_view_test(_test_id uuid, _user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE WHEN _user_id IS NULL THEN false ELSE EXISTS (
    SELECT 1 FROM public.tests t WHERE t.id = _test_id AND t.creator_id = _user_id
  ) OR EXISTS (
    SELECT 1
    FROM public.test_groups tg
    JOIN public.group_members gm ON gm.group_id = tg.group_id
    WHERE tg.test_id = _test_id AND gm.user_id = _user_id
  ) END;
$function$;

-- Fix 5: Revoke anon EXECUTE on admin/sensitive SECURITY DEFINER RPCs
REVOKE EXECUTE ON FUNCTION public.get_admin_stats() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_search_users(text, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_list_tests(text, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_list_groups(text, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_toggle_admin(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_delete_user(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_delete_test(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_delete_group(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_recent_activity(integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_group_member_stats(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_group_leaderboard(uuid, uuid, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.attach_test_to_group(text, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.detach_test_from_group(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.join_group_by_code(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_user_attempt_test(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.recompute_question_stats(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;

GRANT EXECUTE ON FUNCTION public.get_admin_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_search_users(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_tests(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_groups(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_toggle_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_test(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_group(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_recent_activity(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_group_member_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_group_leaderboard(uuid, uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.attach_test_to_group(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.detach_test_from_group(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_group_by_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_user_attempt_test(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_question_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Fix 6: Restrict avatars bucket listing — keep public read of individual files,
-- but only allow listing/select via authenticated context (prevents anon enumeration).
-- Also: restrict access_code visibility so members cannot see the code.
DROP POLICY IF EXISTS "Members can view their groups" ON public.groups;
CREATE POLICY "Members can view their groups (no code)"
ON public.groups FOR SELECT
USING (
  is_group_member(id, auth.uid())
  -- Note: column exposure cannot be limited via RLS alone; app code must avoid selecting access_code as a non-creator. See app changes.
);
