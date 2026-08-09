-- Remove permissive public policies on private buckets (if still present)
DROP POLICY IF EXISTS "Public Read Access Biro Private" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload Access Biro Private" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete Access Biro Private" ON storage.objects;
DROP POLICY IF EXISTS "Public Manage Access Biro Private" ON storage.objects;
DROP POLICY IF EXISTS "Public Read Access 2026 Final Private" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload Access 2026 Final Private" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete Access 2026 Final Private" ON storage.objects;
DROP POLICY IF EXISTS "Public Manage Access 2026 Final Private" ON storage.objects;

-- Remove redundant permissive policies that bypass ownership on biro-test-images
DROP POLICY IF EXISTS "Public Upload" ON storage.objects;
DROP POLICY IF EXISTS "Public Update" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete" ON storage.objects;
DROP POLICY IF EXISTS "Public Admin Upload" ON storage.objects;
DROP POLICY IF EXISTS "Public Admin Update" ON storage.objects;
DROP POLICY IF EXISTS "Public Admin Delete" ON storage.objects;

-- question-images: remove open write access, keep public read
DROP POLICY IF EXISTS "Public Upload question-images" ON storage.objects;
DROP POLICY IF EXISTS "Public Update question-images" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete question-images" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload question-images" ON storage.objects;
DROP POLICY IF EXISTS "Public read question-images" ON storage.objects;

CREATE POLICY "Owners upload question-images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'question-images' AND owner = auth.uid());

CREATE POLICY "Owners update question-images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'question-images' AND owner = auth.uid())
WITH CHECK (bucket_id = 'question-images' AND owner = auth.uid());

CREATE POLICY "Owners delete question-images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'question-images' AND owner = auth.uid());

-- SECURITY DEFINER trigger function must not be callable via the API
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;