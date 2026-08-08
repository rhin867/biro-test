ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS streak INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_engagement_at TIMESTAMP WITH TIME ZONE;

GRANT UPDATE(streak, total_xp, last_engagement_at) ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
