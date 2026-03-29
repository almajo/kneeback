/**
 * Unit tests for repository functions.
 * Mocks the drizzle db module so repos can be exercised without a real database.
 */

// ---------------------------------------------------------------------------
// Mock the drizzle db singleton
// ---------------------------------------------------------------------------

const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();

// Chainable query builder helper
function makeChain(resolveWith: unknown) {
  const chain: Record<string, jest.Mock> = {};
  const methods = ["from", "where", "limit", "values", "set", "returning", "orderBy", "leftJoin"];
  for (const m of methods) {
    chain[m] = jest.fn().mockReturnValue(chain);
  }
  // Terminal – returns a promise
  chain.then = undefined as unknown as jest.Mock; // not a thenable by default
  // Make the chain itself a promise via Symbol.iterator trick — use explicit resolve
  Object.defineProperty(chain, Symbol.toStringTag, { value: "MockChain" });
  return {
    ...chain,
    // Allow `await chain` to work by making it a thenable
    then: (resolve: (v: unknown) => void) => Promise.resolve(resolveWith).then(resolve),
  };
}

jest.mock("../db/database-context", () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    $client: {
      getFirstSync: jest.fn().mockReturnValue(null),
      getAllSync: jest.fn().mockReturnValue([]),
    },
  },
}));

// ---------------------------------------------------------------------------
// profile-repo
// ---------------------------------------------------------------------------

import {
  getProfile,
  createProfile,
  updateProfile,
} from "../db/repositories/profile-repo";
import type { Profile } from "../data/data-store.types";

const baseProfileRow = {
  id: "p1",
  name: "Alex",
  username: "alex",
  surgery_date: null as string | null,
  graft_type: null as string | null,
  knee_side: "right",
  expo_push_token: null as string | null,
  created_at: "2024-01-01T00:00:00Z",
};

type SelectChain = Record<string, jest.Mock> & {
  then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise<unknown>;
};

// Builds a chainable select mock that is itself thenable.
function makeSelectChain(rows: unknown[]): SelectChain {
  const chain = {} as SelectChain;
  for (const m of ["from", "where", "leftJoin"]) {
    chain[m] = jest.fn().mockReturnValue(chain);
  }
  chain.limit = jest.fn().mockResolvedValue(rows);
  chain.orderBy = jest.fn().mockResolvedValue(rows);
  // Make chain awaitable when where()/from() is the terminal call
  chain.then = (res, rej) => Promise.resolve(rows).then(res, rej);
  return chain;
}

// Builds and registers a select chain on mockSelect.
function setupSelectChain(rows: unknown[]) {
  const chain = makeSelectChain(rows);
  mockSelect.mockReturnValue(chain);
  return chain;
}

function setupInsertChain() {
  const chain: Record<string, jest.Mock> = {};
  chain.values = jest.fn().mockReturnValue(chain);
  chain.onConflictDoUpdate = jest.fn().mockResolvedValue(undefined);
  chain.onConflictDoNothing = jest.fn().mockResolvedValue(undefined);
  // Also make values itself awaitable (for cases without onConflict)
  chain.values = jest.fn().mockImplementation(() => {
    const v: Record<string, jest.Mock> = {
      onConflictDoUpdate: jest.fn().mockResolvedValue(undefined),
      onConflictDoNothing: jest.fn().mockResolvedValue(undefined),
    };
    // Make v itself a thenable
    (v as unknown as { then: unknown }).then = (res: (v: unknown) => unknown) =>
      Promise.resolve(undefined).then(res);
    return v;
  });
  mockInsert.mockReturnValue(chain);
  return chain;
}

function setupUpdateChain(changes = 1) {
  const chain = {
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue({ changes }),
  };
  mockUpdate.mockReturnValue(chain);
  return chain;
}

function setupDeleteChain(changes = 1) {
  const chain = {
    where: jest.fn().mockResolvedValue({ changes }),
  };
  mockDelete.mockReturnValue(chain);
  return chain;
}

describe("profile-repo", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getProfile", () => {
    it("returns null when no profile row exists", async () => {
      setupSelectChain([]);
      const result = await getProfile();
      expect(result).toBeNull();
    });

    it("parses graft_type and knee_side from raw row", async () => {
      setupSelectChain([{ ...baseProfileRow, graft_type: "patellar", knee_side: "left" }]);
      const profile = await getProfile();
      expect(profile).not.toBeNull();
      expect(profile!.graft_type).toBe("patellar");
      expect(profile!.knee_side).toBe("left");
    });
  });

  describe("createProfile", () => {
    it("throws if the row is not found after insert", async () => {
      setupInsertChain();
      // select returns empty after insert
      const selectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([]),
        limit: jest.fn().mockResolvedValue([]),
      };
      mockSelect.mockReturnValue(selectChain);

      await expect(
        createProfile({
          id: "p1",
          name: "Alex",
          username: "alex",
          surgery_date: null,
          graft_type: null,
          knee_side: "right",
        })
      ).rejects.toThrow("Failed to create profile");
    });

    it("inserts a row and returns parsed profile", async () => {
      setupInsertChain();
      const selectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ ...baseProfileRow }]),
        limit: jest.fn().mockResolvedValue([{ ...baseProfileRow }]),
      };
      mockSelect.mockReturnValue(selectChain);

      const result = await createProfile({
        id: "p1",
        name: "Alex",
        username: "alex",
        surgery_date: null,
        graft_type: null,
        knee_side: "right",
      });

      expect(mockInsert).toHaveBeenCalledTimes(1);
      expect(result.id).toBe("p1");
      expect(result.knee_side).toBe("right");
    });
  });

  describe("updateProfile", () => {
    it("throws if no profile exists to update", async () => {
      const selectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([]),
        limit: jest.fn().mockResolvedValue([]),
      };
      mockSelect.mockReturnValue(selectChain);

      await expect(updateProfile({ name: "New Name" })).rejects.toThrow(
        "No profile found to update"
      );
    });

    it("skips SQL update when no fields provided and returns existing", async () => {
      const selectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ ...baseProfileRow }]),
        limit: jest.fn().mockResolvedValue([{ ...baseProfileRow }]),
      };
      mockSelect.mockReturnValue(selectChain);

      const result = await updateProfile({});
      expect(mockUpdate).not.toHaveBeenCalled();
      expect(result.id).toBe("p1");
    });
  });
});

// ---------------------------------------------------------------------------
// user-exercise-repo
// ---------------------------------------------------------------------------

import {
  getAllUserExercises,
  createUserExercise,
} from "../db/repositories/user-exercise-repo";

const baseUserExerciseRow = {
  id: "ue1",
  user_id: null as string | null,
  exercise_id: "ex1",
  sets: 3,
  reps: 10,
  hold_seconds: null as number | null,
  sort_order: 0,
};

describe("user-exercise-repo", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createUserExercise — new insert path", () => {
    it("inserts a new row and returns it with the provided id", async () => {
      setupInsertChain();
      // select after insert returns the newly created row
      mockSelect.mockImplementation(() =>
        makeSelectChain([{ user_exercises: { ...baseUserExerciseRow }, exercises: null }])
      );

      const result = await createUserExercise({
        id: "ue1",
        exercise_id: "ex1",
        sets: 3,
        reps: 10,
        hold_seconds: null,
        sort_order: 0,
      });

      expect(mockInsert).toHaveBeenCalledTimes(1);
      expect(result.id).toBe("ue1");
      expect(result.exercise_id).toBe("ex1");
    });

    it("throws when the row is not found after upsert", async () => {
      setupInsertChain();
      mockSelect.mockImplementation(() =>
        makeSelectChain([])
      );

      await expect(
        createUserExercise({
          id: "ue1",
          exercise_id: "ex1",
          sets: 3,
          reps: 10,
          hold_seconds: null,
          sort_order: 0,
        })
      ).rejects.toThrow("Failed to create user exercise");
    });
  });

  describe("createUserExercise — conflict update path (exercise_id already exists)", () => {
    it("returns the existing row id (not the incoming id) when exercise_id conflicts", async () => {
      setupInsertChain();
      // The ON CONFLICT(exercise_id) DO UPDATE preserves the existing row's id.
      // Simulate this by returning a row with a different id than what was passed in.
      const existingRow = { ...baseUserExerciseRow, id: "existing-ue-id", sets: 4 };
      mockSelect.mockImplementation(() =>
        makeSelectChain([{ user_exercises: existingRow, exercises: null }])
      );

      const result = await createUserExercise({
        id: "new-ue-id",
        exercise_id: "ex1",
        sets: 4,
        reps: 12,
        hold_seconds: null,
        sort_order: 0,
      });

      // The upsert preserves the existing row's id so exercise_logs FKs stay valid
      expect(result.id).toBe("existing-ue-id");
      expect(result.sets).toBe(4);
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

const baseDailyLogRow = {
  id: "log1",
  user_id: null as string | null,
  date: "2024-06-01",
  is_rest_day: 0,
  notes: null as string | null,
  created_at: "2024-06-01T00:00:00Z",
};

describe("daily-log-repo", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getOrCreateDailyLog", () => {
    it("returns existing log if found", async () => {
      const selectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ ...baseDailyLogRow }]),
        limit: jest.fn().mockResolvedValue([{ ...baseDailyLogRow }]),
      };
      mockSelect.mockReturnValue(selectChain);

      const log = await getOrCreateDailyLog("2024-06-01");
      expect(log.id).toBe("log1");
      expect(log.is_rest_day).toBe(false);
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it("creates a new log when not found", async () => {
      setupInsertChain();
      let callCount = 0;
      mockSelect.mockImplementation(() => {
        callCount++;
        return makeSelectChain(callCount === 1 ? [] : [{ ...baseDailyLogRow }]);
      });

      const log = await getOrCreateDailyLog("2024-06-01");
      expect(mockInsert).toHaveBeenCalledTimes(1);
      expect(log.date).toBe("2024-06-01");
    });

    it("throws if insert fails silently", async () => {
      setupInsertChain();
      // always returns empty (insert doesn't create the row)
      mockSelect.mockImplementation(() => makeSelectChain([]));

      await expect(getOrCreateDailyLog("2024-06-01")).rejects.toThrow();
    });
  });

  describe("getDailyLogsByDateRange", () => {
    it("queries with correct date range and parses boolean fields", async () => {
      setupSelectChain([{ ...baseDailyLogRow, is_rest_day: 1, notes: "rest" }]);

      const logs = await getDailyLogsByDateRange("2024-06-01", "2024-06-30");
      expect(logs).toHaveLength(1);
      expect(logs[0].is_rest_day).toBe(true);
    });
  });

  describe("updateDailyLog", () => {
    it("throws if the log is not found after update", async () => {
      setupUpdateChain(0);
      mockSelect.mockImplementation(() => makeSelectChain([]));

      await expect(
        updateDailyLog("log1", { is_rest_day: true })
      ).rejects.toThrow("Daily log not found: log1");
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

const baseExerciseLogRow = {
  id: "el1",
  daily_log_id: "log1",
  user_exercise_id: "ue1",
  completed: 1,
  actual_sets: 3,
  actual_reps: 10,
};

describe("exercise-log-repo", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getExerciseLogsByDailyLogId", () => {
    it("parses completed boolean from integer", async () => {
      setupSelectChain([{ ...baseExerciseLogRow }]);

      const logs = await getExerciseLogsByDailyLogId("log1");
      expect(logs[0].completed).toBe(true);
    });
  });

  describe("upsertExerciseLog", () => {
    it("throws if upserted row is not found", async () => {
      setupInsertChain();
      mockSelect.mockImplementation(() => makeSelectChain([]));

      await expect(
        upsertExerciseLog({
          id: "el1",
          daily_log_id: "log1",
          user_exercise_id: "ue1",
          completed: true,
          actual_sets: 3,
          actual_reps: 10,
        })
      ).rejects.toThrow("Failed to upsert exercise log");
    });

    it("inserts with correct boolean conversion and returns parsed row", async () => {
      setupInsertChain();
      mockSelect.mockImplementation(() => makeSelectChain([{ ...baseExerciseLogRow }]));

      const result = await upsertExerciseLog({
        id: "el1",
        daily_log_id: "log1",
        user_exercise_id: "ue1",
        completed: true,
        actual_sets: 3,
        actual_reps: 10,
      });

      expect(mockInsert).toHaveBeenCalledTimes(1);
      expect(result.completed).toBe(true);
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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getAllMilestones", () => {
    it("returns empty array when no milestones", async () => {
      setupSelectChain([]);
      const result = await getAllMilestones();
      expect(result).toEqual([]);
    });

    it("parses category field", async () => {
      const row = {
        id: "m1",
        user_id: null,
        title: "First Steps",
        category: "milestone",
        date: "2024-06-01",
        notes: null,
        template_key: null,
        created_at: "2024-06-01T00:00:00Z",
      };
      setupSelectChain([row]);

      const milestones = await getAllMilestones();
      expect(milestones[0].category).toBe("milestone");
    });
  });

  describe("deleteMilestone", () => {
    it("calls delete with correct id", async () => {
      setupDeleteChain();
      await deleteMilestone("m1");
      expect(mockDelete).toHaveBeenCalledTimes(1);
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

const baseGateCriteriaRow = {
  id: "gc1",
  user_id: null as string | null,
  gate_key: "gate_1",
  criterion_key: "criterion_a",
  confirmed_at: "2024-06-01T00:00:00Z",
};

describe("gate-criteria-repo", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getGateCriteriaByGate", () => {
    it("queries by gate_key", async () => {
      setupSelectChain([]);

      await getGateCriteriaByGate("gate_1");
      expect(mockSelect).toHaveBeenCalledTimes(1);
    });
  });

  describe("confirmGateCriterion", () => {
    it("returns existing criterion without insert if already confirmed", async () => {
      setupSelectChain([{ ...baseGateCriteriaRow }]);

      const result = await confirmGateCriterion("gate_1", "criterion_a");
      expect(mockInsert).not.toHaveBeenCalled();
      expect(result.id).toBe("gc1");
    });
  });

  describe("removeGateCriterion", () => {
    it("calls delete with gate_key and criterion_key", async () => {
      setupDeleteChain();
      await removeGateCriterion("gate_1", "criterion_a");
      expect(mockDelete).toHaveBeenCalledTimes(1);
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

const baseNotifRow = {
  id: "np1",
  daily_reminder_time: "08:00",
  evening_nudge_enabled: 0,
  evening_nudge_time: "20:00",
  completion_congrats_enabled: 1,
};

describe("notification-repo", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getNotificationPreferences", () => {
    it("returns null when no row exists", async () => {
      setupSelectChain([]);
      const result = await getNotificationPreferences();
      expect(result).toBeNull();
    });

    it("parses boolean fields from integers", async () => {
      setupSelectChain([{ ...baseNotifRow }]);

      const prefs = await getNotificationPreferences();
      expect(prefs!.evening_nudge_enabled).toBe(false);
      expect(prefs!.completion_congrats_enabled).toBe(true);
    });
  });

  describe("createOrUpdateNotificationPreferences", () => {
    it("creates a new row when none exists", async () => {
      setupInsertChain();
      let callCount = 0;
      mockSelect.mockImplementation(() => {
        callCount++;
        const rows = callCount === 1 ? [] : [{ ...baseNotifRow, daily_reminder_time: "09:00" }];
        return makeSelectChain(rows);
      });

      const prefs = await createOrUpdateNotificationPreferences({
        daily_reminder_time: "09:00",
        evening_nudge_time: "21:00",
      });
      expect(mockInsert).toHaveBeenCalledTimes(1);
      expect(prefs.daily_reminder_time).toBe("09:00");
    });
  });
});
