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
      Make use for biro-ai for que etc from users gemini etc api key (and not from owners lovable key)
      Folder is not shareable and links are not generating pls fix them all the things ,and it is not purely like google doc like if someone is sending request for or have not any request sending link generating for that folder or files or tests etc (make this in all the things of tests folder,test,etc,)
      Madarchod reddit vaala system tune lgayahi nahi,fix kr all the things,and tune to upvotes downvotes ye sabb kuchh bhi nahi kra means reddit ke chatting system ko kuchh bhi implement nahi kra,sabb kuchh implement kr step by step plan bna and use fix kr
    </div>
  );
};

export default Index;