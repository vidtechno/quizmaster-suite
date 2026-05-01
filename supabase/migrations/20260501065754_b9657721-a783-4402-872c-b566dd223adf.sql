-- Allow public (anonymous) read access to tests so the test page works for guests
CREATE POLICY "Tests are publicly viewable"
ON public.tests
FOR SELECT
TO anon
USING (true);

-- Allow public read access to questions so guests can preview the test
CREATE POLICY "Questions are publicly viewable"
ON public.questions
FOR SELECT
TO anon
USING (true);

-- Public, sanitized profile view (no phone) for username lookups by group creators
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT id, username, full_name, avatar_url, bio, created_at
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO anon, authenticated;
