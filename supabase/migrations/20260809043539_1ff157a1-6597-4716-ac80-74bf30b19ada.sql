
-- Add image_url to hot_questions if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hot_questions' AND column_name = 'image_url') THEN
        ALTER TABLE public.hot_questions ADD COLUMN image_url TEXT;
    END IF;
END $$;

-- Add question_type and type to hot_questions if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hot_questions' AND column_name = 'question_type') THEN
        ALTER TABLE public.hot_questions ADD COLUMN question_type TEXT DEFAULT 'mcq';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hot_questions' AND column_name = 'type') THEN
        ALTER TABLE public.hot_questions ADD COLUMN type TEXT DEFAULT 'mcq';
    END IF;
END $$;

-- Ensure hot_question_responses has image_url
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hot_question_responses' AND column_name = 'image_url') THEN
        ALTER TABLE public.hot_question_responses ADD COLUMN image_url TEXT;
    END IF;
END $$;

-- Ensure hot_question_responses has engagement columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hot_question_responses' AND column_name = 'likes') THEN
        ALTER TABLE public.hot_question_responses ADD COLUMN likes INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hot_question_responses' AND column_name = 'downvotes') THEN
        ALTER TABLE public.hot_question_responses ADD COLUMN downvotes INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hot_question_responses' AND column_name = 'liked_by') THEN
        ALTER TABLE public.hot_question_responses ADD COLUMN liked_by TEXT[] DEFAULT '{}';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hot_question_responses' AND column_name = 'disliked_by') THEN
        ALTER TABLE public.hot_question_responses ADD COLUMN disliked_by TEXT[] DEFAULT '{}';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hot_question_responses' AND column_name = 'parent_id') THEN
        ALTER TABLE public.hot_question_responses ADD COLUMN parent_id UUID REFERENCES public.hot_question_responses(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Ensure app_settings is properly granted
GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT ALL ON public.app_settings TO service_role;
