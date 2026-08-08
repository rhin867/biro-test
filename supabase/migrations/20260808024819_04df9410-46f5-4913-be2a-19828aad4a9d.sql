-- Add image_url column to hot_questions if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hot_questions' AND column_name = 'image_url') THEN
        ALTER TABLE public.hot_questions ADD COLUMN image_url TEXT;
    END IF;
END $$;

-- Update RLS for storage.objects to allow public uploads to the biro-test-images bucket
-- This is necessary for the Admin Panel upload to work for anonymous/non-auth users 

-- First drop existing to avoid conflicts if they exist partially
DROP POLICY IF EXISTS "Public Admin Upload" ON storage.objects;
DROP POLICY IF EXISTS "Public Admin Update" ON storage.objects;
DROP POLICY IF EXISTS "Public Admin Select" ON storage.objects;
DROP POLICY IF EXISTS "Public Admin Delete" ON storage.objects;

CREATE POLICY "Public Admin Upload" 
ON storage.objects 
FOR INSERT 
TO anon, authenticated
WITH CHECK (bucket_id = 'biro-test-images');

CREATE POLICY "Public Admin Update" 
ON storage.objects 
FOR UPDATE 
TO anon, authenticated
USING (bucket_id = 'biro-test-images');

CREATE POLICY "Public Admin Select" 
ON storage.objects 
FOR SELECT 
TO anon, authenticated
USING (bucket_id = 'biro-test-images');

CREATE POLICY "Public Admin Delete" 
ON storage.objects 
FOR DELETE 
TO anon, authenticated
USING (bucket_id = 'biro-test-images');
