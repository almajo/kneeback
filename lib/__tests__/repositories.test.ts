/**
 * Unit tests for repository functions.
 * Exercises the repository logic using a mock SQLiteDatabase.
 */

import type { SQLiteDatabase } from "expo-sqlite";

// ---------------------------------------------------------------------------
// Mock SQLiteDatabase factory
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;

interface MockDb {
  execSync: jest.Mock;
  runSync: jest.Mock;
  getAllSync: jest.Mock<Row[], [string, ...unknown[]]>;
  getFirstSync: jest.Mock<Row | null, [string, ...unknown[]]>;
  _store: Map<string, Row[]>;
}

function makeMockDb(): MockDb {
  const store = new Map<string, Row[]>();

  return {
    execSync: jest.fn(),
    runSync: jest.fn(),
    getAllSync: jest.fn().mockReturnValue([]),
    getFirstSync: jest.fn().mockReturnValue(null),
    _store: store,
  };
}

// ---------------------------------------------------------------------------
// profile-repo
// ---------------------------------------------------------------------------

import {
  getProfile,
  createProfile,
  updateProfile,
  type LocalProfile,
} from "../db/repositories/profile-repo";

describe("profile-repo", () => {
  describe("getProfile", () => {
    it("returns null when no profile row exists", () => {
      const db = makeMockDb();
      db.getFirstSync.mockReturnValue(null);
      expect(getProfile(db as unknown as SQLiteDatabase)).toBeNull();
    });

    it("parses graft_type and knee_side from raw strings", () => {
      const db = makeMockDb();
      db.getFirstSync.mockReturnValue({
        id: "p1",
        name: "Alex",
        username: "alex",
        surgery_date: "2024-01-01",
        graft_type: "patellar",
        knee_side: "left",
        device_id: "device-123",
        supabase_user_id: null,
        last_synced_at: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      });

      const profile = getProfile(db as unknown as SQLiteDatabase);
      expect(profile).not.toBeNull();
      expect(profile!.graft_type).toBe("patellar");
      expect(profile!.knee_side).toBe("left");
    });
  });

  describe("createProfile", () => {
    it("throws if the row is not found after insert", () => {
      const db = makeMockDb();
      db.getFirstSync.mockReturnValue(null);

      expect(() =>
        createProfile(db as unknown as SQLiteDatabase, {
          id: "p1",
          name: "Alex",
          username: "alex",
          surgery_date: null,
          graft_type: null,
          knee_side: "right",
          device_id: "device-123",
          supabase_user_id: null,
          last_synced_at: null,
        })
      ).toThrow("Failed to create profile");
    });

    it("inserts a row and returns parsed profile", () => {
      const db = makeMockDb();
      const expectedRow = {
        id: "p1",
        name: "Alex",
        username: "alex",
        surgery_date: null,
        graft_type: null,
        knee_side: "right",
        device_id: "device-123",
        supabase_user_id: null,
        last_synced_at: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };
      db.getFirstSync.mockReturnValue(expectedRow);

      const result = createProfile(db as unknown as SQLiteDatabase, {
        id: "p1",
        name: "Alex",
        username: "alex",
        surgery_date: null,
        graft_type: null,
        knee_side: "right",
        device_id: "device-123",
        supabase_user_id: null,
        last_synced_at: null,
      });

      expect(db.runSync).toHaveBeenCalledTimes(1);
      expect(result.id).toBe("p1");
      expect(result.knee_side).toBe("right");
    });
  });

  describe("updateProfile", () => {
    it("throws if no profile exists to update", () => {
      const db = makeMockDb();
      db.getFirstSync.mockReturnValue(null);
      expect(() =>
        updateProfile(db as unknown as SQLiteDatabase, { name: "New Name" })
      ).toThrow("No profile found to update");
    });

    it("skips SQL update when no fields provided", () => {
      const db = makeMockDb();
      const existingRow = {
        id: "p1",
        name: "Alex",
        username: "alex",
        surgery_date: null,
        graft_type: null,
        knee_side: "right",
        device_id: "device-123",
        supabase_user_id: null,
        last_synced_at: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };
      // First call returns existing profile, second call returns same
      db.getFirstSync.mockReturnValueOnce(existingRow).mockReturnValueOnce(existingRow);

      const result = updateProfile(db as unknown as SQLiteDatabase, {});
      expect(db.runSync).not.toHaveBeenCalled();
      expect(result.id).toBe("p1");
    });
  });
});

// ---------------------------------------------------------------------------
// daily-log-repo
// ---------------------------------------------------------------------------

import {
  getOrCreateDailyLog,
  getDailyLogsByDateRange,
  updateDailyLog,
} from "../db/repositories/daily-log-repo";

describe("daily-log-repo", () => {
  describe("getOrCreateDailyLog", () => {
    it("returns existing log if found", () => {
      const db = makeMockDb();
      const existingRow = {
        id: "log1",
        date: "2024-06-01",
        is_rest_day: 0,
        notes: null,
        created_at: "2024-06-01T00:00:00Z",
        updated_at: "2024-06-01T00:00:00Z",
      };
      db.getFirstSync.mockReturnValue(existingRow);

      const log = getOrCreateDailyLog(db as unknown as SQLiteDatabase, "2024-06-01");
      expect(log.id).toBe("log1");
      expect(log.is_rest_day).toBe(false);
      expect(db.runSync).not.toHaveBeenCalled();
    });

    it("creates a new log when not found", () => {
      const db = makeMockDb();
      // First call: no existing row; second call: return created row
      const createdRow = {
        id: "generated-id",
        date: "2024-06-01",
        is_rest_day: 0,
        notes: null,
        created_at: "2024-06-01T00:00:00Z",
        updated_at: "2024-06-01T00:00:00Z",
      };
      db.getFirstSync
        .mockReturnValueOnce(null)   // date check
        .mockReturnValueOnce(createdRow); // read after insert

      const log = getOrCreateDailyLog(db as unknown as SQLiteDatabase, "2024-06-01");
      expect(db.runSync).toHaveBeenCalledTimes(1);
      expect(log.date).toBe("2024-06-01");
    });

    it("throws if insert fails silently", () => {
      const db = makeMockDb();
      db.getFirstSync.mockReturnValue(null); // always null

      expect(() =>
        getOrCreateDailyLog(db as unknown as SQLiteDatabase, "2024-06-01")
      ).toThrow();
    });
  });

  describe("getDailyLogsByDateRange", () => {
    it("queries with correct date range and parses boolean fields", () => {
      const db = makeMockDb();
      db.getAllSync.mockReturnValue([
        {
          id: "log1",
          date: "2024-06-01",
          is_rest_day: 1,
          notes: "rest",
          created_at: "2024-06-01T00:00:00Z",
          updated_at: "2024-06-01T00:00:00Z",
        },
      ]);

      const logs = getDailyLogsByDateRange(
        db as unknown as SQLiteDatabase,
        "2024-06-01",
        "2024-06-30"
      );

      expect(logs).toHaveLength(1);
      expect(logs[0].is_rest_day).toBe(true);
      expect(db.getAllSync).toHaveBeenCalledWith(
        expect.stringContaining("date >= ?"),
        ["2024-06-01", "2024-06-30"]
      );
    });
  });

  describe("updateDailyLog", () => {
    it("throws if the log is not found after update", () => {
      const db = makeMockDb();
      db.getFirstSync.mockReturnValue(null);

      expect(() =>
        updateDailyLog(db as unknown as SQLiteDatabase, "log1", {
          is_rest_day: true,
        })
      ).toThrow("Daily log not found: log1");
    });
  });
});

// ---------------------------------------------------------------------------
// exercise-log-repo
// ---------------------------------------------------------------------------

import {
  getExerciseLogsByDailyLogId,
  upsertExerciseLog,
} from "../db/repositories/exercise-log-repo";

describe("exercise-log-repo", () => {
  describe("getExerciseLogsByDailyLogId", () => {
    it("parses completed boolean from integer", () => {
      const db = makeMockDb();
      db.getAllSync.mockReturnValue([
        {
          id: "el1",
          daily_log_id: "log1",
          user_exercise_id: "ue1",
          completed: 1,
          actual_sets: 3,
          actual_reps: 10,
          created_at: "2024-06-01T00:00:00Z",
          updated_at: "2024-06-01T00:00:00Z",
        },
      ]);

      const logs = getExerciseLogsByDailyLogId(
        db as unknown as SQLiteDatabase,
        "log1"
      );
      expect(logs[0].completed).toBe(true);
    });
  });

  describe("upsertExerciseLog", () => {
    it("throws if upserted row is not found", () => {
      const db = makeMockDb();
      db.getFirstSync.mockReturnValue(null);

      expect(() =>
        upsertExerciseLog(db as unknown as SQLiteDatabase, {
          id: "el1",
          daily_log_id: "log1",
          user_exercise_id: "ue1",
          completed: true,
          actual_sets: 3,
          actual_reps: 10,
        })
      ).toThrow("Failed to upsert exercise log");
    });

    it("calls runSync with correct boolean conversion", () => {
      const db = makeMockDb();
      const returnedRow = {
        id: "el1",
        daily_log_id: "log1",
        user_exercise_id: "ue1",
        completed: 1,
        actual_sets: 3,
        actual_reps: 10,
        created_at: "2024-06-01T00:00:00Z",
        updated_at: "2024-06-01T00:00:00Z",
      };
      db.getFirstSync.mockReturnValue(returnedRow);

      upsertExerciseLog(db as unknown as SQLiteDatabase, {
        id: "el1",
        daily_log_id: "log1",
        user_exercise_id: "ue1",
        completed: true,
        actual_sets: 3,
        actual_reps: 10,
      });

      const [_sql, params] = db.runSync.mock.calls[0] as [string, unknown[]];
      // completed should be converted to 1
      expect(params[3]).toBe(1);
    });
  });
});

// ---------------------------------------------------------------------------
// milestone-repo
// ---------------------------------------------------------------------------

import {
  getAllMilestones,
  createMilestone,
  deleteMilestone,
} from "../db/repositories/milestone-repo";

describe("milestone-repo", () => {
  describe("getAllMilestones", () => {
    it("returns empty array when no milestones", () => {
      const db = makeMockDb();
      db.getAllSync.mockReturnValue([]);
      expect(getAllMilestones(db as unknown as SQLiteDatabase)).toEqual([]);
    });

    it("parses category field", () => {
      const db = makeMockDb();
      db.getAllSync.mockReturnValue([
        {
          id: "m1",
          title: "First Steps",
          category: "milestone",
          date: "2024-06-01",
          notes: null,
          template_key: null,
          created_at: "2024-06-01T00:00:00Z",
          updated_at: "2024-06-01T00:00:00Z",
        },
      ]);

      const milestones = getAllMilestones(db as unknown as SQLiteDatabase);
      expect(milestones[0].category).toBe("milestone");
    });
  });

  describe("deleteMilestone", () => {
    it("calls DELETE with correct id", () => {
      const db = makeMockDb();
      deleteMilestone(db as unknown as SQLiteDatabase, "m1");
      expect(db.runSync).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM milestones"),
        ["m1"]
      );
    });
  });
});

// ---------------------------------------------------------------------------
// gate-criteria-repo
// ---------------------------------------------------------------------------

import {
  getGateCriteriaByGate,
  confirmGateCriterion,
  removeGateCriterion,
} from "../db/repositories/gate-criteria-repo";

describe("gate-criteria-repo", () => {
  describe("getGateCriteriaByGate", () => {
    it("queries by gate_key", () => {
      const db = makeMockDb();
      db.getAllSync.mockReturnValue([]);
      getGateCriteriaByGate(db as unknown as SQLiteDatabase, "gate_1");
      expect(db.getAllSync).toHaveBeenCalledWith(
        expect.stringContaining("gate_key = ?"),
        ["gate_1"]
      );
    });
  });

  describe("confirmGateCriterion", () => {
    it("returns existing criterion without insert if already confirmed", () => {
      const db = makeMockDb();
      const existingRow = {
        id: "gc1",
        gate_key: "gate_1",
        criterion_key: "criterion_a",
        confirmed_at: "2024-06-01T00:00:00Z",
        created_at: "2024-06-01T00:00:00Z",
        updated_at: "2024-06-01T00:00:00Z",
      };
      db.getFirstSync.mockReturnValue(existingRow);

      const result = confirmGateCriterion(
        db as unknown as SQLiteDatabase,
        "gate_1",
        "criterion_a"
      );
      expect(db.runSync).not.toHaveBeenCalled();
      expect(result.id).toBe("gc1");
    });
  });

  describe("removeGateCriterion", () => {
    it("calls DELETE with gate_key and criterion_key", () => {
      const db = makeMockDb();
      removeGateCriterion(db as unknown as SQLiteDatabase, "gate_1", "criterion_a");
      expect(db.runSync).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM user_gate_criteria"),
        ["gate_1", "criterion_a"]
      );
    });
  });
});

// ---------------------------------------------------------------------------
// notification-repo
// ---------------------------------------------------------------------------

import {
  getNotificationPreferences,
  createOrUpdateNotificationPreferences,
} from "../db/repositories/notification-repo";

describe("notification-repo", () => {
  describe("getNotificationPreferences", () => {
    it("returns null when no row exists", () => {
      const db = makeMockDb();
      db.getFirstSync.mockReturnValue(null);
      expect(
        getNotificationPreferences(db as unknown as SQLiteDatabase)
      ).toBeNull();
    });

    it("parses boolean fields from integers", () => {
      const db = makeMockDb();
      db.getFirstSync.mockReturnValue({
        id: "np1",
        daily_reminder_time: "08:00",
        evening_nudge_enabled: 0,
        evening_nudge_time: "20:00",
        completion_congrats_enabled: 1,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      });

      const prefs = getNotificationPreferences(db as unknown as SQLiteDatabase);
      expect(prefs!.evening_nudge_enabled).toBe(false);
      expect(prefs!.completion_congrats_enabled).toBe(true);
    });
  });

  describe("createOrUpdateNotificationPreferences", () => {
    it("creates a new row when none exists", () => {
      const db = makeMockDb();
      const createdRow = {
        id: "np1",
        daily_reminder_time: "09:00",
        evening_nudge_enabled: 0,
        evening_nudge_time: "21:00",
        completion_congrats_enabled: 1,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };
      db.getFirstSync
        .mockReturnValueOnce(null)     // no existing row
        .mockReturnValueOnce(createdRow); // row after insert

      const prefs = createOrUpdateNotificationPreferences(
        db as unknown as SQLiteDatabase,
        { daily_reminder_time: "09:00", evening_nudge_time: "21:00" }
      );
      expect(db.runSync).toHaveBeenCalledTimes(1);
      expect(prefs.daily_reminder_time).toBe("09:00");
    });
  });
});
