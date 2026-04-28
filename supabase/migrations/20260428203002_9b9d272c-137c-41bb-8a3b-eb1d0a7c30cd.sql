DELETE FROM public.test_attempts;
DELETE FROM public.test_groups;
DELETE FROM public.questions;
DELETE FROM public.tests;

DROP POLICY IF EXISTS "Public tests viewable by everyone" ON public.tests;
DROP POLICY IF EXISTS "Authenticated users can view private tests for taking" ON public.tests;
DROP POLICY IF EXISTS "Questions viewable for accessible tests" ON public.questions;
DROP POLICY IF EXISTS "Authenticated users can view linked groups" ON public.groups;

DROP FUNCTION IF EXISTS public.handle_test_privacy_transition() CASCADE;

-- CASCADE tashqi policy'larni ham olib tashlaydi (results jadvalidagi)
ALTER TABLE public.tests DROP COLUMN IF EXISTS is_public CASCADE;
ALTER TABLE public.tests DROP COLUMN IF EXISTS access_code CASCADE;
ALTER TABLE public.tests DROP COLUMN IF EXISTS group_id CASCADE;
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS test_code TEXT UNIQUE;

ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS access_code TEXT UNIQUE;

CREATE OR REPLACE FUNCTION public.gen_code6()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; code TEXT := ''; i INT;
BEGIN
  FOR i IN 1..6 LOOP code := code || substr(chars, (floor(random() * length(chars)) + 1)::int, 1); END LOOP;
  RETURN code;
END; $$;

CREATE OR REPLACE FUNCTION public.gen_unique_test_code()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_code TEXT; attempt INT := 0;
BEGIN
  LOOP
    v_code := public.gen_code6();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.tests WHERE test_code = v_code);
    attempt := attempt + 1;
    IF attempt > 20 THEN RAISE EXCEPTION 'Could not generate unique test code'; END IF;
  END LOOP;
  RETURN v_code;
END; $$;

CREATE OR REPLACE FUNCTION public.gen_unique_group_code()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_code TEXT; attempt INT := 0;
BEGIN
  LOOP
    v_code := 'GK-' || public.gen_code6();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.groups WHERE access_code = v_code);
    attempt := attempt + 1;
    IF attempt > 20 THEN RAISE EXCEPTION 'Could not generate unique group code'; END IF;
  END LOOP;
  RETURN v_code;
END; $$;

CREATE OR REPLACE FUNCTION public.tg_tests_set_code()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.test_code IS NULL OR NEW.test_code = '' THEN NEW.test_code := public.gen_unique_test_code(); END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_tests_set_code ON public.tests;
CREATE TRIGGER trg_tests_set_code BEFORE INSERT ON public.tests
  FOR EACH ROW EXECUTE FUNCTION public.tg_tests_set_code();

CREATE OR REPLACE FUNCTION public.tg_groups_set_code()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.access_code IS NULL OR NEW.access_code = '' THEN NEW.access_code := public.gen_unique_group_code(); END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_groups_set_code ON public.groups;
CREATE TRIGGER trg_groups_set_code BEFORE INSERT ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.tg_groups_set_code();

UPDATE public.groups SET access_code = public.gen_unique_group_code() WHERE access_code IS NULL;
ALTER TABLE public.tests ALTER COLUMN test_code SET NOT NULL;
ALTER TABLE public.groups ALTER COLUMN access_code SET NOT NULL;

CREATE POLICY "Creators can view own tests" ON public.tests
  FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "Group members can view linked tests" ON public.tests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.test_groups tg
      JOIN public.group_members gm ON gm.group_id = tg.group_id
      WHERE tg.test_id = tests.id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Questions viewable for accessible tests" ON public.questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tests t
      WHERE t.id = questions.test_id
        AND (
          t.creator_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.test_groups tg
            JOIN public.group_members gm ON gm.group_id = tg.group_id
            WHERE tg.test_id = t.id AND gm.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Members can view their groups" ON public.groups
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = groups.id AND gm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Group creators view attempts on linked tests" ON public.test_attempts;
CREATE POLICY "Group members view attempts on linked tests" ON public.test_attempts
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.test_groups tg
      JOIN public.group_members gm_self ON gm_self.group_id = tg.group_id AND gm_self.user_id = auth.uid()
      JOIN public.group_members gm_target ON gm_target.group_id = tg.group_id AND gm_target.user_id = test_attempts.user_id
      WHERE tg.test_id = test_attempts.test_id
    )
  );

CREATE OR REPLACE FUNCTION public.attach_test_to_group(_test_code TEXT, _group_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_test_id UUID; v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'unauthorized'); END IF;
  SELECT id INTO v_test_id FROM public.tests WHERE test_code = upper(trim(_test_code)) LIMIT 1;
  IF v_test_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'test_not_found'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.groups WHERE id = _group_id AND creator_id = v_uid) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_group_owner');
  END IF;
  IF EXISTS (SELECT 1 FROM public.test_groups WHERE test_id = v_test_id AND group_id = _group_id) THEN
    RETURN jsonb_build_object('ok', true, 'already', true, 'test_id', v_test_id);
  END IF;
  INSERT INTO public.test_groups (test_id, group_id) VALUES (v_test_id, _group_id);
  RETURN jsonb_build_object('ok', true, 'test_id', v_test_id);
END; $$;

CREATE OR REPLACE FUNCTION public.detach_test_from_group(_test_id UUID, _group_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'unauthorized'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.groups WHERE id = _group_id AND creator_id = v_uid) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_group_owner');
  END IF;
  DELETE FROM public.test_groups WHERE test_id = _test_id AND group_id = _group_id;
  RETURN jsonb_build_object('ok', true);
END; $$;

CREATE OR REPLACE FUNCTION public.join_group_by_code(_code TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_group RECORD; v_count INT; v_uid UUID := auth.uid(); v_norm TEXT;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'unauthorized'); END IF;
  v_norm := upper(trim(_code));
  IF position('GK-' IN v_norm) <> 1 THEN v_norm := 'GK-' || v_norm; END IF;
  SELECT * INTO v_group FROM public.groups WHERE access_code = v_norm LIMIT 1;
  IF v_group.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;
  IF EXISTS (SELECT 1 FROM public.group_members WHERE group_id = v_group.id AND user_id = v_uid) THEN
    RETURN jsonb_build_object('ok', true, 'already', true, 'group_id', v_group.id);
  END IF;
  IF v_group.member_limit IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count FROM public.group_members WHERE group_id = v_group.id;
    IF v_count >= v_group.member_limit THEN RETURN jsonb_build_object('ok', false, 'error', 'group_full'); END IF;
  END IF;
  INSERT INTO public.group_members (group_id, user_id, joined_via) VALUES (v_group.id, v_uid, 'code');
  RETURN jsonb_build_object('ok', true, 'group_id', v_group.id);
END; $$;

CREATE OR REPLACE FUNCTION public.can_user_attempt_test(_test_id UUID, _user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_test RECORD; v_limit INT; v_used INT;
BEGIN
  SELECT id, max_attempts, creator_id INTO v_test FROM public.tests WHERE id = _test_id;
  IF v_test.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;
  IF v_test.creator_id = _user_id THEN RETURN jsonb_build_object('ok', true, 'limit', NULL, 'used', 0); END IF;
  SELECT MIN(gm.attempts_limit) INTO v_limit
    FROM public.test_groups tg JOIN public.group_members gm ON gm.group_id = tg.group_id
    WHERE tg.test_id = _test_id AND gm.user_id = _user_id;
  IF v_limit IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not_member'); END IF;
  SELECT COUNT(*) INTO v_used FROM public.test_attempts
    WHERE test_id = _test_id AND user_id = _user_id AND status = 'completed';
  IF v_limit IS NOT NULL AND v_used >= v_limit THEN
    RETURN jsonb_build_object('ok', false, 'error', 'limit_reached', 'limit', v_limit, 'used', v_used);
  END IF;
  RETURN jsonb_build_object('ok', true, 'limit', v_limit, 'used', v_used);
END; $$;

CREATE OR REPLACE FUNCTION public.get_group_leaderboard(_group_id UUID, _test_id UUID, _limit INT DEFAULT 10)
RETURNS TABLE(
  user_id UUID, full_name TEXT, username TEXT, avatar_url TEXT,
  score INT, total_questions INT, pct NUMERIC, time_spent INT, submitted_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.groups g WHERE g.id = _group_id AND g.creator_id = auth.uid())
     AND NOT EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = _group_id AND gm.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  WITH best AS (
    SELECT DISTINCT ON (ta.user_id)
      ta.user_id, ta.score, ta.total_questions, ta.time_spent, ta.submitted_at
    FROM public.test_attempts ta
    JOIN public.group_members gm ON gm.user_id = ta.user_id AND gm.group_id = _group_id
    WHERE ta.test_id = _test_id AND ta.status = 'completed' AND ta.total_questions > 0
    ORDER BY ta.user_id,
      (ta.score::numeric / NULLIF(ta.total_questions,0)) DESC,
      ta.time_spent ASC
  )
  SELECT b.user_id, p.full_name, p.username, p.avatar_url,
    b.score, b.total_questions,
    ROUND((b.score::numeric / NULLIF(b.total_questions,0)) * 100, 1) AS pct,
    b.time_spent, b.submitted_at
  FROM best b LEFT JOIN public.profiles p ON p.id = b.user_id
  ORDER BY pct DESC NULLS LAST, b.time_spent ASC
  LIMIT GREATEST(_limit, 1);
END; $$;

DROP FUNCTION IF EXISTS public.generate_access_code();