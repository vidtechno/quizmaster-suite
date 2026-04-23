
-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- TESTS
CREATE TABLE public.tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  time_limit INTEGER NOT NULL DEFAULT 600, -- seconds
  random_enabled BOOLEAN NOT NULL DEFAULT false,
  is_public BOOLEAN NOT NULL DEFAULT true,
  access_code TEXT,
  max_attempts INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public tests viewable by everyone"
  ON public.tests FOR SELECT USING (is_public = true OR auth.uid() = creator_id);

CREATE POLICY "Authenticated users can view private tests for taking"
  ON public.tests FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create their own tests"
  ON public.tests FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their tests"
  ON public.tests FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete their tests"
  ON public.tests FOR DELETE USING (auth.uid() = creator_id);

CREATE INDEX idx_tests_creator ON public.tests(creator_id);
CREATE INDEX idx_tests_public ON public.tests(is_public) WHERE is_public = true;

-- QUESTIONS
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer_index INTEGER NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Anyone can read questions for tests they can see (needed for taking the test)
CREATE POLICY "Questions viewable for accessible tests"
  ON public.questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tests t
      WHERE t.id = questions.test_id
        AND (t.is_public = true OR t.creator_id = auth.uid() OR auth.uid() IS NOT NULL)
    )
  );

CREATE POLICY "Creators can insert questions"
  ON public.questions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.tests t WHERE t.id = test_id AND t.creator_id = auth.uid())
  );

CREATE POLICY "Creators can update questions"
  ON public.questions FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.tests t WHERE t.id = test_id AND t.creator_id = auth.uid())
  );

CREATE POLICY "Creators can delete questions"
  ON public.questions FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.tests t WHERE t.id = test_id AND t.creator_id = auth.uid())
  );

CREATE INDEX idx_questions_test ON public.questions(test_id);

-- RESULTS
CREATE TABLE public.results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  time_spent INTEGER NOT NULL, -- seconds
  answers_log JSONB NOT NULL DEFAULT '[]'::jsonb,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own results"
  ON public.results FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Test creators can view all results for their tests"
  ON public.results FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.tests t WHERE t.id = test_id AND t.creator_id = auth.uid())
  );

CREATE POLICY "Anyone can view results for public tests (leaderboard)"
  ON public.results FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.tests t WHERE t.id = test_id AND t.is_public = true)
  );

CREATE POLICY "Users can insert their own results"
  ON public.results FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_results_user ON public.results(user_id);
CREATE INDEX idx_results_test ON public.results(test_id);
CREATE INDEX idx_results_leaderboard ON public.results(test_id, score DESC, time_spent ASC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_tests_updated_at
  BEFORE UPDATE ON public.tests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup using metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, username, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.id::text),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
