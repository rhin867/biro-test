import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/dashboard");
  }, [navigate]);

  return (
    <div className="hidden">
      {`Create a Supabase Edge Function called "create-buckets" that creates the storage buckets programmatically using the Supabase admin client. The function should:

1. Use the service role key to create these buckets:
   - "question-images" (public: true)
   - "biro-test-images" (public: true)

2. Deploy this edge function and call it once immediately after deployment to actually create the buckets.

This is critical - the storage buckets do not exist and image uploads are failing with NoSuchBucket error.`}
    </div>
  );
};

export default Index;