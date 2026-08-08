
-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_key TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Grant access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO anon;
GRANT ALL ON public.notifications TO service_role;

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can manage their own notifications via user_key"
ON public.notifications
FOR ALL
USING (true)
WITH CHECK (true);

-- Enhance hot_question_responses table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hot_question_responses' AND column_name = 'parent_id') THEN
        ALTER TABLE public.hot_question_responses ADD COLUMN parent_id UUID REFERENCES public.hot_question_responses(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hot_question_responses' AND column_name = 'likes') THEN
        ALTER TABLE public.hot_question_responses ADD COLUMN likes INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hot_question_responses' AND column_name = 'liked_by') THEN
        ALTER TABLE public.hot_question_responses ADD COLUMN liked_by TEXT[] DEFAULT '{}';
    END IF;
END $$;
