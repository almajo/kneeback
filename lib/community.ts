import { supabase } from "./supabase";
import type { CreatePostInput } from "./types";
import type { CommunityIdentity } from "./community-identity";

export async function submitCommunityPost(
  identity: CommunityIdentity,
  input: CreatePostInput
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("community_posts").insert({
    device_id: identity.deviceId,
    author_animal_name: identity.animalName,
    author_phase: identity.phase,
    ...input,
  });
  return { error: error?.message ?? null };
}
