-- Let's try to just GRANT all on storage.objects to see if that helps with the ownership issue
GRANT ALL ON storage.objects TO public;
GRANT ALL ON storage.buckets TO public;
