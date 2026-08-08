
-- 1. app_settings: remove blanket public read
DROP POLICY IF EXISTS "Anon read app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Public read app_settings" ON public.app_settings;
REVOKE SELECT ON public.app_settings FROM anon;

-- 2. hot_questions: admin-only writes
DROP POLICY IF EXISTS "Public delete hot questions" ON public.hot_questions;
DROP POLICY IF EXISTS "Public insert hot questions" ON public.hot_questions;
DROP POLICY IF EXISTS "Public update hot questions" ON public.hot_questions;
CREATE POLICY "Admins manage hot questions" ON public.hot_questions
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

-- 3. hot_question_responses: ownership-scoped writes
DROP POLICY IF EXISTS "Public delete hot_question_responses" ON public.hot_question_responses;
DROP POLICY IF EXISTS "Public update hot_question_responses" ON public.hot_question_responses;
DROP POLICY IF EXISTS "Anyone can insert responses" ON public.hot_question_responses;
DROP POLICY IF EXISTS "Public insert hot_question_responses" ON public.hot_question_responses;
CREATE POLICY "Insert own response" ON public.hot_question_responses
  FOR INSERT TO anon, authenticated
  WITH CHECK (user_key = private.current_request_user_key());
CREATE POLICY "Update own response" ON public.hot_question_responses
  FOR UPDATE TO anon, authenticated
  USING (user_key = private.current_request_user_key())
  WITH CHECK (user_key = private.current_request_user_key());
CREATE POLICY "Delete own response" ON public.hot_question_responses
  FOR DELETE TO anon, authenticated
  USING (user_key = private.current_request_user_key());

-- 4. notifications: scope to requester's user key
DROP POLICY IF EXISTS "Anyone can manage their own notifications via user_key" ON public.notifications;
CREATE POLICY "Read own notifications" ON public.notifications
  FOR SELECT TO anon, authenticated
  USING (user_key = private.current_request_user_key());
CREATE POLICY "Update own notifications" ON public.notifications
  FOR UPDATE TO anon, authenticated
  USING (user_key = private.current_request_user_key())
  WITH CHECK (user_key = private.current_request_user_key());
CREATE POLICY "Delete own notifications" ON public.notifications
  FOR DELETE TO anon, authenticated
  USING (user_key = private.current_request_user_key());

-- 5. Revoke EXECUTE on SECURITY DEFINER trigger function in exposed schema
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- 6. Storage: remove wide-open public write/read policies
DROP POLICY IF EXISTS "Public Upload" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete" ON storage.objects;
DROP POLICY IF EXISTS "Public Update" ON storage.objects;
DROP POLICY IF EXISTS "Public Insert Biro" ON storage.objects;
DROP POLICY IF EXISTS "Public Update Biro" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete Biro" ON storage.objects;
DROP POLICY IF EXISTS "Public Select Biro" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload Access Biro Private" ON storage.objects;
DROP POLICY IF EXISTS "Public Read Access Biro Private" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload Access 2026_Final Private" ON storage.objects;
DROP POLICY IF EXISTS "Public Read Access 2026_Final Private" ON storage.objects;

CREATE POLICY "Authenticated upload biro-test-images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'biro-test-images' AND owner = auth.uid());
CREATE POLICY "Owners update biro-test-images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'biro-test-images' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'biro-test-images' AND owner = auth.uid());
CREATE POLICY "Owners delete biro-test-images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'biro-test-images' AND owner = auth.uid());

CREATE POLICY "Owners read biro private" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id IN ('biro-images-private','test-images-2026-final-private') AND owner = auth.uid());
CREATE POLICY "Owners write biro private" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('biro-images-private','test-images-2026-final-private') AND owner = auth.uid());
