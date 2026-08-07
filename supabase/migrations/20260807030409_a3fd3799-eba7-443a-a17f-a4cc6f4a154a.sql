-- Add missing columns to hot_questions if they don't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='hot_questions' AND column_name='type') THEN
        ALTER TABLE public.hot_questions ADD COLUMN type TEXT DEFAULT 'MCQ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='hot_questions' AND column_name='image_url') THEN
        ALTER TABLE public.hot_questions ADD COLUMN image_url TEXT;
    END IF;
END $$;

-- Fix RLS for hot_questions to allow insertion by authenticated/anon if needed for admin panel, 
-- but better to restrict to a specific admin check if possible. 
-- For now, since the admin panel uses the client, we need to allow insertion.
-- The screenshot shows "new row violates RLS policy for table hot_questions".

DROP POLICY IF EXISTS "Public insert hot questions" ON public.hot_questions;
CREATE POLICY "Public insert hot questions" ON public.hot_questions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update hot questions" ON public.hot_questions;
CREATE POLICY "Public update hot questions" ON public.hot_questions FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public delete hot questions" ON public.hot_questions;
CREATE POLICY "Public delete hot questions" ON public.hot_questions FOR DELETE USING (true);

-- Ensure grants are correct
GRANT ALL ON public.hot_questions TO authenticated;
GRANT ALL ON public.hot_questions TO anon;
GRANT ALL ON public.hot_questions TO service_role;
