-- 1. GROUPS TABLE
CREATE TABLE public.groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- 2. ADD group_id TO TESTS (must come before policies/indexes that reference it)
ALTER TABLE public.tests
  ADD COLUMN group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL;

-- 3. GROUPS POLICIES
CREATE POLICY "Creators can view their own groups"
  ON public.groups FOR SELECT
  USING (auth.uid() = creator_id);

CREATE POLICY "Authenticated users can view linked groups"
  ON public.groups FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tests t WHERE t.group_id = groups.id));

CREATE POLICY "Users can create their own groups"
  ON public.groups FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their own groups"
  ON public.groups FOR UPDATE
  USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete their own groups"
  ON public.groups FOR DELETE
  USING (auth.uid() = creator_id);

CREATE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_groups_creator_id ON public.groups(creator_id);
CREATE INDEX idx_tests_group_id ON public.tests(group_id);

-- 4. One private test per group (public exempt)
CREATE UNIQUE INDEX idx_tests_one_active_per_group
  ON public.tests(group_id)
  WHERE group_id IS NOT NULL AND is_public = false;

-- 5. ACCESS CODE GENERATOR
CREATE OR REPLACE FUNCTION public.generate_access_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code TEXT;
  i INT;
  attempt INT := 0;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..8 LOOP
      code := code || substr(chars, (floor(random() * length(chars)) + 1)::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.tests WHERE access_code = code);
    attempt := attempt + 1;
    IF attempt > 10 THEN
      RAISE EXCEPTION 'Could not generate unique access code';
    END IF;
  END LOOP;
  RETURN code;
END;
$$;

-- 6. ARCHIVE FLAG ON RESULTS
ALTER TABLE public.results
  ADD COLUMN archived BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX idx_results_test_archived ON public.results(test_id, archived);

DROP POLICY IF EXISTS "Anyone can view results for public tests (leaderboard)" ON public.results;
CREATE POLICY "Anyone can view non-archived public test results"
  ON public.results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tests t
      WHERE t.id = results.test_id AND t.is_public = true
    )
    AND archived = false
  );

-- 7. PRIVACY TRANSITION TRIGGER
CREATE OR REPLACE FUNCTION public.handle_test_privacy_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.is_public = true AND NEW.is_public = false THEN
    UPDATE public.results SET archived = true
      WHERE test_id = NEW.id AND archived = false;
  END IF;
  IF OLD.is_public = false AND NEW.is_public = true THEN
    UPDATE public.results SET archived = false
      WHERE test_id = NEW.id AND archived = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_test_privacy_transition
  AFTER UPDATE OF is_public ON public.tests
  FOR EACH ROW
  WHEN (OLD.is_public IS DISTINCT FROM NEW.is_public)
  EXECUTE FUNCTION public.handle_test_privacy_transition();
