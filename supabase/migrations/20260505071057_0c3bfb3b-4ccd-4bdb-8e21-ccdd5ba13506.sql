
-- 1. Group assignments
CREATE TABLE public.group_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL,
  test_id UUID NOT NULL,
  creator_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.group_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view assignments" ON public.group_assignments
FOR SELECT TO authenticated
USING (public.is_group_member(group_id, auth.uid()) OR public.is_group_creator(group_id, auth.uid()));

CREATE POLICY "Creators insert assignments" ON public.group_assignments
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = creator_id AND public.is_group_creator(group_id, auth.uid()));

CREATE POLICY "Creators update assignments" ON public.group_assignments
FOR UPDATE TO authenticated
USING (public.is_group_creator(group_id, auth.uid()))
WITH CHECK (public.is_group_creator(group_id, auth.uid()));

CREATE POLICY "Creators delete assignments" ON public.group_assignments
FOR DELETE TO authenticated
USING (public.is_group_creator(group_id, auth.uid()));

CREATE INDEX idx_group_assignments_group ON public.group_assignments(group_id);

-- 2. Group files
CREATE TABLE public.group_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL,
  uploader_id UUID NOT NULL,
  name TEXT NOT NULL,
  storage_path TEXT,
  url TEXT,
  size_bytes BIGINT,
  mime TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.group_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view files" ON public.group_files
FOR SELECT TO authenticated
USING (public.is_group_member(group_id, auth.uid()) OR public.is_group_creator(group_id, auth.uid()));

CREATE POLICY "Creators insert files" ON public.group_files
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = uploader_id AND public.is_group_creator(group_id, auth.uid()));

CREATE POLICY "Creators delete files" ON public.group_files
FOR DELETE TO authenticated
USING (public.is_group_creator(group_id, auth.uid()));

CREATE INDEX idx_group_files_group ON public.group_files(group_id);

-- 3. Storage bucket for group files
INSERT INTO storage.buckets (id, name, public) VALUES ('group-files', 'group-files', false)
ON CONFLICT (id) DO NOTHING;

-- Helper: is requesting user a member/creator of a group identified by first folder
CREATE OR REPLACE FUNCTION public.user_can_access_group_folder(_path TEXT, _uid UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id::text = split_part(_path, '/', 1)
      AND (g.creator_id = _uid OR public.is_group_member(g.id, _uid))
  );
$$;

CREATE POLICY "Group members read group files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'group-files' AND public.user_can_access_group_folder(name, auth.uid()));

CREATE POLICY "Group creators upload group files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'group-files' AND EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id::text = split_part(name, '/', 1) AND g.creator_id = auth.uid()
  )
);

CREATE POLICY "Group creators delete group files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'group-files' AND EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id::text = split_part(name, '/', 1) AND g.creator_id = auth.uid()
  )
);

-- 4. Per-question time
ALTER TABLE public.questions ADD COLUMN time_seconds INTEGER;
