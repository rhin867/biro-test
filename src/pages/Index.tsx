import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/dashboard");
  }, [navigate]);

  return (
    <div className="hidden">
      PROBLEM:

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

         - In the Daily Hot Question component (and anywhere question images are shown), render the image using a standard &lt;img&gt; tag with the stored public URL as src

         - Do NOT use any iframe, embed, or external diagram renderer

         - Show the image directly like: &lt;img src={question.image_url} alt="Question diagram" style={{width: '100%', borderRadius: '8px'}} /&gt;

         - Handle loading and error states gracefully




      4. ADMIN PANEL:

         - When admin creates/edits a daily hot question, show a file input to upload image

         - Preview the image immediately after upload (before saving)

         - The stored value should always be the Supabase public URL, never a local blob URL or external link




      GOAL: Question images should display inline — exactly like WhatsApp/Telegram image previews — both on the student-facing daily question card AND in the admin edit panel, without any external links or diagram renderers.
    </div>

  );
};

export default Index;