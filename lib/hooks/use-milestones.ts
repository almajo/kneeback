import { useState, useEffect, useCallback } from "react";
import { generateId } from "../utils/uuid";
import { useDataStore } from "../data/data-store-context";
import type { Milestone } from "../data/data-store.types";

export function useMilestones() {
  const store = useDataStore();
  const today = new Date().toISOString().split("T")[0];
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMilestones = useCallback(async () => {
    setLoading(true);
    const data = await store.getAllMilestones();
    setMilestones(data);
    setLoading(false);
  }, [store]);

  useEffect(() => {
    fetchMilestones();
  }, [fetchMilestones]);

  async function addMilestone(input: {
    title: string;
    category: "milestone" | "win";
    date: string;
    notes?: string;
    template_key?: string;
  }) {
    const id = generateId();
    const created = await store.createMilestone({
      id,
      title: input.title,
      category: input.category,
      date: input.date,
      notes: input.notes ?? null,
      template_key: input.template_key ?? null,
      created_at: new Date().toISOString(),
    });
    setMilestones((prev) =>
      [...prev, created].sort((a, b) => a.date.localeCompare(b.date))
    );
  }

  async function deleteMilestone(id: string) {
    await store.deleteMilestone(id);
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
