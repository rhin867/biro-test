-- Ensure the column exists in hot_questions
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hot_questions' AND column_name = 'image_url') THEN
        ALTER TABLE public.hot_questions ADD COLUMN image_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hot_questions' AND column_name = 'question_type') THEN
        ALTER TABLE public.hot_questions ADD COLUMN question_type TEXT DEFAULT 'mcq';
    END IF;
END $$;

-- Update RLS for hot_questions
DROP POLICY IF EXISTS "Public read hot questions" ON public.hot_questions;
CREATE POLICY "Public read hot questions" ON public.hot_questions FOR SELECT TO authenticated, anon USING (true);

-- Allow public access to read/write images in biro-test-images via storage.objects
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'biro-test-images');

DROP POLICY IF EXISTS "Public Upload Access" ON storage.objects;
CREATE POLICY "Public Upload Access"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'biro-test-images');

DROP POLICY IF EXISTS "Public Update Access" ON storage.objects;
CREATE POLICY "Public Update Access"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'biro-test-images');

DROP POLICY IF EXISTS "Public Delete Access" ON storage.objects;
CREATE POLICY "Public Delete Access"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'biro-test-images');
