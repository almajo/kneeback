# Exercise Phase System Design

**Date:** 2026-03-08
**Status:** Approved

## Problem

All 15 exercises are currently tagged as `"early"` phase and pre-selected by default during onboarding. Many exercises (e.g. wall slides, calf raises) require knee bend and are not appropriate in the first days post-surgery. The picker should respect the standard rehab phase plan and let the user—not the app—decide what their physio has prescribed.

## Solution

Replace the coarse `early/mid/late` phase enum with four named rehab stages. Group exercises by stage in the onboarding picker. Lock future stages based on days since surgery. Default all exercises to deselected.

## Phase Definitions

| Phase | Weeks | Unlock day |
|---|---|---|
| `acute` | 0–2 | Always unlocked |
| `early_active` | 2–6 | Day 14 |
| `strengthening` | 6–12 | Day 42 |
| `return_to_sport` | 12+ | Day 84 |

## Exercise Assignments

**Acute (0–2 weeks)** — isometric and passive work, no significant knee bend required:
- Ankle Pumps
- Quad Sets
- Hamstring Sets
- Straight Leg Raises
- Short Arc Quads
- Prone Hangs
- Patellar Mobilization
- Heel Slides
- Hip Abduction Side-Lying

**Early Active (2–6 weeks)** — partial weight-bearing, quad activation established:
- Gastrocnemius Stretch
- Calf Raises
- Wall Slides
- Terminal Knee Extensions (TKE)
- Seated Knee Extension
- Standing Hamstring Curls

**Strengthening (6–12 weeks):** No exercises yet (placeholder)
**Return to Sport (12+ weeks):** No exercises yet (placeholder)

## Changes

### Database migration
- Drop `early/mid/late` phase enum values, add `acute/early_active/strengthening/return_to_sport`
- Update all 15 exercises with new phase assignments

### `lib/types.ts`
- Update `ExercisePhase` type: `"acute" | "early_active" | "strengthening" | "return_to_sport"`

### `app/(onboarding)/pick-exercises.tsx`
- Default selection: empty `Set()` (no pre-selection)
- Group exercises by phase with section headers showing name + week range
- Locked phases: grayed out, non-interactive, labeled "Unlocks at week X"
- Unlock logic: compute `daysSinceSurgery` from `surgery_date` in onboarding context

### Unchanged
- `app/(onboarding)/set-reminder.tsx` — persisting selected IDs works the same
- `app/exercise-picker.tsx` — post-onboarding picker shows all exercises, no locking
- `app/(tabs)/today.tsx` and all other screens

## Out of Scope
- Auto-advancing phases over time
- Physio-controlled phase overrides
- Mid/late exercise content (future work)
