-- 1) Add questions_per_attempt to tests
ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS questions_per_attempt INTEGER;

-- 2) Junction table for many-to-many test ↔ groups
CREATE TABLE IF NOT EXISTS public.test_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (test_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_test_groups_test ON public.test_groups(test_id);
CREATE INDEX IF NOT EXISTS idx_test_groups_group ON public.test_groups(group_id);

ALTER TABLE public.test_groups ENABLE ROW LEVEL SECURITY;

-- Migrate any existing tests.group_id values into test_groups
INSERT INTO public.test_groups (test_id, group_id)
SELECT id, group_id FROM public.tests
WHERE group_id IS NOT NULL
ON CONFLICT (test_id, group_id) DO NOTHING;

-- RLS: Test creators manage links
DROP POLICY IF EXISTS "Creators manage test_groups" ON public.test_groups;
CREATE POLICY "Creators manage test_groups" ON public.test_groups
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.tests t WHERE t.id = test_groups.test_id AND t.creator_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.tests t WHERE t.id = test_groups.test_id AND t.creator_id = auth.uid()));

-- RLS: Group members can see links involving their groups
DROP POLICY IF EXISTS "Members view test_groups for their groups" ON public.test_groups;
CREATE POLICY "Members view test_groups for their groups" ON public.test_groups
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = test_groups.group_id AND gm.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.groups g WHERE g.id = test_groups.group_id AND g.creator_id = auth.uid())
);

-- 3) Update can_user_attempt_test to consider all linked groups
CREATE OR REPLACE FUNCTION public.can_user_attempt_test(_test_id uuid, _user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_test RECORD;
  v_limit INTEGER;
  v_used INTEGER;
  v_is_member BOOLEAN := false;
  v_has_links BOOLEAN := false;
BEGIN
  SELECT id, is_public, max_attempts, creator_id INTO v_test
  FROM public.tests WHERE id = _test_id;
  IF v_test.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF v_test.creator_id = _user_id THEN
    RETURN jsonb_build_object('ok', true, 'limit', NULL, 'used', 0);
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.test_groups WHERE test_id = _test_id) INTO v_has_links;

  IF v_test.is_public = false AND v_has_links THEN
    -- Use minimum attempts_limit across all groups the user belongs to that link this test
    SELECT MIN(gm.attempts_limit) INTO v_limit
    FROM public.test_groups tg
    JOIN public.group_members gm ON gm.group_id = tg.group_id
    WHERE tg.test_id = _test_id AND gm.user_id = _user_id;

    IF v_limit IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'not_member');
    END IF;
    v_is_member := true;
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
$function$;

-- 4) Update join_group_by_code to use test_groups (and fall back to tests.group_id)
CREATE OR REPLACE FUNCTION public.join_group_by_code(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_test RECORD;
  v_group RECORD;
  v_group_id UUID;
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

  IF v_test.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  -- Prefer first linked group from test_groups; fall back to legacy tests.group_id
  SELECT group_id INTO v_group_id FROM public.test_groups
    WHERE test_id = v_test.id ORDER BY created_at ASC LIMIT 1;
  IF v_group_id IS NULL THEN
    v_group_id := v_test.group_id;
  END IF;

  IF v_group_id IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'group_id', NULL, 'test_id', v_test.id);
  END IF;

  SELECT * INTO v_group FROM public.groups WHERE id = v_group_id;
  IF v_group.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF EXISTS (SELECT 1 FROM public.group_members WHERE group_id = v_group.id AND user_id = v_uid) THEN
    RETURN jsonb_build_object('ok', true, 'already', true, 'group_id', v_group.id, 'test_id', v_test.id);
  END IF;

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
$function$;

-- 5) RPC: per-member stats for a group (creator only)
CREATE OR REPLACE FUNCTION public.get_group_member_stats(_group_id uuid)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  username TEXT,
  attempts_limit INTEGER,
  joined_at TIMESTAMPTZ,
  completed_count INTEGER,
  avg_score NUMERIC,
  best_score INTEGER,
  last_attempt_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.groups g WHERE g.id = _group_id AND g.creator_id = auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    gm.user_id,
    p.full_name,
    p.username,
    gm.attempts_limit,
    gm.joined_at,
    COALESCE(s.completed_count, 0)::INTEGER,
    COALESCE(s.avg_score, 0)::NUMERIC,
    COALESCE(s.best_score, 0)::INTEGER,
    s.last_attempt_at
  FROM public.group_members gm
  LEFT JOIN public.profiles p ON p.id = gm.user_id
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) FILTER (WHERE ta.status = 'completed') AS completed_count,
      AVG(CASE WHEN ta.status='completed' AND ta.total_questions > 0
               THEN (ta.score::numeric / ta.total_questions) * 100 END) AS avg_score,
      MAX(CASE WHEN ta.status='completed' AND ta.total_questions > 0
               THEN ROUND((ta.score::numeric / ta.total_questions) * 100) END)::INTEGER AS best_score,
      MAX(ta.submitted_at) AS last_attempt_at
    FROM public.test_attempts ta
    JOIN public.test_groups tg ON tg.test_id = ta.test_id
    WHERE tg.group_id = _group_id AND ta.user_id = gm.user_id
  ) s ON TRUE
  WHERE gm.group_id = _group_id
  ORDER BY gm.joined_at ASC;
END;
$function$;

-- 6) Allow group creators to see attempts on tests linked to their groups
DROP POLICY IF EXISTS "Group creators view attempts on linked tests" ON public.test_attempts;
CREATE POLICY "Group creators view attempts on linked tests" ON public.test_attempts
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.test_groups tg
    JOIN public.groups g ON g.id = tg.group_id
    JOIN public.group_members gm ON gm.group_id = tg.group_id
    WHERE tg.test_id = test_attempts.test_id
      AND g.creator_id = auth.uid()
      AND gm.user_id = test_attempts.user_id
  )
);

-- 7) Allow group creators to view profiles of their members (so names show up in stats)
DROP POLICY IF EXISTS "Group creators view member profiles" ON public.profiles;
CREATE POLICY "Group creators view member profiles" ON public.profiles
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    JOIN public.groups g ON g.id = gm.group_id
    WHERE gm.user_id = profiles.id AND g.creator_id = auth.uid()
  )
);
