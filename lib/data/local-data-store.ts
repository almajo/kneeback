import * as profileRepo from "../db/repositories/profile-repo";
import * as userExerciseRepo from "../db/repositories/user-exercise-repo";
import * as dailyLogRepo from "../db/repositories/daily-log-repo";
import * as exerciseLogRepo from "../db/repositories/exercise-log-repo";
import * as romRepo from "../db/repositories/rom-repo";
import * as milestoneRepo from "../db/repositories/milestone-repo";
import * as achievementRepo from "../db/repositories/achievement-repo";
import * as gateCriteriaRepo from "../db/repositories/gate-criteria-repo";
import * as notificationRepo from "../db/repositories/notification-repo";
import * as exerciseRepoModule from "../db/repositories/exercise-repo";
import * as contentRepoModule from "../db/repositories/content-repo";
import type { ExercisePhase } from "../types";

import type {
  DataStore,
  CatalogStore,
  Profile,
  CreateProfileData,
  UpdateProfileData,
  UserExercise,
  CreateUserExerciseData,
  UpdateUserExerciseData,
  DailyLog,
  UpdateDailyLogData,
  ExerciseLog,
  UpsertExerciseLogData,
  RomMeasurement,
  CreateRomData,
  Milestone,
  CreateMilestoneData,
  UserAchievement,
  GateCriterion,
  NotificationPreferences,
  NotificationPrefsData,
} from "./data-store.types";
import type { Exercise, Content } from "../types";

// Strip local-only fields from LocalProfile to return the shared Profile type
function toSharedProfile(local: profileRepo.LocalProfile): Profile {
  return {
    id: local.id,
    name: local.name,
    username: local.username,
    surgery_date: local.surgery_date,
    graft_type: local.graft_type,
    knee_side: local.knee_side,
    created_at: local.created_at,
    updated_at: local.updated_at,
  };
}

function toSharedUserExercise(local: userExerciseRepo.LocalUserExercise): UserExercise {
  return {
    id: local.id,
    exercise_id: local.exercise_id,
    sets: local.sets,
    reps: local.reps,
    hold_seconds: local.hold_seconds,
    sort_order: local.sort_order,
    created_at: local.created_at,
    updated_at: local.updated_at,
    exercise: local.exercise,
  };
}

function toSharedDailyLog(local: dailyLogRepo.LocalDailyLog): DailyLog {
  return {
    id: local.id,
    date: local.date,
    is_rest_day: local.is_rest_day,
    notes: local.notes,
    created_at: local.created_at,
  };
}

function toSharedExerciseLog(local: exerciseLogRepo.LocalExerciseLog): ExerciseLog {
  return {
    id: local.id,
    daily_log_id: local.daily_log_id,
    user_exercise_id: local.user_exercise_id,
    completed: local.completed,
    actual_sets: local.actual_sets,
    actual_reps: local.actual_reps,
  };
}

function toSharedRomMeasurement(local: romRepo.LocalRomMeasurement): RomMeasurement {
  return {
    id: local.id,
    date: local.date,
    flexion_degrees: local.flexion_degrees,
    extension_degrees: local.extension_degrees,
    quad_activation: local.quad_activation,
  };
}

function toSharedMilestone(local: milestoneRepo.LocalMilestone): Milestone {
  return {
    id: local.id,
    title: local.title,
    category: local.category,
    date: local.date,
    notes: local.notes,
    template_key: local.template_key,
    created_at: local.created_at,
  };
}

function toSharedAchievement(local: achievementRepo.LocalUserAchievement): UserAchievement {
  return {
    id: local.id,
    content_id: local.content_id,
    unlocked_at: local.unlocked_at,
  };
}

function toSharedGateCriterion(local: gateCriteriaRepo.LocalUserGateCriterion): GateCriterion {
  return {
    id: local.id,
    gate_key: local.gate_key,
    criterion_key: local.criterion_key,
    confirmed_at: local.confirmed_at,
  };
}

function toSharedNotificationPrefs(
  local: notificationRepo.LocalNotificationPreferences
): NotificationPreferences {
  return {
    id: local.id,
    daily_reminder_time: local.daily_reminder_time,
    evening_nudge_enabled: local.evening_nudge_enabled,
    evening_nudge_time: local.evening_nudge_time,
    completion_congrats_enabled: local.completion_congrats_enabled,
  };
}

// ─── LocalDataStore ──────────────────────────────────────────────────────────

export class LocalDataStore implements DataStore {
  // profile
  async getProfile(): Promise<Profile | null> {
    const local = await profileRepo.getProfile();
    if (!local) return null;
    return toSharedProfile(local);
  }

  async createProfile(data: CreateProfileData): Promise<Profile> {
    const local = await profileRepo.createProfile({
      ...data,
      device_id: "",
      supabase_user_id: null,
      last_synced_at: null,
    });
    return toSharedProfile(local);
  }

  async updateProfile(data: UpdateProfileData): Promise<Profile> {
    const local = await profileRepo.updateProfile(data);
    return toSharedProfile(local);
  }

  // user exercises
  async getAllUserExercises(): Promise<UserExercise[]> {
    const locals = await userExerciseRepo.getAllUserExercises();
    return locals.map(toSharedUserExercise);
  }

  async createUserExercise(data: CreateUserExerciseData): Promise<UserExercise> {
    const local = await userExerciseRepo.createUserExercise(data);
    return toSharedUserExercise(local);
  }

  async updateUserExercise(id: string, data: UpdateUserExerciseData): Promise<UserExercise> {
    const local = await userExerciseRepo.updateUserExercise(id, data);
    return toSharedUserExercise(local);
  }

  async deleteUserExercise(id: string): Promise<void> {
    await userExerciseRepo.deleteUserExercise(id);
  }

  async updateUserExerciseSortOrder(id: string, sortOrder: number): Promise<void> {
    await userExerciseRepo.updateUserExerciseSortOrder(id, sortOrder);
  }

  // daily logs
  async getOrCreateDailyLog(date: string): Promise<DailyLog> {
    const local = await dailyLogRepo.getOrCreateDailyLog(date);
    return toSharedDailyLog(local);
  }

  async updateDailyLog(id: string, data: UpdateDailyLogData): Promise<DailyLog> {
    const local = await dailyLogRepo.updateDailyLog(id, data);
    return toSharedDailyLog(local);
  }

  // exercise logs
  async getExerciseLogsByDailyLogId(dailyLogId: string): Promise<ExerciseLog[]> {
    const locals = await exerciseLogRepo.getExerciseLogsByDailyLogId(dailyLogId);
    return locals.map(toSharedExerciseLog);
  }

  async upsertExerciseLog(data: UpsertExerciseLogData): Promise<ExerciseLog> {
    const local = await exerciseLogRepo.upsertExerciseLog(data);
    return toSharedExerciseLog(local);
  }

  // ROM
  async getAllRomMeasurements(): Promise<RomMeasurement[]> {
    const locals = await romRepo.getAllRomMeasurements();
    return locals.map(toSharedRomMeasurement);
  }

  async getRomMeasurementsByDateRange(start: string, end: string): Promise<RomMeasurement[]> {
    const locals = await romRepo.getRomMeasurementsByDateRange(start, end);
    return locals.map(toSharedRomMeasurement);
  }

  async createRomMeasurement(data: CreateRomData): Promise<RomMeasurement> {
    const local = await romRepo.createRomMeasurement(data);
    return toSharedRomMeasurement(local);
  }

  // milestones
  async getAllMilestones(): Promise<Milestone[]> {
    const locals = await milestoneRepo.getAllMilestones();
    return locals.map(toSharedMilestone);
  }

  async getMilestonesByDate(date: string): Promise<Milestone[]> {
    const locals = await milestoneRepo.getMilestonesByDate(date);
    return locals.map(toSharedMilestone);
  }

  async createMilestone(data: CreateMilestoneData): Promise<Milestone> {
    const local = await milestoneRepo.createMilestone(data);
    return toSharedMilestone(local);
  }

  async deleteMilestone(id: string): Promise<void> {
    await milestoneRepo.deleteMilestone(id);
  }

  // achievements
  async getAchievements(): Promise<UserAchievement[]> {
    const locals = await achievementRepo.getUnlockedAchievements();
    return locals.map(toSharedAchievement);
  }

  async unlockAchievement(contentId: string): Promise<UserAchievement> {
    const local = await achievementRepo.unlockAchievement(contentId);
    return toSharedAchievement(local);
  }

  // gate criteria
  async getAllGateCriteria(): Promise<GateCriterion[]> {
    const locals = await gateCriteriaRepo.getAllGateCriteria();
    return locals.map(toSharedGateCriterion);
  }

  async getGateCriteriaByGate(gateKey: string): Promise<GateCriterion[]> {
    const locals = await gateCriteriaRepo.getGateCriteriaByGate(gateKey);
    return locals.map(toSharedGateCriterion);
  }

  async confirmGateCriterion(gateKey: string, criterionKey: string): Promise<GateCriterion> {
    const local = await gateCriteriaRepo.confirmGateCriterion(gateKey, criterionKey);
    return toSharedGateCriterion(local);
  }

  async removeGateCriterion(gateKey: string, criterionKey: string): Promise<void> {
    await gateCriteriaRepo.removeGateCriterion(gateKey, criterionKey);
  }

  // notification preferences
  async getNotificationPreferences(): Promise<NotificationPreferences | null> {
    const local = await notificationRepo.getNotificationPreferences();
    if (!local) return null;
    return toSharedNotificationPrefs(local);
  }

  async createOrUpdateNotificationPreferences(
    data: NotificationPrefsData
  ): Promise<NotificationPreferences> {
    const local = await notificationRepo.createOrUpdateNotificationPreferences(data);
    return toSharedNotificationPrefs(local);
  }
}

// ─── LocalCatalogStore ────────────────────────────────────────────────────────

export class LocalCatalogStore implements CatalogStore {
  async getAllExercises(): Promise<Exercise[]> {
    return exerciseRepoModule.getAllExercises();
  }

  async getExercisesByPhase(phase: string): Promise<Exercise[]> {
    return exerciseRepoModule.getExercisesByPhase(phase as ExercisePhase);
  }

  async getAllContent(): Promise<Content[]> {
    return contentRepoModule.getAllContent();
  }
}
