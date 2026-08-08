-- 1. Create the App Role enum
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
    END IF;
END $$;

-- 2. Create the user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL,
    UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Create/Update security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- 4. Apply policies to app_settings
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admins manage app_settings" ON public.app_settings;

CREATE POLICY "Public read app_settings" ON public.app_settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anon read app_settings" ON public.app_settings
  FOR SELECT TO anon USING (true);

CREATE POLICY "Admins manage app_settings" ON public.app_settings
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 5. Apply policies to test_creation_usage
ALTER TABLE public.test_creation_usage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own usage" ON public.test_creation_usage;
DROP POLICY IF EXISTS "Users update own usage" ON public.test_creation_usage;
DROP POLICY IF EXISTS "Admins view all usage" ON public.test_creation_usage;
DROP POLICY IF EXISTS "Anyone view own usage" ON public.test_creation_usage;
DROP POLICY IF EXISTS "Anyone insert own usage" ON public.test_creation_usage;
DROP POLICY IF EXISTS "Anyone update own usage" ON public.test_creation_usage;

-- Use the current_request_user_key() function to track by user_key (supports non-auth)
CREATE POLICY "Anyone view own usage" ON public.test_creation_usage
  FOR SELECT USING (user_key = public.current_request_user_key());

CREATE POLICY "Anyone insert own usage" ON public.test_creation_usage
  FOR INSERT WITH CHECK (user_key = public.current_request_user_key());

CREATE POLICY "Anyone update own usage" ON public.test_creation_usage
  FOR UPDATE USING (user_key = public.current_request_user_key());

CREATE POLICY "Admins view all usage" ON public.test_creation_usage
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 6. Ensure GRANTs exist
GRANT SELECT ON public.app_settings TO authenticated, anon;
GRANT ALL ON public.app_settings TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.test_creation_usage TO authenticated, anon;
GRANT ALL ON public.test_creation_usage TO service_role;
