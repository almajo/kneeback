/**
 * Export catalog script
 * Pulls approved exercises and content from Supabase → JSON seed files.
 *
 * Usage: npx ts-node scripts/export-catalog.ts
 *
 * Requires environment variables:
 *   EXPO_PUBLIC_SUPABASE_URL
 *   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY or SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "Error: EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY) must be set"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const SEED_DIR = path.join(__dirname, "../lib/db/seed");

async function exportExercises(): Promise<void> {
  console.log("Fetching exercises from Supabase...");

  const { data, error } = await supabase
    .from("exercises")
    .select(
      "id, name, description, phase_start, phase_end, role, primary_exercise_id, muscle_groups, default_sets, default_reps, default_hold_seconds, category, sort_order"
    )
    .eq("status", "approved")
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch exercises: ${error.message}`);
  }

  if (!data || data.length === 0) {
    console.warn("No approved exercises found in Supabase");
    return;
  }

  const outputPath = path.join(SEED_DIR, "exercises.json");
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`Wrote ${data.length} exercises to ${outputPath}`);
}

async function exportContent(): Promise<void> {
  console.log("Fetching content from Supabase...");

  const { data, error } = await supabase
    .from("content")
    .select(
      "id, type, title, body, trigger_condition, phase, sort_order"
    )
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch content: ${error.message}`);
  }

  if (!data || data.length === 0) {
    console.warn("No content found in Supabase");
    return;
  }

  const outputPath = path.join(SEED_DIR, "content.json");
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`Wrote ${data.length} content items to ${outputPath}`);
}

async function main(): Promise<void> {
  if (!fs.existsSync(SEED_DIR)) {
    fs.mkdirSync(SEED_DIR, { recursive: true });
  }

  try {
    await exportExercises();
    await exportContent();
    console.log("Catalog export complete.");
  } catch (err) {
    console.error("Export failed:", err);
    process.exit(1);
  }
}

main();
