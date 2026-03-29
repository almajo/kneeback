export type GraftType = "patellar" | "hamstring" | "quad" | "allograft";
export type KneeSide = "left" | "right";
export type ExercisePhase = "prehab" | "acute" | "early_active" | "strengthening" | "advanced_strengthening" | "return_to_sport";

// Gate system types
export type GateCriterionType = "auto_days" | "auto_rom" | "self_report";

export interface GateCriterion {
  key: string;
  label: string;
  plainLabel: string; // non-technical version for users
  type: GateCriterionType;
  // For auto_days: minimum days since surgery
  minDays?: number;
  // For auto_rom: minimum flexion degrees
  minFlexionDegrees?: number;
  source: string;
}

export interface GateDefinition {
  gateKey: string; // e.g. 'gate_3'
  fromPhase: ExercisePhase;
  toPhase: ExercisePhase;
  title: string;
  researchGap?: boolean; // true if no gate (Phase 2→3)
  informationalOnly?: boolean; // true if Phase 1→2 (show criteria but don't warn)
  criteria: GateCriterion[];
  warningMessage: string; // shown in soft gate warning
  source: string;
}

export interface UserGateCriteria {
  id: string;
  gate_key: string;
  criterion_key: string;
  confirmed_at: string;
}

export interface GateProgress {
  gate: GateDefinition;
  metCount: number;
  totalCount: number;
  allMet: boolean;
  criteriaStatus: { criterion: GateCriterion; met: boolean }[];
}
export type ExerciseCategory = "rom" | "strengthening" | "activation";
export type ContentType = "achievement" | "daily_message" | "crutch_hack";
export type ExerciseStatus = "approved" | "pending";
export type ExerciseRole = 'primary' | 'alternative' | 'optional';
export type ExerciseMuscleGroup = 'Quad' | 'Hamstring' | 'Hip' | 'Calf' | 'Knee ROM' | 'Core' | 'Glute';

export interface Profile {
  id: string;
  username: string;
  surgery_date: string | null;
  graft_type: GraftType | null;
  knee_side: KneeSide;
  expo_push_token: string | null;
  created_at: string;
}

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

export interface UserExercise {
  id: string;
  exercise_id: string;
  sets: number;
  reps: number;
  hold_seconds: number | null;
  sort_order: number;
  exercise?: Exercise; // joined
}

export interface DailyLog {
  id: string;
  date: string;
  is_rest_day: boolean;
  is_pt_day: boolean;
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
  title: string;
  category: 'milestone' | 'win';
  date: string; // YYYY-MM-DD
  notes: string | null;
  template_key: string | null;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  content_id: string;
  unlocked_at: string;
}

export interface NotificationPreferences {
  id: string;
  daily_reminder_time: string;
  evening_nudge_enabled: boolean;
  evening_nudge_time: string;
  completion_congrats_enabled: boolean;
}

// Community types
export type PostType = "question" | "milestone" | "life_hack" | "win";
export type ModerationStatus = "pending" | "approved" | "flagged";

export interface CommunityPost {
  id: string;
  device_id: string;
  post_type: PostType;
  title: string;
  body: string;
  upvote_count: number;
  created_at: string;
  author_animal_name: string;  // stored on the post
  author_phase: string;        // stored on the post
  comment_count: number;       // joined count
  has_upvoted: boolean;        // computed per current device
  moderation_status: ModerationStatus;
}

export interface CommunityComment {
  id: string;
  post_id: string;
  device_id: string;
  body: string;
  created_at: string;
  author_animal_name: string;  // stored on the comment
  author_phase: string;        // stored on the comment
  upvote_count: number;
  has_upvoted: boolean;
  moderation_status: ModerationStatus;
}

export interface CreatePostInput {
  post_type: PostType;
  title: string;
  body: string;
}

