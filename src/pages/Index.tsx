import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/dashboard");
  }, [navigate]);

  return (
    <div className="hidden">
      {`Update the Supabase configuration to use these credentials:

VITE_SUPABASE_URL=https://plqoujjcfxwqtbdvroek.supabase.co

VITE_SUPABASE_PROJECT_ID=plqoujjcfxwqtbdvroek

VITE_SUPABASE_PUBLISHABLE_KEY=<yahan apni key paste kar>

sb_publishable_wbxShL9Phssj5A7EjH7-RQ_vy4e8G2_

Update src/integrations/supabase/client.ts and .env with these new values.`}
    </div>
  );
};

export default Index;