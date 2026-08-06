-- Add image_url and question_type to hot_questions
ALTER TABLE public.hot_questions ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.hot_questions ADD COLUMN IF NOT EXISTS question_type TEXT DEFAULT 'mcq';

-- Allow public access to read images
CREATE POLICY "Public Read Access" ON storage.objects FOR SELECT TO public USING (bucket_id = 'test-images');
-- Allow authenticated users (admins) to upload/manage
CREATE POLICY "Auth Upload Access" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'test-images');
CREATE POLICY "Auth Manage Access" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'test-images');
CREATE POLICY "Auth Delete Access" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'test-images');
