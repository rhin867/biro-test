
DROP POLICY IF EXISTS "Anyone can read public tests" ON public.public_tests;
CREATE POLICY "Owners can read their public tests"
  ON public.public_tests FOR SELECT
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Anyone can update messages" ON public.community_messages;

CREATE POLICY "Users can delete their own attempts"
  ON public.test_attempts FOR DELETE
  USING (auth.uid() = user_id);

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.current_request_user_key() FROM PUBLIC, anon, authenticated;
