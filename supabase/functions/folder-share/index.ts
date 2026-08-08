// Server-side folder share management.
// Passwords are hashed (SHA-256) before storage and verified here only.
// The client never sends or receives the stored hash.
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

    if (action === "create") {
      const folderName = String(body?.folderName || "").slice(0, 200).trim();
      const ownerUserKey = String(body?.ownerUserKey || "").slice(0, 200).trim();
      const sharedWithEmail = body?.sharedWithEmail ? String(body.sharedWithEmail).slice(0, 240).trim() : null;
      const rawPassword = body?.password ? String(body.password).slice(0, 200) : "";
      if (!folderName || !ownerUserKey) return json({ error: "folderName and ownerUserKey required" }, 400);

      const { data, error } = await supabase
        .from("test_folder_shares")
        .insert({
          folder_name: folderName,
          owner_user_key: ownerUserKey,
          shared_with_email: sharedWithEmail,
          password_hash: rawPassword ? await hashSecret(rawPassword) : null,
        })
        .select("share_token")
        .single();
      if (error) throw error;
      return json({ ok: true, shareToken: data.share_token });
    }

    if (action === "info") {
      const token = String(body?.token || "").trim();
      if (!token) return json({ error: "token required" }, 400);
      const { data, error } = await supabase
        .from("test_folder_shares")
        .select("id, folder_name, password_hash")
        .eq("share_token", token)
        .maybeSingle();
      if (error) throw error;
      if (!data) return json({ error: "Folder not found or link expired" }, 404);
      return json({ ok: true, folderName: data.folder_name, requiresPassword: !!data.password_hash });
    }

    if (action === "request_access") {
      const token = String(body?.token || "").trim();
      const email = String(body?.email || "").slice(0, 240).trim();
      const userKey = String(body?.userKey || "").slice(0, 200).trim();
      const password = body?.password ? String(body.password).slice(0, 200) : "";
      if (!token || !email || !userKey) return json({ error: "token, email and userKey required" }, 400);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Invalid email" }, 400);

      const { data: share, error } = await supabase
        .from("test_folder_shares")
        .select("id, password_hash")
        .eq("share_token", token)
        .maybeSingle();
      if (error) throw error;
      if (!share) return json({ error: "Invalid share link" }, 404);

      if (share.password_hash) {
        const stored = share.password_hash as string;
        const ok = stored.startsWith("sha256$")
          ? stored === await hashSecret(password)
          : stored === password;
        if (!ok) return json({ error: "Incorrect folder password" }, 401);
      }

      const { error: insErr } = await supabase.from("folder_access_requests").insert({
        folder_share_id: share.id,
        requester_user_key: userKey,
        requester_email: email,
      });
      if (insErr) throw insErr;
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("folder-share error", e);
    return json({ error: "Request failed" }, 500);
  }
});
