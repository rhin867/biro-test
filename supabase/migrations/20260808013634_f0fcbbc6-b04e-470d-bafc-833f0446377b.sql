
-- Create study_plans table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.study_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    generated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    plan_data JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true
);

-- Grant access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_plans TO authenticated;
GRANT ALL ON public.study_plans TO service_role;

-- Enable RLS
ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own study plans"
ON public.study_plans
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Enhance mistake_book table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mistake_book' AND column_name = 'mastery_level') THEN
        ALTER TABLE public.mistake_book ADD COLUMN mastery_level INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mistake_book' AND column_name = 'last_practiced_at') THEN
        ALTER TABLE public.mistake_book ADD COLUMN last_practiced_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mistake_book' AND column_name = 'ai_remediation_suggested') THEN
        ALTER TABLE public.mistake_book ADD COLUMN ai_remediation_suggested BOOLEAN DEFAULT false;
    END IF;
END $$;
