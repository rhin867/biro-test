import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TABLES: Record<string, { up: string; down: string; upList: string; downList: string }> = {
  community_messages: { up: "upvotes", down: "downvotes", upList: "liked_by", downList: "disliked_by" },
  hot_question_responses: { up: "likes", down: "downvotes", upList: "liked_by", downList: "disliked_by" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { table, id, userKey, direction } = await req.json();

    const cfg = TABLES[table];
    if (!cfg || typeof id !== "string" || typeof userKey !== "string" || !["up", "down"].includes(direction)) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: row, error: readErr } = await supabase.from(table).select("*").eq("id", id).maybeSingle();
    if (readErr) throw readErr;
    if (!row) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let up = Number(row[cfg.up] ?? 0);
    let down = Number(row[cfg.down] ?? 0);
    let upList: string[] = row[cfg.upList] ?? [];
    let downList: string[] = row[cfg.downList] ?? [];

    if (direction === "up") {
      if (upList.includes(userKey)) {
        upList = upList.filter((k) => k !== userKey);
        up = Math.max(0, up - 1);
      } else {
        upList = [...upList, userKey];
        up += 1;
        if (downList.includes(userKey)) {
          downList = downList.filter((k) => k !== userKey);
          down = Math.max(0, down - 1);
        }
      }
    } else {
      if (downList.includes(userKey)) {
        downList = downList.filter((k) => k !== userKey);
        down = Math.max(0, down - 1);
      } else {
        downList = [...downList, userKey];
        down += 1;
        if (upList.includes(userKey)) {
          upList = upList.filter((k) => k !== userKey);
          up = Math.max(0, up - 1);
        }
      }
    }

    const { error: updErr } = await supabase
      .from(table)
      .update({ [cfg.up]: up, [cfg.down]: down, [cfg.upList]: upList, [cfg.downList]: downList })
      .eq("id", id);
    if (updErr) throw updErr;

    return new Response(
      JSON.stringify({ upvotes: up, downvotes: down, liked_by: upList, disliked_by: downList }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
