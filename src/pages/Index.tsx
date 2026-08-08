import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/dashboard");
  }, [navigate]);

  return (
    <div className="hidden">
      {`Its manual cropping system have not any image or uploaded pdfs etc and have not any cropping areas pls fix it

The storage buckets "question-images" and "biro-test-images" exist but images are failing to upload with NoSuchBucket error. 




Please run this SQL in the Supabase SQL editor to fix the RLS policies and ensure buckets are truly public:




UPDATE storage.buckets SET public = true WHERE id IN ('question-images', 'biro-test-images');




DROP POLICY IF EXISTS "Public read question-images" ON storage.objects;

DROP POLICY IF EXISTS "Auth upload question-images" ON storage.objects;

DROP POLICY IF EXISTS "Public read biro-test-images" ON storage.objects;

DROP POLICY IF EXISTS "Auth upload biro-test-images" ON storage.objects;




CREATE POLICY "Public read question-images" ON storage.objects FOR SELECT USING (bucket_id = 'question-images');

CREATE POLICY "Public insert question-images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'question-images');

CREATE POLICY "Public read biro-test-images" ON storage.objects FOR SELECT USING (bucket_id = 'biro-test-images');

CREATE POLICY "Public insert biro-test-images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'biro-test-images');`}
    </div>
  );
};

export default Index;