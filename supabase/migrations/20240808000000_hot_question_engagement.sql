-- Add likes and nesting to hot_question_responses
ALTER TABLE public.hot_question_responses ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.hot_question_responses(id) ON DELETE CASCADE;
ALTER TABLE public.hot_question_responses ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0;
ALTER TABLE public.hot_question_responses ADD COLUMN IF NOT EXISTS liked_by UUID[] DEFAULT '{}';

-- Create notifications table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_key TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.notifications TO anon;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can see their own notifications" ON public.notifications
    FOR SELECT USING (true); -- Filtered in code by user_key

CREATE POLICY "Anyone can create notifications" ON public.notifications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update their own notifications" ON public.notifications
    FOR UPDATE USING (true);

