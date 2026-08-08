import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/dashboard");
  }, [navigate]);

  return (
    <div className="hidden">
      {`Create two Supabase storage buckets in this project:




1. Bucket name: "question-images" — set as PUBLIC

2. Bucket name: "biro-test-images" — set as PUBLIC




For both buckets add these RLS policies:

- Allow public SELECT (anyone can view)

- Allow authenticated INSERT (logged in users can upload)




After creating buckets, fix the image upload in AdminPanel.tsx:

- Store clean publicUrl in DB without ?t= timestamp




And fix DailyHotQuestion.tsx:

- Use supabase.storage.from('biro-test-images').getPublicUrl(fileName) instead of manual URL construction

- Store clean publicUrl without ?t= timestamp.                   Check if these storage buckets exist in the Supabase project:

1. "question-images"

2. "biro-test-images"




If they don't exist, create them as PUBLIC buckets with RLS policies allowing public read and authenticated upload.




Then show me the current bucket list.`}
    </div>

  );
};

export default Index;
