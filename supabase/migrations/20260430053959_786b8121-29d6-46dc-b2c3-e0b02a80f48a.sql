-- Remove overly permissive public read policy on profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Authenticated users can read profiles (needed for leaderboards, group member display, attempts)
-- Phone numbers remain hidden from anonymous/unauthenticated callers.
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Owners can always view their own profile (covers anon edge cases)
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);