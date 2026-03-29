# Physical Therapy Day Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Physical Therapy" day button next to "Log Rest Day" on the Today screen, backed by a new `is_pt_day` field; PT and Rest Day are mutually exclusive; exercises still show on PT day.

**Architecture:** Extend `DailyLog` with `is_pt_day: boolean` across types, local SQLite repo, and remote Supabase store. Replace `SmartRestToggle` with a `DayModeToggle` component that owns both buttons and a `"normal" | "rest" | "pt"` mode. Wire mutual-exclusivity logic in `today.tsx` via a single `handleDayModeChange` handler.

**Tech Stack:** React Native (Expo), Drizzle ORM (SQLite), Supabase, TypeScript, Ionicons, NativeWind

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Modify | `lib/data/data-store.types.ts` | Add `is_pt_day` to `DailyLog` and `UpdateDailyLogData` |
| Modify | `lib/types.ts` | Mirror `is_pt_day` on the shared `DailyLog` interface |
| Modify | `lib/database.types.ts` | Add `is_pt_day` to Supabase Row/Insert/Update |
| Modify | `lib/db/schema.ts` | Add `is_pt_day` column to Drizzle schema |
| Modify | `lib/db/sqlite.ts` | Bump `CURRENT_SCHEMA_VERSION` to 6; add v5->v6 migration |
| Modify | `lib/db/repositories/daily-log-repo.ts` | Map `is_pt_day` in all repo functions |
| Modify | `lib/data/remote-data-store.ts` | Map `is_pt_day` in `dbToDailyLog`, `getOrCreateDailyLog`, `updateDailyLog` |
| Modify | `components/SmartRestToggle.tsx` | New props; two-button layout; renamed export |
| Modify | `app/(tabs)/today.tsx` | Import `DayModeToggle`; derive `dayMode`; add `handleDayModeChange` |
| Modify | `lib/__tests__/repositories.test.ts` | Add `is_pt_day: 0` to base fixture; add updateDailyLog PT test |

---

## Task 1: Add is_pt_day to types

**Files:**
- Modify: `lib/data/data-store.types.ts:40-48`
- Modify: `lib/types.ts:90-93`
- Modify: `lib/database.types.ts:200-225`

- [ ] **Step 1: Update lib/data/data-store.types.ts**

Replace the DailyLog interface and UpdateDailyLogData type:

```typescript
export interface DailyLog {
  id: string;
  date: string;
  is_rest_day: boolean;
  is_pt_day: boolean;
  notes: string | null;
  created_at: string;
}

export type UpdateDailyLogData = Partial<Pick<DailyLog, "is_rest_day" | "is_pt_day" | "notes">>;
```

- [ ] **Step 2: Update lib/types.ts**

Find `interface DailyLog` and add the field:

```typescript
export interface DailyLog {
  id: string;
  date: string;
  is_rest_day: boolean;
  is_pt_day: boolean;
  notes?: string;
}
```

- [ ] **Step 3: Update lib/database.types.ts**

Add `is_pt_day` to the daily_logs Row, Insert, and Update shapes:

```typescript
Row: {
  created_at: string | null
  date: string
  id: string
  is_pt_day: boolean        // ADD
  is_rest_day: boolean
  notes: string | null
  user_id: string
}
Insert: {
  created_at?: string | null
  date: string
  id?: string
  is_pt_day?: boolean       // ADD
  is_rest_day?: boolean
  notes?: string | null
  user_id: string
}
Update: {
  created_at?: string | null
  date?: string
  id?: string
  is_pt_day?: boolean       // ADD
  is_rest_day?: boolean
  notes?: string | null
  user_id?: string
}
```

- [ ] **Step 4: Commit**

```bash
git add "lib/data/data-store.types.ts" "lib/types.ts" "lib/database.types.ts"
git commit -m "feat: add is_pt_day to DailyLog types"
```

---

## Task 2: SQLite schema + migration

**Files:**
- Modify: `lib/db/schema.ts:63-70`
- Modify: `lib/db/sqlite.ts` (bump version, add migration block)

- [ ] **Step 1: Update Drizzle schema (lib/db/schema.ts)**

Add `is_pt_day` to the `daily_logs` table after `is_rest_day`:

```typescript
export const daily_logs = sqliteTable("daily_logs", {
  id: text("id").primaryKey(),
  user_id: text("user_id"),
  date: text("date").notNull().unique(),
  is_rest_day: integer("is_rest_day").notNull().default(0),
  is_pt_day: integer("is_pt_day").notNull().default(0),
  notes: text("notes"),
  created_at: text("created_at").default(sql`(datetime('now'))`),
});
```

- [ ] **Step 2: Bump schema version in lib/db/sqlite.ts**

Change line 3:
```typescript
export const CURRENT_SCHEMA_VERSION = 6;
```

- [ ] **Step 3: Add migration block after the v4->v5 block (after line 325)**

```typescript
  // Migration v5 -> v6: add is_pt_day column to daily_logs
  if (currentVersion < 6) {
    db.execSync(
      "ALTER TABLE daily_logs ADD COLUMN is_pt_day INTEGER NOT NULL DEFAULT 0"
    );
  }
```

- [ ] **Step 4: Commit**

```bash
git add "lib/db/schema.ts" "lib/db/sqlite.ts"
git commit -m "feat: add is_pt_day column to daily_logs (migration v6)"
```

---

## Task 3: Update local repository

**Files:**
- Modify: `lib/db/repositories/daily-log-repo.ts`

- [ ] **Step 1: Update rowToDailyLog**

```typescript
function rowToDailyLog(row: typeof daily_logs.$inferSelect): DailyLog {
  return {
    id: row.id,
    date: row.date,
    is_rest_day: row.is_rest_day === 1,
    is_pt_day: row.is_pt_day === 1,
    notes: row.notes ?? null,
    created_at: row.created_at ?? "",
  };
}
```

- [ ] **Step 2: Update getOrCreateDailyLog insert values**

```typescript
  await db.insert(daily_logs).values({
    id,
    date,
    is_rest_day: 0,
    is_pt_day: 0,
    notes: null,
  }).onConflictDoNothing();
```

- [ ] **Step 3: Update updateDailyLog**

Add after the is_rest_day line:
```typescript
  if (data.is_rest_day !== undefined) updates.is_rest_day = data.is_rest_day ? 1 : 0;
  if (data.is_pt_day !== undefined) updates.is_pt_day = data.is_pt_day ? 1 : 0;
  if (data.notes !== undefined) updates.notes = data.notes ?? null;
```

- [ ] **Step 4: Commit**

```bash
git add "lib/db/repositories/daily-log-repo.ts"
git commit -m "feat: map is_pt_day in local daily-log repository"
```

---

## Task 4: Update remote data store

**Files:**
- Modify: `lib/data/remote-data-store.ts`

- [ ] **Step 1: Update dbToDailyLog (line ~70)**

```typescript
function dbToDailyLog(row: DbDailyLog): DailyLog {
  return {
    id: row.id,
    date: row.date,
    is_rest_day: row.is_rest_day,
    is_pt_day: row.is_pt_day,
    notes: row.notes ?? null,
    created_at: row.created_at ?? "",
  };
}
```

- [ ] **Step 2: Update getOrCreateDailyLog insert (line ~342)**

```typescript
      .insert({
        id: generateId(),
        user_id: this.userId,
        date,
        is_rest_day: false,
        is_pt_day: false,
        notes: null,
      })
```

- [ ] **Step 3: Update updateDailyLog (line ~397)**

```typescript
    if (data.is_rest_day !== undefined) updates.is_rest_day = data.is_rest_day;
    if (data.is_pt_day !== undefined) updates.is_pt_day = data.is_pt_day;
    if (data.notes !== undefined) updates.notes = data.notes;
```

- [ ] **Step 4: Commit**

```bash
git add "lib/data/remote-data-store.ts"
git commit -m "feat: map is_pt_day in remote data store"
```

---

## Task 5: Update repository tests

**Files:**
- Modify: `lib/__tests__/repositories.test.ts`

- [ ] **Step 1: Add is_pt_day to baseDailyLogRow**

```typescript
const baseDailyLogRow = {
  id: "log1",
  user_id: null as string | null,
  date: "2024-06-01",
  is_rest_day: 0,
  is_pt_day: 0,
  notes: null as string | null,
  created_at: "2024-06-01T00:00:00Z",
};
```

- [ ] **Step 2: Add tests for is_pt_day in the updateDailyLog describe block**

```typescript
  it("maps is_pt_day correctly when set to true", async () => {
    setupSelectChain([{ ...baseDailyLogRow, is_pt_day: 1 }]);
    setupUpdateChain();

    const log = await updateDailyLog("log1", { is_pt_day: true });

    expect(log.is_pt_day).toBe(true);
  });

  it("maps is_pt_day correctly when set to false", async () => {
    setupSelectChain([{ ...baseDailyLogRow, is_pt_day: 0 }]);
    setupUpdateChain();

    const log = await updateDailyLog("log1", { is_pt_day: false });

    expect(log.is_pt_day).toBe(false);
  });
```

- [ ] **Step 3: Run tests**

```bash
npx jest "lib/__tests__/repositories.test.ts" --no-coverage
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add "lib/__tests__/repositories.test.ts"
git commit -m "test: add is_pt_day coverage to daily-log-repo tests"
```

---

## Task 6: Create DayModeToggle component

**Files:**
- Modify: `components/SmartRestToggle.tsx`

- [ ] **Step 1: Replace the entire file with DayModeToggle**

```typescript
import { TouchableOpacity, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/colors";

type DayMode = "normal" | "rest" | "pt";

interface Props {
  dayMode: DayMode;
  onModeChange: (mode: DayMode) => void;
}

export function DayModeToggle({ dayMode, onModeChange }: Props) {
  const isRest = dayMode === "rest";
  const isPt = dayMode === "pt";

  function handleRestPress() {
    onModeChange(isRest ? "normal" : "rest");
  }

  function handlePtPress() {
    onModeChange(isPt ? "normal" : "pt");
  }

  return (
    <View className="flex-row mx-4 mb-4 gap-3">
      <TouchableOpacity
        className={`flex-1 flex-row items-center justify-center py-3 rounded-2xl border ${
          isRest ? "border-rest" : "bg-surface border-border"
        }`}
        style={isRest ? { backgroundColor: Colors.rest } : undefined}
        onPress={handleRestPress}
        activeOpacity={0.75}
      >
        <Ionicons
          name={isRest ? "bed" : "bed-outline"}
          size={20}
          color={isRest ? "#FFFFFF" : Colors.rest}
        />
        <Text
          className="ml-2 font-bold"
          style={{ color: isRest ? "#FFFFFF" : Colors.rest }}
        >
          {isRest ? "Rest Logged" : "Log Rest Day"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        className={`flex-1 flex-row items-center justify-center py-3 rounded-2xl border ${
          isPt ? "border-secondary" : "bg-surface border-border"
        }`}
        style={isPt ? { backgroundColor: Colors.secondary } : undefined}
        onPress={handlePtPress}
        activeOpacity={0.75}
      >
        <Ionicons
          name={isPt ? "fitness" : "fitness-outline"}
          size={20}
          color={isPt ? "#FFFFFF" : Colors.secondary}
        />
        <Text
          className="ml-2 font-bold"
          style={{ color: isPt ? "#FFFFFF" : Colors.secondary }}
        >
          {isPt ? "PT Logged" : "Physical Therapy"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "components/SmartRestToggle.tsx"
git commit -m "feat: replace SmartRestToggle with DayModeToggle"
```

---

## Task 7: Wire DayModeToggle into today.tsx

**Files:**
- Modify: `app/(tabs)/today.tsx`

- [ ] **Step 1: Update import**

Replace:
```typescript
import { SmartRestToggle } from "../../components/SmartRestToggle";
```
With:
```typescript
import { DayModeToggle } from "../../components/SmartRestToggle";
```

- [ ] **Step 2: Add isPtDay and dayMode derivations after line 85**

After `const isRestDay = dailyLog?.is_rest_day ?? false;` add:
```typescript
  const isPtDay = dailyLog?.is_pt_day ?? false;
  const dayMode = isRestDay ? "rest" : isPtDay ? "pt" : "normal";
```

- [ ] **Step 3: Replace toggleRestDay with handleDayModeChange**

Remove:
```typescript
  async function toggleRestDay() {
    if (!dailyLog) return;
    const newIsRest = !isRestDay;
    await store.updateDailyLog(dailyLog.id, { is_rest_day: newIsRest });
    refetch();
    if (newIsRest) {
      const streakLogs = await store.getDailyLogsForStreak();
      const prevRestDays = streakLogs.filter((l) => l.is_rest_day);
      runAchievementCheck({ isFirstRestDay: prevRestDays.length <= 1 });
    }
  }
```

Add:
```typescript
  async function handleDayModeChange(mode: "normal" | "rest" | "pt") {
    if (!dailyLog) return;
    await store.updateDailyLog(dailyLog.id, {
      is_rest_day: mode === "rest",
      is_pt_day: mode === "pt",
    });
    refetch();
    if (mode === "rest") {
      const streakLogs = await store.getDailyLogsForStreak();
      const prevRestDays = streakLogs.filter((l) => l.is_rest_day);
      runAchievementCheck({ isFirstRestDay: prevRestDays.length <= 1 });
    }
  }
```

- [ ] **Step 4: Replace SmartRestToggle usage in listHeader**

Replace:
```typescript
      <SmartRestToggle isRestDay={isRestDay} onToggle={toggleRestDay} />
```
With:
```typescript
      <DayModeToggle dayMode={dayMode} onModeChange={handleDayModeChange} />
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add "app/(tabs)/today.tsx"
git commit -m "feat: wire DayModeToggle into Today screen with PT day support"
```

---

## Task 8: Create PR

- [ ] **Step 1: Push branch**

```bash
git push -u origin feat/pt-day-button
```

- [ ] **Step 2: Create PR**

```bash
gh pr create \
  --title "feat: add Physical Therapy day button to Today screen" \
  --base main \
  --body "$(cat <<'EOF'
## Summary

- Adds a Physical Therapy button next to Log Rest Day on the Today screen
- New is_pt_day field on DailyLog (SQLite migration v6, Supabase types updated)
- SmartRestToggle replaced with DayModeToggle - three states: normal / rest / pt
- Rest and PT are mutually exclusive; tapping active button resets to normal
- Exercise list still shows when PT is logged (only hidden on rest day)
- Streak unaffected (counts any day with a daily_log entry)

## Test plan

- [ ] Log a PT day: exercises remain visible, PT button fills teal
- [ ] Log a rest day: exercises hide, rest button fills purple
- [ ] Toggle PT on while rest is active: rest clears, PT activates
- [ ] Toggle active button off: returns to normal day
- [ ] Fresh install: migration v6 runs, existing rest-day data unaffected
EOF
)"
```
