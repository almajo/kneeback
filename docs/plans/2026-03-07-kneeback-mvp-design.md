# KneeBack MVP Design Document

**Date:** 2026-03-07
**Status:** Approved

## Overview

KneeBack is a playful, Duolingo-inspired daily ACL rehab companion app. The MVP targets Android (Pixel 9), running locally via Expo Dev Build. It combines frictionless exercise logging with humor and empathy to keep patients consistent through the long recovery timeline.

## Decisions Summary

| Dimension | Decision |
|---|---|
| Platform | Android first (Pixel 9, local dev build) |
| Auth | Email/password + Google Sign-In (Supabase Auth) |
| Onboarding | Guided: surgery date, graft type, knee side, mobility -> starter exercises |
| Exercise library | ~15 seed exercises (phase-tagged), crowdsourced additions from users |
| Session UX | Inline per-exercise timer + rep counter (no dedicated session mode) |
| ROM logging | Separate "Measurements" screen, occasional use |
| Notifications | Daily reminder + completion congrats + evening nudge |
| Content | Curated seed data in Supabase (achievements, messages, hacks) |
| Offline | Online only for MVP |
| Visual design | Playful & bold, warm colors, rounded shapes, Duolingo energy |
| Mascot | Not yet -- leave space, personality lives in copy |
| Privacy | RLS, data export/delete, privacy policy, no HIPAA |
| Architecture | Supabase-heavy (auth + DB + edge functions + seed data) |

## Architecture

### Approach: Supabase-Heavy

All backend logic lives in Supabase: auth, database with RLS, edge functions for notification scheduling, and seed data for content. No custom backend server.

**Why:** Fastest to ship for a solo dev. One platform to manage. Free tier covers MVP easily. RLS handles data privacy natively. Migration path to a separate backend exists when needed.

### Tech Stack

- **Expo SDK 52** with Expo Router (file-based navigation)
- **NativeWind v4** for Tailwind-style styling
- **Supabase JS client** for auth, database
- **expo-notifications** for push notifications
- **expo-haptics** for timer vibration feedback
- **react-native-chart-kit** or **victory-native** for ROM charts (evaluate during implementation)

## Data Model

### `profiles` (extends Supabase auth.users)

| Column | Type | Notes |
|---|---|---|
| id | uuid | FK to auth.users |
| username | text (unique) | Required, for future social features |
| surgery_date | date | |
| graft_type | enum | patellar, hamstring, quad, allograft |
| knee_side | enum | left, right |
| expo_push_token | text | For push notifications |
| created_at | timestamptz | |

### `exercises` (shared library, crowdsourced)

| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| name | text | |
| description | text | |
| phase | enum | early, mid, late |
| default_sets | int | |
| default_reps | int | |
| default_hold_seconds | int | Nullable, for timed exercises |
| category | text | ROM, strengthening, activation |
| submitted_by | uuid | Nullable FK to auth.users. Null = seed data |
| status | enum | approved, pending (all approved for MVP) |
| sort_order | int | |

User-submitted exercises go live immediately for all users. Duplicate detection via case-insensitive name matching before insert.

### `user_exercises` (user's personal plan)

| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| user_id | uuid | FK to auth.users |
| exercise_id | uuid | FK to exercises |
| sets | int | |
| reps | int | |
| hold_seconds | int | Nullable |
| is_active | boolean | Can deactivate without deleting |
| sort_order | int | |

### `daily_logs` (one row per user per day)

| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| user_id | uuid | FK to auth.users |
| date | date | |
| is_rest_day | boolean | |
| notes | text | Nullable |
| created_at | timestamptz | |

### `exercise_logs` (individual exercise completions)

| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| daily_log_id | uuid | FK to daily_logs |
| user_exercise_id | uuid | FK to user_exercises |
| completed | boolean | |
| actual_sets | int | |
| actual_reps | int | |

### `rom_measurements` (occasional logging)

| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| user_id | uuid | FK to auth.users |
| date | date | |
| flexion_degrees | int | Nullable |
| extension_degrees | int | Nullable |
| quad_activation | boolean | |

### `content` (achievements, messages, hacks)

| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| type | enum | achievement, daily_message, crutch_hack |
| title | text | |
| body | text | |
| trigger_condition | jsonb | Nullable. E.g. `{"type": "day_reached", "value": 7}` |
| phase | enum | Nullable. early, mid, late, or null (universal) |
| sort_order | int | |

### `user_achievements` (unlocked achievements)

| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| user_id | uuid | FK to auth.users |
| content_id | uuid | FK to content |
| unlocked_at | timestamptz | |

### `notification_preferences`

| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| user_id | uuid | FK to auth.users |
| daily_reminder_time | time | Default: user-chosen during onboarding |
| evening_nudge_enabled | boolean | Default: true |
| evening_nudge_time | time | Default: 20:00 |
| completion_congrats_enabled | boolean | Default: true |

## Screen Map & Navigation

### Bottom Tabs

1. **Today** (home tab, default) -- Day counter, daily message, Smart Rest toggle, exercise checklist with inline controls
2. **Progress** -- ROM chart, quad activation streak, calendar heatmap
3. **Measurements** -- Log new ROM readings, history
4. **Profile** -- Username, surgery info, notification prefs, export data, delete account, privacy policy

### Stacked Screens

- **Onboarding flow** (3-4 screens): Sign up -> Surgery details -> Pick exercises -> Set reminder -> Today
- **Exercise picker** -- Browse/search library + "Add Custom Exercise"
- **Exercise detail** -- Edit sets/reps/hold for a user_exercise
- **Achievement popup** -- Modal overlay

### Project Structure

```
app/
  (auth)/
    sign-in.tsx
    sign-up.tsx
  (onboarding)/
    surgery-details.tsx
    pick-exercises.tsx
    set-reminder.tsx
  (tabs)/
    today.tsx
    progress.tsx
    measurements.tsx
    profile.tsx
  exercise-picker.tsx
  exercise-detail.tsx
components/
  ExerciseCard.tsx
  RepCounter.tsx
  RestTimer.tsx
  SetTracker.tsx
  SmartRestToggle.tsx
  AchievementPopup.tsx
  RomChart.tsx
lib/
  supabase.ts
  achievements.ts
  notifications.ts
  types.ts
constants/
  colors.ts
  content.ts
```

## Today Screen -- Core UX

### Layout (top to bottom)

1. **Header**: "Day X" (large, bold) + week context (e.g. "Week 3")
2. **Daily message**: One-liner from content table, rotated daily, phase-aware
3. **Smart Rest toggle**: Pill button -- "Log Rest Day"
   - Activating: exercises grey out, supportive message shown, streak preserved
   - Reversible within the same day
4. **Exercise checklist**: Each row expands to reveal:
   - Rep counter (+/- buttons)
   - Rest timer (countdown, vibrates on completion)
   - Set tracker (visual dots that fill per set)
   - Auto-completes when all sets done, manual override available
5. **Add exercise button**: "+" at bottom -> exercise picker
6. **Completion state**: Micro-animation + achievement popup if triggered

### Streak Logic

- Complete all exercises OR log rest day = streak maintained
- Missing a day = streak resets to 0
- No shame messaging on reset

## Notifications

### Triggers

| Notification | When | Condition |
|---|---|---|
| Daily reminder | User-chosen time | Always (if enabled) |
| Completion congrats | After all exercises completed | completion_congrats_enabled = true |
| Evening nudge | User-chosen evening time (default 8pm) | No exercises completed AND no rest day logged |

### Evening Nudge Tone

Gentle, not guilt-tripping. Example: "Still time to knock out a few reps. Or if today's rough, log a rest day -- that counts too."

### Implementation

Supabase Edge Function on a cron schedule checks notification_preferences + daily_logs to determine who needs nudges. Sends via Expo Push Notification service.

## Achievement System

Achievements checked client-side after these events:
- Exercise completion (daily + cumulative milestones)
- Rest day logged
- ROM measurement logged
- Streak milestones
- Day-since-surgery milestones

Matching logic compares user state against `trigger_condition` JSON in the content table. On match: insert `user_achievements` row, show popup.

## Privacy & Data

- **Row-Level Security** on all tables -- users read/write only their own data
- `exercises` and `content` tables are publicly readable
- Users can export all personal data (JSON)
- Users can delete their account and all associated data
- Privacy policy accessible from Profile screen

## Seed Content (Samples)

### Achievements (~30 total)

- "First Rep" -- Complete your first exercise
- "Full Send" -- Complete every exercise in a day
- "Week One Warrior" -- Reach Day 7
- "Straight Leg Jedi" -- Log 10 straight leg raise sessions
- "Rest is a Rep" -- Log your first rest day
- "First Shower Without Panic" -- Reach Day 10
- "The Bend Begins" -- Log flexion above 90 degrees

### Daily Messages (~30 total)

- "Your knee didn't ask for this either. But here you both are."
- "Somewhere, your surgeon is trusting you to do your exercises. Don't make it weird."
- "Day 14. You've officially spent more time with your ice machine than most people."

### Crutch Hacks (~15 total)

- "Use a backpack. Your hands belong to the crutches now."
- "Shower chair. Not glamorous. Absolutely essential."
- "Zip-lock bag over the bandage before showers. You're welcome."

## Visual Design Direction

- Playful and bold, Duolingo-esque energy
- Warm color palette (oranges, yellows, soft reds) with a calming accent (teal or soft blue)
- Rounded shapes, generous padding, large tap targets
- Space reserved for a future mascot character
- Personality delivered through copy, not illustration (for MVP)
