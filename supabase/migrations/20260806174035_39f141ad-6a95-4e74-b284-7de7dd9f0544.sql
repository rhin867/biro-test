-- Fix permissions for storage objects if needed, although usually handled by Supabase storage roles.
-- Ensure we have grants for the Data API to work with public.hot_questions if not already there
GRANT ALL ON public.hot_questions TO service_role;
GRANT SELECT, INSERT ON public.hot_questions TO authenticated;
GRANT SELECT ON public.hot_questions TO anon;
