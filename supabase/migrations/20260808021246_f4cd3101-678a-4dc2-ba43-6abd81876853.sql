-- Now try to set up the policies again since we have permissions
BEGIN;

-- Select policy
DROP POLICY IF EXISTS "Public Select Biro" ON storage.objects;
CREATE POLICY "Public Select Biro" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'biro-test-images');

-- Insert policy
DROP POLICY IF EXISTS "Public Insert Biro" ON storage.objects;
CREATE POLICY "Public Insert Biro" 
ON storage.objects FOR INSERT 
TO public 
WITH CHECK (bucket_id = 'biro-test-images');

-- Update/Delete policies
DROP POLICY IF EXISTS "Public Update Biro" ON storage.objects;
CREATE POLICY "Public Update Biro" 
ON storage.objects FOR UPDATE 
TO public 
USING (bucket_id = 'biro-test-images');

DROP POLICY IF EXISTS "Public Delete Biro" ON storage.objects;
CREATE POLICY "Public Delete Biro" 
ON storage.objects FOR DELETE 
TO public 
USING (bucket_id = 'biro-test-images');

COMMIT;
