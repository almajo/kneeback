import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SUPPORTED_TABLES = ["community_posts", "community_comments"] as const;
type SupportedTable = (typeof SUPPORTED_TABLES)[number];

function extractText(table: SupportedTable, record: Record<string, unknown>): string {
  if (table === "community_posts") {
    return `${record.title ?? ""}\n${record.body ?? ""}`.trim();
  }
  return String(record.body ?? "").trim();
}

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const { type, table, record } = payload as {
      type: string;
      table: string;
      record: Record<string, unknown>;
    };

    if (type !== "INSERT" || !record?.id) {
      return new Response("ok");
    }

    if (!SUPPORTED_TABLES.includes(table as SupportedTable)) {
      return new Response("ok");
    }

    const text = extractText(table as SupportedTable, record);
    if (!text) {
      // Nothing to moderate — approve immediately
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      await supabase.from(table).update({ moderation_status: "approved" }).eq("id", record.id);
      return new Response("ok");
    }

    // Call OpenAI Moderation API (free endpoint)
    const res = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ input: text }),
    });

    if (!res.ok) {
      console.error("OpenAI moderation API error:", res.status, await res.text());
      // On API failure, approve so content isn't silently suppressed
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      await supabase.from(table).update({ moderation_status: "approved" }).eq("id", record.id);
      return new Response("ok");
    }

    const json = await res.json();
    const flagged = json.results?.[0]?.flagged === true;
    const status = flagged ? "flagged" : "approved";

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error } = await supabase
      .from(table)
      .update({ moderation_status: status })
      .eq("id", record.id);

    if (error) {
      console.error("Supabase update error:", error.message);
    }

    return new Response("ok");
  } catch (err) {
    console.error("moderate-content error:", err);
    return new Response("error", { status: 500 });
  }
});
