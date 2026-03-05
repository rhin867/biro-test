import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const systemPrompt = `You are a fast question paper parser. Extract ALL questions from the document into JSON.

RULES:
1. Extract EVERY question. Use LaTeX for math ($x^2$).
2. Detect Subject (Physics/Chemistry/Maths/Biology) and Chapter.
3. 4 options per MCQ (A,B,C,D). Set hasDiagram:true if image/diagram needed.
4. Detect correct answer if visible, else null.
5. Skip headers/footers/instructions/watermarks.
6. Even without numbering, detect questions by A/B/C/D option pattern.

OUTPUT (STRICT JSON, NO MARKDOWN):
{"examTitle":"Title","questions":[{"id":1,"question":"text","options":["A","B","C","D"],"correctAnswer":"A","subject":"Physics","chapter":"Mechanics","hasDiagram":false,"pageNumber":1}],"totalExtracted":75,"subjectCounts":{"Physics":25}}`;

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

    // Extended model list with more fallbacks
    const models = [
      "gemini-2.0-flash",
      "gemini-1.5-flash",
      "gemini-2.5-flash",
      "gemini-1.5-pro",
    ];

    const headers: Record<string, string> = { "Content-Type": "application/json" };

    const parts: any[] = [
      { text: promptContent + "\n\nExtract ALL questions. Return STRICT JSON only, no markdown." }
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
        temperature: 0.05,
        maxOutputTokens: 65536,
      }
    });

    let response: Response | null = null;
    let lastError = "";

    for (const model of models) {
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${userApiKey}`;
      console.log(`Trying model: ${model}...`);
      
      // 3 attempts per model with increasing delays
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) {
          const delay = attempt * 3000; // 3s, 6s
          console.log(`Retry ${attempt} for ${model}, waiting ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
        }
        
        try {
          const res = await fetch(apiUrl, { method: "POST", headers, body });
          
          if (res.ok) {
            response = res;
            break;
          }
          
          const errorText = await res.text();
          lastError = errorText;
          console.error(`${model} error (${res.status}):`, errorText.substring(0, 300));
          
          if (res.status === 400 && (errorText.includes("API_KEY") || errorText.includes("API key"))) {
            return new Response(
              JSON.stringify({ error: "Invalid API key. Please check your Gemini API key in Settings." }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          
          if (res.status === 503 || res.status === 429) continue;
          break; // Other errors, skip to next model
        } catch (fetchErr) {
          console.error(`Fetch error for ${model}:`, fetchErr);
          lastError = String(fetchErr);
          continue;
        }
      }
      
      if (response) break;
    }

    if (!response) {
      return new Response(
        JSON.stringify({ 
          error: "All AI models are temporarily busy. Please wait 30 seconds and try again. If this persists, check your API key at aistudio.google.com.",
          retryable: true 
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!content) {
      const finishReason = data.candidates?.[0]?.finishReason;
      if (finishReason === "SAFETY") {
        throw new Error("Content was blocked by safety filters. Try a different PDF.");
      }
      throw new Error("No response from AI. The PDF may be too complex or empty.");
    }

    // Parse the JSON response - handle various formats
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
      // Try to find JSON in the response
      const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          console.error("Failed to parse AI response:", content.substring(0, 500));
          throw new Error("Failed to parse extracted data. Try enabling Image Mode for this PDF.");
        }
      } else {
        console.error("No JSON found in response:", content.substring(0, 500));
        throw new Error("AI returned invalid format. Try enabling Image Mode for this PDF.");
      }
    }

    if (extractAnswerKeyOnly) {
      return new Response(
        JSON.stringify({ answerKey: parsed.answerKey || parsed }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
