import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const profile = sqliteTable("profile", {
  id: text("id").primaryKey(),
  name: text("name"),
  username: text("username"),
  surgery_date: text("surgery_date"),
  graft_type: text("graft_type"),
  knee_side: text("knee_side").notNull().default("right"),
  device_id: text("device_id"),
  supabase_user_id: text("supabase_user_id"),
  last_synced_at: text("last_synced_at"),
  created_at: text("created_at").default("(datetime('now'))"),
  updated_at: text("updated_at").default("(datetime('now'))"),
});

export const exercises = sqliteTable("exercises", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  phase_start: text("phase_start").notNull(),
  phase_end: text("phase_end"),
  role: text("role").notNull().default("primary"),
  primary_exercise_id: text("primary_exercise_id"),
  muscle_groups: text("muscle_groups").notNull().default("[]"),
  default_sets: integer("default_sets").notNull().default(3),
  default_reps: integer("default_reps").notNull().default(10),
  default_hold_seconds: integer("default_hold_seconds"),
  category: text("category").notNull().default("strengthening"),
  sort_order: integer("sort_order").notNull().default(0),
  catalog_version: integer("catalog_version").notNull().default(1),
  created_at: text("created_at").default("(datetime('now'))"),
  updated_at: text("updated_at").default("(datetime('now'))"),
});

export const content = sqliteTable("content", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  trigger_condition: text("trigger_condition"),
  phase: text("phase"),
  sort_order: integer("sort_order").notNull().default(0),
  catalog_version: integer("catalog_version").notNull().default(1),
  created_at: text("created_at").default("(datetime('now'))"),
  updated_at: text("updated_at").default("(datetime('now'))"),
});

export const user_exercises = sqliteTable("user_exercises", {
  id: text("id").primaryKey(),
  exercise_id: text("exercise_id")
    .notNull()
    .references(() => exercises.id),
  sets: integer("sets").notNull().default(3),
  reps: integer("reps").notNull().default(10),
  hold_seconds: integer("hold_seconds"),
  sort_order: integer("sort_order").notNull().default(0),
  created_at: text("created_at").default("(datetime('now'))"),
  updated_at: text("updated_at").default("(datetime('now'))"),
});

export const daily_logs = sqliteTable("daily_logs", {
  id: text("id").primaryKey(),
  date: text("date").notNull().unique(),
  is_rest_day: integer("is_rest_day").notNull().default(0),
  notes: text("notes"),
  created_at: text("created_at").default("(datetime('now'))"),
  updated_at: text("updated_at").default("(datetime('now'))"),
});

export const exercise_logs = sqliteTable("exercise_logs", {
  id: text("id").primaryKey(),
  daily_log_id: text("daily_log_id")
    .notNull()
    .references(() => daily_logs.id),
  user_exercise_id: text("user_exercise_id")
    .notNull()
    .references(() => user_exercises.id),
  completed: integer("completed").notNull().default(0),
  actual_sets: integer("actual_sets").notNull().default(0),
  actual_reps: integer("actual_reps").notNull().default(0),
  created_at: text("created_at").default("(datetime('now'))"),
  updated_at: text("updated_at").default("(datetime('now'))"),
});

export const rom_measurements = sqliteTable("rom_measurements", {
  id: text("id").primaryKey(),
  date: text("date").notNull(),
  flexion_degrees: real("flexion_degrees"),
  extension_degrees: real("extension_degrees"),
  quad_activation: integer("quad_activation").notNull().default(0),
  created_at: text("created_at").default("(datetime('now'))"),
  updated_at: text("updated_at").default("(datetime('now'))"),
});

export const milestones = sqliteTable("milestones", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull().default("milestone"),
  date: text("date").notNull(),
  notes: text("notes"),
  template_key: text("template_key"),
  created_at: text("created_at").default("(datetime('now'))"),
  updated_at: text("updated_at").default("(datetime('now'))"),
});

export const user_achievements = sqliteTable("user_achievements", {
  id: text("id").primaryKey(),
  content_id: text("content_id")
    .notNull()
    .references(() => content.id),
  unlocked_at: text("unlocked_at").notNull(),
  created_at: text("created_at").default("(datetime('now'))"),
  updated_at: text("updated_at").default("(datetime('now'))"),
});

export const user_gate_criteria = sqliteTable("user_gate_criteria", {
  id: text("id").primaryKey(),
  gate_key: text("gate_key").notNull(),
  criterion_key: text("criterion_key").notNull(),
  confirmed_at: text("confirmed_at").notNull(),
  created_at: text("created_at").default("(datetime('now'))"),
  updated_at: text("updated_at").default("(datetime('now'))"),
});

export const notification_preferences = sqliteTable("notification_preferences", {
  id: text("id").primaryKey(),
  daily_reminder_time: text("daily_reminder_time").notNull().default("08:00"),
  evening_nudge_enabled: integer("evening_nudge_enabled").notNull().default(0),
  evening_nudge_time: text("evening_nudge_time").notNull().default("20:00"),
  completion_congrats_enabled: integer("completion_congrats_enabled")
    .notNull()
    .default(1),
  created_at: text("created_at").default("(datetime('now'))"),
  updated_at: text("updated_at").default("(datetime('now'))"),
});

// TypeScript inferred types for each table
export type Profile = typeof profile.$inferSelect;
export type Exercise = typeof exercises.$inferSelect;
export type Content = typeof content.$inferSelect;
export type UserExercise = typeof user_exercises.$inferSelect;
export type DailyLog = typeof daily_logs.$inferSelect;
export type ExerciseLog = typeof exercise_logs.$inferSelect;
export type RomMeasurement = typeof rom_measurements.$inferSelect;
export type Milestone = typeof milestones.$inferSelect;
export type UserAchievement = typeof user_achievements.$inferSelect;
export type UserGateCriterion = typeof user_gate_criteria.$inferSelect;
export type NotificationPreference = typeof notification_preferences.$inferSelect;
