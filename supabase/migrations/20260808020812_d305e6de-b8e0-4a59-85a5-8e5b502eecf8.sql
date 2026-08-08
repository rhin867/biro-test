-- Add downvotes, disliked_by and nested replies support to hot_question_responses
ALTER TABLE public.hot_question_responses ADD COLUMN IF NOT EXISTS downvotes INTEGER DEFAULT 0;
ALTER TABLE public.hot_question_responses ADD COLUMN IF NOT EXISTS disliked_by TEXT[] DEFAULT '{}';

-- Fix liked_by type if it was UUID[] (standardize on TEXT[] for user_key consistency)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'hot_question_responses' 
        AND column_name = 'liked_by' 
        AND data_type = 'ARRAY'
    ) THEN
        ALTER TABLE public.hot_question_responses ALTER COLUMN liked_by TYPE TEXT[] USING liked_by::TEXT[];
    END IF;
END $$;

-- Ensure grants are complete for real-time engagement
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hot_question_responses TO authenticated, anon;
GRANT ALL ON public.hot_question_responses TO service_role;

-- Ensure notifications are fully accessible
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated, anon;
GRANT ALL ON public.notifications TO service_role;
