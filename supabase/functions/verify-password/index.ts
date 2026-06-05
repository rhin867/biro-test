// Server-side password verification. Passwords never leave the server.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const KIND_TO_KEY: Record<string, string> = {
  test_creation: "test_creation_password",
  admin_1: "admin_password_1",
  admin_2: "admin_password_2",
};

const DEFAULTS: Record<string, string> = {
  test_creation_password: "1@n2@e",
  admin_password_1: "4918",
  admin_password_2: "555911",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { kind, password } = await req.json();
    const key = KIND_TO_KEY[kind];
    if (!key) {
      return json({ ok: false, error: "Invalid kind" }, 400);
    }
    if (typeof password !== "string" || password.length > 256) {
      return json({ ok: false, error: "Invalid password" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase
      .from("app_settings")
      .select("key,value")
      .in("key", [key, "test_creation_password_expires_at"]);

    if (error) throw error;

    const map = new Map(data?.map((r: any) => [r.key, r.value]) ?? []);
    const stored = (map.get(key) as string) ?? DEFAULTS[key];
    const expiresAt = map.get("test_creation_password_expires_at") as string | null | undefined;

    // expiry only applies to test_creation
    if (kind === "test_creation" && expiresAt && new Date(expiresAt) < new Date()) {
      return json({ ok: false, error: "Password expired. Ask owner for the new one." }, 401);
    }

    if (password !== stored) {
      return json({ ok: false, error: "Incorrect password" }, 401);
    }

    return json({
      ok: true,
      expiresAt: kind === "test_creation" ? expiresAt ?? null : null,
    });
  } catch (e: any) {
    return json({ ok: false, error: e.message || "Server error" }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
