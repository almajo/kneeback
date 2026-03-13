import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase";
import { useAuth } from "../auth-context";
import type { CommunityPost, CommunityComment } from "../types";
import { getPhaseFromDate } from "../utils/format-time";

async function getProfile(userId: string): Promise<{ username: string; phase: string }> {
  const { data, error } = await supabase
    .from("profiles")
    .select("username, surgery_date")
    .eq("id", userId)
    .single();
  if (error) {
    console.error("[getProfile] Failed to load profile:", error);
  }
  return {
    username: data?.username ?? "Anonymous",
    phase: data?.surgery_date ? getPhaseFromDate(data.surgery_date) : "",
  };
}

export function usePost(postId: string) {
  const { session } = useAuth();
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const userId = session?.user.id;

  const fetchPost = useCallback(async () => {
    if (!userId || !postId) return;
    setLoading(true);

    const [
      { data: rawPost },
      { data: rawComments },
      { data: myReaction },
    ] = await Promise.all([
      supabase
        .from("community_posts")
        .select("*")
        .eq("id", postId)
        .single(),
      supabase
        .from("community_comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true }),
      supabase
        .from("community_reactions")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    if (rawPost) {
      const commentList = rawComments ?? [];
      const commentIds = commentList.map((c: any) => c.id as string);
      const commentAuthorIds = [
        ...new Set(commentList.map((c: any) => c.user_id as string)),
      ];
      const allUserIds = [...new Set([rawPost.user_id, ...commentAuthorIds])];

      const [{ data: profiles }, { data: myCommentReactions }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, username, surgery_date")
          .in("id", allUserIds),
        commentIds.length > 0
          ? supabase
              .from("community_comment_reactions")
              .select("comment_id")
              .eq("user_id", userId)
              .in("comment_id", commentIds)
          : Promise.resolve({ data: [] }),
      ]);

      const profileMap = new Map(
        (profiles ?? []).map((p: any) => [
          p.id,
          { username: p.username, phase: getPhaseFromDate(p.surgery_date) },
        ])
      );

      const upvotedCommentIds = new Set(
        (myCommentReactions ?? []).map((r: any) => r.comment_id)
      );

      setPost({
        id: rawPost.id,
        user_id: rawPost.user_id,
        post_type: rawPost.post_type,
        title: rawPost.title,
        body: rawPost.body,
        upvote_count: rawPost.upvote_count,
        created_at: rawPost.created_at,
        author_username: profileMap.get(rawPost.user_id)?.username ?? "Anonymous",
        author_phase: profileMap.get(rawPost.user_id)?.phase ?? "",
        comment_count: commentList.length,
        has_upvoted: !!myReaction,
      });

      setComments(
        commentList.map((c: any) => ({
          id: c.id,
          post_id: c.post_id,
          user_id: c.user_id,
          body: c.body,
          created_at: c.created_at,
          author_username: profileMap.get(c.user_id)?.username ?? "Anonymous",
          author_phase: profileMap.get(c.user_id)?.phase ?? "",
          upvote_count: c.upvote_count ?? 0,
          has_upvoted: upvotedCommentIds.has(c.id),
        }))
      );
    }

    setLoading(false);
  }, [userId, postId]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  async function addComment(body: string) {
    if (!userId || !postId || !body.trim()) return;

    const { username: myUsername, phase: myPhase } = await getProfile(userId);

    const optimistic: CommunityComment = {
      id: `optimistic-${Date.now()}`,
      post_id: postId,
      user_id: userId,
      body: body.trim(),
      created_at: new Date().toISOString(),
      author_username: myUsername,
      author_phase: myPhase,
      upvote_count: 0,
      has_upvoted: false,
    };

    setComments((prev) => [...prev, optimistic]);
    setPost((prev) =>
      prev ? { ...prev, comment_count: prev.comment_count + 1 } : prev
    );

    setSubmitting(true);
    const { data } = await supabase
      .from("community_comments")
      .insert({ post_id: postId, user_id: userId, body: body.trim() })
      .select("*")
      .single();

    if (data) {
      const real: CommunityComment = {
        id: data.id,
        post_id: data.post_id,
        user_id: data.user_id,
        body: data.body,
        created_at: data.created_at,
        author_username: myUsername,
        author_phase: myPhase,
        upvote_count: 0,
        has_upvoted: false,
      };
      setComments((prev) =>
        prev.map((c) => (c.id === optimistic.id ? real : c))
      );
    }
    setSubmitting(false);
  }

  async function toggleUpvote() {
    if (!userId || !post) return;

    const wasUpvoted = post.has_upvoted;

    setPost((prev) =>
      prev
        ? {
            ...prev,
            has_upvoted: !wasUpvoted,
            upvote_count: wasUpvoted
              ? prev.upvote_count - 1
              : prev.upvote_count + 1,
          }
        : prev
    );

    if (wasUpvoted) {
      const { error } = await supabase
        .from("community_reactions")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", userId);
      if (error) {
        console.error("[toggleUpvote] Failed to remove reaction:", error);
        setPost((prev) =>
          prev
            ? { ...prev, has_upvoted: wasUpvoted, upvote_count: prev.upvote_count + 1 }
            : prev
        );
      }
    } else {
      const { error } = await supabase
        .from("community_reactions")
        .insert({ post_id: postId, user_id: userId });
      if (error) {
        console.error("[toggleUpvote] Failed to insert reaction:", error);
        setPost((prev) =>
          prev
            ? { ...prev, has_upvoted: wasUpvoted, upvote_count: prev.upvote_count - 1 }
            : prev
        );
      }
    }
  }

  async function toggleCommentUpvote(commentId: string) {
    if (!userId) return;

    const comment = comments.find((c) => c.id === commentId);
    if (!comment) return;

    const wasUpvoted = comment.has_upvoted;

    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? {
              ...c,
              has_upvoted: !wasUpvoted,
              upvote_count: wasUpvoted ? c.upvote_count - 1 : c.upvote_count + 1,
            }
          : c
      )
    );

    if (wasUpvoted) {
      await supabase
        .from("community_comment_reactions")
        .delete()
        .eq("comment_id", commentId)
        .eq("user_id", userId);
    } else {
      await supabase
        .from("community_comment_reactions")
        .insert({ comment_id: commentId, user_id: userId });
    }
  }

  return {
    post,
    comments,
    loading,
    submitting,
    addComment,
    toggleUpvote,
    toggleCommentUpvote,
  };
}
