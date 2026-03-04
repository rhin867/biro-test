import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const systemPrompt = `You are an expert question paper parser for competitive exams (JEE, NEET, CUET, etc.). Analyze the provided PDF/text and extract questions into STRICT JSON format.

CRITICAL RULES:
1. Extract EVERY question - count carefully, the output count MUST match the PDF
2. Identify Subject (Physics/Chemistry/Maths/Biology/English/General) based on content
3. Output ALL math equations in valid LaTeX format (e.g., $\\int_0^1 x\\,dx$, $E = mc^2$)
4. For EACH question provide exactly 4 options (A, B, C, D) 
5. If question relies on a diagram/circuit/graph/structure, set "hasDiagram": true
6. Detect correct answer if visible, else set to null
7. Ignore headers, footers, page numbers, watermarks, instructions
8. Combine multi-line questions into single text
9. Chapter should be specific (e.g., "Kinematics", "Organic Chemistry", "Calculus")
10. Even if numbering is missing, detect questions by pattern (options A/B/C/D)
11. If a page has 30+ questions, extract ALL of them
12. Clean up non-question text (instructions, headers) - only include actual questions
13. For numerical/integer type questions, still provide 4 options if visible, else leave empty

OUTPUT FORMAT (STRICT JSON, NO MARKDOWN):
{
  "examTitle": "Detected Exam Title or 'Extracted Test'",
  "questions": [
    {
      "id": 1,
      "question": "Question text with LaTeX: $x^2 + y^2 = r^2$",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "A",
      "subject": "Physics",
      "chapter": "Mechanics",
      "hasDiagram": false,
      "pageNumber": 1
    }
  ],
  "totalExtracted": 75,
  "subjectCounts": {
    "Physics": 25,
    "Chemistry": 25,
    "Maths": 25
  }
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfText, pdfBase64, mimeType, extractAnswerKeyOnly, totalQuestions, userApiKey } = await req.json();
    
    if (!pdfText && !pdfBase64) {
      return new Response(
        JSON.stringify({ error: "PDF text or base64 data is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!userApiKey) {
      return new Response(
        JSON.stringify({ error: "Please set your Gemini API key in Settings first. Go to Settings → Enter your API key." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine prompt based on mode
    const promptContent = extractAnswerKeyOnly
      ? `You are an answer key extractor. Look at this document and extract the answer key.
Return STRICT JSON only, no markdown. Format:
{
  "answerKey": {
    "1": "A",
    "2": "B",
    "3": "C"
  }
}
Extract answers for up to ${totalQuestions || 75} questions. Map question numbers to their correct option letter (A/B/C/D).`
      : systemPrompt;

    // Always use Google Gemini API directly with user's key
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${userApiKey}`;
    const headers: Record<string, string> = { "Content-Type": "application/json" };

    const parts: any[] = [
      { text: promptContent + "\n\n" + (extractAnswerKeyOnly 
        ? "Extract the answer key from this document. Return STRICT JSON only."
        : "Extract ALL questions from this PDF. Return STRICT JSON only. Do NOT skip any question.") }
    ];

    if (pdfBase64) {
      parts.push({
        inline_data: {
          mime_type: mimeType || 'application/pdf',
          data: pdfBase64
        }
      });
    } else if (pdfText) {
      parts[0].text += "\n\n" + pdfText;
    }

    const body = JSON.stringify({
      contents: [{ parts }],
      generationConfig: { 
        temperature: 0.1,
        maxOutputTokens: 65536,
      }
    });

    console.log("Calling Gemini API with user key...");
    const response = await fetch(apiUrl, {
      method: "POST",
      headers,
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 400 && errorText.includes("API_KEY")) {
        return new Response(
          JSON.stringify({ error: "Invalid API key. Please check your Gemini API key in Settings." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`Gemini API error (${response.status}): ${errorText.substring(0, 300)}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!content) {
      throw new Error("No response from Gemini. The PDF may be too complex or empty.");
    }

    // Parse the JSON response
    let jsonContent = content;
    if (content.includes("```json")) {
      jsonContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    } else if (content.includes("```")) {
      jsonContent = content.replace(/```\n?/g, "");
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonContent.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response:", content.substring(0, 500));
      throw new Error("Failed to parse extracted data. The PDF format may not be supported.");
    }

    // If extracting answer key only, return it directly
    if (extractAnswerKeyOnly) {
      return new Response(
        JSON.stringify({ answerKey: parsed.answerKey || parsed }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Transform to expected format
    const transformedQuestions = (parsed.questions || []).map((q: any, index: number) => ({
      questionNumber: q.id || index + 1,
      subject: q.subject || "Physics",
      chapter: q.chapter || "General",
      question: q.question || q.text || "",
      options: Array.isArray(q.options) 
        ? { A: q.options[0] || "", B: q.options[1] || "", C: q.options[2] || "", D: q.options[3] || "" }
        : q.options || { A: "", B: "", C: "", D: "" },
      correctAnswer: q.correctAnswer || q.answer || null,
      type: "MCQ",
      hasDiagram: q.hasDiagram || false,
      pdfPageNumber: q.pageNumber || null
    }));

    console.log(`Successfully extracted ${transformedQuestions.length} questions`);

    return new Response(
      JSON.stringify({
        examTitle: parsed.examTitle || "Extracted Test",
        questions: transformedQuestions,
        totalExtracted: transformedQuestions.length,
        subjectCounts: parsed.subjectCounts || {}
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Extract questions error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
