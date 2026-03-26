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

    console.log(`[moderate-content] type=${type} table=${table} id=${record?.id}`);

    if (!record?.id) {
      console.log("[moderate-content] skipping: no record id");
      return new Response("ok");
    }

    if (type === "UPDATE") {
      const oldRecord = payload.old_record as Record<string, unknown> | null;
      const contentChanged =
        record.body !== oldRecord?.body ||
        (record.title !== undefined && record.title !== oldRecord?.title);
      console.log(`[moderate-content] UPDATE contentChanged=${contentChanged}`);
      if (!contentChanged) return new Response("ok");
    } else if (type !== "INSERT") {
      console.log(`[moderate-content] skipping: unsupported type=${type}`);
      return new Response("ok");
    }

    if (!SUPPORTED_TABLES.includes(table as SupportedTable)) {
      console.log(`[moderate-content] skipping: unsupported table=${table}`);
      return new Response("ok");
    }

    const text = extractText(table as SupportedTable, record);
    console.log(`[moderate-content] text to moderate: "${text}"`);

    if (!text) {
      console.log("[moderate-content] empty text, approving immediately");
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      await supabase.from(table).update({ moderation_status: "approved" }).eq("id", record.id);
      return new Response("ok");
    }

    const requestBody = { model: "text-moderation-latest", input: text };
    console.log("[moderate-content] calling OpenAI:", JSON.stringify(requestBody));

    const res = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const rawResponse = await res.text();
    console.log(`[moderate-content] OpenAI status=${res.status} response=${rawResponse}`);

    if (!res.ok) {
      console.error("[moderate-content] OpenAI error, approving to avoid suppression");
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      await supabase.from(table).update({ moderation_status: "approved" }).eq("id", record.id);
      return new Response("ok");
    }

    const json = JSON.parse(rawResponse);
    const result = json.results?.[0];
    console.log(`[moderate-content] flagged=${result?.flagged} categories=${JSON.stringify(result?.categories)}`);

    const flagged = result?.flagged === true;
    const status = flagged ? "flagged" : "approved";
    console.log(`[moderate-content] setting moderation_status=${status}`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error } = await supabase
      .from(table)
      .update({ moderation_status: status })
      .eq("id", record.id);

    if (error) {
      console.error("[moderate-content] Supabase update error:", error.message);
    }

    return new Response("ok");
  } catch (err) {
    console.error("moderate-content error:", err);
    return new Response("error", { status: 500 });
  }
});
