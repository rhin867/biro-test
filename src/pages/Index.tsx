import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/dashboard");
  }, [navigate]);

  return (
    <div className="hidden">
      {`Abb firse image upload nahi hor ha hai and bucket not found bta rh ahai and checkout kro ki supabase ke kaunse prinect mein hamara bucket hai and vo sahi hai ya nahi and bucket hai bhi ya nahi and mereko supabase ke project ka link do and agar project bna hi nahi hai tto bnao aur agar nahi bna pa rhe hai to mere ko step by step btao kaise kaise bnana hai prohect and bucket all the things and main apne supabase prihect ko kaise connect kr sakta hu apne is websight se and apne biro-test.vercela.pp ko bhi kaise connect kr paaunga and qki usmein bhi bucket not found bta rha hai image seen nahi ho rha hai and image upload bhi nahi ho rha hai and sabb kuchh bta ,PROBLEM:

      The Daily Hot Question feature shows "Diagram failed to load" because the question image URL points to a Supabase Storage bucket that returns 404 NoSuchBucket error.




      ROOT CAUSE:

      Images are being stored as URLs/links in the database instead of being uploaded to and served directly from Supabase Storage. The bucket either doesn't exist or isn't configured as public.




      FIX REQUIRED — do all of the following:




      1. CREATE SUPABASE STORAGE BUCKET:

         - Bucket name: "question-images" (or whatever is referenced in code)

         - Set it as PUBLIC bucket (public read access)

         - Enable RLS policy: allow authenticated users to INSERT, allow everyone to SELECT




      2. CHANGE IMAGE UPLOAD LOGIC:

         - When admin uploads a question image, upload the actual file to Supabase Storage bucket "question-images"

         - Use supabase.storage.from('question-images').upload(filePath, file)

         - After upload, get the PUBLIC URL using: supabase.storage.from('question-images').getPublicUrl(filePath)

         - Store ONLY this public URL in the database column




      3. CHANGE IMAGE DISPLAY LOGIC:

         - In the Daily Hot Question component (and anywhere question images are shown), render the image using a standard <img> tag with the stored public URL as src

         - Do NOT use any iframe, embed, or external diagram renderer

         - Show the image directly like: <img src={question.image_url} alt="Question diagram" style={{width: '100%', borderRadius: '8px'}} />

         - Handle loading and error states gracefully




      4. ADMIN PANEL:

         - When admin creates/edits a daily hot question, show a file input to upload image

         - Preview the image immediately after upload (before saving)

         - The stored value should always be the Supabase public URL, never a local blob URL or external link




      GOAL: Question images should display inline — exactly like WhatsApp/Telegram image previews — both on the student-facing daily question card AND in the admin edit panel, without any external links or diagram renderers.

      Add storage health check,add admin upload diagnostic,add image retry ui,add cache busting on load,give me the links of supabase project,and give me the links of buckets so that i can see that is it build or not
      Reddit type upvoting downvoting system purely har ek comments replies mein add kro fix kro checkout keo`}
    </div>

  );
};

export default Index;
