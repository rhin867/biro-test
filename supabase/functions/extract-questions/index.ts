import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0";

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
    const { pdfText, pdfBase64, mimeType, extractAnswerKeyOnly, totalQuestions } = await req.json();
    
    if (!pdfText && !pdfBase64) {
      return new Response(
        JSON.stringify({ error: "PDF text or base64 data is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
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
              : "Extract all JEE questions from this PDF. Return STRICT JSON only."
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
          : `Extract all JEE questions from this text. Return STRICT JSON only:\n\n${pdfText}`
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        temperature: 0.1,
      }),
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
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

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
      console.error("Failed to parse AI response:", content);
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
