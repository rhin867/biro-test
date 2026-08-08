-- Revoke execute from public on all security definer functions
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;

-- Grant execute to specific roles if needed for policies
-- Actually, policies can call functions if the owner has permission, 
-- but in Supabase, the user needs EXECUTE permission if the policy is evaluated.
-- Let's grant to service_role and authenticated (since they call it in policies).
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- For current_request_user_key, it might not be SECURITY DEFINER, 
-- but let's be safe if it is.
REVOKE EXECUTE ON FUNCTION public.current_request_user_key() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_request_user_key() TO authenticated, anon, service_role;
