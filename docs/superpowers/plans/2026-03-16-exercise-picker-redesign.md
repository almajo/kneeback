# Exercise Picker Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the exercise picker to eliminate duplicate exercises, hide prehab post-surgery, group exercises by category with primary-first display, and add a quick-setup onboarding screen.

**Architecture:** DB migration adds `phase_start`/`phase_end`/`role`/`muscle_groups` to `exercises` and deduplicates rows; TypeScript types are updated; the exercise picker is rebuilt with phase+category sections, alternatives expansion, and optional collapse; onboarding gets a new quick-setup screen that pre-selects phase-appropriate primaries.

**Tech Stack:** React Native / Expo, Supabase (PostgreSQL), TypeScript, NativeWind (Tailwind classes), expo-router

---

## Chunk 1: Database Migration

### Task 1: Add enums and columns to exercises table

**Files:**
- No file to create — apply SQL via Supabase MCP (`mcp__supabase__apply_migration`)

- [ ] **Step 1: Apply schema migration**

Run via Supabase MCP `apply_migration` with name `exercise_picker_phase_range`:

```sql
-- 1. New enums
CREATE TYPE exercise_role AS ENUM ('primary', 'alternative', 'optional');
CREATE TYPE exercise_muscle_group AS ENUM (
  'Quad', 'Hamstring', 'Hip', 'Calf', 'Knee ROM', 'Core', 'Glute'
);

-- 2. New columns (nullable until seed is run)
-- Note: phase_start/phase_end are text (not a PG enum) because ExercisePhase
-- is a TypeScript union, not a Postgres enum in this codebase.
ALTER TABLE exercises
  ADD COLUMN phase_start text,
  ADD COLUMN phase_end   text,
  ADD COLUMN role        exercise_role,
  ADD COLUMN primary_exercise_id uuid REFERENCES exercises(id),
  ADD COLUMN muscle_groups exercise_muscle_group[] DEFAULT '{}';
```

- [ ] **Step 2: Verify columns exist**

Run via Supabase MCP `execute_sql`:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'exercises'
  AND column_name IN ('phase_start','phase_end','role','primary_exercise_id','muscle_groups')
ORDER BY column_name;
```
Expected: 5 rows returned.

---

### Task 2: Seed exercise metadata and deduplicate rows

**Files:**
- No file to create — apply SQL via Supabase MCP

> **Note:** The exercises below are named exactly as they appear in the current DB (sourced from `content/EXERCICES.md`). The migration keeps the row with the lowest `sort_order` for each exercise name and deletes the rest before updating.

- [ ] **Step 0: Check for FK conflicts before deduplication**

Before deleting duplicate rows, verify that no `user_exercises` rows reference the soon-to-be-deleted duplicates. Run via Supabase MCP `execute_sql`:

```sql
-- Identify duplicate exercise IDs (all but the canonical/lowest sort_order row)
WITH ranked AS (
  SELECT id, name,
         ROW_NUMBER() OVER (PARTITION BY name ORDER BY sort_order ASC, id ASC) AS rn
  FROM exercises
)
SELECT ue.id AS user_exercise_id, e.name, e.id AS duplicate_exercise_id
FROM user_exercises ue
JOIN exercises e ON e.id = ue.exercise_id
WHERE e.id IN (SELECT id FROM ranked WHERE rn > 1);
```

If **any rows are returned**, those `user_exercises` must be updated to point to the canonical exercise ID before deletion. For each duplicate found, run:
```sql
UPDATE user_exercises
SET exercise_id = (
  SELECT id FROM exercises WHERE name = '<exercise_name>' ORDER BY sort_order ASC LIMIT 1
)
WHERE exercise_id = '<duplicate_id>';
```
Only proceed to Step 1 once this query returns 0 rows.

- [ ] **Step 1: Apply seed + deduplication migration** (name: `exercise_seed_phase_range`)

```sql
-- ============================================================
-- STEP A: Delete duplicate rows, keep lowest sort_order per name
-- ============================================================
DELETE FROM exercises
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY name ORDER BY sort_order ASC, id ASC) AS rn
    FROM exercises
  ) ranked
  WHERE rn > 1
);

-- ============================================================
-- STEP B: Populate phase_start, phase_end, role, muscle_groups
-- ============================================================

-- Mobility / ROM exercises
UPDATE exercises SET phase_start='prehab', phase_end='acute',        role='primary',     muscle_groups=ARRAY['Knee ROM']::exercise_muscle_group[] WHERE name='Everyday Knee Extensions';
UPDATE exercises SET phase_start='prehab', phase_end='acute',        role='primary',     muscle_groups=ARRAY['Knee ROM']::exercise_muscle_group[] WHERE name='Supine Knee Extensions';
UPDATE exercises SET phase_start='prehab', phase_end='acute',        role='alternative', muscle_groups=ARRAY['Knee ROM']::exercise_muscle_group[] WHERE name='Prone Knee Extensions';
UPDATE exercises SET phase_start='prehab', phase_end='strengthening',role='alternative', muscle_groups=ARRAY['Knee ROM']::exercise_muscle_group[] WHERE name='Seated Passive-Assisted Knee Extensions';
UPDATE exercises SET phase_start='prehab', phase_end='acute',        role='primary',     muscle_groups=ARRAY['Knee ROM']::exercise_muscle_group[] WHERE name='Heel Slides';
UPDATE exercises SET phase_start='prehab', phase_end='acute',        role='primary',     muscle_groups=ARRAY['Calf']::exercise_muscle_group[]    WHERE name='Ankle Pumps';
UPDATE exercises SET phase_start='acute',  phase_end='early_active', role='primary',     muscle_groups=ARRAY['Knee ROM']::exercise_muscle_group[] WHERE name='Patellar Mobilization';

-- Strengthening — Quad / Hamstring
UPDATE exercises SET phase_start='prehab', phase_end='early_active', role='primary',     muscle_groups=ARRAY['Quad']::exercise_muscle_group[]                WHERE name='Quadriceps Set';
UPDATE exercises SET phase_start='prehab', phase_end='acute',        role='primary',     muscle_groups=ARRAY['Hamstring']::exercise_muscle_group[]           WHERE name='Hamstring Set — on Your Back';
UPDATE exercises SET phase_start='prehab', phase_end='acute',        role='alternative', muscle_groups=ARRAY['Hamstring']::exercise_muscle_group[]           WHERE name='Hamstring Set — on Your Stomach';
UPDATE exercises SET phase_start='prehab', phase_end='acute',        role='alternative', muscle_groups=ARRAY['Hamstring']::exercise_muscle_group[]           WHERE name='Hamstring Set — Standing';
UPDATE exercises SET phase_start='prehab', phase_end='acute',        role='primary',     muscle_groups=ARRAY['Quad','Hamstring']::exercise_muscle_group[]    WHERE name='Hamstring / Quadriceps Co-Contraction';
UPDATE exercises SET phase_start='prehab', phase_end='acute',        role='primary',     muscle_groups=ARRAY['Quad','Hip']::exercise_muscle_group[]          WHERE name='Straight Leg Raises';
UPDATE exercises SET phase_start='early_active', phase_end='early_active', role='primary', muscle_groups=ARRAY['Quad','Hip']::exercise_muscle_group[]       WHERE name='Straight Leg Raises With Resistance';
UPDATE exercises SET phase_start='prehab', phase_end='acute',        role='primary',     muscle_groups=ARRAY['Glute','Hip']::exercise_muscle_group[]         WHERE name='Prone Straight Leg Raises';
UPDATE exercises SET phase_start='prehab', phase_end='early_active', role='alternative', muscle_groups=ARRAY['Glute','Hip']::exercise_muscle_group[]         WHERE name='Standing Hip Extensions';
UPDATE exercises SET phase_start='prehab', phase_end='acute',        role='alternative', muscle_groups=ARRAY['Hamstring']::exercise_muscle_group[]           WHERE name='Prone Hamstring Curls';
UPDATE exercises SET phase_start='acute',  phase_end='early_active', role='alternative', muscle_groups=ARRAY['Quad']::exercise_muscle_group[]               WHERE name='Standing Terminal Knee Extension';

-- Strengthening — Calf / Hip
UPDATE exercises SET phase_start='prehab', phase_end=null,           role='primary',     muscle_groups=ARRAY['Calf']::exercise_muscle_group[]               WHERE name='Double-Leg Heel Raises';
UPDATE exercises SET phase_start='acute',  phase_end=null,           role='primary',     muscle_groups=ARRAY['Calf']::exercise_muscle_group[]               WHERE name='Single-Leg Heel Raises';
UPDATE exercises SET phase_start='prehab', phase_end='strengthening',role='primary',     muscle_groups=ARRAY['Quad','Glute']::exercise_muscle_group[]        WHERE name='Double-Leg Quarter Squats';
UPDATE exercises SET phase_start='prehab', phase_end='early_active', role='primary',     muscle_groups=ARRAY['Hip','Glute']::exercise_muscle_group[]         WHERE name='Side-Lying Hip Abduction';
UPDATE exercises SET phase_start='early_active', phase_end='strengthening', role='primary', muscle_groups=ARRAY['Quad','Hip']::exercise_muscle_group[]      WHERE name='Standing Hip Flexion With Resistance';
UPDATE exercises SET phase_start='early_active', phase_end='strengthening', role='primary', muscle_groups=ARRAY['Glute','Hip']::exercise_muscle_group[]     WHERE name='Standing Single-Leg Hip Extension With Resistance';
UPDATE exercises SET phase_start='early_active', phase_end='strengthening', role='primary', muscle_groups=ARRAY['Hip','Glute']::exercise_muscle_group[]     WHERE name='Standing Single-Leg Hip Abduction With Resistance';
UPDATE exercises SET phase_start='early_active', phase_end='strengthening', role='primary', muscle_groups=ARRAY['Quad','Hip','Core']::exercise_muscle_group[] WHERE name='Standing Anterior Reach';
UPDATE exercises SET phase_start='early_active', phase_end='strengthening', role='primary', muscle_groups=ARRAY['Hamstring','Glute']::exercise_muscle_group[] WHERE name='Standing Hip Hinge';
UPDATE exercises SET phase_start='early_active', phase_end='strengthening', role='primary', muscle_groups=ARRAY['Quad','Glute','Hip']::exercise_muscle_group[] WHERE name='Side Step Up';
UPDATE exercises SET phase_start='strengthening', phase_end='strengthening', role='primary', muscle_groups=ARRAY['Quad','Glute','Hip']::exercise_muscle_group[] WHERE name='Front Step Ups';
UPDATE exercises SET phase_start='strengthening', phase_end=null,    role='primary',     muscle_groups=ARRAY['Quad','Hamstring','Core']::exercise_muscle_group[] WHERE name='Double-Leg Hopping';

-- Return to sport
UPDATE exercises SET phase_start='advanced_strengthening', phase_end=null, role='primary', muscle_groups=ARRAY['Quad','Hamstring','Core']::exercise_muscle_group[] WHERE name='Running';
UPDATE exercises SET phase_start='return_to_sport', phase_end=null,  role='primary',     muscle_groups=ARRAY['Quad','Hamstring','Hip','Core']::exercise_muscle_group[] WHERE name='Cutting / Deceleration / Pivoting';
UPDATE exercises SET phase_start='advanced_strengthening', phase_end=null, role='primary', muscle_groups=ARRAY['Quad','Hamstring','Core']::exercise_muscle_group[] WHERE name='Single-Leg Plyometrics';

-- Optional exercises
UPDATE exercises SET phase_start='prehab', phase_end='acute',        role='optional',    muscle_groups=ARRAY['Hamstring']::exercise_muscle_group[]           WHERE name='Standing Hamstring Curls';
UPDATE exercises SET phase_start='prehab', phase_end='acute',        role='optional',    muscle_groups=ARRAY['Hip']::exercise_muscle_group[]                 WHERE name='Side-Lying Hip Adduction';
```

- [ ] **Step 2: Set primary_exercise_id for alternatives** (name: `exercise_seed_alternatives`)

```sql
-- Prone Knee Extensions → Supine Knee Extensions
UPDATE exercises SET primary_exercise_id = (SELECT id FROM exercises WHERE name='Supine Knee Extensions')
WHERE name='Prone Knee Extensions';

-- Seated Passive-Assisted → Supine Knee Extensions
UPDATE exercises SET primary_exercise_id = (SELECT id FROM exercises WHERE name='Supine Knee Extensions')
WHERE name='Seated Passive-Assisted Knee Extensions';

-- Hamstring Set variants → Hamstring Set on Back
UPDATE exercises SET primary_exercise_id = (SELECT id FROM exercises WHERE name='Hamstring Set — on Your Back')
WHERE name IN ('Hamstring Set — on Your Stomach', 'Hamstring Set — Standing');

-- Prone Hamstring Curls → Hamstring Set on Back
UPDATE exercises SET primary_exercise_id = (SELECT id FROM exercises WHERE name='Hamstring Set — on Your Back')
WHERE name='Prone Hamstring Curls';

-- Standing Hip Extensions → Prone Straight Leg Raises
UPDATE exercises SET primary_exercise_id = (SELECT id FROM exercises WHERE name='Prone Straight Leg Raises')
WHERE name='Standing Hip Extensions';

-- Standing Terminal Knee Extension → Quadriceps Set
UPDATE exercises SET primary_exercise_id = (SELECT id FROM exercises WHERE name='Quadriceps Set')
WHERE name='Standing Terminal Knee Extension';
```

- [ ] **Step 3: Verify no nulls remain on primaries and optionals**

```sql
SELECT name, role, phase_start, phase_end
FROM exercises
WHERE role IN ('primary','optional') AND muscle_groups = '{}'
ORDER BY name;
```
Expected: 0 rows. If any rows return, add their muscle_groups manually.

- [ ] **Step 4: Verify alternatives all have a primary_exercise_id**

```sql
SELECT name FROM exercises
WHERE role = 'alternative' AND primary_exercise_id IS NULL;
```
Expected: 0 rows.

---

### Task 3: Finalize schema constraints and drop old column

**Files:**
- No file to create — apply SQL via Supabase MCP

- [ ] **Step 1: Apply final constraints migration** (name: `exercise_schema_finalize`)

```sql
-- Drop old phase column
ALTER TABLE exercises DROP COLUMN phase;

-- NOT NULL + check constraint on muscle_groups
ALTER TABLE exercises
  ALTER COLUMN phase_start SET NOT NULL,
  ALTER COLUMN role SET NOT NULL,
  ADD CONSTRAINT exercises_muscle_groups_not_empty
    CHECK (array_length(muscle_groups, 1) > 0);
```

- [ ] **Step 2: Verify final schema**

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'exercises'
ORDER BY ordinal_position;
```
Confirm: no `phase` column, `phase_start` NOT NULL, `role` NOT NULL.

- [ ] **Step 3: Regenerate TypeScript types from Supabase**

Run via Supabase MCP `generate_typescript_types` and replace the contents of `lib/database.types.ts` with the result. This ensures the generated `exercises` row type reflects the new columns and dropped `phase` column.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/plans/2026-03-16-exercise-picker-redesign.md lib/database.types.ts
git commit -m "chore: apply exercise phase_range DB migration + seed"
```

---

## Chunk 2: TypeScript Types and Exercise Utilities

### Task 4: Update Exercise type and add filtering helpers

**Files:**
- Modify: `lib/types.ts`
- Create: `lib/exercise-utils.ts`

- [ ] **Step 1: Update `lib/types.ts`**

Replace the `Exercise` interface and add new types:

```typescript
// Add after ExerciseStatus
export type ExerciseRole = 'primary' | 'alternative' | 'optional';
export type ExerciseMuscleGroup = 'Quad' | 'Hamstring' | 'Hip' | 'Calf' | 'Knee ROM' | 'Core' | 'Glute';

// Replace the Exercise interface (remove `phase`, add new fields)
export interface Exercise {
  id: string;
  name: string;
  description: string;
  phase_start: ExercisePhase;
  phase_end: ExercisePhase | null;
  role: ExerciseRole;
  primary_exercise_id: string | null;
  muscle_groups: ExerciseMuscleGroup[];
  default_sets: number;
  default_reps: number;
  default_hold_seconds: number | null;
  category: ExerciseCategory;
  submitted_by: string | null;
  status: ExerciseStatus;
  sort_order: number;
}
```

- [ ] **Step 2: Create `lib/exercise-utils.ts`**

```typescript
import type { Exercise, ExercisePhase } from './types';
import type { SurgeryStatus } from './hooks/use-today';
import { PHASES_ORDERED } from './phase-gates';

const PHASE_ORDER: ExercisePhase[] = PHASES_ORDERED.map(p => p.key);

function phaseIndex(phase: ExercisePhase): number {
  return PHASE_ORDER.indexOf(phase);
}

/**
 * Returns the display phase key for an exercise given the current surgery status.
 * Post-op: exercises with phase_start='prehab' are remapped to 'acute'.
 */
export function displayPhaseFor(
  exercise: Exercise,
  surgeryStatus: SurgeryStatus
): ExercisePhase {
  if (surgeryStatus === 'post_surgery' && exercise.phase_start === 'prehab') {
    return 'acute';
  }
  return exercise.phase_start;
}

/**
 * Filter exercises to those visible for the given surgery status.
 * Pre-surgery / no_date: only prehab exercises.
 * Post-surgery: all non-prehab exercises, plus prehab exercises that extend past prehab.
 */
export function filterExercisesBySurgeryStatus(
  exercises: Exercise[],
  surgeryStatus: SurgeryStatus
): Exercise[] {
  if (surgeryStatus === 'pre_surgery' || surgeryStatus === 'no_date') {
    return exercises.filter(e => e.phase_start === 'prehab');
  }
  return exercises.filter(e => {
    if (e.phase_start !== 'prehab') return true;
    // Prehab exercise that extends past prehab → show post-op (in acute section)
    const endIdx = e.phase_end ? phaseIndex(e.phase_end) : Infinity;
    return endIdx > phaseIndex('prehab');
  });
}

/**
 * Group exercises by their display phase (after surgery status remapping).
 * Returns a Map keyed by phase, values sorted by sort_order.
 */
export function groupExercisesByDisplayPhase(
  exercises: Exercise[],
  surgeryStatus: SurgeryStatus
): Map<ExercisePhase, Exercise[]> {
  const map = new Map<ExercisePhase, Exercise[]>();
  for (const ex of exercises) {
    const phase = displayPhaseFor(ex, surgeryStatus);
    if (!map.has(phase)) map.set(phase, []);
    map.get(phase)!.push(ex);
  }
  return map;
}

/**
 * Returns the primary exercises for a given phase's exercises list,
 * sorted by sort_order.
 */
export function getPrimaryExercises(exercises: Exercise[]): Exercise[] {
  return exercises.filter(e => e.role === 'primary').sort((a, b) => a.sort_order - b.sort_order);
}

/**
 * Returns the alternatives for a given primary exercise.
 */
export function getAlternatives(exercises: Exercise[], primaryId: string): Exercise[] {
  return exercises
    .filter(e => e.role === 'alternative' && e.primary_exercise_id === primaryId)
    .sort((a, b) => a.sort_order - b.sort_order);
}

/**
 * Returns optional exercises for a phase's exercises list.
 */
export function getOptionalExercises(exercises: Exercise[]): Exercise[] {
  return exercises.filter(e => e.role === 'optional').sort((a, b) => a.sort_order - b.sort_order);
}

/**
 * Returns the primary exercises for the user's current phase
 * (used for quick setup onboarding pre-selection).
 */
export function getQuickSetupExercises(
  exercises: Exercise[],
  currentPhase: ExercisePhase,
  surgeryStatus: SurgeryStatus
): Exercise[] {
  const visible = filterExercisesBySurgeryStatus(exercises, surgeryStatus);
  const grouped = groupExercisesByDisplayPhase(visible, surgeryStatus);
  const phaseExercises = grouped.get(currentPhase) ?? [];
  return getPrimaryExercises(phaseExercises);
}
```

- [ ] **Step 3: Fix TypeScript compile errors from `phase` removal**

Search for `exercise.phase` or `ex.phase` in the codebase and update references:

```bash
grep -r "\.phase" --include="*.tsx" --include="*.ts" /Users/alex/workspace/kneeback/app /Users/alex/workspace/kneeback/lib /Users/alex/workspace/kneeback/components
```

For each occurrence that references the old `phase` field on an Exercise:
- `exercise.phase` → `exercise.phase_start` (when used for grouping logic)
- Any grouping by `ex.phase` → use `displayPhaseFor(ex, surgeryStatus)` from `lib/exercise-utils.ts`

- [ ] **Step 4: Commit**

```bash
git add lib/types.ts lib/exercise-utils.ts
git commit -m "feat: update Exercise type with phase range + role + muscle groups"
```

---

## Chunk 3: Exercise Picker UI Redesign

### Task 5: Add MuscleTag component

**Files:**
- Create: `components/MuscleTag.tsx`

- [ ] **Step 1: Create `components/MuscleTag.tsx`**

```typescript
import { View, Text } from 'react-native';
import type { ExerciseMuscleGroup } from '../lib/types';

const MUSCLE_COLORS: Record<ExerciseMuscleGroup, { bg: string; text: string }> = {
  Quad:      { bg: '#3B82F620', text: '#3B82F6' },
  Hamstring: { bg: '#7C3AED20', text: '#7C3AED' },
  Hip:       { bg: '#F59E0B20', text: '#F59E0B' },
  Calf:      { bg: '#16A34A20', text: '#16A34A' },
  'Knee ROM':{ bg: '#0D948820', text: '#0D9488' },
  Core:      { bg: '#FF6B3520', text: '#FF6B35' },
  Glute:     { bg: '#E11D4820', text: '#E11D48' },
};

interface Props {
  group: ExerciseMuscleGroup;
}

export function MuscleTag({ group }: Props) {
  const colors = MUSCLE_COLORS[group];
  return (
    <View
      style={{ backgroundColor: colors.bg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}
    >
      <Text style={{ color: colors.text, fontSize: 10, fontWeight: '500' }}>{group}</Text>
    </View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/MuscleTag.tsx
git commit -m "feat: add MuscleTag component"
```

---

### Task 6: Rebuild `app/exercise-picker.tsx`

**Files:**
- Modify: `app/exercise-picker.tsx`

The new picker groups exercises by phase, then by category (Strengthening / Mobility) within each phase, showing only primaries by default with alternatives expandable and optionals collapsible.

- [ ] **Step 1: Replace `app/exercise-picker.tsx`**

```typescript
import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';
import { ExerciseStepper } from '../components/ExerciseStepper';
import { MuscleTag } from '../components/MuscleTag';
import { Colors } from '../constants/colors';
import { usePhaseGate } from '../lib/hooks/use-phase-gate';
import {
  GATE_DEFINITIONS, PHASES_ORDERED, PHASE_COLORS, PHASE_DISPLAY_NAMES,
} from '../lib/phase-gates';
import {
  filterExercisesBySurgeryStatus,
  groupExercisesByDisplayPhase,
  getPrimaryExercises,
  getAlternatives,
  getOptionalExercises,
  displayPhaseFor,
} from '../lib/exercise-utils';
import { getPhaseFromDays } from '../lib/phase-gates';
import type { Exercise, ExercisePhase, UserExercise, GateDefinition } from '../lib/types';
import type { SurgeryStatus } from '../lib/hooks/use-today';

export default function ExercisePicker() {
  const router = useRouter();
  const { session } = useAuth();

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [userExercisesMap, setUserExercisesMap] = useState<Map<string, UserExercise>>(new Map());
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [daysSinceSurgery, setDaysSinceSurgery] = useState(0);
  const [surgeryStatus, setSurgeryStatus] = useState<SurgeryStatus>('no_date');
  const [loading, setLoading] = useState(true);
  const [gateWarning, setGateWarning] = useState<{ exercise: Exercise; gate: GateDefinition } | null>(null);
  // expandedAlternatives: set of primary exercise IDs with alternatives shown
  const [expandedAlternatives, setExpandedAlternatives] = useState<Set<string>>(new Set());
  // expandedOptionals: set of phase keys with optional section expanded
  const [expandedOptionals, setExpandedOptionals] = useState<Set<string>>(new Set());

  const { gateProgress, toggleCriterion } = usePhaseGate(daysSinceSurgery, surgeryStatus, null);

  useEffect(() => {
    if (!session) return;
    Promise.all([
      supabase.from('exercises').select('*').eq('status', 'approved').order('sort_order'),
      supabase.from('user_exercises').select('*, exercise:exercises(*)').eq('user_id', session.user.id),
      supabase.from('profiles').select('surgery_date').eq('id', session.user.id).single(),
    ]).then(([{ data: exs }, { data: ues }, { data: profile }]) => {
      setExercises((exs as Exercise[]) || []);

      const map = new Map<string, UserExercise>();
      for (const ue of (ues as UserExercise[]) || []) map.set(ue.exercise_id, ue);
      setUserExercisesMap(map);

      if (profile?.surgery_date) {
        const diff = Math.floor(
          (Date.now() - new Date(profile.surgery_date).getTime()) / 86400000
        );
        if (diff >= 0) { setDaysSinceSurgery(diff); setSurgeryStatus('post_surgery'); }
        else setSurgeryStatus('pre_surgery');
      }

      setLoading(false);
    });
  }, [session]);

  const currentPhase = getPhaseFromDays(daysSinceSurgery, surgeryStatus);

  function getRequiredGate(exercise: Exercise): GateDefinition | null {
    const displayPhase = displayPhaseFor(exercise, surgeryStatus);
    const displayIdx = PHASES_ORDERED.findIndex(p => p.key === displayPhase);
    const currentIdx = PHASES_ORDERED.findIndex(p => p.key === currentPhase);
    if (displayIdx <= currentIdx) return null;
    for (let i = currentIdx; i < displayIdx; i++) {
      const fromPhase = PHASES_ORDERED[i].key;
      const gate = GATE_DEFINITIONS.find(g => g.fromPhase === fromPhase && !g.researchGap && !g.informationalOnly);
      if (gate) {
        const gp = gateProgress.find(p => p.gate.gateKey === gate.gateKey);
        if (gp && !gp.allMet) return gate as GateDefinition;
      }
    }
    return null;
  }

  async function performToggle(exercise: Exercise) {
    if (!session) return;
    setSaving(prev => new Set(prev).add(exercise.id));
    const existing = userExercisesMap.get(exercise.id);

    if (existing?.is_active) {
      await supabase.from('user_exercises').update({ is_active: false }).eq('id', existing.id);
      setUserExercisesMap(prev => new Map(prev).set(exercise.id, { ...existing, is_active: false }));
    } else if (existing && !existing.is_active) {
      await supabase.from('user_exercises').update({ is_active: true }).eq('id', existing.id);
      setUserExercisesMap(prev => new Map(prev).set(exercise.id, { ...existing, is_active: true }));
    } else {
      const { data: inserted } = await supabase
        .from('user_exercises')
        .insert({
          user_id: session.user.id, exercise_id: exercise.id,
          sets: exercise.default_sets, reps: exercise.default_reps,
          hold_seconds: exercise.default_hold_seconds, is_active: true, sort_order: 99,
        })
        .select('*, exercise:exercises(*)')
        .single();
      if (inserted) setUserExercisesMap(prev => new Map(prev).set(exercise.id, inserted as UserExercise));
    }

    setSaving(prev => { const n = new Set(prev); n.delete(exercise.id); return n; });
  }

  async function onToggle(exercise: Exercise) {
    if (userExercisesMap.get(exercise.id)?.is_active) {
      await performToggle(exercise);
      return;
    }
    const gate = getRequiredGate(exercise);
    if (gate) { setGateWarning({ exercise, gate }); return; }
    await performToggle(exercise);
  }

  async function onStepperChange(exerciseId: string, field: 'sets' | 'reps' | 'hold_seconds', value: number) {
    const existing = userExercisesMap.get(exerciseId);
    if (!existing) return;
    setUserExercisesMap(prev => new Map(prev).set(exerciseId, { ...existing, [field]: value }));
    await supabase.from('user_exercises').update({ [field]: value }).eq('id', existing.id);
  }

  // --- Filtering + grouping ---
  const searchLower = search.toLowerCase();
  const visibleExercises = filterExercisesBySurgeryStatus(exercises, surgeryStatus);
  const grouped = groupExercisesByDisplayPhase(visibleExercises, surgeryStatus);

  // Post-op phases only (no prehab). Pre-op: only prehab.
  const postOpPhases: ExercisePhase[] = ['acute','early_active','strengthening','advanced_strengthening','return_to_sport'];
  const activePhases: ExercisePhase[] = surgeryStatus === 'post_surgery' ? postOpPhases : ['prehab'];

  function matchesSearch(ex: Exercise): boolean {
    return !search || ex.name.toLowerCase().includes(searchLower);
  }

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  const warningGateProgress = gateWarning ? gateProgress.find(p => p.gate.gateKey === gateWarning.gate.gateKey) : null;
  const unmetCriteria = warningGateProgress
    ? warningGateProgress.criteriaStatus.filter(cs => !cs.met).slice(0, 3)
    : [];

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center px-4 pt-14 pb-3">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text className="text-xl font-bold" style={{ color: Colors.text }}>Edit Exercises</Text>
      </View>

      <TextInput
        className="mx-4 bg-surface border border-border rounded-2xl px-4 py-3 text-base mb-3"
        placeholder="Search exercises..."
        value={search}
        onChangeText={setSearch}
        placeholderTextColor={Colors.textMuted}
      />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
        {activePhases.map(phaseKey => {
          const phaseExercises = grouped.get(phaseKey) ?? [];
          if (phaseExercises.length === 0) return null;

          const phaseEntry = PHASES_ORDERED.find(p => p.key === phaseKey)!;
          const displayInfo = PHASE_DISPLAY_NAMES[phaseKey];
          const phaseColor = PHASE_COLORS[phaseKey];
          const isLocked = phaseKey !== 'prehab' && daysSinceSurgery < phaseEntry.unlockDay;
          const isCurrent = phaseKey === currentPhase;
          const unlockWeek = Math.ceil(phaseEntry.unlockDay / 7);

          const strengthening = phaseExercises.filter(e => e.category === 'strengthening' || e.category === 'activation');
          const mobility = phaseExercises.filter(e => e.category === 'rom');
          const optionals = getOptionalExercises(phaseExercises);
          const optionalsExpanded = expandedOptionals.has(phaseKey);

          return (
            <View key={phaseKey} style={{ opacity: isLocked ? 0.5 : 1, marginBottom: 8 }}>
              {/* Phase header */}
              <View className="flex-row items-center justify-between py-3 mt-2">
                <View>
                  <View className="flex-row items-center gap-2">
                    <Text className="font-bold text-base" style={{ color: isLocked ? '#A0A0A0' : phaseColor }}>
                      {displayInfo.label}
                    </Text>
                    {isCurrent && (
                      <View style={{ backgroundColor: phaseColor + '22', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text style={{ color: phaseColor, fontSize: 10, fontWeight: '600' }}>Current</Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-xs" style={{ color: '#A0A0A0' }}>{displayInfo.weekRange}</Text>
                </View>
                {isLocked && (
                  <View className="bg-surface border border-border rounded-full px-3 py-1">
                    <Text className="text-xs" style={{ color: '#A0A0A0' }}>🔒 Unlocks week {unlockWeek}</Text>
                  </View>
                )}
              </View>

              {/* Strengthening subsection */}
              {strengthening.length > 0 && (
                <ExerciseCategorySection
                  label="Strengthening"
                  exercises={strengthening}
                  locked={isLocked}
                  allExercises={phaseExercises}
                  userExercisesMap={userExercisesMap}
                  saving={saving}
                  expandedAlternatives={expandedAlternatives}
                  setExpandedAlternatives={setExpandedAlternatives}
                  onToggle={onToggle}
                  onStepperChange={onStepperChange}
                  matchesSearch={matchesSearch}
                />
              )}

              {/* Mobility subsection */}
              {mobility.length > 0 && (
                <ExerciseCategorySection
                  label="Mobility"
                  exercises={mobility}
                  locked={isLocked}
                  allExercises={phaseExercises}
                  userExercisesMap={userExercisesMap}
                  saving={saving}
                  expandedAlternatives={expandedAlternatives}
                  setExpandedAlternatives={setExpandedAlternatives}
                  onToggle={onToggle}
                  onStepperChange={onStepperChange}
                  matchesSearch={matchesSearch}
                />
              )}

              {/* Optional section (collapsed by default) */}
              {optionals.length > 0 && (
                <View className="mb-2">
                  <TouchableOpacity
                    className="flex-row items-center justify-between px-3 py-2 rounded-xl bg-surface border border-border"
                    onPress={() => setExpandedOptionals(prev => {
                      const n = new Set(prev);
                      optionalsExpanded ? n.delete(phaseKey) : n.add(phaseKey);
                      return n;
                    })}
                    disabled={isLocked}
                  >
                    <Text className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#666' }}>
                      Optional exercises
                    </Text>
                    <Text style={{ color: '#666', fontSize: 11 }}>
                      {optionals.length} exercises {optionalsExpanded ? '▾' : '▸'}
                    </Text>
                  </TouchableOpacity>
                  {optionalsExpanded && optionals.filter(matchesSearch).map(ex => (
                    <ExerciseRow
                      key={ex.id}
                      exercise={ex}
                      locked={isLocked}
                      userExercise={userExercisesMap.get(ex.id)}
                      isSaving={saving.has(ex.id)}
                      onToggle={() => onToggle(ex)}
                      onStepperChange={onStepperChange}
                    />
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Gate warning modal — unchanged from original */}
      <Modal animationType="slide" transparent visible={gateWarning !== null} onRequestClose={() => setGateWarning(null)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <SafeAreaView style={{ backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
            <View style={{ padding: 24 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Ionicons name="warning-outline" size={22} color={Colors.warning} style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 18, fontWeight: '700', color: Colors.text }}>Research Advisory</Text>
              </View>
              <Text style={{ fontSize: 14, color: Colors.textSecondary, lineHeight: 20, marginBottom: 16 }}>
                {gateWarning?.gate.warningMessage}
              </Text>
              {unmetCriteria.length > 0 && (
                <View style={{ backgroundColor: Colors.surfaceAlt, borderRadius: 12, padding: 14, marginBottom: 16 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 8 }}>Criteria not yet confirmed:</Text>
                  {unmetCriteria.map(cs => (
                    <View key={cs.criterion.key} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 }}>
                      <Ionicons name="close-circle-outline" size={16} color={Colors.error} style={{ marginRight: 6, marginTop: 1 }} />
                      <Text style={{ fontSize: 13, color: Colors.textSecondary, flex: 1 }}>{cs.criterion.plainLabel}</Text>
                    </View>
                  ))}
                </View>
              )}
              {gateWarning?.gate.source && (
                <Text style={{ fontSize: 11, color: Colors.textMuted, marginBottom: 20, fontStyle: 'italic' }}>
                  Source: {gateWarning.gate.source}
                </Text>
              )}
              <TouchableOpacity style={{ borderRadius: 14, paddingVertical: 14, alignItems: 'center', backgroundColor: Colors.primary, marginBottom: 10 }} onPress={() => setGateWarning(null)}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Not yet</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface, marginBottom: 4 }}
                onPress={async () => { const p = gateWarning?.exercise; setGateWarning(null); if (p) await performToggle(p); }}
              >
                <Text style={{ color: Colors.textSecondary, fontWeight: '600', fontSize: 15 }}>I understand, add anyway</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

interface CategorySectionProps {
  label: string;
  exercises: Exercise[];
  locked: boolean;
  allExercises: Exercise[];
  userExercisesMap: Map<string, UserExercise>;
  saving: Set<string>;
  expandedAlternatives: Set<string>;
  setExpandedAlternatives: React.Dispatch<React.SetStateAction<Set<string>>>;
  onToggle: (ex: Exercise) => void;
  onStepperChange: (id: string, field: 'sets' | 'reps' | 'hold_seconds', value: number) => void;
  matchesSearch: (ex: Exercise) => boolean;
}

function ExerciseCategorySection({
  label, exercises, locked, allExercises,
  userExercisesMap, saving, expandedAlternatives, setExpandedAlternatives,
  onToggle, onStepperChange, matchesSearch,
}: CategorySectionProps) {
  const primaries = getPrimaryExercises(exercises).filter(matchesSearch);
  if (primaries.length === 0) return null;

  return (
    <View className="mb-3">
      <Text className="text-xs font-semibold uppercase tracking-wider mb-2 px-1" style={{ color: '#666' }}>
        {label}
      </Text>
      {primaries.map(primary => {
        const alternatives = getAlternatives(allExercises, primary.id).filter(matchesSearch);
        const altExpanded = expandedAlternatives.has(primary.id);

        return (
          <View key={primary.id}>
            <ExerciseRow
              exercise={primary}
              locked={locked}
              userExercise={userExercisesMap.get(primary.id)}
              isSaving={saving.has(primary.id)}
              onToggle={() => onToggle(primary)}
              onStepperChange={onStepperChange}
              alternativesCount={alternatives.length}
              altExpanded={altExpanded}
              onToggleAlternatives={() => setExpandedAlternatives(prev => {
                const n = new Set(prev);
                altExpanded ? n.delete(primary.id) : n.add(primary.id);
                return n;
              })}
            />
            {altExpanded && alternatives.map(alt => (
              <View key={alt.id} style={{ marginLeft: 16 }}>
                <ExerciseRow
                  exercise={alt}
                  locked={locked}
                  userExercise={userExercisesMap.get(alt.id)}
                  isSaving={saving.has(alt.id)}
                  onToggle={() => onToggle(alt)}
                  onStepperChange={onStepperChange}
                />
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

interface ExerciseRowProps {
  exercise: Exercise;
  locked: boolean;
  userExercise: UserExercise | undefined;
  isSaving: boolean;
  onToggle: () => void;
  onStepperChange: (id: string, field: 'sets' | 'reps' | 'hold_seconds', value: number) => void;
  alternativesCount?: number;
  altExpanded?: boolean;
  onToggleAlternatives?: () => void;
}

function ExerciseRow({
  exercise, locked, userExercise, isSaving, onToggle, onStepperChange,
  alternativesCount = 0, altExpanded = false, onToggleAlternatives,
}: ExerciseRowProps) {
  const isActive = userExercise?.is_active ?? false;
  const sets = userExercise?.sets ?? exercise.default_sets;
  const reps = userExercise?.reps ?? exercise.default_reps;
  const holdSeconds = userExercise?.hold_seconds ?? exercise.default_hold_seconds;
  const previewLabel = `${sets} sets × ${holdSeconds ? `${holdSeconds}s hold` : `${reps} reps`}`;

  return (
    <TouchableOpacity
      className={`mb-2 rounded-2xl border ${locked ? 'bg-surface border-border opacity-40' : isActive ? 'bg-primary/10 border-primary' : 'bg-surface border-border'}`}
      onPress={() => !locked && !isSaving && onToggle()}
      disabled={locked || isSaving}
      activeOpacity={0.8}
    >
      <View className="flex-row items-start p-4">
        {isSaving ? (
          <ActivityIndicator size="small" color={Colors.primary} style={{ marginRight: 12, marginTop: 2 }} />
        ) : (
          <Ionicons
            name={isActive && !locked ? 'checkmark-circle' : 'ellipse-outline'}
            size={24}
            color={isActive && !locked ? Colors.primary : Colors.textMuted}
            style={{ marginRight: 12, marginTop: 2 }}
          />
        )}
        <View className="flex-1">
          <View className="flex-row flex-wrap items-center gap-1 mb-1">
            <Text className="font-semibold text-base" style={{ color: locked ? '#A0A0A0' : Colors.text }}>
              {exercise.name}
            </Text>
            {exercise.muscle_groups.map(g => <MuscleTag key={g} group={g} />)}
          </View>
          <Text className="text-sm" style={{ color: '#6B6B6B' }} numberOfLines={isActive ? undefined : 2}>
            {exercise.description}
          </Text>
          <View className="flex-row items-center gap-2 mt-1">
            <Text className="text-xs" style={{ color: isActive ? Colors.primary : '#A0A0A0' }}>
              {previewLabel}
            </Text>
            {alternativesCount > 0 && (
              <TouchableOpacity
                onPress={e => { e.stopPropagation?.(); onToggleAlternatives?.(); }}
                className="bg-surface border border-border rounded-full px-2 py-0.5"
              >
                <Text className="text-xs" style={{ color: '#888' }}>
                  {alternativesCount} alternative{alternativesCount > 1 ? 's' : ''} {altExpanded ? '▾' : '▸'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {isActive && !locked && (
        <View className="px-4 pb-4 border-t border-primary/20 pt-3">
          <ExerciseStepper label="Sets" value={sets} min={1} max={10} onChange={v => onStepperChange(exercise.id, 'sets', v)} />
          {holdSeconds !== null ? (
            <ExerciseStepper label="Hold" value={holdSeconds} min={0} max={120} variableStep unit="s" onChange={v => onStepperChange(exercise.id, 'hold_seconds', v)} />
          ) : (
            <ExerciseStepper label="Reps" value={reps} min={1} max={50} onChange={v => onStepperChange(exercise.id, 'reps', v)} />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}
```

- [ ] **Step 2: Run the app and verify the exercise picker renders without errors**

```bash
npx expo start
```

Open exercise picker. Confirm:
- Phases visible for current surgery status
- Category headers (Strengthening / Mobility) appear
- Muscle tags show on each exercise
- Alternatives button appears where expected
- Optional section collapsed by default

- [ ] **Step 3: Commit**

```bash
git add app/exercise-picker.tsx components/MuscleTag.tsx
git commit -m "feat: rebuild exercise picker with category grouping, muscle tags, and alternatives"
```

---

## Chunk 4: Onboarding Quick Setup

### Task 7: Add quick-setup onboarding screen

**Files:**
- Create: `app/(onboarding)/quick-setup.tsx`
- Modify: `app/(onboarding)/pick-exercises.tsx` (add pre-selection, remove blank-slate behavior)
- Modify: `app/(onboarding)/surgery-details.tsx` (route to quick-setup instead of pick-exercises)

- [ ] **Step 1: Create `app/(onboarding)/quick-setup.tsx`**

```typescript
import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useOnboarding } from '../../lib/onboarding-context';
import { MuscleTag } from '../../components/MuscleTag';
import { Colors } from '../../constants/colors';
import { PHASE_DISPLAY_NAMES } from '../../lib/phase-gates';
import { getPhaseFromDays, PHASES_ORDERED } from '../../lib/phase-gates';
import {
  filterExercisesBySurgeryStatus,
  getQuickSetupExercises,
} from '../../lib/exercise-utils';
import type { Exercise, ExercisePhase } from '../../lib/types';
import type { SurgeryStatus } from '../../lib/hooks/use-today';

export default function QuickSetup() {
  const router = useRouter();
  const { data, toggleExercise, isSelected } = useOnboarding();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  // Determine surgery status from onboarding data
  const surgeryStatus: SurgeryStatus = (() => {
    if (!data.surgeryDate) return 'no_date';
    const diff = Math.floor((Date.now() - new Date(data.surgeryDate).getTime()) / 86400000);
    if (diff >= 0) return 'post_surgery';
    return 'pre_surgery';
  })();

  const daysSinceSurgery = (() => {
    if (!data.surgeryDate) return 0;
    return Math.max(0, Math.floor((Date.now() - new Date(data.surgeryDate).getTime()) / 86400000));
  })();

  const currentPhase = getPhaseFromDays(daysSinceSurgery, surgeryStatus);
  const phaseInfo = PHASE_DISPLAY_NAMES[currentPhase];

  // Capture stable values for the effect to avoid stale-closure lint warnings
  const stablePhase = currentPhase;
  const stableStatus = surgeryStatus;
  const alreadySelected = data.selectedExercises.length > 0;

  useEffect(() => {
    supabase
      .from('exercises')
      .select('*')
      .eq('status', 'approved')
      .order('sort_order')
      .then(({ data: exs }) => {
        const all = (exs as Exercise[]) || [];
        setExercises(all);

        // Pre-select quick setup exercises if nothing selected yet
        if (!alreadySelected) {
          const quickSet = getQuickSetupExercises(all, stablePhase, stableStatus);
          for (const ex of quickSet) toggleExercise(ex);
        }
        setLoading(false);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps — intentionally runs once on mount

  const quickExercises = getQuickSetupExercises(exercises, currentPhase, surgeryStatus);

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 120 }}>
        <Text className="text-3xl font-bold text-primary mb-2">Your starter plan</Text>
        <Text className="text-base mb-6" style={{ color: '#6B6B6B' }}>
          Based on your current phase, we've pre-selected the recommended exercises. You can customise anytime.
        </Text>

        <View className="bg-surface border border-border rounded-2xl p-4 mb-6">
          <Text className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#888' }}>
            {phaseInfo.label} — {quickExercises.length} exercises selected
          </Text>
          {quickExercises.map(ex => (
            <View key={ex.id} className="flex-row items-center gap-2 mb-3">
              <Text style={{ color: Colors.success, fontSize: 14 }}>✓</Text>
              <Text className="font-medium flex-1" style={{ color: Colors.text }}>{ex.name}</Text>
              <View className="flex-row gap-1">
                {ex.muscle_groups.slice(0, 2).map(g => <MuscleTag key={g} group={g} />)}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 bg-background px-6 pb-8 pt-4 border-t border-border gap-3">
        <TouchableOpacity
          className="bg-primary rounded-2xl py-4 items-center"
          onPress={() => router.push('/(onboarding)/set-reminder')}
        >
          <Text className="text-white font-bold text-lg">Start with this plan</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="rounded-2xl py-4 items-center border border-border bg-surface"
          onPress={() => router.push('/(onboarding)/pick-exercises')}
        >
          <Text className="font-semibold text-base" style={{ color: Colors.textSecondary }}>
            Customise exercises
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
```

- [ ] **Step 2: Update `surgery-details.tsx` to route to quick-setup**

Find the line in `surgery-details.tsx` that navigates to `pick-exercises`:
```typescript
router.push('/(onboarding)/pick-exercises');
```
Replace with:
```typescript
router.push('/(onboarding)/quick-setup');
```

- [ ] **Step 3: Replace `app/(onboarding)/pick-exercises.tsx`**

```typescript
import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useOnboarding } from '../../lib/onboarding-context';
import { ExerciseStepper } from '../../components/ExerciseStepper';
import { MuscleTag } from '../../components/MuscleTag';
import { Colors } from '../../constants/colors';
import {
  PHASE_COLORS, PHASE_DISPLAY_NAMES, PHASES_ORDERED, getPhaseFromDays,
} from '../../lib/phase-gates';
import {
  filterExercisesBySurgeryStatus,
  groupExercisesByDisplayPhase,
  getPrimaryExercises,
  getAlternatives,
  getOptionalExercises,
} from '../../lib/exercise-utils';
import type { Exercise, ExercisePhase } from '../../lib/types';
import type { SurgeryStatus } from '../../lib/hooks/use-today';

export default function PickExercises() {
  const router = useRouter();
  const { data, toggleExercise, isSelected, updateExerciseValues } = useOnboarding();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expandedAlternatives, setExpandedAlternatives] = useState<Set<string>>(new Set());
  const [expandedOptionals, setExpandedOptionals] = useState<Set<string>>(new Set());

  const surgeryStatus: SurgeryStatus = (() => {
    if (!data.surgeryDate) return 'no_date';
    const diff = Math.floor((Date.now() - new Date(data.surgeryDate).getTime()) / 86400000);
    return diff >= 0 ? 'post_surgery' : 'pre_surgery';
  })();
  const daysSinceSurgery = data.surgeryDate
    ? Math.max(0, Math.floor((Date.now() - new Date(data.surgeryDate).getTime()) / 86400000))
    : 0;
  const currentPhase = getPhaseFromDays(daysSinceSurgery, surgeryStatus);

  useEffect(() => {
    supabase
      .from('exercises').select('*').eq('status', 'approved').order('sort_order')
      .then(({ data: exs, error: err }) => {
        if (err) { setError('Could not load exercises. Check your connection.'); }
        else setExercises((exs as Exercise[]) || []);
        setLoading(false);
      });
  }, []);

  const searchLower = search.toLowerCase();
  const matchesSearch = (ex: Exercise) => !search || ex.name.toLowerCase().includes(searchLower);

  const visible = filterExercisesBySurgeryStatus(exercises, surgeryStatus);
  const grouped = groupExercisesByDisplayPhase(visible, surgeryStatus);
  const postOpPhases: ExercisePhase[] = ['acute','early_active','strengthening','advanced_strengthening','return_to_sport'];
  const activePhases: ExercisePhase[] = surgeryStatus === 'post_surgery' ? postOpPhases : ['prehab'];

  if (error) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-6">
        <Text className="text-base text-center" style={{ color: '#6B6B6B' }}>{error}</Text>
      </View>
    );
  }
  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <View className="px-6 pt-14 pb-2">
        <Text className="text-3xl font-bold text-primary mb-1">Your exercises</Text>
        <Text className="text-base mb-3" style={{ color: '#6B6B6B' }}>
          Select exercises your physio has prescribed. Future phases unlock as you progress.
        </Text>
        <TextInput
          className="bg-surface border border-border rounded-2xl px-4 py-3 text-base"
          placeholder="Search exercises..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor={Colors.textMuted}
        />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}>
        {activePhases.map(phaseKey => {
          const phaseExercises = grouped.get(phaseKey) ?? [];
          if (phaseExercises.length === 0) return null;

          const phaseEntry = PHASES_ORDERED.find(p => p.key === phaseKey)!;
          const displayInfo = PHASE_DISPLAY_NAMES[phaseKey];
          const phaseColor = PHASE_COLORS[phaseKey];
          const isLocked = phaseKey !== 'prehab' && daysSinceSurgery < phaseEntry.unlockDay;
          const isCurrent = phaseKey === currentPhase;
          const unlockWeek = Math.ceil(phaseEntry.unlockDay / 7);

          const strengthening = phaseExercises.filter(e => e.category === 'strengthening' || e.category === 'activation');
          const mobility = phaseExercises.filter(e => e.category === 'rom');
          const optionals = getOptionalExercises(phaseExercises);
          const optionalsExpanded = expandedOptionals.has(phaseKey);

          return (
            <View key={phaseKey} style={{ opacity: isLocked ? 0.5 : 1, marginBottom: 8 }}>
              <View className="flex-row items-center justify-between py-3 mt-2">
                <View>
                  <View className="flex-row items-center gap-2">
                    <Text className="font-bold text-base" style={{ color: isLocked ? '#A0A0A0' : phaseColor }}>
                      {displayInfo.label}
                    </Text>
                    {isCurrent && (
                      <View style={{ backgroundColor: phaseColor + '22', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text style={{ color: phaseColor, fontSize: 10, fontWeight: '600' }}>Current</Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-xs" style={{ color: '#A0A0A0' }}>{displayInfo.weekRange}</Text>
                </View>
                {isLocked && (
                  <View className="bg-surface border border-border rounded-full px-3 py-1">
                    <Text className="text-xs" style={{ color: '#A0A0A0' }}>🔒 Unlocks week {unlockWeek}</Text>
                  </View>
                )}
              </View>

              {/* Strengthening */}
              {strengthening.length > 0 && (
                <View className="mb-3">
                  <Text className="text-xs font-semibold uppercase tracking-wider mb-2 px-1" style={{ color: '#666' }}>Strengthening</Text>
                  {getPrimaryExercises(strengthening).filter(matchesSearch).map(primary => {
                    const alts = getAlternatives(phaseExercises, primary.id).filter(matchesSearch);
                    const altExpanded = expandedAlternatives.has(primary.id);
                    const selected = isSelected(primary.id);
                    const selEx = data.selectedExercises.find(e => e.exerciseId === primary.id);
                    return (
                      <View key={primary.id}>
                        <OnboardingExerciseRow exercise={primary} locked={isLocked} selected={selected} selEx={selEx}
                          onToggle={() => !isLocked && toggleExercise(primary)}
                          onStepperChange={(f, v) => updateExerciseValues(primary.id, { [f]: v })}
                          alternativesCount={alts.length} altExpanded={altExpanded}
                          onToggleAlternatives={() => setExpandedAlternatives(prev => {
                            const n = new Set(prev); altExpanded ? n.delete(primary.id) : n.add(primary.id); return n;
                          })} />
                        {altExpanded && alts.map(alt => {
                          const altSelected = isSelected(alt.id);
                          const altSelEx = data.selectedExercises.find(e => e.exerciseId === alt.id);
                          return (
                            <View key={alt.id} style={{ marginLeft: 16 }}>
                              <OnboardingExerciseRow exercise={alt} locked={isLocked} selected={altSelected} selEx={altSelEx}
                                onToggle={() => !isLocked && toggleExercise(alt)}
                                onStepperChange={(f, v) => updateExerciseValues(alt.id, { [f]: v })} />
                            </View>
                          );
                        })}
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Mobility */}
              {mobility.length > 0 && (
                <View className="mb-3">
                  <Text className="text-xs font-semibold uppercase tracking-wider mb-2 px-1" style={{ color: '#666' }}>Mobility</Text>
                  {getPrimaryExercises(mobility).filter(matchesSearch).map(primary => {
                    const alts = getAlternatives(phaseExercises, primary.id).filter(matchesSearch);
                    const altExpanded = expandedAlternatives.has(primary.id);
                    const selected = isSelected(primary.id);
                    const selEx = data.selectedExercises.find(e => e.exerciseId === primary.id);
                    return (
                      <View key={primary.id}>
                        <OnboardingExerciseRow exercise={primary} locked={isLocked} selected={selected} selEx={selEx}
                          onToggle={() => !isLocked && toggleExercise(primary)}
                          onStepperChange={(f, v) => updateExerciseValues(primary.id, { [f]: v })}
                          alternativesCount={alts.length} altExpanded={altExpanded}
                          onToggleAlternatives={() => setExpandedAlternatives(prev => {
                            const n = new Set(prev); altExpanded ? n.delete(primary.id) : n.add(primary.id); return n;
                          })} />
                        {altExpanded && alts.map(alt => {
                          const altSelected = isSelected(alt.id);
                          const altSelEx = data.selectedExercises.find(e => e.exerciseId === alt.id);
                          return (
                            <View key={alt.id} style={{ marginLeft: 16 }}>
                              <OnboardingExerciseRow exercise={alt} locked={isLocked} selected={altSelected} selEx={altSelEx}
                                onToggle={() => !isLocked && toggleExercise(alt)}
                                onStepperChange={(f, v) => updateExerciseValues(alt.id, { [f]: v })} />
                            </View>
                          );
                        })}
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Optional */}
              {optionals.length > 0 && (
                <View className="mb-2">
                  <TouchableOpacity
                    className="flex-row items-center justify-between px-3 py-2 rounded-xl bg-surface border border-border"
                    onPress={() => setExpandedOptionals(prev => {
                      const n = new Set(prev); optionalsExpanded ? n.delete(phaseKey) : n.add(phaseKey); return n;
                    })}
                    disabled={isLocked}
                  >
                    <Text className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#666' }}>Optional exercises</Text>
                    <Text style={{ color: '#666', fontSize: 11 }}>{optionals.length} exercises {optionalsExpanded ? '▾' : '▸'}</Text>
                  </TouchableOpacity>
                  {optionalsExpanded && optionals.filter(matchesSearch).map(ex => {
                    const selected = isSelected(ex.id);
                    const selEx = data.selectedExercises.find(e => e.exerciseId === ex.id);
                    return (
                      <OnboardingExerciseRow key={ex.id} exercise={ex} locked={isLocked} selected={selected} selEx={selEx}
                        onToggle={() => !isLocked && toggleExercise(ex)}
                        onStepperChange={(f, v) => updateExerciseValues(ex.id, { [f]: v })} />
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 bg-background px-6 pb-8 pt-4 border-t border-border">
        <TouchableOpacity className="bg-primary rounded-2xl py-4 items-center" onPress={() => router.push('/(onboarding)/set-reminder')}>
          <Text className="text-white font-bold text-lg">Next → ({data.selectedExercises.length} selected)</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

interface OnboardingRowProps {
  exercise: Exercise;
  locked: boolean;
  selected: boolean;
  selEx: { sets: number; reps: number; hold_seconds: number | null } | undefined;
  onToggle: () => void;
  onStepperChange: (field: 'sets' | 'reps' | 'hold_seconds', value: number) => void;
  alternativesCount?: number;
  altExpanded?: boolean;
  onToggleAlternatives?: () => void;
}

function OnboardingExerciseRow({
  exercise, locked, selected, selEx, onToggle, onStepperChange,
  alternativesCount = 0, altExpanded = false, onToggleAlternatives,
}: OnboardingRowProps) {
  const sets = selEx?.sets ?? exercise.default_sets;
  const reps = selEx?.reps ?? exercise.default_reps;
  const holdSeconds = selEx?.hold_seconds ?? exercise.default_hold_seconds;
  const previewLabel = `${sets} sets × ${holdSeconds ? `${holdSeconds}s hold` : `${reps} reps`}`;

  return (
    <TouchableOpacity
      className={`mb-2 rounded-2xl border ${locked ? 'bg-surface border-border opacity-40' : selected ? 'bg-primary/10 border-primary' : 'bg-surface border-border'}`}
      onPress={onToggle} disabled={locked} activeOpacity={0.8}
    >
      <View className="flex-row items-start p-4">
        <Ionicons name={selected && !locked ? 'checkmark-circle' : 'ellipse-outline'} size={24}
          color={selected && !locked ? Colors.primary : Colors.textMuted} style={{ marginRight: 12, marginTop: 2 }} />
        <View className="flex-1">
          <View className="flex-row flex-wrap items-center gap-1 mb-1">
            <Text className="font-semibold text-base" style={{ color: locked ? '#A0A0A0' : Colors.text }}>{exercise.name}</Text>
            {exercise.muscle_groups.map(g => <MuscleTag key={g} group={g} />)}
          </View>
          <Text className="text-sm" style={{ color: '#6B6B6B' }} numberOfLines={selected ? undefined : 2}>{exercise.description}</Text>
          <View className="flex-row items-center gap-2 mt-1">
            <Text className="text-xs" style={{ color: selected ? Colors.primary : '#A0A0A0' }}>{previewLabel}</Text>
            {alternativesCount > 0 && (
              <TouchableOpacity onPress={e => { e.stopPropagation?.(); onToggleAlternatives?.(); }}
                className="bg-surface border border-border rounded-full px-2 py-0.5">
                <Text className="text-xs" style={{ color: '#888' }}>
                  {alternativesCount} alternative{alternativesCount > 1 ? 's' : ''} {altExpanded ? '▾' : '▸'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
      {selected && !locked && selEx && (
        <View className="px-4 pb-4 border-t border-primary/20 pt-3">
          <ExerciseStepper label="Sets" value={sets} min={1} max={10} onChange={v => onStepperChange('sets', v)} />
          {holdSeconds !== null ? (
            <ExerciseStepper label="Hold" value={holdSeconds} min={0} max={120} variableStep unit="s" onChange={v => onStepperChange('hold_seconds', v)} />
          ) : (
            <ExerciseStepper label="Reps" value={reps} min={1} max={50} onChange={v => onStepperChange('reps', v)} />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}
```

- [ ] **Step 3b: Note — no persistence change needed**

The `selectedExercises` from `OnboardingContext` are written to `user_exercises` in Supabase inside `app/(onboarding)/set-reminder.tsx` (existing behaviour, unchanged). Both "Start with this plan" and "Customise exercises → Done" routes end at `set-reminder`, so the DB write is covered.

**Search edge case:** If a primary exercise is hidden by the search filter, its alternatives are also hidden. This is intentional — searching "hamstring on stomach" will not surface that result unless the query matches the primary's name too. Acceptable for now.

- [ ] **Step 4: Run the app and test onboarding flow**

```bash
npx expo start
```

Verify:
1. Surgery details → routes to quick-setup
2. Quick-setup shows pre-selected exercises for current phase
3. "Customise" → opens pick-exercises with same pre-selection active
4. "Start with this plan" → routes to set-reminder

- [ ] **Step 5: Commit**

```bash
git add app/(onboarding)/quick-setup.tsx app/(onboarding)/surgery-details.tsx app/(onboarding)/pick-exercises.tsx
git commit -m "feat: add quick-setup onboarding screen with phase-appropriate pre-selection"
```

---

## Chunk 5: Cleanup and Verification

### Task 8: Remove stale references and verify build

**Files:**
- Modify: any file with stale `exercise.phase` references (found in Task 4 step 3)

- [ ] **Step 1: Run TypeScript compiler**

```bash
npx tsc --noEmit
```
Expected: 0 errors. Fix any remaining type errors (most likely `exercise.phase` → `exercise.phase_start`).

- [ ] **Step 2: Lint check**

```bash
npx eslint app/ lib/ components/ --ext .ts,.tsx
```
Fix any lint errors.

- [ ] **Step 3: Verify the DB query in `use-today.ts` still works**

Open `lib/hooks/use-today.ts` and check if it references `exercise.phase`. If so, update to `exercise.phase_start`.

- [ ] **Step 4: Final commit**

```bash
git add -u
git commit -m "chore: remove stale exercise.phase references, fix TS errors"
```
