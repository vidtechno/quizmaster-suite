-- Fix infinite recursion in group_members RLS by introducing SECURITY DEFINER helpers
-- and rewriting policies that referenced group_members from within group_members.

CREATE OR REPLACE FUNCTION public.is_group_creator(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.groups g WHERE g.id = _group_id AND g.creator_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.is_group_member(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = _group_id AND gm.user_id = _user_id);
$$;

-- Rewrite group_members policies to avoid recursion
DROP POLICY IF EXISTS "Group creators manage members" ON public.group_members;
DROP POLICY IF EXISTS "Members can leave group" ON public.group_members;
DROP POLICY IF EXISTS "Members can view their memberships" ON public.group_members;
DROP POLICY IF EXISTS "Users can join groups" ON public.group_members;

CREATE POLICY "Members view own membership"
ON public.group_members FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Group creators view all members"
ON public.group_members FOR SELECT
USING (public.is_group_creator(group_id, auth.uid()));

CREATE POLICY "Users join groups"
ON public.group_members FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Group creators add members"
ON public.group_members FOR INSERT
TO authenticated
WITH CHECK (public.is_group_creator(group_id, auth.uid()));

CREATE POLICY "Group creators update members"
ON public.group_members FOR UPDATE
USING (public.is_group_creator(group_id, auth.uid()))
WITH CHECK (public.is_group_creator(group_id, auth.uid()));

CREATE POLICY "Members leave group"
ON public.group_members FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Group creators remove members"
ON public.group_members FOR DELETE
USING (public.is_group_creator(group_id, auth.uid()));

-- Rewrite groups SELECT policy that referenced group_members (also recursive path source)
DROP POLICY IF EXISTS "Members can view their groups" ON public.groups;
CREATE POLICY "Members can view their groups"
ON public.groups FOR SELECT
USING (public.is_group_member(id, auth.uid()));

-- Rewrite test_groups SELECT policy similarly
DROP POLICY IF EXISTS "Members view test_groups for their groups" ON public.test_groups;
CREATE POLICY "Members view test_groups for their groups"
ON public.test_groups FOR SELECT
TO authenticated
USING (
  public.is_group_member(group_id, auth.uid())
  OR public.is_group_creator(group_id, auth.uid())
);

-- Rewrite questions SELECT to use helper
DROP POLICY IF EXISTS "Questions viewable for accessible tests" ON public.questions;
CREATE POLICY "Questions viewable for accessible tests"
ON public.questions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tests t
    WHERE t.id = questions.test_id
      AND (
        t.creator_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.test_groups tg
          WHERE tg.test_id = t.id AND public.is_group_member(tg.group_id, auth.uid())
        )
      )
  )
);

-- Rewrite tests SELECT for group members similarly
DROP POLICY IF EXISTS "Group members can view linked tests" ON public.tests;
CREATE POLICY "Group members can view linked tests"
ON public.tests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.test_groups tg
    WHERE tg.test_id = tests.id AND public.is_group_member(tg.group_id, auth.uid())
  )
);

-- Rewrite test_attempts policy that joined group_members twice (recursion-prone)
DROP POLICY IF EXISTS "Group members view attempts on linked tests" ON public.test_attempts;
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

-- Rewrite profiles policy that referenced group_members
DROP POLICY IF EXISTS "Group creators view member profiles" ON public.profiles;
CREATE POLICY "Group creators view member profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    JOIN public.groups g ON g.id = gm.group_id
    WHERE gm.user_id = profiles.id AND g.creator_id = auth.uid()
  )
);
