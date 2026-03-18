import * as SQLite from "expo-sqlite";

export const CURRENT_SCHEMA_VERSION = 1;

// schema_version is an internal migration-tracking table.
// It intentionally omits a primary key `id` column and is exempt from the
// convention that all domain tables must have id/created_at/updated_at columns.
const CREATE_SCHEMA_VERSION = `
  CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
`;

const CREATE_PROFILE = `
  CREATE TABLE IF NOT EXISTS profile (
    id TEXT PRIMARY KEY,
    name TEXT,
    username TEXT,
    surgery_date TEXT,
    graft_type TEXT,
    knee_side TEXT NOT NULL DEFAULT 'right',
    device_id TEXT,
    supabase_user_id TEXT,
    last_synced_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
`;

const CREATE_EXERCISES = `
  CREATE TABLE IF NOT EXISTS exercises (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    phase_start TEXT NOT NULL,
    phase_end TEXT,
    role TEXT NOT NULL DEFAULT 'primary',
    primary_exercise_id TEXT,
    muscle_groups TEXT NOT NULL DEFAULT '[]',
    default_sets INTEGER NOT NULL DEFAULT 3,
    default_reps INTEGER NOT NULL DEFAULT 10,
    default_hold_seconds INTEGER,
    category TEXT NOT NULL DEFAULT 'strengthening',
    sort_order INTEGER NOT NULL DEFAULT 0,
    catalog_version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
`;

const CREATE_CONTENT = `
  CREATE TABLE IF NOT EXISTS content (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    trigger_condition TEXT,
    phase TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    catalog_version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
`;

const CREATE_USER_EXERCISES = `
  CREATE TABLE IF NOT EXISTS user_exercises (
    id TEXT PRIMARY KEY,
    exercise_id TEXT NOT NULL REFERENCES exercises(id),
    sets INTEGER NOT NULL DEFAULT 3,
    reps INTEGER NOT NULL DEFAULT 10,
    hold_seconds INTEGER,
    is_active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
`;

const CREATE_DAILY_LOGS = `
  CREATE TABLE IF NOT EXISTS daily_logs (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL UNIQUE,
    is_rest_day INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
`;

const CREATE_EXERCISE_LOGS = `
  CREATE TABLE IF NOT EXISTS exercise_logs (
    id TEXT PRIMARY KEY,
    daily_log_id TEXT NOT NULL REFERENCES daily_logs(id),
    user_exercise_id TEXT NOT NULL REFERENCES user_exercises(id),
    completed INTEGER NOT NULL DEFAULT 0,
    actual_sets INTEGER NOT NULL DEFAULT 0,
    actual_reps INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(daily_log_id, user_exercise_id)
  );
`;

const CREATE_ROM_MEASUREMENTS = `
  CREATE TABLE IF NOT EXISTS rom_measurements (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    flexion_degrees REAL,
    extension_degrees REAL,
    quad_activation INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
`;

const CREATE_MILESTONES = `
  CREATE TABLE IF NOT EXISTS milestones (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'milestone',
    date TEXT NOT NULL,
    notes TEXT,
    template_key TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
`;

const CREATE_USER_ACHIEVEMENTS = `
  CREATE TABLE IF NOT EXISTS user_achievements (
    id TEXT PRIMARY KEY,
    content_id TEXT NOT NULL REFERENCES content(id),
    unlocked_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
`;

const CREATE_USER_GATE_CRITERIA = `
  CREATE TABLE IF NOT EXISTS user_gate_criteria (
    id TEXT PRIMARY KEY,
    gate_key TEXT NOT NULL,
    criterion_key TEXT NOT NULL,
    confirmed_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(gate_key, criterion_key)
  );
`;

const CREATE_NOTIFICATION_PREFERENCES = `
  CREATE TABLE IF NOT EXISTS notification_preferences (
    id TEXT PRIMARY KEY,
    daily_reminder_time TEXT NOT NULL DEFAULT '08:00',
    evening_nudge_enabled INTEGER NOT NULL DEFAULT 0,
    evening_nudge_time TEXT NOT NULL DEFAULT '20:00',
    completion_congrats_enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
`;

function getSchemaVersion(db: SQLite.SQLiteDatabase): number {
  const row = db.getFirstSync<{ version: number }>(
    "SELECT version FROM schema_version LIMIT 1"
  );
  return row?.version ?? 0;
}

function setSchemaVersion(db: SQLite.SQLiteDatabase, version: number): void {
  const existing = db.getFirstSync<{ version: number }>(
    "SELECT version FROM schema_version LIMIT 1"
  );
  if (existing) {
    db.runSync(
      "UPDATE schema_version SET version = ?, updated_at = datetime('now')",
      [version]
    );
  } else {
    db.runSync("INSERT INTO schema_version (version) VALUES (?)", [version]);
  }
}

export function initializeDatabase(db: SQLite.SQLiteDatabase): void {
  // Create schema_version first so we can read it
  db.execSync(CREATE_SCHEMA_VERSION);

  const currentVersion = getSchemaVersion(db);

  if (currentVersion >= CURRENT_SCHEMA_VERSION) {
    return;
  }

  // Migration v0 → v1: initial schema
  if (currentVersion < 1) {
    db.execSync(CREATE_PROFILE);
    db.execSync(CREATE_EXERCISES);
    db.execSync(CREATE_CONTENT);
    db.execSync(CREATE_USER_EXERCISES);
    db.execSync(CREATE_DAILY_LOGS);
    db.execSync(CREATE_EXERCISE_LOGS);
    db.execSync(CREATE_ROM_MEASUREMENTS);
    db.execSync(CREATE_MILESTONES);
    db.execSync(CREATE_USER_ACHIEVEMENTS);
    db.execSync(CREATE_USER_GATE_CRITERIA);
    db.execSync(CREATE_NOTIFICATION_PREFERENCES);
  }

  setSchemaVersion(db, CURRENT_SCHEMA_VERSION);
}
