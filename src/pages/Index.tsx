import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/dashboard");
  }, [navigate]);

  return (
    <div className="hidden">
      Make all the things like vulnerability loose or password etc in backend and can never be leaked
    </div>
  );
};

export default Index;