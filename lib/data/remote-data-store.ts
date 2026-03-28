import { supabase } from "@/lib/supabase";
import { generateId } from "@/lib/utils/uuid";
import type {
  DataStore,
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
import type { Database } from "../database.types";
import type {
  ExercisePhase,
  ExerciseRole,
  ExerciseMuscleGroup,
  ExerciseCategory,
  ExerciseStatus,
} from "../types";

type DbProfile = Database["public"]["Tables"]["profiles"]["Row"];
type DbUserExercise = Database["public"]["Tables"]["user_exercises"]["Row"];
type DbDailyLog = Database["public"]["Tables"]["daily_logs"]["Row"];
type DbExerciseLog = Database["public"]["Tables"]["exercise_logs"]["Row"];
type DbRomMeasurement = Database["public"]["Tables"]["rom_measurements"]["Row"];
type DbMilestone = Database["public"]["Tables"]["milestones"]["Row"];
type DbUserAchievement = Database["public"]["Tables"]["user_achievements"]["Row"];
type DbGateCriterion = Database["public"]["Tables"]["user_gate_criteria"]["Row"];
type DbNotificationPrefs = Database["public"]["Tables"]["notification_preferences"]["Row"];

// ─── Row → shared type mappers ────────────────────────────────────────────────

function dbToProfile(row: DbProfile): Profile {
  return {
    id: row.id,
    name: row.name ?? "",
    username: row.username,
    surgery_date: row.surgery_date ?? null,
    graft_type: row.graft_type ?? null,
    knee_side: row.knee_side,
    created_at: row.created_at ?? "",
    // The profiles table has no updated_at column; omit the field entirely.
  };
}

function dbToUserExercise(row: DbUserExercise): UserExercise {
  return {
    id: row.id,
    exercise_id: row.exercise_id,
    sets: row.sets,
    reps: row.reps,
    hold_seconds: row.hold_seconds ?? null,
    sort_order: row.sort_order,
    // The user_exercises table has no created_at/updated_at columns; fields are omitted.
  };
}

function dbToDailyLog(row: DbDailyLog): DailyLog {
  return {
    id: row.id,
    date: row.date,
    is_rest_day: row.is_rest_day,
    notes: row.notes ?? null,
    created_at: row.created_at ?? "",
  };
}

function dbToExerciseLog(row: DbExerciseLog): ExerciseLog {
  return {
    id: row.id,
    daily_log_id: row.daily_log_id,
    user_exercise_id: row.user_exercise_id,
    completed: row.completed,
    actual_sets: row.actual_sets,
    actual_reps: row.actual_reps,
  };
}

function dbToRomMeasurement(row: DbRomMeasurement): RomMeasurement {
  return {
    id: row.id,
    date: row.date,
    flexion_degrees: row.flexion_degrees ?? null,
    extension_degrees: row.extension_degrees ?? null,
    quad_activation: row.quad_activation,
  };
}

function dbToMilestone(row: DbMilestone): Milestone {
  return {
    id: row.id,
    title: row.title,
    category: row.category as "milestone" | "win",
    date: row.date,
    notes: row.notes ?? null,
    template_key: row.template_key ?? null,
    created_at: row.created_at ?? "",
  };
}

function dbToUserAchievement(row: DbUserAchievement): UserAchievement {
  return {
    id: row.id,
    content_id: row.content_id,
    unlocked_at: row.unlocked_at ?? new Date().toISOString(),
  };
}

function dbToGateCriterion(row: DbGateCriterion): GateCriterion {
  return {
    id: row.id,
    gate_key: row.gate_key,
    criterion_key: row.criterion_key,
    confirmed_at: row.confirmed_at ?? new Date().toISOString(),
  };
}

function dbToNotificationPrefs(row: DbNotificationPrefs): NotificationPreferences {
  return {
    id: row.id,
    daily_reminder_time: row.daily_reminder_time,
    evening_nudge_enabled: row.evening_nudge_enabled,
    evening_nudge_time: row.evening_nudge_time,
    completion_congrats_enabled: row.completion_congrats_enabled,
  };
}

// ─── RemoteDataStore ──────────────────────────────────────────────────────────

export class RemoteDataStore implements DataStore {
  private readonly userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  // profile
  async getProfile(): Promise<Profile | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", this.userId)
      .maybeSingle();

    if (error) throw new Error(`RemoteDataStore.getProfile failed: ${error.message}`);
    if (!data) return null;
    return dbToProfile(data);
  }

  async createProfile(data: CreateProfileData): Promise<Profile> {
    const { data: row, error } = await supabase
      .from("profiles")
      .insert({
        id: this.userId,
        name: data.name,
        username: data.username,
        surgery_date: data.surgery_date ?? null,
        graft_type: data.graft_type ?? null,
        knee_side: data.knee_side,
      })
      .select()
      .single();

    if (error) throw new Error(`RemoteDataStore.createProfile failed: ${error.message}`);
    return dbToProfile(row);
  }

  async updateProfile(data: UpdateProfileData): Promise<Profile> {
    const updates: Database["public"]["Tables"]["profiles"]["Update"] = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.username !== undefined) updates.username = data.username;
    if (data.surgery_date !== undefined) updates.surgery_date = data.surgery_date;
    if (data.graft_type !== undefined) {
      // Supabase Update type omits null for graft_type; cast is safe per DB schema
      updates.graft_type = data.graft_type as Database["public"]["Enums"]["graft_type"];
    }
    if (data.knee_side !== undefined) updates.knee_side = data.knee_side;

    const { data: row, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", this.userId)
      .select()
      .single();

    if (error) throw new Error(`RemoteDataStore.updateProfile failed: ${error.message}`);
    return dbToProfile(row);
  }

  // user exercises
  async getAllUserExercises(): Promise<UserExercise[]> {
    const { data, error } = await supabase
      .from("user_exercises")
      .select("*, exercises(*)")
      .eq("user_id", this.userId)
      .order("sort_order", { ascending: true });

    if (error) throw new Error(`RemoteDataStore.getAllUserExercises failed: ${error.message}`);
    return (data ?? []).map((row) => {
      const ue = dbToUserExercise(row);
      if (row.exercises) {
        const ex = row.exercises as Database["public"]["Tables"]["exercises"]["Row"];
        ue.exercise = {
          id: ex.id,
          name: ex.name,
          description: ex.description,
          phase_start: ex.phase_start as ExercisePhase,
          phase_end: (ex.phase_end as ExercisePhase) ?? null,
          role: ex.role as ExerciseRole,
          primary_exercise_id: ex.primary_exercise_id ?? null,
          muscle_groups: (ex.muscle_groups ?? []) as ExerciseMuscleGroup[],
          default_sets: ex.default_sets,
          default_reps: ex.default_reps,
          default_hold_seconds: ex.default_hold_seconds ?? null,
          category: ex.category as ExerciseCategory,
          submitted_by: ex.submitted_by ?? null,
          status: ex.status as ExerciseStatus,
          sort_order: ex.sort_order,
        };
      }
      return ue;
    });
  }

  async createUserExercise(data: CreateUserExerciseData): Promise<UserExercise> {
    const { data: row, error } = await supabase
      .from("user_exercises")
      .upsert({
        id: data.id,
        user_id: this.userId,
        exercise_id: data.exercise_id,
        sets: data.sets,
        reps: data.reps,
        hold_seconds: data.hold_seconds ?? null,
        sort_order: data.sort_order,
      }, { onConflict: "exercise_id" })
      .select()
      .single();

    if (error) throw new Error(`RemoteDataStore.createUserExercise failed: ${error.message}`);
    return dbToUserExercise(row);
  }

  async updateUserExercise(id: string, data: UpdateUserExerciseData): Promise<UserExercise> {
    const updates: Database["public"]["Tables"]["user_exercises"]["Update"] = {};
    if (data.sets !== undefined) updates.sets = data.sets;
    if (data.reps !== undefined) updates.reps = data.reps;
    if (data.hold_seconds !== undefined) updates.hold_seconds = data.hold_seconds;
    if (data.sort_order !== undefined) updates.sort_order = data.sort_order;

    const { data: row, error } = await supabase
      .from("user_exercises")
      .update(updates)
      .eq("id", id)
      .eq("user_id", this.userId)
      .select()
      .single();

    if (error) throw new Error(`RemoteDataStore.updateUserExercise failed: ${error.message}`);
    return dbToUserExercise(row);
  }

  async deleteUserExercise(id: string): Promise<void> {
    const { error } = await supabase
      .from("user_exercises")
      .delete()
      .eq("id", id)
      .eq("user_id", this.userId);

    if (error) throw new Error(`RemoteDataStore.deleteUserExercise failed: ${error.message}`);
  }

  async updateUserExerciseSortOrder(id: string, sortOrder: number): Promise<void> {
    const { error } = await supabase
      .from("user_exercises")
      .update({ sort_order: sortOrder })
      .eq("id", id)
      .eq("user_id", this.userId);

    if (error) {
      throw new Error(`RemoteDataStore.updateUserExerciseSortOrder failed: ${error.message}`);
    }
  }

  // daily logs
  async getOrCreateDailyLog(date: string): Promise<DailyLog> {
    const { data: existing, error: fetchError } = await supabase
      .from("daily_logs")
      .select("*")
      .eq("user_id", this.userId)
      .eq("date", date)
      .maybeSingle();

    if (fetchError) throw new Error(`RemoteDataStore.getOrCreateDailyLog fetch failed: ${fetchError.message}`);
    if (existing) return dbToDailyLog(existing);

    const { data: created, error: insertError } = await supabase
      .from("daily_logs")
      .insert({
        id: generateId(),
        user_id: this.userId,
        date,
        is_rest_day: false,
        notes: null,
      })
      .select()
      .single();

    if (insertError) {
      // Handle race condition — another request may have inserted the row first
      const { data: retry, error: retryError } = await supabase
        .from("daily_logs")
        .select("*")
        .eq("user_id", this.userId)
        .eq("date", date)
        .maybeSingle();

      if (retryError || !retry) {
        throw new Error(`RemoteDataStore.getOrCreateDailyLog insert failed: ${insertError.message}`);
      }
      return dbToDailyLog(retry);
    }

    return dbToDailyLog(created);
  }

  async getDailyLogsForStreak(): Promise<{ date: string; is_rest_day: boolean }[]> {
    const { data, error } = await supabase
      .from("daily_logs")
      .select("date, is_rest_day")
      .eq("user_id", this.userId)
      .order("date", { ascending: false })
      .limit(60);

    if (error) throw new Error(`RemoteDataStore.getDailyLogsForStreak failed: ${error.message}`);
    return (data ?? []).map((r) => ({ date: r.date, is_rest_day: r.is_rest_day }));
  }

  async updateDailyLog(id: string, data: UpdateDailyLogData): Promise<DailyLog> {
    const updates: Database["public"]["Tables"]["daily_logs"]["Update"] = {};
    if (data.is_rest_day !== undefined) updates.is_rest_day = data.is_rest_day;
    if (data.notes !== undefined) updates.notes = data.notes;

    const { data: row, error } = await supabase
      .from("daily_logs")
      .update(updates)
      .eq("id", id)
      .eq("user_id", this.userId)
      .select()
      .single();

    if (error) throw new Error(`RemoteDataStore.updateDailyLog failed: ${error.message}`);
    return dbToDailyLog(row);
  }

  // exercise logs
  async getExerciseLogsByDailyLogId(dailyLogId: string): Promise<ExerciseLog[]> {
    const { data, error } = await supabase
      .from("exercise_logs")
      .select("*")
      .eq("daily_log_id", dailyLogId);

    if (error) throw new Error(`RemoteDataStore.getExerciseLogsByDailyLogId failed: ${error.message}`);
    return (data ?? []).map(dbToExerciseLog);
  }

  async upsertExerciseLog(data: UpsertExerciseLogData): Promise<ExerciseLog> {
    const { data: row, error } = await supabase
      .from("exercise_logs")
      .upsert({
        id: data.id,
        daily_log_id: data.daily_log_id,
        user_exercise_id: data.user_exercise_id,
        completed: data.completed,
        actual_sets: data.actual_sets,
        actual_reps: data.actual_reps,
      }, { onConflict: "daily_log_id,user_exercise_id" })
      .select()
      .single();

    if (error) throw new Error(`RemoteDataStore.upsertExerciseLog failed: ${error.message}`);
    return dbToExerciseLog(row);
  }

  // ROM
  async getAllRomMeasurements(): Promise<RomMeasurement[]> {
    const { data, error } = await supabase
      .from("rom_measurements")
      .select("*")
      .eq("user_id", this.userId)
      .order("date", { ascending: true });

    if (error) throw new Error(`RemoteDataStore.getAllRomMeasurements failed: ${error.message}`);
    return (data ?? []).map(dbToRomMeasurement);
  }

  async getRomMeasurementsByDateRange(start: string, end: string): Promise<RomMeasurement[]> {
    const { data, error } = await supabase
      .from("rom_measurements")
      .select("*")
      .eq("user_id", this.userId)
      .gte("date", start)
      .lte("date", end)
      .order("date", { ascending: true });

    if (error) throw new Error(`RemoteDataStore.getRomMeasurementsByDateRange failed: ${error.message}`);
    return (data ?? []).map(dbToRomMeasurement);
  }

  async createRomMeasurement(data: CreateRomData): Promise<RomMeasurement> {
    const { data: row, error } = await supabase
      .from("rom_measurements")
      .insert({
        id: data.id,
        user_id: this.userId,
        date: data.date,
        flexion_degrees: data.flexion_degrees ?? null,
        extension_degrees: data.extension_degrees ?? null,
        quad_activation: data.quad_activation,
      })
      .select()
      .single();

    if (error) throw new Error(`RemoteDataStore.createRomMeasurement failed: ${error.message}`);
    return dbToRomMeasurement(row);
  }

  // milestones
  async getAllMilestones(): Promise<Milestone[]> {
    const { data, error } = await supabase
      .from("milestones")
      .select("*")
      .eq("user_id", this.userId)
      .order("date", { ascending: false });

    if (error) throw new Error(`RemoteDataStore.getAllMilestones failed: ${error.message}`);
    return (data ?? []).map(dbToMilestone);
  }

  async getMilestonesByDate(date: string): Promise<Milestone[]> {
    const { data, error } = await supabase
      .from("milestones")
      .select("*")
      .eq("user_id", this.userId)
      .eq("date", date)
      .order("created_at", { ascending: true });

    if (error) throw new Error(`RemoteDataStore.getMilestonesByDate failed: ${error.message}`);
    return (data ?? []).map(dbToMilestone);
  }

  async createMilestone(data: CreateMilestoneData): Promise<Milestone> {
    const { data: row, error } = await supabase
      .from("milestones")
      .insert({
        id: data.id,
        user_id: this.userId,
        title: data.title,
        category: data.category,
        date: data.date,
        notes: data.notes ?? null,
        template_key: data.template_key ?? null,
      })
      .select()
      .single();

    if (error) throw new Error(`RemoteDataStore.createMilestone failed: ${error.message}`);
    return dbToMilestone(row);
  }

  async deleteMilestone(id: string): Promise<void> {
    const { error } = await supabase
      .from("milestones")
      .delete()
      .eq("id", id)
      .eq("user_id", this.userId);

    if (error) throw new Error(`RemoteDataStore.deleteMilestone failed: ${error.message}`);
  }

  // achievements
  async getAchievements(): Promise<UserAchievement[]> {
    const { data, error } = await supabase
      .from("user_achievements")
      .select("*")
      .eq("user_id", this.userId)
      .order("unlocked_at", { ascending: false });

    if (error) throw new Error(`RemoteDataStore.getAchievements failed: ${error.message}`);
    return (data ?? []).map(dbToUserAchievement);
  }

  async unlockAchievement(contentId: string): Promise<UserAchievement> {
    const { data: existing, error: fetchError } = await supabase
      .from("user_achievements")
      .select("*")
      .eq("user_id", this.userId)
      .eq("content_id", contentId)
      .maybeSingle();

    if (fetchError) throw new Error(`RemoteDataStore.unlockAchievement fetch failed: ${fetchError.message}`);
    if (existing) return dbToUserAchievement(existing);

    const { data: row, error } = await supabase
      .from("user_achievements")
      .insert({
        id: generateId(),
        user_id: this.userId,
        content_id: contentId,
        unlocked_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(`RemoteDataStore.unlockAchievement insert failed: ${error.message}`);
    return dbToUserAchievement(row);
  }

  // gate criteria
  async getAllGateCriteria(): Promise<GateCriterion[]> {
    const { data, error } = await supabase
      .from("user_gate_criteria")
      .select("*")
      .eq("user_id", this.userId)
      .order("confirmed_at", { ascending: true });

    if (error) throw new Error(`RemoteDataStore.getAllGateCriteria failed: ${error.message}`);
    return (data ?? []).map(dbToGateCriterion);
  }

  async getGateCriteriaByGate(gateKey: string): Promise<GateCriterion[]> {
    const { data, error } = await supabase
      .from("user_gate_criteria")
      .select("*")
      .eq("user_id", this.userId)
      .eq("gate_key", gateKey)
      .order("confirmed_at", { ascending: true });

    if (error) throw new Error(`RemoteDataStore.getGateCriteriaByGate failed: ${error.message}`);
    return (data ?? []).map(dbToGateCriterion);
  }

  async confirmGateCriterion(gateKey: string, criterionKey: string): Promise<GateCriterion> {
    const { data: existing, error: fetchError } = await supabase
      .from("user_gate_criteria")
      .select("*")
      .eq("user_id", this.userId)
      .eq("gate_key", gateKey)
      .eq("criterion_key", criterionKey)
      .maybeSingle();

    if (fetchError) throw new Error(`RemoteDataStore.confirmGateCriterion fetch failed: ${fetchError.message}`);
    if (existing) return dbToGateCriterion(existing);

    const { data: row, error } = await supabase
      .from("user_gate_criteria")
      .insert({
        id: generateId(),
        user_id: this.userId,
        gate_key: gateKey,
        criterion_key: criterionKey,
        confirmed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(`RemoteDataStore.confirmGateCriterion insert failed: ${error.message}`);
    return dbToGateCriterion(row);
  }

  async removeGateCriterion(gateKey: string, criterionKey: string): Promise<void> {
    const { error } = await supabase
      .from("user_gate_criteria")
      .delete()
      .eq("user_id", this.userId)
      .eq("gate_key", gateKey)
      .eq("criterion_key", criterionKey);

    if (error) throw new Error(`RemoteDataStore.removeGateCriterion failed: ${error.message}`);
  }

  // notification preferences
  async getNotificationPreferences(): Promise<NotificationPreferences | null> {
    const { data, error } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", this.userId)
      .maybeSingle();

    if (error) throw new Error(`RemoteDataStore.getNotificationPreferences failed: ${error.message}`);
    if (!data) return null;
    return dbToNotificationPrefs(data);
  }

  async createOrUpdateNotificationPreferences(
    data: NotificationPrefsData
  ): Promise<NotificationPreferences> {
    const { data: existing, error: fetchError } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", this.userId)
      .maybeSingle();

    if (fetchError) {
      throw new Error(
        `RemoteDataStore.createOrUpdateNotificationPreferences fetch failed: ${fetchError.message}`
      );
    }

    const id = existing?.id ?? generateId();

    const { data: row, error } = await supabase
      .from("notification_preferences")
      .upsert({
        id,
        user_id: this.userId,
        daily_reminder_time: data.daily_reminder_time ?? existing?.daily_reminder_time ?? "08:00",
        evening_nudge_enabled: data.evening_nudge_enabled ?? existing?.evening_nudge_enabled ?? false,
        evening_nudge_time: data.evening_nudge_time ?? existing?.evening_nudge_time ?? "20:00",
        completion_congrats_enabled: data.completion_congrats_enabled ?? existing?.completion_congrats_enabled ?? true,
      }, { onConflict: "user_id" })
      .select()
      .single();

    if (error) {
      throw new Error(
        `RemoteDataStore.createOrUpdateNotificationPreferences failed: ${error.message}`
      );
    }
    return dbToNotificationPrefs(row);
  }
}
