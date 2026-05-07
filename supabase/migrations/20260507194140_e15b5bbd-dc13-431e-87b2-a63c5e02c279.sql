-- Add one-way mode to tests
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS one_way_mode boolean NOT NULL DEFAULT false;

-- Add image_url to questions
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS image_url text;

-- Create question-images storage bucket (public for read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('question-images', 'question-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for question-images bucket
DROP POLICY IF EXISTS "Question images public read" ON storage.objects;
CREATE POLICY "Question images public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'question-images');

DROP POLICY IF EXISTS "Auth users upload question images to own folder" ON storage.objects;
CREATE POLICY "Auth users upload question images to own folder" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'question-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Auth users update own question images" ON storage.objects;
CREATE POLICY "Auth users update own question images" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'question-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Auth users delete own question images" ON storage.objects;
CREATE POLICY "Auth users delete own question images" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'question-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Enable realtime for group_messages
ALTER TABLE public.group_messages REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'group_messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages';
  END IF;
END $$;