# KneeBack MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a functional ACL rehab tracker MVP running on Android (Pixel 9) via Expo Dev Build.

**Architecture:** Supabase-heavy (auth + DB + RLS + edge functions). Expo SDK 52 with Expo Router for file-based navigation. NativeWind v4 for styling.

**Tech Stack:** Expo SDK 52, Expo Router, NativeWind v4, Supabase JS, expo-notifications, expo-haptics, react-native-reanimated, @react-native-google-signin/google-signin

---

## Task 1: Scaffold Expo Project

**Files:**
- Create: project root via `create-expo-app`

**Step 1: Create the Expo project**

Run:
```bash
cd /Users/alex/workspace && npx create-expo-app@latest kneeback-app --template default
```

Expected: New project directory with TypeScript, Expo Router pre-configured.

**Step 2: Verify it runs**

Run:
```bash
cd /Users/alex/workspace/kneeback-app && npx expo start
```

Expected: Metro bundler starts, QR code shown.

**Step 3: Move project files into kneeback root**

Move all files from `kneeback-app/` into `/Users/alex/workspace/kneeback/` (the git repo). Remove the nested directory.

```bash
cp -r /Users/alex/workspace/kneeback-app/* /Users/alex/workspace/kneeback/
cp /Users/alex/workspace/kneeback-app/.* /Users/alex/workspace/kneeback/ 2>/dev/null || true
rm -rf /Users/alex/workspace/kneeback-app
```

**Step 4: Add .gitignore**

Ensure `.gitignore` includes:
```
node_modules/
.expo/
dist/
*.jks
*.p8
*.p12
*.key
*.mobileprovision
*.orig.*
web-build/
.env
.env.local
```

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: scaffold Expo project with Expo Router"
```

---

## Task 2: Install & Configure NativeWind

**Files:**
- Modify: `babel.config.js`
- Modify: `metro.config.js`
- Modify: `tailwind.config.js` (create)
- Create: `global.css`
- Modify: `app/_layout.tsx`

**Step 1: Install NativeWind and peer dependencies**

```bash
npx expo install nativewind tailwindcss react-native-reanimated react-native-safe-area-context
npm install -D prettier-plugin-tailwindcss
```

**Step 2: Create `tailwind.config.js`**

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

**Step 3: Create `global.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Step 4: Update `babel.config.js`**

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};
```

**Step 5: Update `metro.config.js`**

```javascript
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: "./global.css" });
```

**Step 6: Import global.css in root layout**

In `app/_layout.tsx`, add at the top:
```typescript
import "../global.css";
```

**Step 7: Verify NativeWind works**

Add a test element with Tailwind classes to any screen. Run the app, confirm styling applies.

**Step 8: Commit**

```bash
git add -A && git commit -m "feat: configure NativeWind v4 with Tailwind CSS"
```

---

## Task 3: Design Tokens & Theme

**Files:**
- Create: `constants/colors.ts`
- Create: `constants/typography.ts`
- Modify: `tailwind.config.js`

**Step 1: Define color palette**

```typescript
// constants/colors.ts
export const Colors = {
  // Primary - warm orange (Duolingo-esque energy)
  primary: "#FF6B35",
  primaryLight: "#FF8F5E",
  primaryDark: "#E55A2B",

  // Secondary - teal accent (calming contrast)
  secondary: "#2EC4B6",
  secondaryLight: "#5EDDD1",
  secondaryDark: "#1FA99C",

  // Neutral
  background: "#FFF8F0",
  surface: "#FFFFFF",
  surfaceAlt: "#FFF0E5",
  text: "#2D2D2D",
  textSecondary: "#6B6B6B",
  textMuted: "#A0A0A0",

  // Semantic
  success: "#4CAF50",
  warning: "#FFB74D",
  error: "#EF5350",
  rest: "#7E57C2",

  // Border
  border: "#E8E0D8",
  borderLight: "#F0EAE2",
};
```

**Step 2: Extend Tailwind config with custom colors**

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#FF6B35", light: "#FF8F5E", dark: "#E55A2B" },
        secondary: { DEFAULT: "#2EC4B6", light: "#5EDDD1", dark: "#1FA99C" },
        background: "#FFF8F0",
        surface: { DEFAULT: "#FFFFFF", alt: "#FFF0E5" },
        rest: "#7E57C2",
        border: { DEFAULT: "#E8E0D8", light: "#F0EAE2" },
      },
      borderRadius: {
        xl: 16,
        "2xl": 24,
      },
    },
  },
  plugins: [],
};
```

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add design tokens and color palette"
```

---

## Task 4: Supabase Project & Client Setup

**Files:**
- Create: `.env`
- Create: `lib/supabase.ts`
- Create: `lib/types.ts`

**Step 1: Create Supabase project**

Use the Supabase MCP tool to create a new project named "kneeback" in the user's organization. Note the project URL and publishable key.

**Step 2: Install Supabase client**

```bash
npx expo install @supabase/supabase-js react-native-url-polyfill expo-sqlite
```

**Step 3: Create `.env`**

```
EXPO_PUBLIC_SUPABASE_URL=<project_url>
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable_key>
```

**Step 4: Create `lib/supabase.ts`**

```typescript
import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import { type Database } from "./types";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);
```

**Step 5: Create `lib/types.ts`**

Define TypeScript types matching the data model:

```typescript
export type GraftType = "patellar" | "hamstring" | "quad" | "allograft";
export type KneeSide = "left" | "right";
export type ExercisePhase = "early" | "mid" | "late";
export type ExerciseCategory = "rom" | "strengthening" | "activation";
export type ContentType = "achievement" | "daily_message" | "crutch_hack";
export type ExerciseStatus = "approved" | "pending";

export interface Profile {
  id: string;
  username: string;
  surgery_date: string;
  graft_type: GraftType;
  knee_side: KneeSide;
  expo_push_token: string | null;
  created_at: string;
}

export interface Exercise {
  id: string;
  name: string;
  description: string;
  phase: ExercisePhase;
  default_sets: number;
  default_reps: number;
  default_hold_seconds: number | null;
  category: ExerciseCategory;
  submitted_by: string | null;
  status: ExerciseStatus;
  sort_order: number;
}

export interface UserExercise {
  id: string;
  user_id: string;
  exercise_id: string;
  sets: number;
  reps: number;
  hold_seconds: number | null;
  is_active: boolean;
  sort_order: number;
  exercise?: Exercise; // joined
}

export interface DailyLog {
  id: string;
  user_id: string;
  date: string;
  is_rest_day: boolean;
  notes: string | null;
  created_at: string;
}

export interface ExerciseLog {
  id: string;
  daily_log_id: string;
  user_exercise_id: string;
  completed: boolean;
  actual_sets: number;
  actual_reps: number;
}

export interface RomMeasurement {
  id: string;
  user_id: string;
  date: string;
  flexion_degrees: number | null;
  extension_degrees: number | null;
  quad_activation: boolean;
}

export interface Content {
  id: string;
  type: ContentType;
  title: string;
  body: string;
  trigger_condition: Record<string, any> | null;
  phase: ExercisePhase | null;
  sort_order: number;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  content_id: string;
  unlocked_at: string;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  daily_reminder_time: string;
  evening_nudge_enabled: boolean;
  evening_nudge_time: string;
  completion_congrats_enabled: boolean;
}

// Supabase Database type (simplified, generate full version later)
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Omit<Profile, "created_at">; Update: Partial<Profile> };
      exercises: { Row: Exercise; Insert: Omit<Exercise, "id">; Update: Partial<Exercise> };
      user_exercises: { Row: UserExercise; Insert: Omit<UserExercise, "id">; Update: Partial<UserExercise> };
      daily_logs: { Row: DailyLog; Insert: Omit<DailyLog, "id" | "created_at">; Update: Partial<DailyLog> };
      exercise_logs: { Row: ExerciseLog; Insert: Omit<ExerciseLog, "id">; Update: Partial<ExerciseLog> };
      rom_measurements: { Row: RomMeasurement; Insert: Omit<RomMeasurement, "id">; Update: Partial<RomMeasurement> };
      content: { Row: Content; Insert: Omit<Content, "id">; Update: Partial<Content> };
      user_achievements: { Row: UserAchievement; Insert: Omit<UserAchievement, "id">; Update: Partial<UserAchievement> };
      notification_preferences: { Row: NotificationPreferences; Insert: Omit<NotificationPreferences, "id">; Update: Partial<NotificationPreferences> };
    };
  };
}
```

**Step 6: Commit**

```bash
git add -A && git commit -m "feat: configure Supabase client and TypeScript types"
```

---

## Task 5: Supabase Database Schema & RLS

**Step 1: Apply migration — Create all tables**

Use the Supabase MCP `apply_migration` tool with this SQL:

```sql
-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Custom types
create type graft_type as enum ('patellar', 'hamstring', 'quad', 'allograft');
create type knee_side as enum ('left', 'right');
create type exercise_phase as enum ('early', 'mid', 'late');
create type content_type as enum ('achievement', 'daily_message', 'crutch_hack');
create type exercise_status as enum ('approved', 'pending');

-- Profiles
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  surgery_date date not null,
  graft_type graft_type not null,
  knee_side knee_side not null,
  expo_push_token text,
  created_at timestamptz default now()
);

-- Exercises (shared library)
create table exercises (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text not null default '',
  phase exercise_phase not null default 'early',
  default_sets int not null default 3,
  default_reps int not null default 10,
  default_hold_seconds int,
  category text not null default 'rom',
  submitted_by uuid references auth.users on delete set null,
  status exercise_status not null default 'approved',
  sort_order int not null default 0
);

-- User exercises (personal plan)
create table user_exercises (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  exercise_id uuid references exercises on delete cascade not null,
  sets int not null default 3,
  reps int not null default 10,
  hold_seconds int,
  is_active boolean not null default true,
  sort_order int not null default 0
);

-- Daily logs
create table daily_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  date date not null,
  is_rest_day boolean not null default false,
  notes text,
  created_at timestamptz default now(),
  unique(user_id, date)
);

-- Exercise logs
create table exercise_logs (
  id uuid default uuid_generate_v4() primary key,
  daily_log_id uuid references daily_logs on delete cascade not null,
  user_exercise_id uuid references user_exercises on delete cascade not null,
  completed boolean not null default false,
  actual_sets int not null default 0,
  actual_reps int not null default 0
);

-- ROM measurements
create table rom_measurements (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  date date not null,
  flexion_degrees int,
  extension_degrees int,
  quad_activation boolean not null default false
);

-- Content (achievements, messages, hacks)
create table content (
  id uuid default uuid_generate_v4() primary key,
  type content_type not null,
  title text not null,
  body text not null default '',
  trigger_condition jsonb,
  phase exercise_phase,
  sort_order int not null default 0
);

-- User achievements
create table user_achievements (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  content_id uuid references content on delete cascade not null,
  unlocked_at timestamptz default now(),
  unique(user_id, content_id)
);

-- Notification preferences
create table notification_preferences (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade unique not null,
  daily_reminder_time time not null default '09:00',
  evening_nudge_enabled boolean not null default true,
  evening_nudge_time time not null default '20:00',
  completion_congrats_enabled boolean not null default true
);

-- Indexes
create index idx_user_exercises_user on user_exercises(user_id);
create index idx_daily_logs_user_date on daily_logs(user_id, date);
create index idx_exercise_logs_daily on exercise_logs(daily_log_id);
create index idx_rom_user_date on rom_measurements(user_id, date);
create index idx_content_type on content(type);
create index idx_user_achievements_user on user_achievements(user_id);
```

**Step 2: Apply migration — RLS policies**

```sql
-- Enable RLS on all tables
alter table profiles enable row level security;
alter table exercises enable row level security;
alter table user_exercises enable row level security;
alter table daily_logs enable row level security;
alter table exercise_logs enable row level security;
alter table rom_measurements enable row level security;
alter table content enable row level security;
alter table user_achievements enable row level security;
alter table notification_preferences enable row level security;

-- Profiles: users can read/update their own
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can delete own profile" on profiles for delete using (auth.uid() = id);

-- Exercises: publicly readable, authenticated users can insert
create policy "Anyone can read exercises" on exercises for select using (true);
create policy "Authenticated users can add exercises" on exercises for insert with check (auth.uid() = submitted_by);

-- User exercises: own data only
create policy "Users manage own exercises" on user_exercises for all using (auth.uid() = user_id);

-- Daily logs: own data only
create policy "Users manage own daily logs" on daily_logs for all using (auth.uid() = user_id);

-- Exercise logs: own data via daily_log join
create policy "Users manage own exercise logs" on exercise_logs for all
  using (exists (select 1 from daily_logs where daily_logs.id = exercise_logs.daily_log_id and daily_logs.user_id = auth.uid()));

-- ROM measurements: own data only
create policy "Users manage own ROM" on rom_measurements for all using (auth.uid() = user_id);

-- Content: publicly readable
create policy "Anyone can read content" on content for select using (true);

-- User achievements: own data only
create policy "Users manage own achievements" on user_achievements for all using (auth.uid() = user_id);

-- Notification preferences: own data only
create policy "Users manage own notification prefs" on notification_preferences for all using (auth.uid() = user_id);
```

**Step 3: Commit a note about migrations applied**

No local files changed (migrations are in Supabase), but document:

```bash
echo "Migrations applied via Supabase MCP on $(date)" >> docs/plans/migration-log.md
git add -A && git commit -m "docs: record database schema and RLS migrations"
```

---

## Task 6: Seed Data — Exercises & Content

**Step 1: Seed exercises**

Use Supabase MCP `execute_sql` to insert ~15 early-rehab exercises:

```sql
insert into exercises (name, description, phase, default_sets, default_reps, default_hold_seconds, category, sort_order) values
('Quad Sets', 'Tighten your thigh muscle by pressing the back of your knee into the bed. Hold, then release.', 'early', 3, 10, 5, 'activation', 1),
('Straight Leg Raises', 'Lock your knee straight, then lift the entire leg about 12 inches off the bed. Hold briefly, lower slowly.', 'early', 3, 10, 3, 'strengthening', 2),
('Heel Slides', 'Slide your heel toward your buttocks, bending the knee as far as comfortable. Slide back out.', 'early', 3, 15, null, 'rom', 3),
('Ankle Pumps', 'Move your foot up and down at the ankle, like pressing a gas pedal. Keep it rhythmic.', 'early', 3, 20, null, 'rom', 4),
('Prone Hangs', 'Lie face down with your knee and lower leg hanging off the edge of the bed. Let gravity straighten the knee.', 'early', 3, 1, 300, 'rom', 5),
('Seated Knee Extension', 'Sit on a chair, slowly straighten your knee as far as possible. Hold at the top, lower slowly.', 'early', 3, 10, 3, 'strengthening', 6),
('Standing Hamstring Curls', 'Stand holding a chair for balance. Bend your knee, bringing your heel toward your buttocks.', 'early', 3, 10, null, 'strengthening', 7),
('Calf Raises', 'Stand on both feet, rise up on your toes, hold briefly, then lower slowly.', 'early', 3, 15, 2, 'strengthening', 8),
('Wall Slides', 'Lean your back against a wall. Slide down into a shallow squat (30-45 degrees). Hold.', 'early', 3, 10, 10, 'strengthening', 9),
('Patellar Mobilization', 'Gently push your kneecap up, down, left, and right with your thumbs. Move slowly.', 'early', 2, 10, null, 'rom', 10),
('Hip Abduction (Side-Lying)', 'Lie on your good side. Lift the surgical leg toward the ceiling, keeping it straight. Lower slowly.', 'early', 3, 10, null, 'strengthening', 11),
('Short Arc Quads', 'Place a rolled towel under your knee. Straighten just the lower leg, lifting your foot. Hold, lower.', 'early', 3, 10, 3, 'activation', 12),
('Hamstring Sets', 'Sit with knee slightly bent. Press your heel into the floor without moving. Hold the contraction.', 'early', 3, 10, 5, 'activation', 13),
('Gastrocnemius Stretch', 'Stand facing a wall. Step the surgical leg back, keep it straight, and press the heel down. Lean into the wall.', 'early', 3, 3, 30, 'rom', 14),
('Terminal Knee Extensions (TKE)', 'Loop a band behind your knee, anchored in front. Start slightly bent, then straighten against the resistance.', 'early', 3, 10, 2, 'strengthening', 15);
```

**Step 2: Seed content — achievements**

```sql
insert into content (type, title, body, trigger_condition, phase, sort_order) values
('achievement', 'First Rep', 'You did a thing. A real, actual rehab thing.', '{"type": "first_exercise_completed"}', null, 1),
('achievement', 'Full Send', 'Every exercise, every rep. Your knee is impressed.', '{"type": "daily_complete"}', null, 2),
('achievement', 'Week One Warrior', 'Seven days in. You and your knee have an understanding now.', '{"type": "day_reached", "value": 7}', null, 3),
('achievement', 'Two Week Triumph', 'Day 14. The ice machine knows your name.', '{"type": "day_reached", "value": 14}', null, 4),
('achievement', 'Month One', 'Thirty days of showing up. That is not nothing.', '{"type": "day_reached", "value": 30}', null, 5),
('achievement', 'Straight Leg Jedi', 'Ten straight leg raise sessions. The Force is strong with this quad.', '{"type": "exercise_sessions", "exercise_name": "Straight Leg Raises", "value": 10}', null, 6),
('achievement', 'Rest is a Rep', 'You logged a rest day. Listening to your body is elite behavior.', '{"type": "first_rest_day"}', null, 7),
('achievement', 'The Bend Begins', 'Flexion above 90 degrees. Your knee remembers what bending is.', '{"type": "flexion_above", "value": 90}', 'early', 8),
('achievement', 'Extension Club', 'Full extension logged. Straightness achieved.', '{"type": "extension_at", "value": 0}', 'early', 9),
('achievement', 'Streak: 3 Days', 'Three days in a row. Consistency is building.', '{"type": "streak_reached", "value": 3}', null, 10),
('achievement', 'Streak: 7 Days', 'A full week without missing. Legendary.', '{"type": "streak_reached", "value": 7}', null, 11),
('achievement', 'Streak: 14 Days', 'Two weeks straight. Your physio would be proud.', '{"type": "streak_reached", "value": 14}', null, 12),
('achievement', 'Streak: 30 Days', 'Thirty-day streak. You are the rehab now.', '{"type": "streak_reached", "value": 30}', null, 13),
('achievement', 'First Measurement', 'You logged your first ROM reading. Data is power.', '{"type": "first_measurement"}', null, 14),
('achievement', 'Quad Whisperer', 'Your quad fired today. It heard you.', '{"type": "first_quad_activation"}', 'early', 15),
('achievement', 'First Shower Without Panic', 'Day 10. You navigated the shower like a pro.', '{"type": "day_reached", "value": 10}', null, 16),
('achievement', 'Shoelace Tied Independently', 'Day 21. Freedom, one loop at a time.', '{"type": "day_reached", "value": 21}', null, 17),
('achievement', 'The Halfway Point', 'Day 45. Downhill from here. Metaphorically. Do not go downhill yet.', '{"type": "day_reached", "value": 45}', null, 18);
```

**Step 3: Seed content — daily messages**

```sql
insert into content (type, title, body, phase, sort_order) values
('daily_message', '', 'Your knee did not ask for this either. But here you both are.', null, 1),
('daily_message', '', 'Somewhere, your surgeon is trusting you to do your exercises. Do not make it weird.', null, 2),
('daily_message', '', 'Day 14. You have officially spent more time with your ice machine than most people.', 'early', 3),
('daily_message', '', 'Today is a good day to remind your quad it still works.', 'early', 4),
('daily_message', '', 'Your future self is going to thank your present self. Your present self can complain, though.', null, 5),
('daily_message', '', 'Remember: slow and steady wins the race. Fast and reckless wins a re-tear.', null, 6),
('daily_message', '', 'Some days rehab feels pointless. Those are the days it matters most.', null, 7),
('daily_message', '', 'You are stronger than you think. Your knee, however, is exactly as fragile as the surgeon said.', 'early', 8),
('daily_message', '', 'Progress is not always visible. But it is always happening.', null, 9),
('daily_message', '', 'Every rep is a deposit in the bank of Walking Normally Again.', null, 10),
('daily_message', '', 'You showed up. That is the hardest rep of the day.', null, 11),
('daily_message', '', 'Ice, elevate, exercise, repeat. The glamorous life.', 'early', 12),
('daily_message', '', 'Your knee has opinions today. Listen to them.', null, 13),
('daily_message', '', 'One day you will run again and forget how hard this was. But right now, it is hard. And that is okay.', null, 14),
('daily_message', '', 'The couch misses you. Tell it you will be back after your exercises.', null, 15),
('daily_message', '', 'Healing is not linear. Some days you go backward. That is not failure, that is biology.', null, 16),
('daily_message', '', 'Think of rehab as a video game. You are grinding XP right now.', null, 17),
('daily_message', '', 'Your physio said three sets. Not two. Not one-and-a-half. Three.', null, 18),
('daily_message', '', 'Step count today: Does not matter. What matters is you showed up here.', null, 19),
('daily_message', '', 'Fun fact: your graft is remodeling right now. Even while you read this. Biology is wild.', null, 20);
```

**Step 4: Seed content — crutch hacks**

```sql
insert into content (type, title, body, phase, sort_order) values
('crutch_hack', 'Backpack Life', 'Use a backpack. Your hands belong to the crutches now.', 'early', 1),
('crutch_hack', 'Shower Chair', 'Shower chair. Not glamorous. Absolutely essential.', 'early', 2),
('crutch_hack', 'Waterproof Hack', 'Zip-lock bag over the bandage before showers. You are welcome.', 'early', 3),
('crutch_hack', 'Sleep Setup', 'Pillow under the knee for comfort is tempting. Pillow under the ankle for extension is better.', 'early', 4),
('crutch_hack', 'Ice Machine Tip', 'Freeze water bottles as backup ice. The machine will fail at 2 AM. Be ready.', 'early', 5),
('crutch_hack', 'Sock Strategy', 'Compression socks on the good leg prevent swelling from all the hopping.', 'early', 6),
('crutch_hack', 'Crutch Padding', 'Wrap cloth or foam around your crutch handles. Your palms will thank you by day 3.', 'early', 7),
('crutch_hack', 'Stair Method', 'Good leg goes up first. Bad leg goes down first. Up with the good, down with the bad.', 'early', 8),
('crutch_hack', 'Phone Pocket', 'Cargo shorts or a fanny pack. You need pockets you can reach without crutch gymnastics.', 'early', 9),
('crutch_hack', 'Meal Prep', 'Cook meals in bulk before surgery or have someone batch-cook for you. Standing in a kitchen on crutches is a boss fight.', 'early', 10),
('crutch_hack', 'Night Table', 'Keep water, meds, phone, and charger within arm''s reach of the bed. Nighttime crutch trips are the enemy.', 'early', 11),
('crutch_hack', 'Seated Wardrobe', 'Elastic waistbands only. Buttons and zippers are not your friends right now.', 'early', 12),
('crutch_hack', 'Elevation Station', 'Set up a permanent leg-elevation spot with pillows, remotes, and snacks. You will live here for a while.', 'early', 13),
('crutch_hack', 'Doorway Trick', 'Hook your crutch on the door handle while you use the bathroom. Keeps it from falling.', 'early', 14),
('crutch_hack', 'Patience Reminder', 'Everything takes three times longer on crutches. Build that into your schedule.', 'early', 15);
```

**Step 5: Commit note**

```bash
echo "Seed data inserted via Supabase MCP on $(date)" >> docs/plans/migration-log.md
git add -A && git commit -m "docs: record seed data insertion"
```

---

## Task 7: Auth — Root Layout & Session Management

**Files:**
- Modify: `app/_layout.tsx`
- Create: `lib/auth-context.tsx`

**Step 1: Create auth context**

```typescript
// lib/auth-context.tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "./supabase";
import { type Session } from "@supabase/supabase-js";

interface AuthContextType {
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ session: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

**Step 2: Update root layout with auth routing**

```typescript
// app/_layout.tsx
import "../global.css";
import { useEffect } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { AuthProvider, useAuth } from "../lib/auth-context";

function RootLayoutNav() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inOnboarding = segments[0] === "(onboarding)";

    if (!session && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
    } else if (session && inAuthGroup) {
      // Check if profile exists — if not, go to onboarding
      // For now, go to tabs
      router.replace("/(tabs)/today");
    }
  }, [session, loading, segments]);

  if (loading) return null;

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
```

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add auth context and session-based routing"
```

---

## Task 8: Auth — Sign In & Sign Up Screens

**Files:**
- Create: `app/(auth)/_layout.tsx`
- Create: `app/(auth)/sign-in.tsx`
- Create: `app/(auth)/sign-up.tsx`

**Step 1: Auth group layout**

```typescript
// app/(auth)/_layout.tsx
import { Stack } from "expo-router";

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

**Step 2: Sign-in screen**

```typescript
// app/(auth)/sign-in.tsx
import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { Link } from "expo-router";
import { supabase } from "../../lib/supabase";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) Alert.alert("Error", error.message);
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 bg-background">
      <View className="flex-1 justify-center px-8">
        <Text className="text-4xl font-bold text-center text-primary mb-2">KneeBack</Text>
        <Text className="text-base text-center text-textSecondary mb-10">Your knee's daily companion</Text>

        <TextInput
          className="bg-surface border border-border rounded-2xl px-4 py-4 text-base mb-4"
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          className="bg-surface border border-border rounded-2xl px-4 py-4 text-base mb-6"
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          className={`bg-primary rounded-2xl py-4 items-center mb-4 ${loading ? "opacity-50" : ""}`}
          onPress={handleSignIn}
          disabled={loading}
        >
          <Text className="text-white font-bold text-lg">Sign In</Text>
        </TouchableOpacity>

        <View className="flex-row justify-center">
          <Text className="text-textSecondary">No account? </Text>
          <Link href="/(auth)/sign-up">
            <Text className="text-primary font-bold">Sign Up</Text>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
```

**Step 3: Sign-up screen**

```typescript
// app/(auth)/sign-up.tsx
import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { Link } from "expo-router";
import { supabase } from "../../lib/supabase";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    setLoading(true);
    const { data: { session }, error } = await supabase.auth.signUp({ email, password });
    if (error) Alert.alert("Error", error.message);
    else if (!session) Alert.alert("Check your email", "We sent you a verification link.");
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 bg-background">
      <View className="flex-1 justify-center px-8">
        <Text className="text-4xl font-bold text-center text-primary mb-2">Join KneeBack</Text>
        <Text className="text-base text-center text-textSecondary mb-10">Start your recovery journey</Text>

        <TextInput
          className="bg-surface border border-border rounded-2xl px-4 py-4 text-base mb-4"
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          className="bg-surface border border-border rounded-2xl px-4 py-4 text-base mb-6"
          placeholder="Password (min 6 characters)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          className={`bg-primary rounded-2xl py-4 items-center mb-4 ${loading ? "opacity-50" : ""}`}
          onPress={handleSignUp}
          disabled={loading}
        >
          <Text className="text-white font-bold text-lg">Create Account</Text>
        </TouchableOpacity>

        <View className="flex-row justify-center">
          <Text className="text-textSecondary">Already have an account? </Text>
          <Link href="/(auth)/sign-in">
            <Text className="text-primary font-bold">Sign In</Text>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
```

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: add sign-in and sign-up screens with email/password auth"
```

---

## Task 9: Auth — Google Sign-In

**Files:**
- Modify: `app/(auth)/sign-in.tsx`
- Modify: `app/(auth)/sign-up.tsx`

**Step 1: Install Google Sign-In**

```bash
npx expo install @react-native-google-signin/google-signin
```

**Step 2: Configure Google Sign-In in Supabase dashboard**

Enable Google provider in Supabase Auth settings. Get web client ID from Google Cloud Console. Configure in Supabase.

**Step 3: Add Google Sign-In button to sign-in screen**

Add below the email sign-in button:

```typescript
import { GoogleSignin, GoogleSigninButton } from "@react-native-google-signin/google-signin";

// Inside component, before return:
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID!,
});

async function handleGoogleSignIn() {
  try {
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();
    if (response.data?.idToken) {
      const { error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: response.data.idToken,
      });
      if (error) Alert.alert("Error", error.message);
    }
  } catch (error: any) {
    if (error.code !== "SIGN_IN_CANCELLED") {
      Alert.alert("Error", "Google sign-in failed");
    }
  }
}

// In JSX, after the sign-in button:
<View className="flex-row items-center my-6">
  <View className="flex-1 h-px bg-border" />
  <Text className="mx-4 text-textMuted">or</Text>
  <View className="flex-1 h-px bg-border" />
</View>

<TouchableOpacity
  className="bg-surface border border-border rounded-2xl py-4 items-center"
  onPress={handleGoogleSignIn}
>
  <Text className="font-bold text-base">Continue with Google</Text>
</TouchableOpacity>
```

**Step 4: Add same to sign-up screen**

Same Google button on sign-up page (Google sign-in auto-creates accounts).

**Step 5: Add `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` to `.env`**

**Step 6: Commit**

```bash
git add -A && git commit -m "feat: add Google Sign-In to auth screens"
```

---

## Task 10: Onboarding Flow

**Files:**
- Create: `app/(onboarding)/_layout.tsx`
- Create: `app/(onboarding)/surgery-details.tsx`
- Create: `app/(onboarding)/pick-exercises.tsx`
- Create: `app/(onboarding)/set-reminder.tsx`
- Modify: `app/_layout.tsx` (add profile check)

**Step 1: Onboarding layout**

```typescript
// app/(onboarding)/_layout.tsx
import { Stack } from "expo-router";

export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }} />;
}
```

**Step 2: Surgery details screen**

Collects: username, surgery_date (date picker), graft_type (4-button selector), knee_side (left/right toggle). Stores in local state, passes to next screen via router params or a shared onboarding context.

Create a simple `lib/onboarding-context.tsx`:

```typescript
import { createContext, useContext, useState, type ReactNode } from "react";
import type { GraftType, KneeSide } from "./types";

interface OnboardingData {
  username: string;
  surgeryDate: string;
  graftType: GraftType | null;
  kneeSide: KneeSide | null;
}

interface OnboardingContextType {
  data: OnboardingData;
  update: (partial: Partial<OnboardingData>) => void;
}

const OnboardingContext = createContext<OnboardingContextType>(null!);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<OnboardingData>({
    username: "",
    surgeryDate: new Date().toISOString().split("T")[0],
    graftType: null,
    kneeSide: null,
  });

  const update = (partial: Partial<OnboardingData>) => setData((prev) => ({ ...prev, ...partial }));

  return <OnboardingContext.Provider value={{ data, update }}>{children}</OnboardingContext.Provider>;
}

export const useOnboarding = () => useContext(OnboardingContext);
```

The surgery-details screen:
- Username input
- Date picker for surgery date
- 4 pill buttons for graft type (patellar, hamstring, quad, allograft)
- 2 pill buttons for knee side (left, right)
- "Next" button navigates to pick-exercises

**Step 3: Pick exercises screen**

- Fetches exercises from Supabase `exercises` table (phase = 'early')
- Shows checklist of exercises with name + description
- Pre-selects a suggested set based on graft type (e.g. all early exercises)
- User can toggle exercises on/off
- "Next" navigates to set-reminder

**Step 4: Set reminder screen**

- Time picker for daily reminder
- Toggle for evening nudge
- "Start Recovery" button that:
  1. Inserts `profiles` row
  2. Inserts `user_exercises` rows for selected exercises
  3. Inserts `notification_preferences` row
  4. Navigates to `/(tabs)/today`

**Step 5: Update root layout to check for profile**

In `app/_layout.tsx`, after session is confirmed, check if profile exists:

```typescript
// Inside the useEffect where session && inAuthGroup
if (session && inAuthGroup) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", session.user.id)
    .single();

  if (profile) {
    router.replace("/(tabs)/today");
  } else {
    router.replace("/(onboarding)/surgery-details");
  }
}
```

**Step 6: Commit**

```bash
git add -A && git commit -m "feat: add guided onboarding flow (surgery details, exercise picker, reminder)"
```

---

## Task 11: Tab Navigation Shell

**Files:**
- Create: `app/(tabs)/_layout.tsx`
- Create: `app/(tabs)/today.tsx` (placeholder)
- Create: `app/(tabs)/progress.tsx` (placeholder)
- Create: `app/(tabs)/measurements.tsx` (placeholder)
- Create: `app/(tabs)/profile.tsx` (placeholder)

**Step 1: Tab layout**

```typescript
// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.borderLight,
          paddingBottom: 8,
          paddingTop: 8,
          height: 64,
        },
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.text,
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: "Today",
          tabBarIcon: ({ color, size }) => <Ionicons name="checkmark-circle-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: "Progress",
          tabBarIcon: ({ color, size }) => <Ionicons name="trending-up-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="measurements"
        options={{
          title: "Measure",
          tabBarIcon: ({ color, size }) => <Ionicons name="analytics-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
```

**Step 2: Placeholder screens**

Each tab gets a minimal placeholder with the screen name so navigation works:

```typescript
// app/(tabs)/today.tsx
import { View, Text } from "react-native";
export default function TodayScreen() {
  return <View className="flex-1 bg-background items-center justify-center"><Text>Today</Text></View>;
}
```

Same pattern for progress, measurements, profile.

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add tab navigation shell with placeholders"
```

---

## Task 12: Today Screen — Core

**Files:**
- Modify: `app/(tabs)/today.tsx`
- Create: `lib/hooks/use-today.ts`
- Create: `components/DayHeader.tsx`
- Create: `components/DailyMessage.tsx`
- Create: `components/SmartRestToggle.tsx`
- Create: `components/ExerciseCard.tsx`

**Step 1: Create `use-today` hook**

Fetches all data needed for today's screen:
- Profile (for surgery_date, to calculate day count)
- User exercises (active, with joined exercise data)
- Today's daily_log (create if doesn't exist)
- Today's exercise_logs
- A random daily message for the user's current phase
- Content for crutch hacks

```typescript
// lib/hooks/use-today.ts
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase";
import { useAuth } from "../auth-context";
import type { UserExercise, DailyLog, ExerciseLog, Content } from "../types";

export function useToday() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<{ surgery_date: string } | null>(null);
  const [userExercises, setUserExercises] = useState<UserExercise[]>([]);
  const [dailyLog, setDailyLog] = useState<DailyLog | null>(null);
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
  const [dailyMessage, setDailyMessage] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split("T")[0];
  const userId = session?.user.id;

  const fetchAll = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    // Fetch profile
    const { data: prof } = await supabase
      .from("profiles")
      .select("surgery_date")
      .eq("id", userId)
      .single();
    setProfile(prof);

    // Fetch active user exercises with exercise details
    const { data: exercises } = await supabase
      .from("user_exercises")
      .select("*, exercise:exercises(*)")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("sort_order");
    setUserExercises(exercises || []);

    // Get or create today's daily log
    let { data: log } = await supabase
      .from("daily_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("date", today)
      .single();

    if (!log) {
      const { data: newLog } = await supabase
        .from("daily_logs")
        .insert({ user_id: userId, date: today, is_rest_day: false })
        .select()
        .single();
      log = newLog;
    }
    setDailyLog(log);

    // Fetch exercise logs for today
    if (log) {
      const { data: logs } = await supabase
        .from("exercise_logs")
        .select("*")
        .eq("daily_log_id", log.id);
      setExerciseLogs(logs || []);
    }

    // Fetch a daily message
    const { data: messages } = await supabase
      .from("content")
      .select("*")
      .eq("type", "daily_message");
    if (messages && messages.length > 0) {
      // Deterministic daily pick based on date
      const dayIndex = Math.floor(new Date(today).getTime() / 86400000) % messages.length;
      setDailyMessage(messages[dayIndex]);
    }

    setLoading(false);
  }, [userId, today]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const daysSinceSurgery = profile
    ? Math.floor((new Date(today).getTime() - new Date(profile.surgery_date).getTime()) / 86400000)
    : 0;

  const weekNumber = Math.floor(daysSinceSurgery / 7) + 1;

  return {
    loading,
    daysSinceSurgery,
    weekNumber,
    userExercises,
    dailyLog,
    exerciseLogs,
    dailyMessage,
    refetch: fetchAll,
  };
}
```

**Step 2: Create DayHeader component**

```typescript
// components/DayHeader.tsx
import { View, Text } from "react-native";

interface Props {
  day: number;
  week: number;
}

export function DayHeader({ day, week }: Props) {
  return (
    <View className="items-center py-4">
      <Text className="text-5xl font-bold text-primary">Day {day}</Text>
      <Text className="text-base text-textSecondary mt-1">Week {week}</Text>
    </View>
  );
}
```

**Step 3: Create DailyMessage component**

```typescript
// components/DailyMessage.tsx
import { View, Text } from "react-native";

interface Props {
  message: string | null;
}

export function DailyMessage({ message }: Props) {
  if (!message) return null;
  return (
    <View className="bg-surface-alt rounded-2xl px-5 py-4 mx-4 mb-4">
      <Text className="text-base text-text italic text-center">{message}</Text>
    </View>
  );
}
```

**Step 4: Create SmartRestToggle**

```typescript
// components/SmartRestToggle.tsx
import { TouchableOpacity, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/colors";

interface Props {
  isRestDay: boolean;
  onToggle: () => void;
}

export function SmartRestToggle({ isRestDay, onToggle }: Props) {
  return (
    <TouchableOpacity
      className={`flex-row items-center justify-center mx-4 mb-4 py-3 rounded-2xl border ${
        isRestDay ? "bg-rest border-rest" : "bg-surface border-border"
      }`}
      onPress={onToggle}
    >
      <Ionicons
        name={isRestDay ? "bed" : "bed-outline"}
        size={20}
        color={isRestDay ? "#FFFFFF" : Colors.rest}
      />
      <Text className={`ml-2 font-bold ${isRestDay ? "text-white" : "text-rest"}`}>
        {isRestDay ? "Rest Day Logged" : "Log Rest Day"}
      </Text>
    </TouchableOpacity>
  );
}
```

**Step 5: Create ExerciseCard (expandable)**

```typescript
// components/ExerciseCard.tsx
import { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/colors";
import { RepCounter } from "./RepCounter";
import { RestTimer } from "./RestTimer";
import { SetTracker } from "./SetTracker";
import type { UserExercise, ExerciseLog } from "../lib/types";

interface Props {
  userExercise: UserExercise;
  log: ExerciseLog | null;
  onUpdate: (log: Partial<ExerciseLog>) => void;
  disabled: boolean;
}

export function ExerciseCard({ userExercise, log, onUpdate, disabled }: Props) {
  const [expanded, setExpanded] = useState(false);
  const exercise = userExercise.exercise!;
  const isCompleted = log?.completed ?? false;
  const currentSet = log?.actual_sets ?? 0;
  const currentReps = log?.actual_reps ?? 0;

  const targetLabel = userExercise.hold_seconds
    ? `${userExercise.sets} x ${userExercise.hold_seconds}s hold`
    : `${userExercise.sets} x ${userExercise.reps}`;

  return (
    <View className={`mx-4 mb-3 rounded-2xl border ${isCompleted ? "bg-green-50 border-green-200" : "bg-surface border-border"} ${disabled ? "opacity-40" : ""}`}>
      <TouchableOpacity
        className="flex-row items-center px-4 py-4"
        onPress={() => !disabled && setExpanded(!expanded)}
        disabled={disabled}
      >
        <TouchableOpacity
          onPress={() => onUpdate({ completed: !isCompleted })}
          disabled={disabled}
        >
          <Ionicons
            name={isCompleted ? "checkmark-circle" : "ellipse-outline"}
            size={28}
            color={isCompleted ? Colors.success : Colors.textMuted}
          />
        </TouchableOpacity>
        <View className="flex-1 ml-3">
          <Text className={`text-base font-semibold ${isCompleted ? "line-through text-textMuted" : "text-text"}`}>
            {exercise.name}
          </Text>
          <Text className="text-sm text-textSecondary">{targetLabel}</Text>
        </View>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={20} color={Colors.textMuted} />
      </TouchableOpacity>

      {expanded && !disabled && (
        <View className="px-4 pb-4 border-t border-borderLight pt-3">
          <SetTracker current={currentSet} total={userExercise.sets} onSetComplete={(sets) => onUpdate({ actual_sets: sets })} />
          {userExercise.hold_seconds ? (
            <RestTimer seconds={userExercise.hold_seconds} />
          ) : (
            <RepCounter current={currentReps} target={userExercise.reps} onChange={(reps) => onUpdate({ actual_reps: reps })} />
          )}
        </View>
      )}
    </View>
  );
}
```

**Step 6: Wire up Today screen**

```typescript
// app/(tabs)/today.tsx
import { View, ScrollView, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useToday } from "../../lib/hooks/use-today";
import { DayHeader } from "../../components/DayHeader";
import { DailyMessage } from "../../components/DailyMessage";
import { SmartRestToggle } from "../../components/SmartRestToggle";
import { ExerciseCard } from "../../components/ExerciseCard";
import { supabase } from "../../lib/supabase";
import { Colors } from "../../constants/colors";

export default function TodayScreen() {
  const router = useRouter();
  const { loading, daysSinceSurgery, weekNumber, userExercises, dailyLog, exerciseLogs, dailyMessage, refetch } = useToday();

  if (loading) {
    return <View className="flex-1 bg-background items-center justify-center"><ActivityIndicator color={Colors.primary} size="large" /></View>;
  }

  const isRestDay = dailyLog?.is_rest_day ?? false;

  async function toggleRestDay() {
    if (!dailyLog) return;
    await supabase.from("daily_logs").update({ is_rest_day: !isRestDay }).eq("id", dailyLog.id);
    refetch();
  }

  async function updateExerciseLog(userExerciseId: string, updates: Record<string, any>) {
    if (!dailyLog) return;
    const existing = exerciseLogs.find((l) => l.user_exercise_id === userExerciseId);
    if (existing) {
      await supabase.from("exercise_logs").update(updates).eq("id", existing.id);
    } else {
      await supabase.from("exercise_logs").insert({
        daily_log_id: dailyLog.id,
        user_exercise_id: userExerciseId,
        completed: false,
        actual_sets: 0,
        actual_reps: 0,
        ...updates,
      });
    }
    refetch();
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingBottom: 100 }}>
      <DayHeader day={daysSinceSurgery} week={weekNumber} />
      <DailyMessage message={dailyMessage?.body ?? null} />
      <SmartRestToggle isRestDay={isRestDay} onToggle={toggleRestDay} />

      {isRestDay ? (
        <View className="mx-4 bg-rest/10 rounded-2xl p-6 items-center">
          <Text className="text-lg font-bold text-rest mb-2">Rest Day</Text>
          <Text className="text-base text-textSecondary text-center">
            The couch is officially your medical duty station. Good job listening to your knee.
          </Text>
        </View>
      ) : (
        <>
          {userExercises.map((ue) => (
            <ExerciseCard
              key={ue.id}
              userExercise={ue}
              log={exerciseLogs.find((l) => l.user_exercise_id === ue.id) ?? null}
              onUpdate={(updates) => updateExerciseLog(ue.id, updates)}
              disabled={isRestDay}
            />
          ))}
          <TouchableOpacity
            className="mx-4 mt-2 py-3 rounded-2xl border border-dashed border-primary items-center flex-row justify-center"
            onPress={() => router.push("/exercise-picker")}
          >
            <Ionicons name="add" size={20} color={Colors.primary} />
            <Text className="ml-2 text-primary font-bold">Add Exercise</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}
```

**Step 7: Commit**

```bash
git add -A && git commit -m "feat: build Today screen with day header, daily message, rest toggle, exercise cards"
```

---

## Task 13: Exercise Interaction Components

**Files:**
- Create: `components/RepCounter.tsx`
- Create: `components/RestTimer.tsx`
- Create: `components/SetTracker.tsx`

**Step 1: RepCounter**

```typescript
// components/RepCounter.tsx
import { View, Text, TouchableOpacity } from "react-native";
import * as Haptics from "expo-haptics";

interface Props {
  current: number;
  target: number;
  onChange: (value: number) => void;
}

export function RepCounter({ current, target, onChange }: Props) {
  function adjust(delta: number) {
    const next = Math.max(0, current + delta);
    onChange(next);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  return (
    <View className="flex-row items-center justify-center mt-3">
      <TouchableOpacity className="bg-primary/10 rounded-full w-10 h-10 items-center justify-center" onPress={() => adjust(-1)}>
        <Text className="text-primary text-xl font-bold">-</Text>
      </TouchableOpacity>
      <View className="mx-6 items-center">
        <Text className="text-2xl font-bold text-text">{current}</Text>
        <Text className="text-xs text-textSecondary">of {target} reps</Text>
      </View>
      <TouchableOpacity className="bg-primary/10 rounded-full w-10 h-10 items-center justify-center" onPress={() => adjust(1)}>
        <Text className="text-primary text-xl font-bold">+</Text>
      </TouchableOpacity>
    </View>
  );
}
```

**Step 2: RestTimer**

```typescript
// components/RestTimer.tsx
import { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import * as Haptics from "expo-haptics";
import { Colors } from "../constants/colors";

interface Props {
  seconds: number;
}

export function RestTimer({ seconds }: Props) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            setRunning(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, remaining]);

  function toggle() {
    if (remaining === 0) {
      setRemaining(seconds);
      setRunning(true);
    } else {
      setRunning(!running);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const display = `${mins}:${secs.toString().padStart(2, "0")}`;

  return (
    <View className="items-center mt-3">
      <Text className="text-3xl font-bold text-text">{display}</Text>
      <TouchableOpacity
        className={`mt-2 px-6 py-2 rounded-2xl ${running ? "bg-warning" : remaining === 0 ? "bg-secondary" : "bg-primary"}`}
        onPress={toggle}
      >
        <Text className="text-white font-bold">
          {remaining === 0 ? "Reset" : running ? "Pause" : "Start"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
```

**Step 3: SetTracker**

```typescript
// components/SetTracker.tsx
import { View, TouchableOpacity } from "react-native";
import * as Haptics from "expo-haptics";
import { Colors } from "../constants/colors";

interface Props {
  current: number;
  total: number;
  onSetComplete: (sets: number) => void;
}

export function SetTracker({ current, total, onSetComplete }: Props) {
  function toggleSet(index: number) {
    const newSets = index < current ? index : index + 1;
    onSetComplete(newSets);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  return (
    <View className="flex-row justify-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <TouchableOpacity
          key={i}
          className={`w-8 h-8 rounded-full border-2 items-center justify-center ${
            i < current ? "bg-primary border-primary" : "bg-transparent border-border"
          }`}
          onPress={() => toggleSet(i)}
        />
      ))}
    </View>
  );
}
```

**Step 4: Install expo-haptics**

```bash
npx expo install expo-haptics
```

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: add RepCounter, RestTimer, and SetTracker components"
```

---

## Task 14: Exercise Picker & Add Custom Exercise

**Files:**
- Create: `app/exercise-picker.tsx`
- Create: `components/AddExerciseForm.tsx`

**Step 1: Exercise picker screen**

```typescript
// app/exercise-picker.tsx
import { useState, useEffect } from "react";
import { View, Text, TextInput, FlatList, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth-context";
import { Colors } from "../constants/colors";
import type { Exercise } from "../lib/types";

export default function ExercisePicker() {
  const router = useRouter();
  const { session } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    supabase.from("exercises").select("*").eq("status", "approved").order("sort_order").then(({ data }) => {
      setExercises(data || []);
    });
  }, []);

  const filtered = exercises.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()));

  async function addToMyPlan(exercise: Exercise) {
    if (!session) return;
    // Check for duplicate
    const { data: existing } = await supabase
      .from("user_exercises")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("exercise_id", exercise.id)
      .single();

    if (existing) {
      Alert.alert("Already added", "This exercise is already in your plan.");
      return;
    }

    await supabase.from("user_exercises").insert({
      user_id: session.user.id,
      exercise_id: exercise.id,
      sets: exercise.default_sets,
      reps: exercise.default_reps,
      hold_seconds: exercise.default_hold_seconds,
      is_active: true,
      sort_order: 99,
    });

    Alert.alert("Added!", `${exercise.name} added to your plan.`);
    router.back();
  }

  async function submitCustomExercise(name: string, description: string, sets: number, reps: number, holdSeconds: number | null) {
    if (!session) return;

    // Duplicate detection
    const { data: dupes } = await supabase.from("exercises").select("id, name").ilike("name", name);
    if (dupes && dupes.length > 0) {
      Alert.alert("Similar exercise exists", `Did you mean "${dupes[0].name}"? Check the list.`);
      return;
    }

    const { data: newExercise } = await supabase.from("exercises").insert({
      name,
      description,
      phase: "early",
      default_sets: sets,
      default_reps: reps,
      default_hold_seconds: holdSeconds,
      category: "rom",
      submitted_by: session.user.id,
      status: "approved",
      sort_order: 100,
    }).select().single();

    if (newExercise) {
      addToMyPlan(newExercise);
    }
  }

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center px-4 pt-4 pb-2">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-text">Add Exercise</Text>
      </View>

      <TextInput
        className="mx-4 bg-surface border border-border rounded-2xl px-4 py-3 text-base mb-3"
        placeholder="Search exercises..."
        value={search}
        onChangeText={setSearch}
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity className="mx-4 mb-2 bg-surface rounded-2xl px-4 py-3 border border-border" onPress={() => addToMyPlan(item)}>
            <Text className="text-base font-semibold text-text">{item.name}</Text>
            <Text className="text-sm text-textSecondary mt-1" numberOfLines={2}>{item.description}</Text>
            <Text className="text-xs text-textMuted mt-1">{item.default_sets}x{item.default_reps} | {item.category}</Text>
          </TouchableOpacity>
        )}
        ListFooterComponent={
          <TouchableOpacity
            className="mx-4 mt-2 mb-8 py-4 rounded-2xl border border-dashed border-secondary items-center"
            onPress={() => setShowAddForm(true)}
          >
            <Text className="text-secondary font-bold">Can't find it? Add a custom exercise</Text>
          </TouchableOpacity>
        }
      />

      {/* Add custom exercise modal/form would go here — keep it simple with an Alert.prompt or a bottom sheet */}
    </View>
  );
}
```

**Step 2: Commit**

```bash
git add -A && git commit -m "feat: add exercise picker with search and custom exercise submission"
```

---

## Task 15: Progress Tab

**Files:**
- Modify: `app/(tabs)/progress.tsx`
- Create: `components/RomChart.tsx`
- Create: `components/QuadStreak.tsx`
- Create: `components/CalendarHeatmap.tsx`

**Step 1: Install chart library**

```bash
npx expo install react-native-chart-kit react-native-svg
```

**Step 2: Build RomChart**

Line chart showing flexion + extension over time using react-native-chart-kit. Fetches from `rom_measurements` table.

**Step 3: Build QuadStreak**

Row of 30 dots (last 30 days). Filled = quad_activation true that day. Fetches from `rom_measurements`.

**Step 4: Build CalendarHeatmap**

Monthly grid. Green = all exercises completed, yellow = rest day, empty = missed. Fetches from `daily_logs` + `exercise_logs`.

**Step 5: Wire up Progress screen**

Composes RomChart, QuadStreak, CalendarHeatmap in a ScrollView.

**Step 6: Commit**

```bash
git add -A && git commit -m "feat: build Progress tab with ROM chart, quad streak, calendar heatmap"
```

---

## Task 16: Measurements Tab

**Files:**
- Modify: `app/(tabs)/measurements.tsx`

**Step 1: Build measurements screen**

- Form at top: flexion_degrees (number input), extension_degrees (number input), quad_activation (toggle), date (defaults today)
- "Save" button inserts into `rom_measurements`
- History list below, newest first
- Each entry shows date + values, tappable to edit

**Step 2: Commit**

```bash
git add -A && git commit -m "feat: build Measurements tab with ROM logging form and history"
```

---

## Task 17: Profile Tab

**Files:**
- Modify: `app/(tabs)/profile.tsx`

**Step 1: Build profile screen**

- Username display
- Surgery info (date, graft type, knee side)
- Notification preferences (daily reminder time, evening nudge toggle)
- "Export My Data" button (fetches all user data, serializes to JSON, shares via Share API)
- "Delete Account" button (confirmation dialog, then deletes profile + calls supabase.auth.admin or user signs out)
- "Sign Out" button
- Link to privacy policy (can be a simple in-app text screen for MVP)

**Step 2: Commit**

```bash
git add -A && git commit -m "feat: build Profile tab with settings, data export, and account deletion"
```

---

## Task 18: Achievement System

**Files:**
- Create: `lib/achievements.ts`
- Create: `components/AchievementPopup.tsx`
- Modify: `app/(tabs)/today.tsx` (integrate achievement checks)

**Step 1: Build achievement checker**

```typescript
// lib/achievements.ts
import { supabase } from "./supabase";
import type { Content } from "./types";

interface UserState {
  userId: string;
  daysSinceSurgery: number;
  streak: number;
  totalExercisesCompleted: number;
  dailyComplete: boolean;
  isFirstExercise: boolean;
  isFirstRestDay: boolean;
  isFirstMeasurement: boolean;
  latestFlexion: number | null;
  latestExtension: number | null;
  hasQuadActivation: boolean;
}

export async function checkAchievements(state: UserState): Promise<Content[]> {
  // Fetch all achievements
  const { data: allAchievements } = await supabase.from("content").select("*").eq("type", "achievement");
  if (!allAchievements) return [];

  // Fetch already unlocked
  const { data: unlocked } = await supabase.from("user_achievements").select("content_id").eq("user_id", state.userId);
  const unlockedIds = new Set((unlocked || []).map((u) => u.content_id));

  const newlyUnlocked: Content[] = [];

  for (const achievement of allAchievements) {
    if (unlockedIds.has(achievement.id)) continue;
    const trigger = achievement.trigger_condition as Record<string, any> | null;
    if (!trigger) continue;

    let matched = false;
    switch (trigger.type) {
      case "first_exercise_completed": matched = state.isFirstExercise; break;
      case "daily_complete": matched = state.dailyComplete; break;
      case "day_reached": matched = state.daysSinceSurgery >= trigger.value; break;
      case "streak_reached": matched = state.streak >= trigger.value; break;
      case "first_rest_day": matched = state.isFirstRestDay; break;
      case "first_measurement": matched = state.isFirstMeasurement; break;
      case "flexion_above": matched = (state.latestFlexion ?? 0) > trigger.value; break;
      case "extension_at": matched = state.latestExtension !== null && state.latestExtension <= trigger.value; break;
      case "first_quad_activation": matched = state.hasQuadActivation; break;
    }

    if (matched) {
      await supabase.from("user_achievements").insert({ user_id: state.userId, content_id: achievement.id });
      newlyUnlocked.push(achievement);
    }
  }

  return newlyUnlocked;
}
```

**Step 2: Build AchievementPopup**

Modal overlay with achievement title + body, playful animation (scale in), dismiss button.

**Step 3: Integrate into Today screen**

After exercise completion or rest day toggle, call `checkAchievements` and show popup if any new ones unlocked.

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: add achievement system with trigger matching and popup"
```

---

## Task 19: Push Notifications

**Files:**
- Create: `lib/notifications.ts`
- Modify: `app/(onboarding)/set-reminder.tsx` (register token)
- Modify: `app/(tabs)/profile.tsx` (update prefs)

**Step 1: Install expo-notifications**

```bash
npx expo install expo-notifications expo-device expo-constants
```

**Step 2: Create notification helpers**

```typescript
// lib/notifications.ts
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { supabase } from "./supabase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotifications(userId: string): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return null;

  const token = (await Notifications.getExpoPushTokenAsync()).data;

  await supabase.from("profiles").update({ expo_push_token: token }).eq("id", userId);

  return token;
}

export async function scheduleDailyReminder(hour: number, minute: number) {
  await Notifications.cancelAllScheduledNotificationsAsync();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "KneeBack",
      body: "Time to do your exercises. Your knee is waiting.",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}
```

**Step 3: Register during onboarding and update in profile**

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: add push notification registration and daily scheduling"
```

---

## Task 20: Evening Nudge Edge Function

**Files:**
- Supabase Edge Function (deployed via MCP)

**Step 1: Create edge function**

A Supabase Edge Function on a cron schedule (runs at multiple times to cover user timezones, or once at a fixed time for MVP). It:
1. Queries `notification_preferences` where `evening_nudge_enabled = true`
2. Joins with `daily_logs` to find users with no log for today (or log with no completed exercises and no rest day)
3. Joins with `profiles` to get `expo_push_token`
4. Sends push via Expo Push API

**Step 2: Deploy via Supabase MCP**

**Step 3: Commit note**

```bash
echo "Evening nudge edge function deployed via Supabase MCP on $(date)" >> docs/plans/migration-log.md
git add -A && git commit -m "docs: record evening nudge edge function deployment"
```

---

## Task 21: Visual Polish Pass

**Files:**
- All screens and components

**Step 1: Consistent spacing, rounded corners, color usage**

Review all screens for:
- Consistent use of `rounded-2xl` for cards/inputs/buttons
- `bg-background` on all screen roots
- Warm colors from the palette
- Large tap targets (min 44px)
- Generous padding (`px-4`, `py-4`)

**Step 2: Add Ionicons consistently to all interactive elements**

**Step 3: Loading states**

Ensure all screens show `ActivityIndicator` while fetching.

**Step 4: Empty states**

- No exercises: "Add your first exercise to get started"
- No measurements: "Log your first ROM reading"
- No achievements: "Keep at it — achievements are coming"

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: visual polish pass — consistent styling, loading states, empty states"
```

---

## Task 22: Test on Pixel 9

**Step 1: Create dev build**

```bash
npx expo run:android
```

Or use Expo Dev Client:

```bash
npx expo start --dev-client
```

**Step 2: Full flow test**

Walk through:
1. Sign up with email
2. Complete onboarding
3. Land on Today screen
4. Complete exercises using inline controls
5. Toggle rest day
6. Log ROM measurement
7. Check progress charts
8. Verify notification fires
9. Check achievements unlock

**Step 3: Fix any issues found**

**Step 4: Commit fixes**

```bash
git add -A && git commit -m "fix: issues found during Pixel 9 testing"
```

---

## Execution Summary

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Scaffold Expo project | - |
| 2 | Install & configure NativeWind | 1 |
| 3 | Design tokens & theme | 2 |
| 4 | Supabase project & client setup | 1 |
| 5 | Database schema & RLS | 4 |
| 6 | Seed data | 5 |
| 7 | Auth context & routing | 4 |
| 8 | Sign-in & sign-up screens | 3, 7 |
| 9 | Google Sign-In | 8 |
| 10 | Onboarding flow | 6, 8 |
| 11 | Tab navigation shell | 3, 7 |
| 12 | Today screen core | 10, 11 |
| 13 | Exercise interaction components | 12 |
| 14 | Exercise picker | 12 |
| 15 | Progress tab | 11, 6 |
| 16 | Measurements tab | 11 |
| 17 | Profile tab | 11 |
| 18 | Achievement system | 6, 12 |
| 19 | Push notifications | 10, 17 |
| 20 | Evening nudge edge function | 19 |
| 21 | Visual polish | 12-18 |
| 22 | Test on Pixel 9 | All |
