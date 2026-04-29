-- Helper functions to break RLS recursion across tests / test_groups / group_members / groups
CREATE OR REPLACE FUNCTION public.is_test_creator(_test_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.tests t WHERE t.id = _test_id AND t.creator_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.user_can_view_test(_test_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tests t WHERE t.id = _test_id AND t.creator_id = _user_id
  ) OR EXISTS (
    SELECT 1
    FROM public.test_groups tg
    JOIN public.group_members gm ON gm.group_id = tg.group_id
    WHERE tg.test_id = _test_id AND gm.user_id = _user_id
  );
$$;

-- tests: rewrite SELECT policies
DROP POLICY IF EXISTS "Group members can view linked tests" ON public.tests;
DROP POLICY IF EXISTS "Creators can view own tests" ON public.tests;

CREATE POLICY "Tests viewable by creator or group member"
ON public.tests FOR SELECT
USING (public.user_can_view_test(id, auth.uid()));

-- test_groups: rewrite all policies to avoid touching tests/group_members directly
DROP POLICY IF EXISTS "Creators manage test_groups" ON public.test_groups;
DROP POLICY IF EXISTS "Members view test_groups for their groups" ON public.test_groups;

CREATE POLICY "Test creators view test_groups"
ON public.test_groups FOR SELECT
TO authenticated
USING (public.is_test_creator(test_id, auth.uid()));

CREATE POLICY "Group members view test_groups"
ON public.test_groups FOR SELECT
TO authenticated
USING (public.is_group_member(group_id, auth.uid()) OR public.is_group_creator(group_id, auth.uid()));

CREATE POLICY "Test creators insert test_groups"
ON public.test_groups FOR INSERT
TO authenticated
WITH CHECK (public.is_test_creator(test_id, auth.uid()));

CREATE POLICY "Test creators delete test_groups"
ON public.test_groups FOR DELETE
TO authenticated
USING (public.is_test_creator(test_id, auth.uid()));

-- questions: rewrite SELECT to use helper
DROP POLICY IF EXISTS "Questions viewable for accessible tests" ON public.questions;
CREATE POLICY "Questions viewable for accessible tests"
ON public.questions FOR SELECT
USING (public.user_can_view_test(test_id, auth.uid()));

-- test_attempts: rewrite policies similarly
DROP POLICY IF EXISTS "Creators view all attempts on their tests" ON public.test_attempts;
DROP POLICY IF EXISTS "Group members view attempts on linked tests" ON public.test_attempts;

CREATE POLICY "Creators view attempts on their tests"
ON public.test_attempts FOR SELECT
USING (public.is_test_creator(test_id, auth.uid()));

CREATE POLICY "Group members view attempts on linked tests"
ON public.test_attempts FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.test_groups tg
    WHERE tg.test_id = test_attempts.test_id
      AND public.is_group_member(tg.group_id, auth.uid())
      AND public.is_group_member(tg.group_id, test_attempts.user_id)
  )
);
