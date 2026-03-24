import { getProfile } from "../repositories/profile-repo";
import { db as drizzleDb } from "../database-context";
import { supabase } from "../../supabase";

const LOCAL_DATA_TABLES = [
  "user_exercises",
  "daily_logs",
  "exercise_logs",
  "rom_measurements",
  "milestones",
  "user_achievements",
  "user_gate_criteria",
  "notification_preferences",
] as const;

const CLOUD_DATA_TABLES = [
  "user_exercises",
  "daily_logs",
  "exercise_logs",
  "rom_measurements",
  "milestones",
] as const;

export async function detectLocalData(): Promise<boolean> {
  const localProfile = await getProfile();
  if (localProfile?.surgery_date || localProfile?.graft_type) return true;
  for (const table of LOCAL_DATA_TABLES) {
    const row = drizzleDb.$client.getFirstSync<{ id: string }>(`SELECT id FROM ${table} LIMIT 1`);
    if (row) return true;
  }
  return false;
}

export async function detectCloudData(userId: string): Promise<boolean> {
  // Check profiles table first
  const { data: cloudProfile, error: profileError } = await supabase
    .from("profiles" as never)
    .select("id")
    .eq("id", userId)
    .maybeSingle() as { data: { id: string } | null; error: unknown };

  if (profileError) {
    console.error("[detectCloudData] Error checking cloud profile:", profileError);
    return true; // conservative: assume data exists on error
  }
  if (cloudProfile) return true;

  // Check key user data tables
  for (const table of CLOUD_DATA_TABLES) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from(table as any) as any)
      .select("id")
      .eq("user_id", userId)
      .limit(1) as { data: { id: string }[] | null; error: unknown };

    if (error) {
      console.error(`[detectCloudData] Error checking cloud table ${table}:`, error);
      return true; // conservative: assume data exists on error
    }
    if (data && data.length > 0) return true;
  }
  return false;
}
