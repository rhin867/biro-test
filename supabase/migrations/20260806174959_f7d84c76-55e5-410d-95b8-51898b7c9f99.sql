-- Grant public access to read from the new bucket
CREATE POLICY "Public Read Access 2026_Final" ON storage.objects FOR SELECT TO public USING (bucket_id = 'test-images-2026-final');

-- Grant authenticated users (admins) to upload/manage
CREATE POLICY "Auth Upload Access 2026_Final" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'test-images-2026-final');
CREATE POLICY "Auth Manage Access 2026_Final" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'test-images-2026-final');
CREATE POLICY "Auth Delete Access 2026_Final" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'test-images-2026-final');

-- Grant anon roles to read if needed for the dashboard
CREATE POLICY "Anon Read Access 2026_Final" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'test-images-2026-final');
