import { supabase } from "./supabase";
import type { CreatePostInput } from "./types";

export async function submitCommunityPost(
  userId: string,
  input: CreatePostInput
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("community_posts")
    .insert({ user_id: userId, ...input });
  return { error: error?.message ?? null };
}
