import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const systemPrompt = `You are an expert JEE question paper parser. Analyze the provided PDF/text and extract questions into STRICT JSON format.

CRITICAL RULES:
1. Extract EVERY question - count carefully, the output count MUST match the PDF
2. Identify Subject (Physics/Chemistry/Maths) based on content keywords
3. Output ALL math equations in valid LaTeX format (e.g., $\\int_0^1 x\\,dx$, $E = mc^2$)
4. For EACH question provide exactly 4 options (A, B, C, D)
5. If question relies on a diagram/circuit/graph/structure, set "hasDiagram": true
6. Detect correct answer if visible, else set to null
7. Ignore headers, footers, page numbers, watermarks
8. Combine multi-line questions into single text
9. Chapter should be specific (e.g., "Kinematics", "Organic Chemistry", "Calculus")

OUTPUT FORMAT (STRICT JSON, NO MARKDOWN):
{
  "examTitle": "Detected Exam Title or 'Extracted Test'",
  "questions": [
    {
      "id": 1,
      "question": "Question text with LaTeX: $x^2 + y^2 = r^2$",
      "options": ["Option A with $\\frac{1}{2}$", "Option B", "Option C", "Option D"],
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

    // Use user's API key if provided, otherwise fall back to LOVABLE_API_KEY
    const useGeminiDirect = !!userApiKey;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!userApiKey && !LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "No API key available. Please set your Gemini API key in Settings." }),
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

    let apiUrl: string;
    let headers: Record<string, string>;
    let body: string;

    if (useGeminiDirect) {
      // Use Google Gemini API directly with user's key
      apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${userApiKey}`;
      headers = { "Content-Type": "application/json" };

      const parts: any[] = [
        { text: promptContent + "\n\n" + (extractAnswerKeyOnly 
          ? "Extract the answer key from this document. Return STRICT JSON only."
          : "Extract all questions from this PDF. Return STRICT JSON only.") }
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

      body = JSON.stringify({
        contents: [{ parts }],
        generationConfig: { temperature: 0.1 }
      });
    } else {
      // Use Lovable AI Gateway
      apiUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";
      headers = {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      };

      const messages: any[] = [
        { role: "system", content: promptContent }
      ];

      if (pdfBase64) {
        messages.push({
          role: "user",
          content: [
            {
              type: "text",
              text: extractAnswerKeyOnly 
                ? "Extract the answer key from this document. Return STRICT JSON only."
                : "Extract all questions from this PDF. Return STRICT JSON only."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType || 'application/pdf'};base64,${pdfBase64}`
              }
            }
          ]
        });
      } else {
        messages.push({
          role: "user",
          content: extractAnswerKeyOnly
            ? `Extract the answer key from this text. Return STRICT JSON only:\n\n${pdfText}`
            : `Extract all questions from this text. Return STRICT JSON only:\n\n${pdfText}`
        });
      }

      body = JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        temperature: 0.1,
      });
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers,
      body,
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Usage limit reached. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI error:", response.status, errorText);
      throw new Error(`AI error: ${response.status} - ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    
    // Extract content based on API used
    let content: string;
    if (useGeminiDirect) {
      content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } else {
      content = data.choices?.[0]?.message?.content || "";
    }

    if (!content) {
      throw new Error("No response from AI");
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
      throw new Error("Failed to parse extracted data");
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
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
