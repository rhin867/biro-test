-- Using a do block to avoid permission issues with broad ALTER TABLE statements on storage schema if possible,
-- but standard policy creation should work if scoped correctly.

-- Drop existing to ensure fresh application
DROP POLICY IF EXISTS "Public Admin Upload" ON storage.objects;
DROP POLICY IF EXISTS "Public Admin Update" ON storage.objects;
DROP POLICY IF EXISTS "Public Admin Select" ON storage.objects;
DROP POLICY IF EXISTS "Public Admin Delete" ON storage.objects;

-- Re-create policies
CREATE POLICY "Public Admin Upload" 
ON storage.objects FOR INSERT 
TO anon, authenticated
WITH CHECK (bucket_id = 'biro-test-images');

CREATE POLICY "Public Admin Update" 
ON storage.objects FOR UPDATE 
TO anon, authenticated
USING (bucket_id = 'biro-test-images');

CREATE POLICY "Public Admin Select" 
ON storage.objects FOR SELECT 
TO anon, authenticated
USING (bucket_id = 'biro-test-images');

CREATE POLICY "Public Admin Delete" 
ON storage.objects FOR DELETE 
TO anon, authenticated
USING (bucket_id = 'biro-test-images');
