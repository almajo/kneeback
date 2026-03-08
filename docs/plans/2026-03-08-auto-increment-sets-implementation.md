# Auto-Increment Sets on Timer Completion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Automatically increment the set count and mark exercises as complete when the hold timer reaches 0.

**Architecture:** Add an `onTimerComplete` callback to the `RestTimer` component that fires when the timer naturally reaches 0 (not from a pause). The `ExerciseCard` will pass this callback and handle incrementing the set count via `SetTracker`'s existing `onSetComplete` handler, plus auto-marking the exercise as complete if it was the final set.

**Tech Stack:** React Native, Expo Haptics, TypeScript

---

## Task 1: Update RestTimer with onTimerComplete Callback

**Files:**
- Modify: `components/RestTimer.tsx`

**Step 1: Add callback prop to RestTimer**

Update the interface to add the optional callback:

```typescript
interface Props {
  seconds: number;
  onTimerComplete?: () => void;
}
```

**Step 2: Call callback when timer naturally reaches 0**

In the `setRemaining` callback (around line 17-24), when `prev <= 1`, invoke the callback before setting running to false:

```typescript
if (prev <= 1) {
  setRunning(false);
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  onTimerComplete?.();  // Add this line
  return 0;
}
```

**Step 3: Update useEffect dependency array**

Add `onTimerComplete` to the dependency array at line 30:

```typescript
}, [running, remaining, onTimerComplete]);
```

**Step 4: Test in ExerciseCard**

No unit test needed for this component yet—it will be tested via integration in ExerciseCard.

**Step 5: Commit**

```bash
git add components/RestTimer.tsx
git commit -m "feat: add onTimerComplete callback to RestTimer"
```

---

## Task 2: Update ExerciseCard to Handle Timer Completion

**Files:**
- Modify: `components/ExerciseCard.tsx`

**Step 1: Create handler for timer completion**

After line 28 (where `currentSet` is defined), add a new handler function:

```typescript
function handleTimerComplete() {
  const nextSet = currentSet + 1;
  onUpdate({ actual_sets: nextSet });

  // If this was the final set, mark exercise as completed
  if (nextSet === userExercise.sets) {
    onUpdate({ completed: true });
  }
}
```

**Step 2: Pass callback to RestTimer**

Update the `RestTimer` component at line 122 to pass the handler:

```typescript
{userExercise.hold_seconds && (
  <RestTimer
    seconds={userExercise.hold_seconds}
    onTimerComplete={handleTimerComplete}
  />
)}
```

**Step 3: Verify logic (no test file changes needed)**

The logic mirrors the existing `SetTracker` behavior (see lines 114-119), just triggered automatically instead of manually.

**Step 4: Commit**

```bash
git add components/ExerciseCard.tsx
git commit -m "feat: auto-increment sets and complete exercise on timer completion"
```

---

## Task 3: Manual Testing

**Files:**
- Test in: `app/(tabs)/today.tsx` (existing today screen)

**Step 1: Run the app**

```bash
npm start
# Or if using Expo: expo start
```

**Step 2: Navigate to an exercise with hold time**

On the Today screen, expand an exercise that has a hold duration (exercises with hold_seconds > 0).

**Step 3: Test auto-increment flow**

1. Start the timer by pressing "Start"
2. Let it count down to 0
3. Verify: Set count increments automatically
4. Verify: Timer resets to full duration (stays paused)
5. If testing final set: Verify exercise checkmark appears and is checked

**Step 4: Test pause behavior**

1. Start timer, pause before it reaches 0
2. Verify: Set count does NOT increment
3. Resume timer from where it was paused
4. Let it reach 0
5. Verify: Set count increments when it naturally completes

**Step 5: Test manual set editing**

1. Start timer, pause it
2. Tap the pencil icon to edit
3. Change hold seconds or sets
4. Close the modal
5. Resume timer
6. Let it complete
7. Verify: Auto-increment still works with new values

---

## Task 4: Edge Cases & Polish

**Files:**
- Verify: `components/ExerciseCard.tsx` behavior

**Step 1: Verify final set auto-completion**

If `currentSet + 1 === userExercise.sets`:
- Set count should reach target
- Exercise should be marked completed (checkmark checked)
- Card background should reflect completion state

**Step 2: Verify no double-increments**

- User cannot tap SetTracker circles AND have auto-increment fire
- (RestTimer is independent; user would need to manually interact with SetTracker if they want to override)

**Step 3: Verify visual feedback**

- Haptic feedback triggers when timer reaches 0 (existing)
- Set circles update visually when auto-incremented
- Completion checkmark updates when final set completes

**Step 4: No new commit needed**

All changes are in Tasks 1-2.

---

## Testing Checklist

- [ ] Timer reaches 0 → set auto-increments
- [ ] Non-final set → timer resets, paused, ready to start again
- [ ] Final set timer reaches 0 → exercise auto-marked completed
- [ ] Paused timer → no auto-increment when resumed and reaches 0
- [ ] Manual pause + resume → timer completes and auto-increments
- [ ] Edit sets mid-exercise → auto-increment respects new target
- [ ] Multiple exercises → no cross-contamination of auto-increment logic
- [ ] Visual state updates correctly (set circles, checkmark, card background)

---

## Implementation Notes

- **No breaking changes:** Callback is optional; existing usage without callback works fine
- **Reuses existing logic:** Leverages `onSetComplete` pattern already in place
- **Consistent UX:** Auto-increment behavior matches manual SetTracker interactions
- **Safety:** Pause prevents auto-increment (user has control if needed)
