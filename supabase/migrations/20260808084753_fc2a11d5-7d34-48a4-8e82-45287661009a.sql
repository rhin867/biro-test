
-- Set up RLS policies for storage.objects
-- Policies for 'question-images'
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public read question-images" ON storage.objects;
    DROP POLICY IF EXISTS "Auth upload question-images" ON storage.objects;
END $$;

CREATE POLICY "Public read question-images" ON storage.objects
FOR SELECT USING (bucket_id = 'question-images');

CREATE POLICY "Auth upload question-images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'question-images');

-- Policies for 'biro-test-images'
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public read biro-test-images" ON storage.objects;
    DROP POLICY IF EXISTS "Auth upload biro-test-images" ON storage.objects;
END $$;

CREATE POLICY "Public read biro-test-images" ON storage.objects
FOR SELECT USING (bucket_id = 'biro-test-images');

CREATE POLICY "Auth upload biro-test-images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'biro-test-images');
