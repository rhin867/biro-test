-- 1. Create hot_questions table
CREATE TABLE IF NOT EXISTS public.hot_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    options JSONB, -- Optional list of options if MCQ
    correct_option TEXT -- Optional correct option
);

-- 2. Create hot_question_responses table
CREATE TABLE IF NOT EXISTS public.hot_question_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES public.hot_questions(id) ON DELETE CASCADE NOT NULL,
    user_key TEXT NOT NULL,
    user_display_name TEXT NOT NULL,
    selected_option TEXT,
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create test_folder_shares table
CREATE TABLE IF NOT EXISTS public.test_folder_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_name TEXT NOT NULL,
    owner_user_key TEXT NOT NULL,
    shared_with_email TEXT, -- Can be null for link-based/public share
    share_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
    password_hash TEXT,
    access_level TEXT DEFAULT 'view', -- 'view', 'edit'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create folder_access_requests table
CREATE TABLE IF NOT EXISTS public.folder_access_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_share_id UUID REFERENCES public.test_folder_shares(id) ON DELETE CASCADE NOT NULL,
    requester_user_key TEXT NOT NULL,
    requester_email TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'denied'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Grants
GRANT SELECT, INSERT ON public.hot_questions TO authenticated, anon;
GRANT ALL ON public.hot_questions TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.hot_question_responses TO authenticated, anon;
GRANT ALL ON public.hot_question_responses TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_folder_shares TO authenticated, anon;
GRANT ALL ON public.test_folder_shares TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.folder_access_requests TO authenticated, anon;
GRANT ALL ON public.folder_access_requests TO service_role;

-- 6. Enable RLS
ALTER TABLE public.hot_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hot_question_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_folder_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folder_access_requests ENABLE ROW LEVEL SECURITY;

-- 7. Basic policies (Simplified for now, can be hardened later)
CREATE POLICY "Public read hot questions" ON public.hot_questions FOR SELECT USING (true);
CREATE POLICY "Public read responses" ON public.hot_question_responses FOR SELECT USING (true);
CREATE POLICY "Public insert responses" ON public.hot_question_responses FOR INSERT WITH CHECK (true);

CREATE POLICY "Folder share access" ON public.test_folder_shares FOR ALL USING (true);
CREATE POLICY "Folder access request" ON public.folder_access_requests FOR ALL USING (true);
