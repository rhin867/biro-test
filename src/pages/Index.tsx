import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/dashboard");
  }, [navigate]);

  return (
    <div className="hidden">
      {`Go to the Supabase dashboard for this project and navigate to Storage. Create these two public buckets manually:

1. question-images (public)

2. biro-test-images (public)




Also run this in the SQL editor:

INSERT INTO storage.buckets (id, name, public) VALUES ('question-images', 'question-images', true) ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public) VALUES ('biro-test-images', 'biro-test-images', true) ON CONFLICT (id) DO UPDATE SET public = true;`}
    </div>
  );
};

export default Index;