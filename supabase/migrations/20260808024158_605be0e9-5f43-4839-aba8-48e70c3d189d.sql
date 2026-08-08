
ALTER TABLE public.community_messages
  ADD COLUMN IF NOT EXISTS liked_by text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS disliked_by text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.community_messages(id) ON DELETE CASCADE;
