# Physical Therapy Day Button — Design Spec

**Date:** 2026-03-29
**Status:** Approved

## Summary

Add a "Physical Therapy" button to the Today screen, next to the existing "Log Rest Day" button. Used for days when training with a PT trainer (exercises different from the at-home plan). The at-home exercise list still shows so the user can optionally log those too. PT day and Rest Day are mutually exclusive.

---

## Data Layer

### Types (`lib/data/data-store.types.ts`, `lib/types.ts`)

Add `is_pt_day: boolean` to `DailyLog`:

```ts
export interface DailyLog {
  id: string;
  date: string;
  is_rest_day: boolean;
  is_pt_day: boolean;   // NEW
  notes?: string;
}
```

Update `UpdateDailyLogData` to include `is_pt_day`:

```ts
export type UpdateDailyLogData = Partial<Pick<DailyLog, "is_rest_day" | "is_pt_day" | "notes">>;
```

### SQLite Schema (`lib/db/schema.ts`, `lib/db/sqlite.ts`)

Add column to `daily_logs` table:

```sql
is_pt_day INTEGER NOT NULL DEFAULT 0
```

New migration file: `lib/db/migrations/0004_add_pt_day.sql`

```sql
ALTER TABLE daily_logs ADD COLUMN is_pt_day INTEGER NOT NULL DEFAULT 0;
```

### Local Repository (`lib/db/repositories/daily-log-repo.ts`)

- `rowToDailyLog`: map `is_pt_day: row.is_pt_day === 1`
- `updateDailyLog`: apply `is_pt_day` when present in update data
- `getOrCreateDailyLog`: default `is_pt_day: 0`

### Remote Store (`lib/data/remote-data-store.ts`)

- `dbToDailyLog`: map `is_pt_day: row.is_pt_day`
- `getOrCreateDailyLog`: default `is_pt_day: false`
- `updateDailyLog`: pass through `is_pt_day` when present

### Supabase Types (`lib/database.types.ts`)

Add `is_pt_day: boolean` to `daily_logs` Row, Insert, and Update types.

---

## UI Layer

### `SmartRestToggle` → extended to `DayModeToggle`

Rename component file and export to `DayModeToggle`. New props:

```ts
interface Props {
  dayMode: "normal" | "rest" | "pt";
  onModeChange: (mode: "normal" | "rest" | "pt") => void;
}
```

Renders two buttons side by side in a `flex-row` container:

| Button | Left | Right |
|--------|------|-------|
| Label | "Log Rest Day" / "Rest Day Logged" | "Physical Therapy" / "PT Day Logged" |
| Icon | `bed` / `bed-outline` | `fitness` / `fitness-outline` |
| Active color | `Colors.rest` (purple) | `Colors.primary` (teal/green) |

Tapping an active button toggles it off (back to "normal"). Tapping an inactive button activates it and deactivates the other.

### `app/(tabs)/today.tsx`

- Derive `dayMode`: `isRestDay ? "rest" : isPtDay ? "pt" : "normal"`
- New `handleDayModeChange(mode)` function:
  - `"normal"`: clear both `is_rest_day` and `is_pt_day`
  - `"rest"`: set `is_rest_day: true, is_pt_day: false`
  - `"pt"`: set `is_pt_day: true, is_rest_day: false`
- Exercise list visibility: unchanged — only hidden when `isRestDay`. PT day still shows exercises.
- Rest day info card: unchanged — only shown when `isRestDay`.

---

## Streak

No changes needed. Streak counts any day with a `daily_log` entry regardless of flags.

---

## Scope

**In scope:**
- New `is_pt_day` field across all data layers
- `DayModeToggle` component (renamed from `SmartRestToggle`)
- Mutual exclusivity between rest and PT
- SQLite migration

**Out of scope:**
- PT-specific achievement
- Displaying PT days differently in the Progress screen
- Notes/details about what was done at PT
