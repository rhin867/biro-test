
-- 1. Remove bogus "admin" policies (any authenticated user)
DROP POLICY IF EXISTS "Admin can modify questions" ON public.hot_questions;
DROP POLICY IF EXISTS "Admin can modify responses" ON public.hot_question_responses;
DROP POLICY IF EXISTS "Admin can modify requests" ON public.folder_access_requests;
DROP POLICY IF EXISTS "Admin can modify shares" ON public.test_folder_shares;

-- 2. test_folder_shares: owner-scoped, no password hash exposure
DROP POLICY IF EXISTS "Folder share access" ON public.test_folder_shares;

REVOKE ALL ON public.test_folder_shares FROM anon, authenticated;
GRANT INSERT ON public.test_folder_shares TO anon, authenticated;
GRANT SELECT (id, folder_name, owner_user_key, shared_with_email, share_token, access_level, created_at)
  ON public.test_folder_shares TO anon, authenticated;
GRANT UPDATE (folder_name, shared_with_email, access_level, password_hash)
  ON public.test_folder_shares TO anon, authenticated;
GRANT DELETE ON public.test_folder_shares TO anon, authenticated;
GRANT ALL ON public.test_folder_shares TO service_role;

CREATE POLICY "Anyone can create a folder share"
  ON public.test_folder_shares FOR INSERT TO anon, authenticated
  WITH CHECK (owner_user_key = NULLIF(current_setting('request.headers', true)::jsonb->>'x-user-key',''));

CREATE POLICY "Owner or invited can read share"
  ON public.test_folder_shares FOR SELECT TO anon, authenticated
  USING (
    owner_user_key = NULLIF(current_setting('request.headers', true)::jsonb->>'x-user-key','')
    OR share_token = NULLIF(current_setting('request.headers', true)::jsonb->>'x-share-token','')
  );

CREATE POLICY "Owner can update share"
  ON public.test_folder_shares FOR UPDATE TO anon, authenticated
  USING (owner_user_key = NULLIF(current_setting('request.headers', true)::jsonb->>'x-user-key',''))
  WITH CHECK (owner_user_key = NULLIF(current_setting('request.headers', true)::jsonb->>'x-user-key',''));

CREATE POLICY "Owner can delete share"
  ON public.test_folder_shares FOR DELETE TO anon, authenticated
  USING (owner_user_key = NULLIF(current_setting('request.headers', true)::jsonb->>'x-user-key',''));

-- 3. folder_access_requests: requester or folder owner only
DROP POLICY IF EXISTS "Folder access request" ON public.folder_access_requests;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.folder_access_requests TO anon, authenticated;
GRANT ALL ON public.folder_access_requests TO service_role;

CREATE POLICY "Anyone can request access"
  ON public.folder_access_requests FOR INSERT TO anon, authenticated
  WITH CHECK (requester_user_key = NULLIF(current_setting('request.headers', true)::jsonb->>'x-user-key',''));

CREATE POLICY "Requester or folder owner can read requests"
  ON public.folder_access_requests FOR SELECT TO anon, authenticated
  USING (
    requester_user_key = NULLIF(current_setting('request.headers', true)::jsonb->>'x-user-key','')
    OR EXISTS (
      SELECT 1 FROM public.test_folder_shares s
      WHERE s.id = folder_share_id
        AND s.owner_user_key = NULLIF(current_setting('request.headers', true)::jsonb->>'x-user-key','')
    )
  );

CREATE POLICY "Folder owner can decide requests"
  ON public.folder_access_requests FOR UPDATE TO anon, authenticated
  USING (EXISTS (
      SELECT 1 FROM public.test_folder_shares s
      WHERE s.id = folder_share_id
        AND s.owner_user_key = NULLIF(current_setting('request.headers', true)::jsonb->>'x-user-key','')
  ))
  WITH CHECK (EXISTS (
      SELECT 1 FROM public.test_folder_shares s
      WHERE s.id = folder_share_id
        AND s.owner_user_key = NULLIF(current_setting('request.headers', true)::jsonb->>'x-user-key','')
  ));

CREATE POLICY "Requester or folder owner can delete requests"
  ON public.folder_access_requests FOR DELETE TO anon, authenticated
  USING (
    requester_user_key = NULLIF(current_setting('request.headers', true)::jsonb->>'x-user-key','')
    OR EXISTS (
      SELECT 1 FROM public.test_folder_shares s
      WHERE s.id = folder_share_id
        AND s.owner_user_key = NULLIF(current_setting('request.headers', true)::jsonb->>'x-user-key','')
    )
  );

-- 4. public_tests: keep owner-only reads, make sure password is never selectable by clients
REVOKE ALL ON public.public_tests FROM anon, authenticated;
GRANT SELECT (id, test_id, name, subjects, question_count, duration, total_marks, test_data, owner_id, owner_name, attempts_count, created_at)
  ON public.public_tests TO authenticated;
GRANT ALL ON public.public_tests TO service_role;

-- 5. Storage: private buckets no longer writable/deletable by anonymous visitors
DROP POLICY IF EXISTS "Public Manage Access Biro Private" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete Access Biro Private" ON storage.objects;
DROP POLICY IF EXISTS "Public Manage Access 2026_Final Private" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete Access 2026_Final Private" ON storage.objects;

CREATE POLICY "Auth manage biro private"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'biro-images-private') WITH CHECK (bucket_id = 'biro-images-private');
CREATE POLICY "Auth delete biro private"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'biro-images-private');
CREATE POLICY "Auth manage 2026 final private"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'test-images-2026-final-private') WITH CHECK (bucket_id = 'test-images-2026-final-private');
CREATE POLICY "Auth delete 2026 final private"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'test-images-2026-final-private');

-- 6. SECURITY DEFINER functions not callable from the API
REVOKE ALL ON FUNCTION public.current_request_user_key() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
