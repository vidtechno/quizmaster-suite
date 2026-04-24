
-- 1. Add member_limit to groups
ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS member_limit INTEGER;

-- 2. Group members table
CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  attempts_limit INTEGER NOT NULL DEFAULT 1,
  joined_via TEXT NOT NULL DEFAULT 'code' CHECK (joined_via IN ('code','manual')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_group ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON public.group_members(user_id);

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Group creator can do everything on their group's members
CREATE POLICY "Group creators manage members"
ON public.group_members FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_members.group_id AND g.creator_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_members.group_id AND g.creator_id = auth.uid())
);

-- Members can see their own membership
CREATE POLICY "Members can view their memberships"
ON public.group_members FOR SELECT
USING (auth.uid() = user_id);

-- Members can leave (delete their own membership)
CREATE POLICY "Members can leave group"
ON public.group_members FOR DELETE
USING (auth.uid() = user_id);

-- Authenticated users can insert themselves (for join-by-code; checked by function)
CREATE POLICY "Users can join groups"
ON public.group_members FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 3. Test attempts table (detailed per-attempt tracking)
CREATE TABLE IF NOT EXISTS public.test_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','abandoned')),
  score INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  time_spent INTEGER NOT NULL DEFAULT 0,
  answers_log JSONB NOT NULL DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_test_attempts_test ON public.test_attempts(test_id);
CREATE INDEX IF NOT EXISTS idx_test_attempts_user ON public.test_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_test_attempts_test_user ON public.test_attempts(test_id, user_id);

ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;

-- Users can see their own attempts
CREATE POLICY "Users view own attempts"
ON public.test_attempts FOR SELECT
USING (auth.uid() = user_id);

-- Test creators can see all attempts on their tests
CREATE POLICY "Creators view all attempts on their tests"
ON public.test_attempts FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.tests t WHERE t.id = test_attempts.test_id AND t.creator_id = auth.uid())
);

-- Users can insert their own attempts
CREATE POLICY "Users insert own attempts"
ON public.test_attempts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own in-progress attempts
CREATE POLICY "Users update own attempts"
ON public.test_attempts FOR UPDATE
USING (auth.uid() = user_id);

-- 4. Function to join group by access code (uses test access code -> group)
CREATE OR REPLACE FUNCTION public.join_group_by_code(_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_test RECORD;
  v_group RECORD;
  v_count INTEGER;
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  SELECT id, group_id, title INTO v_test
  FROM public.tests
  WHERE access_code = upper(trim(_code))
  LIMIT 1;

  IF v_test.id IS NULL OR v_test.group_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  SELECT * INTO v_group FROM public.groups WHERE id = v_test.group_id;
  IF v_group.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  -- Already a member?
  IF EXISTS (SELECT 1 FROM public.group_members WHERE group_id = v_group.id AND user_id = v_uid) THEN
    RETURN jsonb_build_object('ok', true, 'already', true, 'group_id', v_group.id, 'test_id', v_test.id);
  END IF;

  -- Check member_limit
  IF v_group.member_limit IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count FROM public.group_members WHERE group_id = v_group.id;
    IF v_count >= v_group.member_limit THEN
      RETURN jsonb_build_object('ok', false, 'error', 'group_full');
    END IF;
  END IF;

  INSERT INTO public.group_members (group_id, user_id, joined_via)
  VALUES (v_group.id, v_uid, 'code');

  RETURN jsonb_build_object('ok', true, 'group_id', v_group.id, 'test_id', v_test.id);
END;
$$;

-- 5. Function to check if user can attempt the test
CREATE OR REPLACE FUNCTION public.can_user_attempt_test(_test_id UUID, _user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_test RECORD;
  v_limit INTEGER;
  v_used INTEGER;
BEGIN
  SELECT id, group_id, is_public, max_attempts, creator_id INTO v_test
  FROM public.tests WHERE id = _test_id;
  IF v_test.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  -- Creator can always
  IF v_test.creator_id = _user_id THEN
    RETURN jsonb_build_object('ok', true, 'limit', NULL, 'used', 0);
  END IF;

  -- Private test: must be group member
  IF v_test.is_public = false AND v_test.group_id IS NOT NULL THEN
    SELECT attempts_limit INTO v_limit
    FROM public.group_members
    WHERE group_id = v_test.group_id AND user_id = _user_id;
    IF v_limit IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'not_member');
    END IF;
  ELSE
    v_limit := v_test.max_attempts;
  END IF;

  SELECT COUNT(*) INTO v_used
  FROM public.test_attempts
  WHERE test_id = _test_id AND user_id = _user_id AND status = 'completed';

  IF v_limit IS NOT NULL AND v_used >= v_limit THEN
    RETURN jsonb_build_object('ok', false, 'error', 'limit_reached', 'limit', v_limit, 'used', v_used);
  END IF;

  RETURN jsonb_build_object('ok', true, 'limit', v_limit, 'used', v_used);
END;
$$;
