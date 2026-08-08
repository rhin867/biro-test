// Serves the daily hot question answer key ONLY after the user has submitted
// a response (or to the owner after password verification). The correct_option
// column is not readable by anon/authenticated roles directly.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function hashSecret(value: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return "sha256$" + Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (action === "check") {
      const questionId = String(body?.questionId || "").trim();
      const userKey = String(body?.userKey || "").slice(0, 200).trim();
      if (!questionId || !userKey) return json({ error: "questionId and userKey required" }, 400);

      const { data: resp, error: respErr } = await supabase
        .from("hot_question_responses")
        .select("selected_option")
        .eq("question_id", questionId)
        .eq("user_key", userKey)
        .not("selected_option", "is", null)
        .limit(1)
        .maybeSingle();
      if (respErr) throw respErr;
      if (!resp) return json({ answered: false });

      const { data: q, error: qErr } = await supabase
        .from("hot_questions")
        .select("correct_option")
        .eq("id", questionId)
        .maybeSingle();
      if (qErr) throw qErr;

      const correctOption = (q?.correct_option ?? null) as string | null;
      const selected = String(resp.selected_option ?? "");
      return json({
        answered: true,
        selectedOption: selected,
        correctOption,
        isCorrect: correctOption
          ? selected.trim().toLowerCase() === correctOption.trim().toLowerCase()
          : null,
      });
    }

    if (action === "admin_get") {
      const password = String(body?.password || "");
      const { data: pwRow } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "admin_password_2")
        .maybeSingle();
      const stored = (pwRow?.value as string | undefined) ?? "";
      if (!stored) return json({ error: "Owner password not configured" }, 503);
      const ok = stored.startsWith("sha256$") ? stored === await hashSecret(password) : stored === password;
      if (!ok) return json({ error: "Unauthorized" }, 401);

      const id = body?.id ? String(body.id) : null;
      let query = supabase.from("hot_questions").select("id, correct_option");
      if (id) query = query.eq("id", id);
      const { data, error } = await query;
      if (error) throw error;
      return json({ ok: true, answers: data ?? [] });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("hot-question-answer error", e);
    return json({ error: "Request failed" }, 500);
  }
});
