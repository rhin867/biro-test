-- Ensure storage bucket exists
-- Note: bucket creation via SQL might fail if extensions/policies aren't right, 
-- but ensuring columns exist is critical.

-- Fix for hot_questions table
ALTER TABLE public.hot_questions ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.hot_questions ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'mcq';
ALTER TABLE public.hot_questions ADD COLUMN IF NOT EXISTS question_type TEXT DEFAULT 'mcq';

-- Fix for hot_question_responses table
ALTER TABLE public.hot_question_responses ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.hot_question_responses ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0;
ALTER TABLE public.hot_question_responses ADD COLUMN IF NOT EXISTS downvotes INTEGER DEFAULT 0;
ALTER TABLE public.hot_question_responses ADD COLUMN IF NOT EXISTS liked_by UUID[] DEFAULT '{}';
ALTER TABLE public.hot_question_responses ADD COLUMN IF NOT EXISTS disliked_by UUID[] DEFAULT '{}';
ALTER TABLE public.hot_question_responses ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.hot_question_responses(id) ON DELETE CASCADE;

-- Update RLS for storage (if possible via migration on this project)
-- We use biro-test-images bucket

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hot_questions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hot_questions TO service_role;
GRANT SELECT ON public.hot_questions TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hot_question_responses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hot_question_responses TO service_role;
GRANT SELECT ON public.hot_question_responses TO anon;

