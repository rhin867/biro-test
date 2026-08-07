import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const systemPrompt = `You are an expert question paper parser for JEE/NEET/CUET exams. Extract ALL questions from the document into JSON.
RULES:
1. Extract EVERY question - even without numbering. Detect questions by Subject headers (Physics, Chemistry, Maths), Section headers, or A/B/C/D option patterns.
2. For SCANNED PDFs/Images: Use high-quality OCR internally. Preserve mathematical symbols and equations accurately.
3. Use LaTeX for ALL math: √x→$\\sqrt{x}$, x²→$x^2$, ∫→$\\int$, Σ→$\\sum$, fractions→$\\frac{a}{b}$
4. Detect Subject (Physics/Chemistry/Maths) and Chapter. If unclear, infer from question context.
5. Detect question type: MCQ (4 options), MSQ (multiple correct), Numerical (integer/decimal answer), Integer (exact integer).
6. options: {A: "...", B: "...", C: "...", D: "..."}. Set hasDiagram:true if image/diagram/graph/figure/circuit is present or referenced.
7. Detect correct answer if visible (e.g., answer key at end or circled), else null.
8. Skip instructions, watermarks, and non-question text.
9. Support multi-page documents (up to 75 questions).
OUTPUT (STRICT JSON):
{"examTitle":"Title","questions":[{"questionNumber":1,"question":"text with $LaTeX$","options":{"A":"","B":"","C":"","D":""},"correctAnswer":"A","subject":"Physics","chapter":"Mechanics","type":"MCQ","hasDiagram":false,"pageNumber":1}],"totalExtracted":75,"subjectCounts":{"Physics":25}}`;
const answerKeyPrompt = `You are an answer key extractor. Extract the answer key from this document.
Return STRICT JSON only, no markdown. Format:
{"answerKey":{"1":"A","2":"B","3":"C"}}
Map question numbers to their correct option letter (A/B/C/D).`;
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const { pdfText, pdfBase64, mimeType, extractAnswerKeyOnly, totalQuestions, userApiKey, userKeyOnly } = await req.json();
    
    if (!pdfText && !pdfBase64) {
      return new Response(
        JSON.stringify({ error: "PDF text or base64 data is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (userKeyOnly && !userApiKey) {
      return new Response(
        JSON.stringify({ error: "Add your own Gemini API key to use this mode." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const LOVABLE_API_KEY = userKeyOnly ? null : Deno.env.get("LOVABLE_API_KEY");
    const fallbackGeminiKey = userApiKey || (userKeyOnly ? null : Deno.env.get("Biro_test_api_key"));
    const useGateway = !!LOVABLE_API_KEY;
    
    if (!useGateway && !fallbackGeminiKey) {
      return new Response(
        JSON.stringify({ error: userKeyOnly ? "Invalid or missing user API key." : "AI service not available. Please try again." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const promptContent = extractAnswerKeyOnly
      ? `${answerKeyPrompt}\nExtract answers for up to ${totalQuestions || 75} questions.`
      : systemPrompt;
    let content: string;
    if (useGateway) {
      try {
        content = await callLovableAI(LOVABLE_API_KEY!, promptContent, pdfText, pdfBase64, mimeType);
      } catch (gatewayError) {
        console.warn("Lovable AI gateway failed, using Gemini fallback", gatewayError);
        if (!fallbackGeminiKey) throw gatewayError;
        content = await callGeminiDirect(fallbackGeminiKey, promptContent, pdfText, pdfBase64, mimeType);
      }
    } else {
      content = await callGeminiDirect(fallbackGeminiKey!, promptContent, pdfText, pdfBase64, mimeType);
    }
    if (!content) {
      throw new Error("No response from AI. The PDF may be too complex or empty.");
    }
    let parsed = parseJsonResponse(content);
    if (extractAnswerKeyOnly) {
      return new Response(
        JSON.stringify({ answerKey: parsed.answerKey || parsed }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const transformedQuestions = (parsed.questions || []).map((q: any, index: number) => ({
      questionNumber: Number(q.questionNumber || q.id || index + 1),
      subject: q.subject || "Physics",
      chapter: q.chapter || "General",
      question: q.question || q.text || "",
      options: Array.isArray(q.options) 
        ? { A: q.options[0] || "", B: q.options[1] || "", C: q.options[2] || "", D: q.options[3] || "" }
        : q.options || { A: "", B: "", C: "", D: "" },
      correctAnswer: q.correctAnswer || q.answer || null,
      type: q.type || "MCQ",
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
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    const status = errorMessage.includes("Rate limit") ? 429 : 
                   errorMessage.includes("Payment") ? 402 :
                   errorMessage.includes("API key") ? 400 : 500;
    return new Response(
      JSON.stringify({ error: errorMessage, retryable: status === 429 }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
async function callLovableAI(apiKey: string, systemPrompt: string, pdfText?: string, pdfBase64?: string, mimeType?: string): Promise<string> {
  const messages: any[] = [
    { role: "system", content: systemPrompt + "\n\nReturn STRICT JSON only, no markdown." }
  ];
  if (pdfBase64) {
    const isPdf = (mimeType || 'application/pdf').includes('pdf');
    const dataUrl = `data:${mimeType || 'application/pdf'};base64,${pdfBase64}`;
    messages.push({
      role: "user",
      content: isPdf
        ? [
            { type: "text", text: "Convert this complete exam PDF into CBT-ready JSON. Extract EVERY question, subject, option, and answer key. Detect diagrams." },
            { type: "file", file: { filename: "exam.pdf", file_data: dataUrl } }
          ]
        : [
            { type: "text", text: "Convert this exam image into CBT-ready JSON. Preserve question/options and detect diagrams." },
            { type: "image_url", image_url: { url: dataUrl } }
          ]
    });
  } else if (pdfText) {
    messages.push({ role: "user", content: `Convert this extracted exam text into CBT-ready JSON.\n\n${pdfText}` });
  }
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "manual-fetch",
    },
    body: JSON.stringify({
      model: "google/gemini-2.0-flash",
      messages,
      temperature: 0.05,
      max_tokens: 65536,
    }),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI gateway error (${response.status})`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}
async function callGeminiDirect(apiKey: string, promptContent: string, pdfText?: string, pdfBase64?: string, mimeType?: string): Promise<string> {
  const models = ["gemini-2.0-flash", "gemini-1.5-flash"];
  const parts: any[] = [
    { text: promptContent + "\n\nExtract ALL questions. Return STRICT JSON only, no markdown." }
  ];
  if (pdfBase64) {
    parts.push({ inline_data: { mime_type: mimeType || 'application/pdf', data: pdfBase64 } });
  } else if (pdfText) {
    parts[0].text += "\n\n" + pdfText;
  }
  const body = JSON.stringify({
    contents: [{ parts }],
    generationConfig: { temperature: 0.05, maxOutputTokens: 65536 }
  });
  for (const model of models) {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
      const res = await fetch(apiUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body });
      if (res.ok) {
        const data = await res.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (content) return content;
      }
    } catch {
      continue;
    }
  }
  throw new Error("AI service unavailable. Try again later.");
}
function parseJsonResponse(content: string): any {
  let jsonContent = content;
  if (content.includes("```json")) {
    jsonContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "");
  } else if (content.includes("```")) {
    jsonContent = content.replace(/```\n?/g, "");
  }
  try {
    return JSON.parse(jsonContent.trim());
  } catch {
    const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try { return JSON.parse(jsonMatch[0]); } catch {}
    }
    throw new Error("Failed to parse AI response.");
  }
}
