-- Remove orphaned/legacy public storage policies for buckets that no longer exist
DROP POLICY IF EXISTS "Anon Read Access 20260806" ON storage.objects;
DROP POLICY IF EXISTS "Anon Read Access 2026_Final" ON storage.objects;
DROP POLICY IF EXISTS "Anon Read Access 2026_V2" ON storage.objects;
DROP POLICY IF EXISTS "Public Read Access 20260806" ON storage.objects;
DROP POLICY IF EXISTS "Public Read Access 2026_Final" ON storage.objects;
DROP POLICY IF EXISTS "Public Read Access 2026_V2" ON storage.objects;
DROP POLICY IF EXISTS "Auth Delete Access" ON storage.objects;
DROP POLICY IF EXISTS "Auth Delete Access 20260806" ON storage.objects;
DROP POLICY IF EXISTS "Auth Delete Access 2026_Final" ON storage.objects;
DROP POLICY IF EXISTS "Auth Delete Access 2026_V2" ON storage.objects;
DROP POLICY IF EXISTS "Auth Manage Access" ON storage.objects;
DROP POLICY IF EXISTS "Auth Manage Access 20260806" ON storage.objects;
DROP POLICY IF EXISTS "Auth Manage Access 2026_Final" ON storage.objects;
DROP POLICY IF EXISTS "Auth Manage Access 2026_V2" ON storage.objects;
DROP POLICY IF EXISTS "Auth Upload Access" ON storage.objects;
DROP POLICY IF EXISTS "Auth Upload Access 20260806" ON storage.objects;
DROP POLICY IF EXISTS "Auth Upload Access 2026_Final" ON storage.objects;
DROP POLICY IF EXISTS "Auth Upload Access 2026_V2" ON storage.objects;

-- Explicitly drop any lingering permissive public write policies (idempotent safety)
DROP POLICY IF EXISTS "Public Upload question-images" ON storage.objects;
DROP POLICY IF EXISTS "Public Update question-images" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete question-images" ON storage.objects;
DROP POLICY IF EXISTS "Public Read question-images" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Admin Delete" ON storage.objects;
DROP POLICY IF EXISTS "Public Update" ON storage.objects;
DROP POLICY IF EXISTS "Public Update Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Read Access Biro Private" ON storage.objects;
DROP POLICY IF EXISTS "Public Read Access 2026_Final Private" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload Access Biro Private" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload Access 2026_Final Private" ON storage.objects;
DROP POLICY IF EXISTS "Public Manage Access Biro Private" ON storage.objects;
DROP POLICY IF EXISTS "Public Manage Access 2026_Final Private" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete Access Biro Private" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete Access 2026_Final Private" ON storage.objects;

-- Owner-scoped read for question-images (bucket is private; use signed URLs)
DROP POLICY IF EXISTS "Owners read question-images" ON storage.objects;
CREATE POLICY "Owners read question-images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'question-images' AND owner = auth.uid());

DROP POLICY IF EXISTS "Owners read biro-test-images" ON storage.objects;
CREATE POLICY "Owners read biro-test-images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'biro-test-images' AND owner = auth.uid());

-- Lock down SECURITY DEFINER trigger functions from direct API execution
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;