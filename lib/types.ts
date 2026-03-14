export type GraftType = "patellar" | "hamstring" | "quad" | "allograft";
export type KneeSide = "left" | "right";
export type ExercisePhase = "acute" | "early_active" | "strengthening" | "return_to_sport";
export type ExerciseCategory = "rom" | "strengthening" | "activation";
export type ContentType = "achievement" | "daily_message" | "crutch_hack";
export type ExerciseStatus = "approved" | "pending";

export interface Profile {
  id: string;
  username: string;
  surgery_date: string | null;
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

export interface Milestone {
  id: string;
  user_id: string;
  title: string;
  category: 'milestone' | 'win';
  date: string; // YYYY-MM-DD
  notes: string | null;
  template_key: string | null;
  created_at: string;
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

// Community types
export type PostType = "question" | "milestone" | "life_hack";

export interface CommunityPost {
  id: string;
  user_id: string;
  post_type: PostType;
  title: string;
  body: string;
  upvote_count: number;
  created_at: string;
  author_username: string;   // joined from profiles
  author_phase: string;      // computed from surgery_date
  comment_count: number;     // joined count
  has_upvoted: boolean;      // computed per current user
}

export interface CommunityComment {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  created_at: string;
  author_username: string;   // joined from profiles
  author_phase: string;      // computed from surgery_date
  upvote_count: number;
  has_upvoted: boolean;
}

export interface CreatePostInput {
  post_type: PostType;
  title: string;
  body: string;
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
      milestones: { Row: Milestone; Insert: Omit<Milestone, "id" | "created_at">; Update: Partial<Milestone> };
    };
  };
}
