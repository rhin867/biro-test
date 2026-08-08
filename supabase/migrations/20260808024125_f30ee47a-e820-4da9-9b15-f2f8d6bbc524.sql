
ALTER TABLE public.community_messages ADD COLUMN IF NOT EXISTS author_key text;

CREATE POLICY "Authors update own messages" ON public.community_messages
  FOR UPDATE TO anon, authenticated
  USING (author_key IS NOT NULL AND author_key = private.current_request_user_key())
  WITH CHECK (author_key IS NOT NULL AND author_key = private.current_request_user_key());

CREATE POLICY "Authors delete own messages" ON public.community_messages
  FOR DELETE TO anon, authenticated
  USING (author_key IS NOT NULL AND author_key = private.current_request_user_key());
