-- Try to create policies on the new bucket
-- This uses a more unique bucket name to avoid any potential global name collisions
CREATE POLICY "Public Read Access 2026_V2" ON storage.objects FOR SELECT TO public USING (bucket_id = 'test-images-2026');
CREATE POLICY "Auth Upload Access 2026_V2" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'test-images-2026');
CREATE POLICY "Auth Manage Access 2026_V2" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'test-images-2026');
CREATE POLICY "Auth Delete Access 2026_V2" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'test-images-2026');
CREATE POLICY "Anon Read Access 2026_V2" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'test-images-2026');
