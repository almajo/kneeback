# Exercise Picker Redesign

**Date:** 2026-03-16
**Status:** Approved by user

---

## Problem

1. **Duplicate exercises** — the same exercise is stored multiple times (once per phase it appears in), causing it to show up repeatedly in the picker.
2. **Prehab leaks into post-op** — after surgery, prehab exercises remain visible and selectable.
3. **Overwhelming list** — no grouping by category, no distinction between primary and alternative exercises, no muscle group context.
4. **No guided setup** — new users are dropped into a raw exercise list with no starting point.

---

## Goals

- Remove duplicates from the exercise list.
- Completely hide prehab post-surgery.
- Reduce visual noise in the picker with category grouping and primary-first display.
- Give new users a pre-selected starter plan based on their current phase.

---

## Data Model Changes

### New fields on `exercises`

| Field | Type | Purpose |
|-------|------|---------|
| `phase_start` | `ExercisePhase` | Earliest phase this exercise appears in |
| `phase_end` | `ExercisePhase \| null` | Latest phase prescribed; null = continues indefinitely |
| `role` | `exercise_role` enum | Maps to 🟢 primary / 🔵 alternative / 🟡 optional |
| `primary_exercise_id` | `uuid \| null` | FK to parent exercise; only set for `role = 'alternative'` |
| `muscle_groups` | `exercise_muscle_group[]` | Controlled-vocabulary tags (see below) |

#### `exercise_role` enum (PostgreSQL)
```sql
CREATE TYPE exercise_role AS ENUM ('primary', 'alternative', 'optional');
```

#### `exercise_muscle_group` enum (PostgreSQL)
```sql
CREATE TYPE exercise_muscle_group AS ENUM ('Quad', 'Hamstring', 'Hip', 'Calf', 'Knee ROM', 'Core', 'Glute');
```
Using a PostgreSQL enum prevents typos from silently breaking colour-coding in the UI.

#### Dropping the old `phase` column
The existing `phase` column is **dropped** after migration. All phase-range logic uses `phase_start` / `phase_end` exclusively. The TypeScript `Exercise` type is updated accordingly.

#### Alternative linkage
`primary_exercise_id` is a flat one-level relationship. Alternatives cannot themselves have alternatives. This matches the structure of EXERCICES.md.

### Deduplication

Exercises currently stored once per phase are consolidated into a single row using `phase_start`/`phase_end`. Example:

- "Quadriceps Set" currently: 3 rows (prehab, phase1, phase2) → 1 row with `phase_start = 'prehab'`, `phase_end = 'early_active'`
- Rows are validated against EXERCICES.md before deduplication. A seed/migration script documents the mapping for each exercise — it is not done ad-hoc.
- `muscle_groups` must be populated for every exercise during this migration; exercises with an empty array are rejected by a check constraint.

### Prehab rules

Three possible `surgeryStatus` states and their effect on the picker:

| Status | What the picker shows |
|--------|----------------------|
| `pre_surgery` | Exercises where `phase_start = 'prehab'` only |
| `no_date` | Same as `pre_surgery` (treat as pre-op until date is set) |
| `post_surgery` | Exercises where `phase_start != 'prehab'`. Exercises that span from prehab onward (`phase_start = 'prehab'` but `phase_end` extends past prehab) appear in the `acute` (Phase 1) section. The grouping key post-op is always `phase_start` remapped: if `phase_start = 'prehab'`, display it under `acute`. Prehab section is never rendered for post-surgery or no-date users. |

---

## Exercise Picker UI

### Phase sections

- **Past + current phases:** fully interactive, exercises selectable.
- **Future phases:** rendered but greyed out. Header shows `"🔒 Unlocks week X"` where X = `Math.ceil(phase.unlockDay / 7)` (static, not relative to surgery date; if no surgery date, badge is omitted). Exercises not selectable.
- Phase header shows: name, colour, week range, and `"Current"` badge on the active phase.

### Within each phase section

Exercises are grouped into two subsections in this order:

1. **Strengthening** — `category = 'strengthening'` or `'activation'`
2. **Mobility** — `category = 'rom'`

Within each subsection, only `role = 'primary'` exercises are shown by default, sorted by `sort_order` (existing DB field, preserved).

**Alternatives button:** Each primary that has linked alternatives shows a pill: `"N alternatives"`. Tapping expands an inline list below the primary row. Alternatives are independently selectable. A user may select both a primary and its alternatives simultaneously — both will appear in the daily workout. No warning is shown; this is intentional (user may want variety or to swap).

**Optional section:** A collapsed row at the bottom of each phase section reads `"Optional exercises · N exercises ▸"`. Tapping expands to show `role = 'optional'` exercises. Closed by default. Optional exercises have no alternatives.

**Search:** The existing search input is retained. It searches across all visible exercises (primaries, expanded alternatives, and expanded optionals). Exercises in locked future phases are excluded from search results.

### Exercise row anatomy

```
[ Exercise name ]  [ Muscle tag(s) ]          [ ✓ / ○ ]
  "N alternatives" pill (if role=primary and has alternatives)
```

Muscle tag colours:

| Tag | Colour |
|-----|--------|
| Quad | Blue (#3B82F6) |
| Hamstring | Purple (#7C3AED) |
| Hip | Amber (#F59E0B) |
| Calf | Green (#16A34A) |
| Knee ROM | Teal (#0D9488) |
| Core | Orange (#FF6B35) |
| Glute | Rose (#E11D48) |

Tapping the exercise name/description area expands the short description (2-line truncation, existing pattern).

---

## Quick Setup (Onboarding)

The existing `pick-exercises.tsx` onboarding screen is **replaced** by a two-step flow:

**Step 1 — Quick Setup screen** (`app/(onboarding)/quick-setup.tsx`)
- Shown immediately after the surgery date step.
- Auto-selects all `role = 'primary'` exercises for the user's current phase.
- Displays the pre-selected list grouped by category with muscle tags.
- Two actions:
  - **"Start with this plan"** — saves selection and advances to the next onboarding step.
  - **"Customise exercises"** — navigates to Step 2.

**Step 2 — Full exercise picker** (`app/(onboarding)/pick-exercises.tsx`, repurposed)
- Opens with the quick-setup pre-selection already applied.
- User can add/remove exercises freely.
- "Done" button saves and advances.

If the user has no surgery date (`no_date`), Quick Setup pre-selects prehab primaries.

---

## Out of Scope

- Muscle group filter chips (deferred — category grouping already reduces noise sufficiently).
- Medical guidance or exercise recommendations beyond the 🟢 PRIMARY auto-selection.
- Changing the Today view layout.
- Tree-structured alternative chains (flat one level only).

---

## Migration Steps

1. Add PostgreSQL enums: `exercise_role`, `exercise_muscle_group`.
2. Add columns: `phase_start`, `phase_end`, `role`, `primary_exercise_id`, `muscle_groups` to `exercises`.
3. Write a documented seed/audit script that maps every exercise row to its new values (cross-referenced against `EXERCICES.md`). Apply script in a migration.
4. Remove duplicate exercise rows (consolidate to single rows per exercise using phase ranges).
5. Drop the old `phase` column.
6. Add DB check constraint: `muscle_groups` must not be empty.
7. Update TypeScript types (`lib/types.ts`, `lib/database.types.ts`).
8. Update `exercise-picker.tsx` with new grouping/filtering/display logic.
9. Add `app/(onboarding)/quick-setup.tsx`; repurpose `pick-exercises.tsx` as the customise step.
