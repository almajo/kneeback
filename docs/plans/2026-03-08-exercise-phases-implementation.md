# Exercise Phase System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the `early/mid/late` phase enum with four named rehab stages, assign exercises to the correct stage, and update the onboarding picker to group by phase, lock future phases, and default to zero selections.

**Architecture:** Three sequential steps — DB migration first (schema + data), then TypeScript types, then UI. The UI reads surgery date from the onboarding context (already available) to compute which phases are unlocked.

**Tech Stack:** Supabase (PostgreSQL via MCP), TypeScript, React Native + NativeWind, Expo Router.

---

### Task 1: DB Migration — update phase enum and re-assign exercises

**Files:**
- No file changes — executed via Supabase MCP tool (`mcp__supabase__apply_migration`)

**Step 1: Add new enum values**

Run the following SQL via `mcp__supabase__apply_migration`. The migration name should be `add_new_exercise_phases`.

```sql
-- Add the four new phase values to the enum
-- (PostgreSQL does not allow removing enum values easily, so we add new ones
--  and update all rows; old values become unused but harmless)
ALTER TYPE exercise_phase ADD VALUE IF NOT EXISTS 'acute';
ALTER TYPE exercise_phase ADD VALUE IF NOT EXISTS 'early_active';
ALTER TYPE exercise_phase ADD VALUE IF NOT EXISTS 'strengthening';
ALTER TYPE exercise_phase ADD VALUE IF NOT EXISTS 'return_to_sport';
```

If the column is TEXT with a CHECK constraint (not an enum type), use this instead:

```sql
ALTER TABLE exercises DROP CONSTRAINT IF EXISTS exercises_phase_check;
ALTER TABLE exercises ADD CONSTRAINT exercises_phase_check
  CHECK (phase IN ('acute', 'early_active', 'strengthening', 'return_to_sport'));
```

**Step 2: Re-assign exercise phases**

Run as a second migration named `reassign_exercise_phases`:

```sql
-- Acute phase (0–2 weeks): isometric and passive work, no knee bend required
UPDATE exercises SET phase = 'acute' WHERE name IN (
  'Ankle Pumps',
  'Quad Sets',
  'Hamstring Sets',
  'Straight Leg Raises',
  'Short Arc Quads',
  'Prone Hangs',
  'Patellar Mobilization',
  'Heel Slides',
  'Hip Abduction - Side-Lying'
);

-- Early Active phase (2–6 weeks): partial weight-bearing, quad activation established
UPDATE exercises SET phase = 'early_active' WHERE name IN (
  'Gastrocnemius Stretch',
  'Calf Raises',
  'Wall Slides',
  'Terminal Knee Extensions',
  'Seated Knee Extension',
  'Standing Hamstring Curls'
);
```

**Step 3: Verify**

Run via `mcp__supabase__execute_sql`:

```sql
SELECT name, phase FROM exercises ORDER BY phase, sort_order;
```

Expected: 9 rows with `acute`, 6 rows with `early_active`, 0 rows with `early`/`mid`/`late`.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: migrate exercise phases to acute/early_active/strengthening/return_to_sport"
```

---

### Task 2: Update TypeScript types

**Files:**
- Modify: `lib/types.ts:3`

**Step 1: Update ExercisePhase**

In `lib/types.ts`, change line 3 from:
```typescript
export type ExercisePhase = "early" | "mid" | "late";
```
to:
```typescript
export type ExercisePhase = "acute" | "early_active" | "strengthening" | "return_to_sport";
```

**Step 2: Check for other references to old phase values**

Run:
```bash
grep -r '"early"\|"mid"\|"late"' --include="*.ts" --include="*.tsx" .
```

If any hits reference exercise phases (not other uses of those strings), update them. The `pick-exercises.tsx` file has `.eq("phase", "early")` which will be replaced in Task 3.

**Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: update ExercisePhase type to named rehab stages"
```

---

### Task 3: Rewrite pick-exercises.tsx

**Files:**
- Modify: `app/(onboarding)/pick-exercises.tsx`

This is the main UI change. The screen now:
- Fetches **all** approved exercises (not just one phase)
- Groups them by phase into sections
- Computes `daysSinceSurgery` from `data.surgeryDate` in onboarding context
- Locks future phases (grayed out, non-interactive)
- Defaults to **empty selection**

**Step 1: Replace the file content**

```typescript
import { useEffect, useState } from "react";
import { View, Text, SectionList, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { useOnboarding } from "../../lib/onboarding-context";
import { Colors } from "../../constants/colors";
import type { Exercise, ExercisePhase } from "../../lib/types";

const PHASES: { key: ExercisePhase; label: string; weekRange: string; unlockDay: number }[] = [
  { key: "acute",           label: "Acute",           weekRange: "Weeks 0–2",  unlockDay: 0  },
  { key: "early_active",    label: "Early Active",    weekRange: "Weeks 2–6",  unlockDay: 14 },
  { key: "strengthening",   label: "Strengthening",   weekRange: "Weeks 6–12", unlockDay: 42 },
  { key: "return_to_sport", label: "Return to Sport", weekRange: "Week 12+",   unlockDay: 84 },
];

function daysSince(dateStr: string): number {
  const surgery = new Date(dateStr);
  const today = new Date();
  return Math.floor((today.getTime() - surgery.getTime()) / (1000 * 60 * 60 * 24));
}

export default function PickExercises() {
  const router = useRouter();
  const { data, update } = useOnboarding();
  const [exercisesByPhase, setExercisesByPhase] = useState<Record<string, Exercise[]>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const days = daysSince(data.surgeryDate);

  useEffect(() => {
    supabase
      .from("exercises")
      .select("*")
      .eq("status", "approved")
      .order("sort_order")
      .then(({ data: exs }) => {
        const grouped: Record<string, Exercise[]> = {};
        for (const ex of exs || []) {
          if (!grouped[ex.phase]) grouped[ex.phase] = [];
          grouped[ex.phase].push(ex);
        }
        setExercisesByPhase(grouped);
        setLoading(false);
      });
  }, []);

  function toggleExercise(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleNext() {
    update({ selectedExerciseIds: Array.from(selected) });
    router.push("/(onboarding)/set-reminder");
  }

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  const sections = PHASES.map((phase) => ({
    phase,
    data: exercisesByPhase[phase.key] || [],
    locked: days < phase.unlockDay,
  })).filter((s) => s.data.length > 0 || s.phase.key === "strengthening" || s.phase.key === "return_to_sport");

  return (
    <View className="flex-1 bg-background">
      <View className="px-6 pt-14 pb-4">
        <Text className="text-3xl font-bold text-primary mb-2">Your exercises</Text>
        <Text className="text-base" style={{ color: "#6B6B6B" }}>
          Select the exercises your physio has prescribed. Future phases unlock as you progress.
        </Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => (typeof item === "string" ? item : item.id)}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
        renderSectionHeader={({ section }) => {
          const { phase, locked } = section;
          return (
            <View className="flex-row items-center justify-between py-3 mt-2">
              <View>
                <Text
                  className="font-bold text-base"
                  style={{ color: locked ? "#A0A0A0" : "#2D2D2D" }}
                >
                  {phase.label}
                </Text>
                <Text className="text-xs" style={{ color: "#A0A0A0" }}>
                  {phase.weekRange}
                </Text>
              </View>
              {locked && (
                <View className="bg-surface border border-border rounded-full px-3 py-1">
                  <Text className="text-xs" style={{ color: "#A0A0A0" }}>
                    Unlocks at week {phase.unlockDay / 7}
                  </Text>
                </View>
              )}
            </View>
          );
        }}
        renderItem={({ item, section }) => {
          if (typeof item === "string") return null; // empty placeholder
          const { locked } = section;
          const isSelected = selected.has(item.id);
          return (
            <TouchableOpacity
              className={`mb-3 rounded-2xl border p-4 flex-row items-start ${
                locked
                  ? "bg-surface border-border opacity-40"
                  : isSelected
                  ? "bg-primary/10 border-primary"
                  : "bg-surface border-border"
              }`}
              onPress={() => !locked && toggleExercise(item.id)}
              disabled={locked}
            >
              <Ionicons
                name={isSelected && !locked ? "checkmark-circle" : "ellipse-outline"}
                size={24}
                color={isSelected && !locked ? Colors.primary : Colors.textMuted}
                style={{ marginRight: 12, marginTop: 2 }}
              />
              <View className="flex-1">
                <Text className="font-semibold text-base" style={{ color: locked ? "#A0A0A0" : "#2D2D2D" }}>
                  {item.name}
                </Text>
                <Text className="text-sm mt-1" style={{ color: "#6B6B6B" }} numberOfLines={2}>
                  {item.description}
                </Text>
                <Text className="text-xs mt-1" style={{ color: "#A0A0A0" }}>
                  {item.default_sets} sets ×{" "}
                  {item.default_hold_seconds ? `${item.default_hold_seconds}s hold` : `${item.default_reps} reps`}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View className="items-center py-12">
            <Text className="text-base text-center" style={{ color: "#6B6B6B" }}>
              No exercises found. Check your connection and try again.
            </Text>
          </View>
        }
      />

      <View className="absolute bottom-0 left-0 right-0 bg-background px-6 pb-8 pt-4 border-t border-border">
        <TouchableOpacity className="bg-primary rounded-2xl py-4 items-center" onPress={handleNext}>
          <Text className="text-white font-bold text-lg">
            Next → ({selected.size} selected)
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
```

**Step 2: Verify manually**

Run the app in Expo Go and navigate to the exercise picker screen during onboarding. Confirm:
- [ ] All exercises are deselected by default
- [ ] Acute exercises are shown and tappable (user is day 0+)
- [ ] Early Active section is shown but grayed out with "Unlocks at week 2" badge
- [ ] Tapping a locked exercise does nothing
- [ ] Tapping an unlocked exercise toggles selection
- [ ] "Next → (N selected)" count updates correctly

**Step 3: Commit**

```bash
git add app/(onboarding)/pick-exercises.tsx
git commit -m "feat: group exercises by rehab phase, lock future phases, deselect by default"
```
