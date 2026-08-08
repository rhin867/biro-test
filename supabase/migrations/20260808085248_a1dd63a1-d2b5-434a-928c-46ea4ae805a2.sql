
-- 1. hot_questions: remove the fully permissive policy
DROP POLICY IF EXISTS "Allow management for all" ON public.hot_questions;

-- 2. biro-test-images: remove all public/anon policies (owner-scoped ones remain)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Admin Select" ON storage.objects;
DROP POLICY IF EXISTS "Public Admin Upload" ON storage.objects;
DROP POLICY IF EXISTS "Public Admin Update" ON storage.objects;
DROP POLICY IF EXISTS "Public Admin Delete" ON storage.objects;
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Update" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete" ON storage.objects;
DROP POLICY IF EXISTS "Public Update Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Read biro-test-images" ON storage.objects;
DROP POLICY IF EXISTS "Public read biro-test-images" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload biro-test-images" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload biro-test-images" ON storage.objects;

-- 3. Private buckets: ensure no public policies linger
DROP POLICY IF EXISTS "Public Read Access Private" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload Access Private" ON storage.objects;
DROP POLICY IF EXISTS "Public Update Access Private" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete Access Private" ON storage.objects;

-- 4. SECURITY DEFINER / trigger functions: not callable via API
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
