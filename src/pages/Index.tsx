import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/dashboard");
  }, [navigate]);

  return (
    <div className="hidden">
      {`Pull the latest changes from GitHub and redeploy. The Supabase credentials have been updated in the .env file to use the Biro-test Supabase project. Test the image upload in the Daily Hot Question admin panel.,          Change the Supabase project credentials to use:

VITE_SUPABASE_URL=https://plqoujjcfxwqtbdvroek.supabase.co

VITE_SUPABASE_PROJECT_ID=plqoujjcfxwqtbdvroek




Update all environment variables accordingly.`}
    </div>
  );
};

export default Index;