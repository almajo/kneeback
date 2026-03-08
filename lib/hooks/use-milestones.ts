import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase";
import { useAuth } from "../auth-context";
import type { Milestone } from "../types";

const today = new Date().toISOString().split("T")[0];

export function useMilestones() {
  const { session } = useAuth();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);

  const userId = session?.user.id;

  const fetchMilestones = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from("milestones")
      .select("*")
      .eq("user_id", userId)
      .order("date");
    setMilestones((data as Milestone[]) || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchMilestones();
  }, [fetchMilestones]);

  async function addMilestone(input: {
    title: string;
    category: 'milestone' | 'win';
    date: string;
    notes?: string;
    template_key?: string;
  }) {
    if (!userId) return;
    const { data } = await supabase
      .from("milestones")
      .insert({
        user_id: userId,
        title: input.title,
        category: input.category,
        date: input.date,
        notes: input.notes ?? null,
        template_key: input.template_key ?? null,
      })
      .select()
      .single();
    if (data) {
      setMilestones((prev) =>
        [...prev, data as Milestone].sort((a, b) => a.date.localeCompare(b.date))
      );
    }
  }

  async function deleteMilestone(id: string) {
    await supabase.from("milestones").delete().eq("id", id);
    setMilestones((prev) => prev.filter((m) => m.id !== id));
  }

  const todayMilestones = milestones.filter((m) => m.date === today);

  return {
    milestones,
    todayMilestones,
    addMilestone,
    deleteMilestone,
    loading,
    refetch: fetchMilestones,
  };
}
