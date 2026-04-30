-- Add explicit creator SELECT policy on tests so newly inserted tests can be read back immediately
CREATE POLICY "Creators can view their own tests"
ON public.tests
FOR SELECT
TO authenticated
USING (auth.uid() = creator_id);

-- Ensure questions can be selected by their test creator (in addition to existing view policy)
CREATE POLICY "Creators can view their own questions"
ON public.questions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tests t
    WHERE t.id = questions.test_id
      AND t.creator_id = auth.uid()
  )
);
