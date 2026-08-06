-- Ensure the bucket exists and policies are applied
-- Note: supabase--storage_create_bucket should be used for bucket creation, 
-- but we repeat policies here to be safe and ensure they are attached to the right bucket.

DO $$
BEGIN
    -- This is just a safety check, ideally bucket creation is handled by the dedicated tool
    -- but we can't easily check for bucket existence in migrations without complex logic.
    NULL; 
END $$;

-- Storage policies for the 'test-images' bucket
-- Allow public access to read images
CREATE POLICY "Public Read Access 20260806" ON storage.objects FOR SELECT TO public USING (bucket_id = 'test-images');

-- Allow authenticated users to upload/manage
CREATE POLICY "Auth Upload Access 20260806" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'test-images');
CREATE POLICY "Auth Manage Access 20260806" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'test-images');
CREATE POLICY "Auth Delete Access 20260806" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'test-images');

-- Also ensure anon can read if the app uses it without auth
CREATE POLICY "Anon Read Access 20260806" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'test-images');
