import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_KEYS = new Set([
  "test_creation_password",
  "test_creation_password_expires_at",
  "admin_password_1",
  "admin_password_2",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { key, value, ownerPassword } = await req.json();

    if (!ALLOWED_KEYS.has(key)) {
      return new Response(JSON.stringify({ error: "Invalid key" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify owner password matches admin_password_2 in DB
    const { data: pwRow, error: pwErr } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "admin_password_2")
      .maybeSingle();

    if (pwErr) throw pwErr;
    const currentPw = pwRow?.value;
    if (!ownerPassword || ownerPassword !== currentPw) {
      return new Response(JSON.stringify({ error: "Unauthorized: invalid owner password" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: upErr } = await supabase
      .from("app_settings")
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });

    if (upErr) throw upErr;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
