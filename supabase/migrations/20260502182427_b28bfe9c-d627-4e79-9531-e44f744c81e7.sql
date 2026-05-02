
-- Roles system
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin'::public.app_role);
$$;

-- RLS for user_roles
CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins view all roles" ON public.user_roles
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Auto-assign admin role for the special phone +998996075479 on signup
CREATE OR REPLACE FUNCTION public.assign_admin_by_phone()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.phone = '+998996075479' OR NEW.phone = '998996075479' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tg_profiles_assign_admin
AFTER INSERT OR UPDATE OF phone ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.assign_admin_by_phone();

-- Backfill: any existing profile with that phone becomes admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM public.profiles
WHERE phone IN ('+998996075479', '998996075479')
ON CONFLICT (user_id, role) DO NOTHING;

-- Admin policies on existing tables (for managing all data)
CREATE POLICY "Admins view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins update all profiles" ON public.profiles
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins view all tests" ON public.tests
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins delete any test" ON public.tests
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins view all groups" ON public.groups
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins delete any group" ON public.groups
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins view all attempts" ON public.test_attempts
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins view all members" ON public.group_members
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- Admin overview RPC (counts)
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSONB
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result JSONB;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT jsonb_build_object(
    'users', (SELECT COUNT(*) FROM public.profiles),
    'tests', (SELECT COUNT(*) FROM public.tests),
    'groups', (SELECT COUNT(*) FROM public.groups),
    'questions', (SELECT COUNT(*) FROM public.questions),
    'attempts', (SELECT COUNT(*) FROM public.test_attempts),
    'completed_attempts', (SELECT COUNT(*) FROM public.test_attempts WHERE status='completed'),
    'group_members', (SELECT COUNT(*) FROM public.group_members),
    'test_groups', (SELECT COUNT(*) FROM public.test_groups),
    'users_today', (SELECT COUNT(*) FROM public.profiles WHERE created_at >= now() - interval '24 hours'),
    'users_7d', (SELECT COUNT(*) FROM public.profiles WHERE created_at >= now() - interval '7 days'),
    'tests_7d', (SELECT COUNT(*) FROM public.tests WHERE created_at >= now() - interval '7 days'),
    'attempts_7d', (SELECT COUNT(*) FROM public.test_attempts WHERE started_at >= now() - interval '7 days'),
    'avg_score', (SELECT COALESCE(ROUND(AVG(CASE WHEN total_questions>0 THEN (score::numeric/total_questions)*100 END)::numeric, 1), 0) FROM public.test_attempts WHERE status='completed'),
    'admins', (SELECT COUNT(*) FROM public.user_roles WHERE role='admin')
  ) INTO result;
  RETURN result;
END;
$$;

-- Admin: search users
CREATE OR REPLACE FUNCTION public.admin_search_users(_q TEXT, _limit INT DEFAULT 50)
RETURNS TABLE(id UUID, full_name TEXT, username TEXT, phone TEXT, created_at TIMESTAMPTZ, is_admin BOOLEAN, test_count INT, attempt_count INT)
LANGUAGE PLPGSQL SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT p.id, p.full_name, p.username, p.phone, p.created_at,
    public.is_admin(p.id) AS is_admin,
    (SELECT COUNT(*)::INT FROM public.tests t WHERE t.creator_id = p.id),
    (SELECT COUNT(*)::INT FROM public.test_attempts ta WHERE ta.user_id = p.id)
  FROM public.profiles p
  WHERE _q IS NULL OR _q = '' OR
    p.full_name ILIKE '%'||_q||'%' OR
    p.username ILIKE '%'||_q||'%' OR
    p.phone ILIKE '%'||_q||'%'
  ORDER BY p.created_at DESC
  LIMIT GREATEST(_limit, 1);
END;
$$;

-- Admin: list all tests with counts
CREATE OR REPLACE FUNCTION public.admin_list_tests(_q TEXT, _limit INT DEFAULT 50)
RETURNS TABLE(id UUID, title TEXT, test_code TEXT, creator_id UUID, creator_name TEXT, created_at TIMESTAMPTZ, question_count INT, attempt_count INT)
LANGUAGE PLPGSQL SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT t.id, t.title, t.test_code, t.creator_id, p.full_name, t.created_at,
    (SELECT COUNT(*)::INT FROM public.questions q WHERE q.test_id = t.id),
    (SELECT COUNT(*)::INT FROM public.test_attempts ta WHERE ta.test_id = t.id)
  FROM public.tests t LEFT JOIN public.profiles p ON p.id = t.creator_id
  WHERE _q IS NULL OR _q = '' OR
    t.title ILIKE '%'||_q||'%' OR t.test_code ILIKE '%'||_q||'%'
  ORDER BY t.created_at DESC
  LIMIT GREATEST(_limit, 1);
END;
$$;

-- Admin: list all groups
CREATE OR REPLACE FUNCTION public.admin_list_groups(_q TEXT, _limit INT DEFAULT 50)
RETURNS TABLE(id UUID, name TEXT, access_code TEXT, creator_id UUID, creator_name TEXT, created_at TIMESTAMPTZ, member_count INT, test_count INT)
LANGUAGE PLPGSQL SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT g.id, g.name, g.access_code, g.creator_id, p.full_name, g.created_at,
    (SELECT COUNT(*)::INT FROM public.group_members gm WHERE gm.group_id = g.id),
    (SELECT COUNT(*)::INT FROM public.test_groups tg WHERE tg.group_id = g.id)
  FROM public.groups g LEFT JOIN public.profiles p ON p.id = g.creator_id
  WHERE _q IS NULL OR _q = '' OR
    g.name ILIKE '%'||_q||'%' OR g.access_code ILIKE '%'||_q||'%'
  ORDER BY g.created_at DESC
  LIMIT GREATEST(_limit, 1);
END;
$$;

-- Admin: toggle admin role for a user
CREATE OR REPLACE FUNCTION public.admin_toggle_admin(_user_id UUID)
RETURNS JSONB LANGUAGE PLPGSQL SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_exists BOOLEAN;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role='admin') INTO v_exists;
  IF v_exists THEN
    DELETE FROM public.user_roles WHERE user_id=_user_id AND role='admin';
    RETURN jsonb_build_object('ok', true, 'is_admin', false);
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'admin');
    RETURN jsonb_build_object('ok', true, 'is_admin', true);
  END IF;
END;
$$;

-- Admin: delete a user (cascades via auth)
CREATE OR REPLACE FUNCTION public.admin_delete_user(_user_id UUID)
RETURNS JSONB LANGUAGE PLPGSQL SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _user_id = auth.uid() THEN RAISE EXCEPTION 'cannot delete self'; END IF;
  DELETE FROM auth.users WHERE id = _user_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Admin: delete a test
CREATE OR REPLACE FUNCTION public.admin_delete_test(_test_id UUID)
RETURNS JSONB LANGUAGE PLPGSQL SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM public.tests WHERE id = _test_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Admin: delete a group
CREATE OR REPLACE FUNCTION public.admin_delete_group(_group_id UUID)
RETURNS JSONB LANGUAGE PLPGSQL SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM public.groups WHERE id = _group_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Recent activity feed
CREATE OR REPLACE FUNCTION public.admin_recent_activity(_limit INT DEFAULT 30)
RETURNS TABLE(kind TEXT, title TEXT, subtitle TEXT, at TIMESTAMPTZ)
LANGUAGE PLPGSQL SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  (SELECT 'user'::TEXT, COALESCE(p.full_name,'User'), '@'||p.username, p.created_at
     FROM public.profiles p ORDER BY p.created_at DESC LIMIT _limit)
  UNION ALL
  (SELECT 'test'::TEXT, t.title, 'kod: '||t.test_code, t.created_at
     FROM public.tests t ORDER BY t.created_at DESC LIMIT _limit)
  UNION ALL
  (SELECT 'group'::TEXT, g.name, g.access_code, g.created_at
     FROM public.groups g ORDER BY g.created_at DESC LIMIT _limit)
  UNION ALL
  (SELECT 'attempt'::TEXT, COALESCE(t.title,'?'), p.username||' — '||ta.score||'/'||ta.total_questions, ta.submitted_at
     FROM public.test_attempts ta
     LEFT JOIN public.tests t ON t.id=ta.test_id
     LEFT JOIN public.profiles p ON p.id=ta.user_id
     WHERE ta.status='completed' AND ta.submitted_at IS NOT NULL
     ORDER BY ta.submitted_at DESC LIMIT _limit)
  ORDER BY at DESC NULLS LAST
  LIMIT _limit;
END;
$$;
