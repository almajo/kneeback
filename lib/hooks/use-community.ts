import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase";
import { useAuth } from "../auth-context";
import type { CommunityPost, CreatePostInput } from "../types";

const PAGE_SIZE = 20;

async function fetchUsernames(userIds: string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();
  const { data } = await supabase
    .from("profiles")
    .select("id, username")
    .in("id", userIds);
  const map = new Map<string, string>();
  (data ?? []).forEach((p: any) => map.set(p.id, p.username));
  return map;
}

async function fetchPage(
  userId: string,
  offset: number
): Promise<CommunityPost[]> {
  const { data: rawPosts, error } = await supabase
    .from("community_posts")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (error || !rawPosts || rawPosts.length === 0) return [];

  const postIds = rawPosts.map((p: any) => p.id as string);
  const authorIds = [...new Set(rawPosts.map((p: any) => p.user_id as string))];

  const [{ data: comments }, { data: myReactions }, usernameMap] =
    await Promise.all([
      supabase
        .from("community_comments")
        .select("post_id")
        .in("post_id", postIds),
      supabase
        .from("community_reactions")
        .select("post_id")
        .eq("user_id", userId)
        .in("post_id", postIds),
      fetchUsernames(authorIds),
    ]);

  const commentCountMap = new Map<string, number>();
  (comments ?? []).forEach((c: any) => {
    commentCountMap.set(c.post_id, (commentCountMap.get(c.post_id) ?? 0) + 1);
  });

  const upvotedSet = new Set((myReactions ?? []).map((r: any) => r.post_id));

  return rawPosts.map((p: any) => ({
    id: p.id,
    user_id: p.user_id,
    post_type: p.post_type,
    title: p.title,
    body: p.body,
    upvote_count: p.upvote_count,
    created_at: p.created_at,
    author_username: usernameMap.get(p.user_id) ?? "Anonymous",
    comment_count: commentCountMap.get(p.id) ?? 0,
    has_upvoted: upvotedSet.has(p.id),
  }));
}

export function useCommunity() {
  const { session } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const userId = session?.user.id;

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const page = await fetchPage(userId, 0);
    setPosts(page);
    setOffset(page.length);
    setHasMore(page.length === PAGE_SIZE);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  async function refresh() {
    if (!userId) return;
    setRefreshing(true);
    const page = await fetchPage(userId, 0);
    setPosts(page);
    setOffset(page.length);
    setHasMore(page.length === PAGE_SIZE);
    setRefreshing(false);
  }

  async function loadMore() {
    if (!userId || !hasMore || loading) return;
    const page = await fetchPage(userId, offset);
    if (page.length === 0) {
      setHasMore(false);
      return;
    }
    setPosts((prev) => [...prev, ...page]);
    setOffset((prev) => prev + page.length);
    setHasMore(page.length === PAGE_SIZE);
  }

  async function createPost(input: CreatePostInput) {
    if (!userId) return;

    const optimisticUsername =
      (await supabase
        .from("profiles")
        .select("username")
        .eq("id", userId)
        .single()
        .then(({ data }) => data?.username)) ??
      session?.user.email?.split("@")[0] ??
      "You";

    const optimistic: CommunityPost = {
      id: `optimistic-${Date.now()}`,
      user_id: userId,
      post_type: input.post_type,
      title: input.title,
      body: input.body,
      upvote_count: 0,
      created_at: new Date().toISOString(),
      author_username: optimisticUsername,
      comment_count: 0,
      has_upvoted: false,
    };

    setPosts((prev) => [optimistic, ...prev]);

    const { data } = await supabase
      .from("community_posts")
      .insert({ user_id: userId, ...input })
      .select("*")
      .single();

    if (data) {
      const real: CommunityPost = {
        id: data.id,
        user_id: data.user_id,
        post_type: data.post_type,
        title: data.title,
        body: data.body,
        upvote_count: data.upvote_count,
        created_at: data.created_at,
        author_username: optimisticUsername,
        comment_count: 0,
        has_upvoted: false,
      };
      setPosts((prev) =>
        prev.map((p) => (p.id === optimistic.id ? real : p))
      );
    }
  }

  async function toggleUpvote(postId: string) {
    if (!userId) return;

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
      await supabase
        .from("community_reactions")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", userId);
    } else {
      await supabase
        .from("community_reactions")
        .insert({ post_id: postId, user_id: userId });
    }
  }

  return {
    posts,
    loading,
    refreshing,
    hasMore,
    createPost,
    toggleUpvote,
    loadMore,
    refresh,
  };
}
