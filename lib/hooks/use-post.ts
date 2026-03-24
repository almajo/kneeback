import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase";
import { getProfile } from "../db/repositories/profile-repo";
import { getCommunityIdentity } from "../community-identity";
import type { CommunityPost, CommunityComment } from "../types";

export function usePost(postId: string) {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    import("../device-identity").then(({ getDeviceId }) =>
      getDeviceId().then(setDeviceId)
    );
  }, []);

  const fetchPost = useCallback(async () => {
    if (!postId) return;
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
      deviceId
        ? supabase
            .from("community_reactions")
            .select("id")
            .eq("post_id", postId)
            .eq("device_id", deviceId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    if (rawPost) {
      const commentList = rawComments ?? [];
      const commentIds = commentList.map((c: any) => c.id as string);

      const { data: myCommentReactions } =
        deviceId && commentIds.length > 0
          ? await supabase
              .from("community_comment_reactions")
              .select("comment_id")
              .eq("device_id", deviceId)
              .in("comment_id", commentIds)
          : { data: [] };

      const upvotedCommentIds = new Set(
        (myCommentReactions ?? []).map((r: any) => r.comment_id)
      );

      setPost({
        id: rawPost.id,
        device_id: rawPost.device_id ?? "",
        post_type: rawPost.post_type as CommunityPost["post_type"],
        title: rawPost.title,
        body: rawPost.body,
        upvote_count: rawPost.upvote_count ?? 0,
        created_at: rawPost.created_at,
        author_animal_name: rawPost.author_animal_name ?? "Anonymous",
        author_phase: rawPost.author_phase ?? "",
        comment_count: commentList.length,
        has_upvoted: !!myReaction,
        moderation_status: (rawPost.moderation_status as CommunityPost["moderation_status"]) ?? "pending",
      });

      setComments(
        commentList.map((c: any) => ({
          id: c.id,
          post_id: c.post_id,
          device_id: c.device_id ?? "",
          body: c.body,
          created_at: c.created_at,
          author_animal_name: c.author_animal_name ?? "Anonymous",
          author_phase: c.author_phase ?? "",
          upvote_count: c.upvote_count ?? 0,
          has_upvoted: upvotedCommentIds.has(c.id),
          moderation_status: c.moderation_status ?? "pending",
        }))
      );
    }

    setLoading(false);
  }, [postId, deviceId]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  async function addComment(body: string) {
    if (!deviceId || !postId || !body.trim()) return;

    const profile = await getProfile();
    const identity = await getCommunityIdentity(profile);

    const optimistic: CommunityComment = {
      id: `optimistic-${Date.now()}`,
      post_id: postId,
      device_id: identity.deviceId,
      body: body.trim(),
      created_at: new Date().toISOString(),
      author_animal_name: identity.animalName,
      author_phase: identity.phase,
      upvote_count: 0,
      has_upvoted: false,
      moderation_status: "pending",
    };

    setComments((prev) => [...prev, optimistic]);
    setPost((prev) =>
      prev ? { ...prev, comment_count: prev.comment_count + 1 } : prev
    );

    setSubmitting(true);
    const { data } = await supabase
      .from("community_comments")
      .insert({
        post_id: postId,
        device_id: identity.deviceId,
        author_animal_name: identity.animalName,
        author_phase: identity.phase,
        body: body.trim(),
      })
      .select("*")
      .single();

    if (data) {
      const real: CommunityComment = {
        id: data.id,
        post_id: data.post_id,
        device_id: data.device_id ?? identity.deviceId,
        body: data.body,
        created_at: data.created_at,
        author_animal_name: identity.animalName,
        author_phase: identity.phase,
        upvote_count: 0,
        has_upvoted: false,
        moderation_status: (data.moderation_status as CommunityComment["moderation_status"]) ?? "pending",
      };
      setComments((prev) =>
        prev.map((c) => (c.id === optimistic.id ? real : c))
      );
    }
    setSubmitting(false);
  }

  async function toggleUpvote() {
    if (!deviceId || !post) return;

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
        .eq("device_id", deviceId);
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
        .insert({ post_id: postId, device_id: deviceId });
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
    if (!deviceId) return;

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
      const { error } = await supabase
        .from("community_comment_reactions")
        .delete()
        .eq("comment_id", commentId)
        .eq("device_id", deviceId);
      if (error) {
        console.error("[toggleCommentUpvote] Failed to remove:", error);
        setComments((prev) =>
          prev.map((c) =>
            c.id === commentId
              ? { ...c, has_upvoted: wasUpvoted, upvote_count: c.upvote_count + 1 }
              : c
          )
        );
      }
    } else {
      const { error } = await supabase
        .from("community_comment_reactions")
        .insert({ comment_id: commentId, device_id: deviceId });
      if (error) {
        console.error("[toggleCommentUpvote] Failed to insert:", error);
        setComments((prev) =>
          prev.map((c) =>
            c.id === commentId
              ? { ...c, has_upvoted: wasUpvoted, upvote_count: c.upvote_count - 1 }
              : c
          )
        );
      }
    }
  }

  async function deleteComment(commentId: string) {
    if (!deviceId) return;
    const prevComments = comments;
    const prevPost = post;
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    setPost((prev) =>
      prev ? { ...prev, comment_count: prev.comment_count - 1 } : prev
    );

    const { error } = await supabase
      .from("community_comments")
      .delete()
      .eq("id", commentId)
      .eq("device_id", deviceId);

    if (error) {
      console.error("[deleteComment] Failed:", error);
      setComments(prevComments);
      setPost(prevPost);
    }
  }

  async function editComment(commentId: string, body: string) {
    if (!deviceId || !body.trim()) return;
    const trimmed = body.trim();
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, body: trimmed } : c))
    );

    const { error } = await supabase
      .from("community_comments")
      .update({ body: trimmed })
      .eq("id", commentId)
      .eq("device_id", deviceId);

    if (error) {
      console.error("[editComment] Failed:", error);
      fetchPost();
    }
  }

  async function deletePost(): Promise<boolean> {
    if (!deviceId || !post) return false;
    const { error } = await supabase
      .from("community_posts")
      .delete()
      .eq("id", postId)
      .eq("device_id", deviceId);

    if (error) {
      console.error("[deletePost] Failed:", error);
      return false;
    }
    return true;
  }

  async function editPost(title: string, body: string) {
    if (!deviceId || !post) return;
    const trimTitle = title.trim();
    const trimBody = body.trim();
    if (!trimTitle || !trimBody) return;

    setPost((prev) =>
      prev ? { ...prev, title: trimTitle, body: trimBody } : prev
    );

    const { error } = await supabase
      .from("community_posts")
      .update({ title: trimTitle, body: trimBody })
      .eq("id", postId)
      .eq("device_id", deviceId);

    if (error) {
      console.error("[editPost] Failed:", error);
      fetchPost();
    }
  }

  return {
    post,
    comments,
    loading,
    submitting,
    deviceId,
    addComment,
    deleteComment,
    editComment,
    deletePost,
    editPost,
    toggleUpvote,
    toggleCommentUpvote,
  };
}
