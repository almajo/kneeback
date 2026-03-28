import type {
  GraftType,
  KneeSide,
  Exercise,
  Content,
} from "../types";

// ─── Profile ────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  name: string;
  username: string;
  surgery_date: string | null;
  graft_type: GraftType | null;
  knee_side: KneeSide;
  created_at: string;
  /** The profiles table has no updated_at column; this field is optional. */
  updated_at?: string;
}

export type CreateProfileData = Omit<Profile, "created_at" | "updated_at">;
export type UpdateProfileData = Partial<Omit<Profile, "id" | "created_at" | "updated_at">>;

// ─── User Exercise ───────────────────────────────────────────────────────────

export interface UserExercise {
  id: string;
  exercise_id: string;
  sets: number;
  reps: number;
  hold_seconds: number | null;
  sort_order: number;
  /** The user_exercises table has no created_at/updated_at columns; these fields are optional. */
  created_at?: string;
  updated_at?: string;
  exercise?: Exercise;
}

export type CreateUserExerciseData = Omit<UserExercise, "created_at" | "updated_at" | "exercise">;
export type UpdateUserExerciseData = Partial<Omit<CreateUserExerciseData, "id" | "exercise_id">>;

// ─── Daily Log ───────────────────────────────────────────────────────────────

export interface DailyLog {
  id: string;
  date: string;
  is_rest_day: boolean;
  notes: string | null;
  created_at: string;
}

export type UpdateDailyLogData = Partial<Pick<DailyLog, "is_rest_day" | "notes">>;

// ─── Exercise Log ────────────────────────────────────────────────────────────

export interface ExerciseLog {
  id: string;
  daily_log_id: string;
  user_exercise_id: string;
  completed: boolean;
  actual_sets: number;
  actual_reps: number;
}

export type UpsertExerciseLogData = {
  id: string;
  daily_log_id: string;
  user_exercise_id: string;
  completed: boolean;
  actual_sets: number;
  actual_reps: number;
};

// ─── ROM Measurement ─────────────────────────────────────────────────────────

export interface RomMeasurement {
  id: string;
  date: string;
  flexion_degrees: number | null;
  extension_degrees: number | null;
  quad_activation: boolean;
}

export type CreateRomData = RomMeasurement;

// ─── Milestone ───────────────────────────────────────────────────────────────

export interface Milestone {
  id: string;
  title: string;
  category: "milestone" | "win";
  date: string;
  notes: string | null;
  template_key: string | null;
  created_at: string;
}

export type CreateMilestoneData = Milestone;

// ─── User Achievement ────────────────────────────────────────────────────────

export interface UserAchievement {
  id: string;
  content_id: string;
  unlocked_at: string;
}

// ─── Gate Criterion ──────────────────────────────────────────────────────────

export interface GateCriterion {
  id: string;
  gate_key: string;
  criterion_key: string;
  confirmed_at: string;
}

// ─── Notification Preferences ────────────────────────────────────────────────

export interface NotificationPreferences {
  id: string;
  daily_reminder_time: string;
  evening_nudge_enabled: boolean;
  evening_nudge_time: string;
  completion_congrats_enabled: boolean;
}

export type NotificationPrefsData = Partial<
  Omit<NotificationPreferences, "id">
>;

// ─── DataStore Interface ─────────────────────────────────────────────────────

export interface DataStore {
  // profile
  getProfile(): Promise<Profile | null>;
  createProfile(data: CreateProfileData): Promise<Profile>;
  updateProfile(data: UpdateProfileData): Promise<Profile>;

  // user exercises
  getAllUserExercises(): Promise<UserExercise[]>;
  createUserExercise(data: CreateUserExerciseData): Promise<UserExercise>;
  updateUserExercise(id: string, data: UpdateUserExerciseData): Promise<UserExercise>;
  deleteUserExercise(id: string): Promise<void>;
  updateUserExerciseSortOrder(id: string, sortOrder: number): Promise<void>;

  // daily logs
  getOrCreateDailyLog(date: string): Promise<DailyLog>;
  updateDailyLog(id: string, data: UpdateDailyLogData): Promise<DailyLog>;

  // exercise logs
  getExerciseLogsByDailyLogId(dailyLogId: string): Promise<ExerciseLog[]>;
  upsertExerciseLog(data: UpsertExerciseLogData): Promise<ExerciseLog>;

  // ROM
  getAllRomMeasurements(): Promise<RomMeasurement[]>;
  getRomMeasurementsByDateRange(start: string, end: string): Promise<RomMeasurement[]>;
  createRomMeasurement(data: CreateRomData): Promise<RomMeasurement>;

  // milestones
  getAllMilestones(): Promise<Milestone[]>;
  getMilestonesByDate(date: string): Promise<Milestone[]>;
  createMilestone(data: CreateMilestoneData): Promise<Milestone>;
  deleteMilestone(id: string): Promise<void>;

  // achievements
  getAchievements(): Promise<UserAchievement[]>;
  unlockAchievement(contentId: string): Promise<UserAchievement>;

  // gate criteria
  getAllGateCriteria(): Promise<GateCriterion[]>;
  getGateCriteriaByGate(gateKey: string): Promise<GateCriterion[]>;
  confirmGateCriterion(gateKey: string, criterionKey: string): Promise<GateCriterion>;
  removeGateCriterion(gateKey: string, criterionKey: string): Promise<void>;

  // notification preferences
  getNotificationPreferences(): Promise<NotificationPreferences | null>;
  createOrUpdateNotificationPreferences(data: NotificationPrefsData): Promise<NotificationPreferences>;
}

// ─── CatalogStore Interface ───────────────────────────────────────────────────

export interface CatalogStore {
  getAllExercises(): Promise<Exercise[]>;
  getExercisesByPhase(phase: string): Promise<Exercise[]>;
  getAllContent(): Promise<Content[]>;
}
