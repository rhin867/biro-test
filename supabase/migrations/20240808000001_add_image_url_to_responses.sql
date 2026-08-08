-- Add image_url column to hot_question_responses if it doesn't exist
ALTER TABLE public.hot_question_responses ADD COLUMN IF NOT EXISTS image_url text;

-- Add is_banned column to profiles to support community moderation
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned boolean DEFAULT false;

-- Grant access
GRANT UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
