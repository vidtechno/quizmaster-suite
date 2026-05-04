
-- Group chat messages
CREATE TABLE public.group_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_group_messages_group ON public.group_messages(group_id, created_at DESC);
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members view messages" ON public.group_messages FOR SELECT TO authenticated
USING (public.is_group_member(group_id, auth.uid()) OR public.is_group_creator(group_id, auth.uid()));
CREATE POLICY "Group members send messages" ON public.group_messages FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND (public.is_group_member(group_id, auth.uid()) OR public.is_group_creator(group_id, auth.uid())));
CREATE POLICY "Authors delete own messages" ON public.group_messages FOR DELETE TO authenticated
USING (auth.uid() = user_id OR public.is_group_creator(group_id, auth.uid()));

-- Group announcements
CREATE TABLE public.group_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL,
  creator_id UUID NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_group_announcements_group ON public.group_announcements(group_id, created_at DESC);
ALTER TABLE public.group_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view announcements" ON public.group_announcements FOR SELECT TO authenticated
USING (public.is_group_member(group_id, auth.uid()) OR public.is_group_creator(group_id, auth.uid()));
CREATE POLICY "Creators post announcements" ON public.group_announcements FOR INSERT TO authenticated
WITH CHECK (auth.uid() = creator_id AND public.is_group_creator(group_id, auth.uid()));
CREATE POLICY "Creators delete announcements" ON public.group_announcements FOR DELETE TO authenticated
USING (public.is_group_creator(group_id, auth.uid()));

-- Test reviews
CREATE TABLE public.test_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (test_id, user_id)
);
CREATE INDEX idx_test_reviews_test ON public.test_reviews(test_id);
ALTER TABLE public.test_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone with test access can view reviews" ON public.test_reviews FOR SELECT TO authenticated
USING (public.user_can_view_test(test_id, auth.uid()));
CREATE POLICY "Users can review tests they took" ON public.test_reviews FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND EXISTS (
  SELECT 1 FROM public.test_attempts ta WHERE ta.test_id = test_reviews.test_id AND ta.user_id = auth.uid() AND ta.status = 'completed'
));
CREATE POLICY "Users update own reviews" ON public.test_reviews FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own reviews" ON public.test_reviews FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Global leaderboard RPC
CREATE OR REPLACE FUNCTION public.get_global_leaderboard(_limit INT DEFAULT 50)
RETURNS TABLE(user_id UUID, full_name TEXT, username TEXT, avatar_url TEXT, completed_count INT, avg_pct NUMERIC, total_score INT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.full_name, p.username, p.avatar_url,
    COUNT(ta.id)::INT AS completed_count,
    COALESCE(ROUND(AVG(CASE WHEN ta.total_questions>0 THEN (ta.score::numeric/ta.total_questions)*100 END)::numeric,1),0) AS avg_pct,
    COALESCE(SUM(ta.score),0)::INT AS total_score
  FROM public.profiles p
  LEFT JOIN public.test_attempts ta ON ta.user_id = p.id AND ta.status='completed'
  GROUP BY p.id, p.full_name, p.username, p.avatar_url
  HAVING COUNT(ta.id) > 0
  ORDER BY avg_pct DESC, total_score DESC
  LIMIT GREATEST(_limit, 1);
$$;

-- Group statistics RPC
CREATE OR REPLACE FUNCTION public.get_group_stats(_group_id UUID)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  IF NOT (public.is_group_creator(_group_id, auth.uid()) OR public.is_group_member(_group_id, auth.uid())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT jsonb_build_object(
    'members', (SELECT COUNT(*) FROM public.group_members WHERE group_id = _group_id),
    'tests', (SELECT COUNT(*) FROM public.test_groups WHERE group_id = _group_id),
    'attempts', (SELECT COUNT(*) FROM public.test_attempts ta JOIN public.test_groups tg ON tg.test_id = ta.test_id WHERE tg.group_id = _group_id AND ta.status='completed'),
    'avg_score', (SELECT COALESCE(ROUND(AVG(CASE WHEN ta.total_questions>0 THEN (ta.score::numeric/ta.total_questions)*100 END)::numeric,1),0)
                  FROM public.test_attempts ta JOIN public.test_groups tg ON tg.test_id = ta.test_id
                  WHERE tg.group_id = _group_id AND ta.status='completed'),
    'attempts_by_day', (SELECT COALESCE(jsonb_agg(jsonb_build_object('day', d, 'count', c) ORDER BY d), '[]'::jsonb)
                        FROM (SELECT date_trunc('day', ta.submitted_at)::date AS d, COUNT(*)::int AS c
                              FROM public.test_attempts ta JOIN public.test_groups tg ON tg.test_id = ta.test_id
                              WHERE tg.group_id = _group_id AND ta.status='completed' AND ta.submitted_at >= now() - interval '14 days'
                              GROUP BY 1) s)
  ) INTO result;
  RETURN result;
END; $$;

-- Test review summary RPC
CREATE OR REPLACE FUNCTION public.get_test_review_summary(_test_id UUID)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'count', COUNT(*),
    'avg', COALESCE(ROUND(AVG(rating)::numeric, 2), 0)
  ) FROM public.test_reviews WHERE test_id = _test_id;
$$;

REVOKE EXECUTE ON FUNCTION public.get_global_leaderboard(INT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_group_stats(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_test_review_summary(UUID) FROM anon;
