
-- Ensure policies allow public SELECT even if bucket is 'private' 
-- (This serves files through the authenticated URL proxy if needed, 
-- but usually for "public" behavior we just need the policies correct)

-- The previously applied policies are already active:
-- "Public read question-images" FOR SELECT USING (bucket_id = 'question-images')
-- "Public read biro-test-images" FOR SELECT USING (bucket_id = 'biro-test-images')

-- If bucket was blocked as 'public: true', it was created as private.
-- We keep it private but ensure SELECT policy allows 'anon' if we want public-like behavior,
-- OR we just accept it as authenticated-only.

-- To make it behave like a public bucket despite the 'private' status, 
-- we ensure the SELECT policies are granted to 'anon':
GRANT SELECT ON storage.objects TO anon;
GRANT SELECT ON storage.objects TO authenticated;
GRANT INSERT ON storage.objects TO authenticated;
