// Owner-only management of public_tests rows. Password is verified server-side
// against admin_password_2 stored in app_settings. Client never sees the hash.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { action, id, name, password } = await req.json();
    if (!action || !id || typeof password !== "string") {
      return json({ error: "action, id and password required" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify owner password (admin_password_2)
    const { data: pwRow, error: pwErr } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "admin_password_2")
      .maybeSingle();
    if (pwErr) throw pwErr;
    const stored = (pwRow?.value as string | undefined) ?? "";
    if (!stored) return json({ error: "Owner password not configured" }, 503);
    const ok = stored.startsWith("sha256$")
      ? stored === await hashSecret(password)
      : stored === password;
    if (!ok) return json({ error: "Unauthorized" }, 401);

    if (action === "delete") {
      const { error } = await supabase.from("public_tests").delete().eq("id", id);
      if (error) throw error;
      return json({ ok: true });
    }
    if (action === "rename") {
      const newName = String(name || "").slice(0, 240).trim();
      if (!newName) return json({ error: "name required" }, 400);
      const { error } = await supabase
        .from("public_tests")
        .update({ name: newName })
        .eq("id", id);
      if (error) throw error;
      // Also update embedded name inside test_data JSON so exam UI matches.
      const { data: row } = await supabase
        .from("public_tests")
        .select("test_data")
        .eq("id", id)
        .maybeSingle();
      if (row?.test_data && typeof row.test_data === "object") {
        const td: any = { ...row.test_data, name: newName };
        await supabase.from("public_tests").update({ test_data: td }).eq("id", id);
      }
      return json({ ok: true });
    }
    return json({ error: "unknown action" }, 400);
  } catch (e: any) {
    return json({ error: e.message || "Server error" }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function hashSecret(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return "sha256$" +
    Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
