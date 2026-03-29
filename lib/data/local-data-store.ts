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

// ─── LocalDataStore ──────────────────────────────────────────────────────────

export class LocalDataStore implements DataStore {
  // profile
  async getProfile(): Promise<Profile | null> {
    return profileRepo.getProfile();
  }

  async createProfile(data: CreateProfileData): Promise<Profile> {
    return profileRepo.createProfile(data);
  }

  async updateProfile(data: UpdateProfileData): Promise<Profile> {
    return profileRepo.updateProfile(data);
  }

  // user exercises
  async getAllUserExercises(): Promise<UserExercise[]> {
    return userExerciseRepo.getAllUserExercises();
  }

  async createUserExercise(data: CreateUserExerciseData): Promise<UserExercise> {
    return userExerciseRepo.createUserExercise(data);
  }

  async updateUserExercise(id: string, data: UpdateUserExerciseData): Promise<UserExercise> {
    return userExerciseRepo.updateUserExercise(id, data);
  }

  async deleteUserExercise(id: string): Promise<void> {
    await userExerciseRepo.deleteUserExercise(id);
  }

  async updateUserExerciseSortOrder(id: string, sortOrder: number): Promise<void> {
    await userExerciseRepo.updateUserExerciseSortOrder(id, sortOrder);
  }

  // daily logs
  async getOrCreateDailyLog(date: string): Promise<DailyLog> {
    return dailyLogRepo.getOrCreateDailyLog(date);
  }

  async updateDailyLog(id: string, data: UpdateDailyLogData): Promise<DailyLog> {
    return dailyLogRepo.updateDailyLog(id, data);
  }

  async getDailyLogsForStreak(): Promise<{ date: string; is_rest_day: boolean }[]> {
    return dailyLogRepo.getDailyLogsForStreak();
  }

  async getDailyLogsByDateRange(start: string, end: string): Promise<DailyLog[]> {
    return dailyLogRepo.getDailyLogsByDateRange(start, end);
  }

  // exercise logs
  async getExerciseLogsByDailyLogId(dailyLogId: string): Promise<ExerciseLog[]> {
    return exerciseLogRepo.getExerciseLogsByDailyLogId(dailyLogId);
  }

  async getExerciseLogsByDailyLogIds(dailyLogIds: string[]): Promise<ExerciseLog[]> {
    return exerciseLogRepo.getExerciseLogsByDailyLogIds(dailyLogIds);
  }

  async upsertExerciseLog(data: UpsertExerciseLogData): Promise<ExerciseLog> {
    return exerciseLogRepo.upsertExerciseLog(data);
  }

  // ROM
  async getAllRomMeasurements(): Promise<RomMeasurement[]> {
    return romRepo.getAllRomMeasurements();
  }

  async getRomMeasurementsByDateRange(start: string, end: string): Promise<RomMeasurement[]> {
    return romRepo.getRomMeasurementsByDateRange(start, end);
  }

  async getLatestRomMeasurement(): Promise<RomMeasurement | null> {
    return romRepo.getLatestRomMeasurement();
  }

  async createRomMeasurement(data: CreateRomData): Promise<RomMeasurement> {
    return romRepo.createRomMeasurement(data);
  }

  // milestones
  async getAllMilestones(): Promise<Milestone[]> {
    return milestoneRepo.getAllMilestones();
  }

  async getMilestonesByDate(date: string): Promise<Milestone[]> {
    return milestoneRepo.getMilestonesByDate(date);
  }

  async createMilestone(data: CreateMilestoneData): Promise<Milestone> {
    return milestoneRepo.createMilestone(data);
  }

  async deleteMilestone(id: string): Promise<void> {
    await milestoneRepo.deleteMilestone(id);
  }

  // achievements
  async getAchievements(): Promise<UserAchievement[]> {
    return achievementRepo.getUnlockedAchievements();
  }

  async unlockAchievement(contentId: string): Promise<UserAchievement> {
    return achievementRepo.unlockAchievement(contentId);
  }

  // gate criteria
  async getAllGateCriteria(): Promise<GateCriterion[]> {
    return gateCriteriaRepo.getAllGateCriteria();
  }

  async getGateCriteriaByGate(gateKey: string): Promise<GateCriterion[]> {
    return gateCriteriaRepo.getGateCriteriaByGate(gateKey);
  }

  async confirmGateCriterion(gateKey: string, criterionKey: string): Promise<GateCriterion> {
    return gateCriteriaRepo.confirmGateCriterion(gateKey, criterionKey);
  }

  async removeGateCriterion(gateKey: string, criterionKey: string): Promise<void> {
    await gateCriteriaRepo.removeGateCriterion(gateKey, criterionKey);
  }

  // notification preferences
  async getNotificationPreferences(): Promise<NotificationPreferences | null> {
    return notificationRepo.getNotificationPreferences();
  }

  async createOrUpdateNotificationPreferences(
    data: NotificationPrefsData
  ): Promise<NotificationPreferences> {
    return notificationRepo.createOrUpdateNotificationPreferences(data);
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
