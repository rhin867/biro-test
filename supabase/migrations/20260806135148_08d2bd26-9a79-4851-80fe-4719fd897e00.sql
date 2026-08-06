CREATE TABLE public.hot_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    options JSONB,
    correct_option TEXT
);

CREATE TABLE public.hot_question_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES public.hot_questions(id) ON DELETE CASCADE NOT NULL,
    user_key TEXT NOT NULL,
    user_display_name TEXT NOT NULL,
    selected_option TEXT,
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.test_folder_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_name TEXT NOT NULL,
    owner_user_key TEXT NOT NULL,
    shared_with_email TEXT, 
    share_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
    password_hash TEXT,
    access_level TEXT DEFAULT 'view',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.folder_access_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_share_id UUID REFERENCES public.test_folder_shares(id) ON DELETE CASCADE NOT NULL,
    requester_user_key TEXT NOT NULL,
    requester_email TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT ON public.hot_questions TO authenticated, anon;
GRANT ALL ON public.hot_questions TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.hot_question_responses TO authenticated, anon;
GRANT ALL ON public.hot_question_responses TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_folder_shares TO authenticated, anon;
GRANT ALL ON public.test_folder_shares TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.folder_access_requests TO authenticated, anon;
GRANT ALL ON public.folder_access_requests TO service_role;

ALTER TABLE public.hot_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hot_question_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_folder_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folder_access_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read hot questions" ON public.hot_questions FOR SELECT USING (true);
CREATE POLICY "Anyone can read responses" ON public.hot_question_responses FOR SELECT USING (true);
CREATE POLICY "Anyone can insert responses" ON public.hot_question_responses FOR INSERT WITH CHECK (true);
CREATE POLICY "Folder share access" ON public.test_folder_shares FOR ALL USING (true);
CREATE POLICY "Folder access request" ON public.folder_access_requests FOR ALL USING (true);
