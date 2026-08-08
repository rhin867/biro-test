-- 1. Private buckets: remove bucket-only policies, enforce owner scoping
DROP POLICY IF EXISTS "Public Read Access Biro Private" ON storage.objects;
DROP POLICY IF EXISTS "Public Manage Access Biro Private" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload Access Biro Private" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete Access Biro Private" ON storage.objects;
DROP POLICY IF EXISTS "Auth manage biro private" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete biro private" ON storage.objects;
DROP POLICY IF EXISTS "Auth manage 2026 final private" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete 2026 final private" ON storage.objects;
DROP POLICY IF EXISTS "Public Read Access 2026 Final Private" ON storage.objects;
DROP POLICY IF EXISTS "Public Manage Access 2026 Final Private" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload Access 2026 Final Private" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete Access 2026 Final Private" ON storage.objects;

DROP POLICY IF EXISTS "Owners update private buckets" ON storage.objects;
CREATE POLICY "Owners update private buckets" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id IN ('biro-images-private','test-images-2026-final-private') AND owner = auth.uid())
  WITH CHECK (bucket_id IN ('biro-images-private','test-images-2026-final-private') AND owner = auth.uid());

DROP POLICY IF EXISTS "Owners delete private buckets" ON storage.objects;
CREATE POLICY "Owners delete private buckets" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id IN ('biro-images-private','test-images-2026-final-private') AND owner = auth.uid());

-- 2. Public image buckets: keep read + upload, remove open overwrite/delete
DROP POLICY IF EXISTS "Public Admin Update" ON storage.objects;
DROP POLICY IF EXISTS "Public Admin Delete" ON storage.objects;
DROP POLICY IF EXISTS "Public Update Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Update question-images" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete question-images" ON storage.objects;
DROP POLICY IF EXISTS "Public Update biro-test-images" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete biro-test-images" ON storage.objects;

-- 3. Hide the quiz answer key from client roles (served via edge function instead)
REVOKE SELECT ON public.hot_questions FROM anon, authenticated;
GRANT SELECT (id, content, created_at, options, image_url, question_type, type)
  ON public.hot_questions TO anon, authenticated;
GRANT ALL ON public.hot_questions TO service_role;

-- 4. Hide password columns from client roles
REVOKE SELECT ON public.public_tests FROM anon, authenticated;
GRANT SELECT (id, test_id, name, subjects, question_count, duration, total_marks,
              owner_id, owner_name, attempts_count, created_at)
  ON public.public_tests TO anon, authenticated;
GRANT ALL ON public.public_tests TO service_role;

REVOKE SELECT ON public.test_folder_shares FROM anon, authenticated;
GRANT SELECT (id, folder_name, owner_user_key, shared_with_email, share_token, access_level, created_at)
  ON public.test_folder_shares TO anon, authenticated;
GRANT ALL ON public.test_folder_shares TO service_role;

-- 5. SECURITY DEFINER functions must not be callable from exposed API roles
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;