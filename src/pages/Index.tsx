import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/dashboard");
  }, [navigate]);

  return (
    <div className="hidden">
      {`Open the Supabase SQL editor for this project and run this SQL to create the storage buckets:




INSERT INTO storage.buckets (id, name, public)

VALUES ('question-images', 'question-images', true)

ON CONFLICT (id) DO UPDATE SET public = true;




INSERT INTO storage.buckets (id, name, public)

VALUES ('biro-test-images', 'biro-test-images', true)

ON CONFLICT (id) DO UPDATE SET public = true;




CREATE POLICY IF NOT EXISTS "Public read question-images"

ON storage.objects FOR SELECT

USING (bucket_id = 'question-images');




CREATE POLICY IF NOT EXISTS "Auth upload question-images"

ON storage.objects FOR INSERT

WITH CHECK (bucket_id = 'question-images');




CREATE POLICY IF NOT EXISTS "Public read biro-test-images"

ON storage.objects FOR SELECT

USING (bucket_id = 'biro-test-images');




CREATE POLICY IF NOT EXISTS "Auth upload biro-test-images"

ON storage.objects FOR INSERT

WITH CHECK (bucket_id = 'biro-test-images');`}
    </div>

  );
};

export default Index;
