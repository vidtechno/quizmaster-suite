
-- =========================================================
-- MegaPanel.uz feature migration
-- =========================================================

-- 1) Questions: add explanation + cached error_rate fields
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS explanation text,
  ADD COLUMN IF NOT EXISTS error_rate numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS attempts_count integer NOT NULL DEFAULT 0;

-- 2) Profiles: bio + avatar_url for profile editing
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- 3) RPC to recompute difficulty stats for one test based on test_attempts.answers_log.
-- Difficulty is "Yangi" if attempts_count < 5, else from error_rate:
--   <0.30 -> Oson, 0.30-0.60 -> O'rta, >0.60 -> Qiyin (computed in UI).
CREATE OR REPLACE FUNCTION public.recompute_question_stats(_test_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  WITH log_rows AS (
    SELECT
      (elem->>'question_id')::uuid AS question_id,
      (elem->>'is_correct')::boolean AS is_correct
    FROM public.test_attempts ta
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(ta.answers_log) = 'array'
           THEN ta.answers_log
           ELSE '[]'::jsonb END
    ) AS elem
    WHERE ta.test_id = _test_id
      AND ta.status = 'completed'
  ),
  agg AS (
    SELECT
      question_id,
      COUNT(*)::int AS total,
      SUM(CASE WHEN is_correct THEN 0 ELSE 1 END)::numeric AS wrong
    FROM log_rows
    WHERE question_id IS NOT NULL
    GROUP BY question_id
  )
  UPDATE public.questions q
     SET attempts_count = COALESCE(a.total, 0),
         error_rate     = CASE WHEN COALESCE(a.total, 0) = 0 THEN 0
                               ELSE ROUND((a.wrong / a.total)::numeric, 4) END
    FROM (SELECT question_id, total, wrong FROM agg) a
   WHERE q.id = a.question_id
     AND q.test_id = _test_id;
END;
$$;

-- 4) Storage bucket for avatars (public read so they render in <img>)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 5) Storage policies: per-user folder uploads (owner = auth.uid())
DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;
CREATE POLICY "Avatars are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users upload their own avatar" ON storage.objects;
CREATE POLICY "Users upload their own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users update their own avatar" ON storage.objects;
CREATE POLICY "Users update their own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users delete their own avatar" ON storage.objects;
CREATE POLICY "Users delete their own avatar"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
