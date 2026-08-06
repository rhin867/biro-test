-- Policies for the private buckets to allow public access (workaround for public_buckets_blocked)
DROP POLICY IF EXISTS "Public Read Access Biro Private" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload Access Biro Private" ON storage.objects;
DROP POLICY IF EXISTS "Public Manage Access Biro Private" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete Access Biro Private" ON storage.objects;

CREATE POLICY "Public Read Access Biro Private" ON storage.objects FOR SELECT TO public USING (bucket_id = 'biro-images-private');
CREATE POLICY "Public Upload Access Biro Private" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'biro-images-private');
CREATE POLICY "Public Manage Access Biro Private" ON storage.objects FOR UPDATE TO public USING (bucket_id = 'biro-images-private');
CREATE POLICY "Public Delete Access Biro Private" ON storage.objects FOR DELETE TO public USING (bucket_id = 'biro-images-private');

DROP POLICY IF EXISTS "Public Read Access 2026_Final Private" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload Access 2026_Final Private" ON storage.objects;
DROP POLICY IF EXISTS "Public Manage Access 2026_Final Private" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete Access 2026_Final Private" ON storage.objects;

CREATE POLICY "Public Read Access 2026_Final Private" ON storage.objects FOR SELECT TO public USING (bucket_id = 'test-images-2026-final-private');
CREATE POLICY "Public Upload Access 2026_Final Private" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'test-images-2026-final-private');
CREATE POLICY "Public Manage Access 2026_Final Private" ON storage.objects FOR UPDATE TO public USING (bucket_id = 'test-images-2026-final-private');
CREATE POLICY "Public Delete Access 2026_Final Private" ON storage.objects FOR DELETE TO public USING (bucket_id = 'test-images-2026-final-private');

-- Update hot_questions table if needed
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'hot_questions' AND COLUMN_NAME = 'image_url') THEN
        ALTER TABLE public.hot_questions ADD COLUMN image_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'hot_questions' AND COLUMN_NAME = 'question_type') THEN
        ALTER TABLE public.hot_questions ADD COLUMN question_type TEXT DEFAULT 'mcq';
    END IF;
END $$;
