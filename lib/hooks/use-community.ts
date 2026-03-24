import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase";
import { getProfile } from "../db/repositories/profile-repo";
import { getCommunityIdentity } from "../community-identity";
import type { CommunityPost, CreatePostInput } from "../types";

const PAGE_SIZE = 20;

async function fetchPage(
  deviceId: string,
  offset: number
): Promise<CommunityPost[]> {
  const { data: rawPosts, error } = await supabase
    .from("community_posts")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (error) {
    console.error("[fetchPage] Failed to load community posts:", error);
    return [];
  }
  if (!rawPosts || rawPosts.length === 0) return [];

  const postIds = rawPosts.map((p: any) => p.id as string);

  const [{ data: comments }, { data: myReactions }] = await Promise.all([
    supabase
      .from("community_comments")
      .select("post_id")
      .in("post_id", postIds),
    supabase
      .from("community_reactions")
      .select("post_id")
      .eq("device_id", deviceId)
      .in("post_id", postIds),
  ]);

  const commentCountMap = new Map<string, number>();
  (comments ?? []).forEach((c: any) => {
    commentCountMap.set(c.post_id, (commentCountMap.get(c.post_id) ?? 0) + 1);
  });

  const upvotedSet = new Set((myReactions ?? []).map((r: any) => r.post_id));

  return rawPosts.map((p: any) => ({
    id: p.id,
    device_id: p.device_id ?? "",
    post_type: p.post_type,
    title: p.title,
    body: p.body,
    upvote_count: p.upvote_count ?? 0,
    created_at: p.created_at,
    author_animal_name: p.author_animal_name ?? "Anonymous",
    author_phase: p.author_phase ?? "",
    comment_count: commentCountMap.get(p.id) ?? 0,
    has_upvoted: upvotedSet.has(p.id),
    moderation_status: p.moderation_status ?? "pending",
  }));
}

export function useCommunity() {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    import("../device-identity").then(({ getDeviceId }) =>
      getDeviceId().then(setDeviceId)
    );
  }, []);

  const load = useCallback(async () => {
    if (!deviceId) return;
    setLoading(true);
    const page = await fetchPage(deviceId, 0);
    setPosts(page);
    setOffset(page.length);
    setHasMore(page.length === PAGE_SIZE);
    setLoading(false);
  }, [deviceId]);

  useEffect(() => {
    load();
  }, [load]);

  async function refresh() {
    if (!deviceId) return;
    setRefreshing(true);
    const page = await fetchPage(deviceId, 0);
    setPosts(page);
    setOffset(page.length);
    setHasMore(page.length === PAGE_SIZE);
    setRefreshing(false);
  }

  async function loadMore() {
    if (!deviceId || !hasMore || loading) return;
    const page = await fetchPage(deviceId, offset);
    if (page.length === 0) {
      setHasMore(false);
      return;
    }
    setPosts((prev) => [...prev, ...page]);
    setOffset((prev) => prev + page.length);
    setHasMore(page.length === PAGE_SIZE);
  }

  async function createPost(input: CreatePostInput) {
    if (!deviceId) return;
    const profile = await getProfile();
    const identity = await getCommunityIdentity(profile);

    const optimistic: CommunityPost = {
      id: `optimistic-${Date.now()}`,
      device_id: identity.deviceId,
      post_type: input.post_type,
      title: input.title,
      body: input.body,
      upvote_count: 0,
      created_at: new Date().toISOString(),
      author_animal_name: identity.animalName,
      author_phase: identity.phase,
      comment_count: 0,
      has_upvoted: false,
      moderation_status: "pending",
    };

    setPosts((prev) => [optimistic, ...prev]);

    const { data } = await supabase
      .from("community_posts")
      .insert({
        device_id: identity.deviceId,
        author_animal_name: identity.animalName,
        author_phase: identity.phase,
        ...input,
      })
      .select("*")
      .single();

    if (data) {
      const real: CommunityPost = {
        id: data.id,
        device_id: data.device_id,
        post_type: data.post_type as CommunityPost["post_type"],
        title: data.title,
        body: data.body,
        upvote_count: data.upvote_count ?? 0,
        created_at: data.created_at,
        author_animal_name: identity.animalName,
        author_phase: identity.phase,
        comment_count: 0,
        has_upvoted: false,
        moderation_status: (data.moderation_status as CommunityPost["moderation_status"]) ?? "pending",
      };
      setPosts((prev) =>
        prev.map((p) => (p.id === optimistic.id ? real : p))
      );
    }
  }

  async function toggleUpvote(postId: string) {
    if (!deviceId) return;

    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const wasUpvoted = post.has_upvoted;

    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              has_upvoted: !wasUpvoted,
              upvote_count: wasUpvoted
                ? p.upvote_count - 1
                : p.upvote_count + 1,
            }
          : p
      )
    );

    if (wasUpvoted) {
      const { error } = await supabase
        .from("community_reactions")
        .delete()
        .eq("post_id", postId)
        .eq("device_id", deviceId);
      if (error) {
        console.error("[toggleUpvote] Failed to remove reaction:", error);
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, has_upvoted: wasUpvoted, upvote_count: p.upvote_count + 1 }
              : p
          )
        );
      }
    } else {
      const { error } = await supabase
        .from("community_reactions")
        .insert({ post_id: postId, device_id: deviceId });
      if (error) {
        console.error("[toggleUpvote] Failed to insert reaction:", error);
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, has_upvoted: wasUpvoted, upvote_count: p.upvote_count - 1 }
              : p
          )
        );
      }
    }
  }

  async function deletePost(postId: string) {
    if (!deviceId) return;
    const prevPosts = posts;
    setPosts((prev) => prev.filter((p) => p.id !== postId));

    const { error } = await supabase
      .from("community_posts")
      .delete()
      .eq("id", postId)
      .eq("device_id", deviceId);

    if (error) {
      console.error("[deletePost] Failed:", error);
      setPosts(prevPosts);
    }
  }

  return {
    posts,
    loading,
    refreshing,
    hasMore,
    deviceId,
    createPost,
    deletePost,
    toggleUpvote,
    loadMore,
    refresh,
  };
}
