import { useState, useEffect, useCallback } from "react";
import { useSQLiteContext } from "expo-sqlite";
import { generateId } from "../utils/uuid";
import {
  getAllMilestones,
  createMilestone,
  deleteMilestone as deleteMilestoneRepo,
  type LocalMilestone,
} from "../db/repositories/milestone-repo";

export function useMilestones() {
  const db = useSQLiteContext();
  const today = new Date().toISOString().split("T")[0];
  const [milestones, setMilestones] = useState<LocalMilestone[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMilestones = useCallback(() => {
    setLoading(true);
    const data = getAllMilestones(db);
    setMilestones(data);
    setLoading(false);
  }, [db]);

  useEffect(() => {
    fetchMilestones();
  }, [fetchMilestones]);

  function addMilestone(input: {
    title: string;
    category: "milestone" | "win";
    date: string;
    notes?: string;
    template_key?: string;
  }) {
    const id = generateId();
    const created = createMilestone(db, {
      id,
      title: input.title,
      category: input.category,
      date: input.date,
      notes: input.notes ?? null,
      template_key: input.template_key ?? null,
    });
    setMilestones((prev) =>
      [...prev, created].sort((a, b) => a.date.localeCompare(b.date))
    );
  }

  function deleteMilestone(id: string) {
    deleteMilestoneRepo(db, id);
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
