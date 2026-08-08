CREATE SCHEMA IF NOT EXISTS private;

-- Move has_role
ALTER FUNCTION public.has_role(uuid, public.app_role) SET SCHEMA private;

-- Move current_request_user_key
ALTER FUNCTION public.current_request_user_key() SET SCHEMA private;

-- handle_new_user should probably stay where it is but be revoked
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;

-- Update policies to use private schema functions
DROP POLICY IF EXISTS "Admins manage app_settings" ON public.app_settings;
CREATE POLICY "Admins manage app_settings" ON public.app_settings
  FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Anyone view own usage" ON public.test_creation_usage;
CREATE POLICY "Anyone view own usage" ON public.test_creation_usage
  FOR SELECT USING (user_key = private.current_request_user_key());

DROP POLICY IF EXISTS "Anyone insert own usage" ON public.test_creation_usage;
CREATE POLICY "Anyone insert own usage" ON public.test_creation_usage
  FOR INSERT WITH CHECK (user_key = private.current_request_user_key());

DROP POLICY IF EXISTS "Anyone update own usage" ON public.test_creation_usage;
CREATE POLICY "Anyone update own usage" ON public.test_creation_usage
  FOR UPDATE USING (user_key = private.current_request_user_key());

DROP POLICY IF EXISTS "Admins view all usage" ON public.test_creation_usage;
CREATE POLICY "Admins view all usage" ON public.test_creation_usage
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- Add policy for user_roles
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
CREATE POLICY "Users can view own role" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
