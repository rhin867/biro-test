CREATE POLICY "Admin can modify questions" ON public.hot_questions FOR ALL TO authenticated USING (true);
CREATE POLICY "Admin can modify responses" ON public.hot_question_responses FOR ALL TO authenticated USING (true);
CREATE POLICY "Admin can modify shares" ON public.test_folder_shares FOR ALL TO authenticated USING (true);
CREATE POLICY "Admin can modify requests" ON public.folder_access_requests FOR ALL TO authenticated USING (true);
