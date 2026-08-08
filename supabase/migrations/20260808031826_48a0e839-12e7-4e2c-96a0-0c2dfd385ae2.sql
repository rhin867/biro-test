-- Policy: Allow anyone to read from 'question-images' bucket
DROP POLICY IF EXISTS "Public Read question-images" ON storage.objects;
CREATE POLICY "Public Read question-images" ON storage.objects FOR SELECT USING (bucket_id = 'question-images');

-- Policy: Allow all users to upload to 'question-images' bucket
DROP POLICY IF EXISTS "Public Upload question-images" ON storage.objects;
CREATE POLICY "Public Upload question-images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'question-images');
DROP POLICY IF EXISTS "Public Update question-images" ON storage.objects;
CREATE POLICY "Public Update question-images" ON storage.objects FOR UPDATE WITH CHECK (bucket_id = 'question-images');
DROP POLICY IF EXISTS "Public Delete question-images" ON storage.objects;
CREATE POLICY "Public Delete question-images" ON storage.objects FOR DELETE USING (bucket_id = 'question-images');

-- Also ensure the biro-test-images bucket is public and accessible as fallback
DROP POLICY IF EXISTS "Public Read biro-test-images" ON storage.objects;
CREATE POLICY "Public Read biro-test-images" ON storage.objects FOR SELECT USING (bucket_id = 'biro-test-images');
DROP POLICY IF EXISTS "Public Upload biro-test-images" ON storage.objects;
CREATE POLICY "Public Upload biro-test-images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'biro-test-images');
DROP POLICY IF EXISTS "Public Update biro-test-images" ON storage.objects;
CREATE POLICY "Public Update biro-test-images" ON storage.objects FOR UPDATE WITH CHECK (bucket_id = 'biro-test-images');
DROP POLICY IF EXISTS "Public Delete biro-test-images" ON storage.objects;
CREATE POLICY "Public Delete biro-test-images" ON storage.objects FOR DELETE USING (bucket_id = 'biro-test-images');
