// Tables with per-user data — catalog tables (exercises, content) are excluded
export const USER_DATA_TABLES = [
  "user_exercises",
  "daily_logs",
  "exercise_logs",
  "rom_measurements",
  "milestones",
  "user_achievements",
  "user_gate_criteria",
  "notification_preferences",
] as const;

export type UserDataTable = (typeof USER_DATA_TABLES)[number];
