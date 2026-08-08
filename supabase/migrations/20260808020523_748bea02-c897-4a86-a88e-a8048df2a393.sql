-- Storage policies for the 'biro-test-images' bucket
DO $policy$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Public Access'
  ) THEN
    CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'biro-test-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Public Upload'
  ) THEN
    CREATE POLICY "Public Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'biro-test-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Public Delete'
  ) THEN
    CREATE POLICY "Public Delete" ON storage.objects FOR DELETE USING (bucket_id = 'biro-test-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Public Update'
  ) THEN
    CREATE POLICY "Public Update" ON storage.objects FOR UPDATE USING (bucket_id = 'biro-test-images');
  END IF;
END
$policy$;

-- Ensure proper grants for hot_question_responses
GRANT ALL ON public.hot_question_responses TO anon, authenticated, service_role;
ALTER TABLE public.hot_question_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public select hot_question_responses" ON public.hot_question_responses;
CREATE POLICY "Public select hot_question_responses" ON public.hot_question_responses FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert hot_question_responses" ON public.hot_question_responses;
CREATE POLICY "Public insert hot_question_responses" ON public.hot_question_responses FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update hot_question_responses" ON public.hot_question_responses;
CREATE POLICY "Public update hot_question_responses" ON public.hot_question_responses FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public delete hot_question_responses" ON public.hot_question_responses;
CREATE POLICY "Public delete hot_question_responses" ON public.hot_question_responses FOR DELETE USING (true);
