# Auto-Increment Sets on Timer Completion

**Date:** 2026-03-08
**Status:** Design Approved

## Overview
When the `RestTimer` component reaches 0 seconds during an exercise, it will automatically increment the set count in `SetTracker`. When the final set completes, the exercise will automatically be marked as done.

## User Flow
1. User starts timer for a set (any hold duration exercise)
2. Timer counts down naturally
3. Timer reaches 0 → Auto-increment set count immediately
4. If not the final set → Timer resets to full duration, paused and ready to start again
5. If the final set → Set count reaches target AND exercise marked completed
6. If user pauses timer → No auto-increment; user can resume where they left off

## Implementation Details

### RestTimer Component Changes
- Add `onTimerComplete?: () => void` prop
- When timer naturally reaches 0, invoke `onTimerComplete()` before showing reset button
- Existing pause/resume behavior unchanged

### ExerciseCard Component Changes
- Pass `onTimerComplete` callback to `RestTimer` that:
  1. Calls `onSetComplete(currentSet + 1)` to increment the set
  2. If `currentSet + 1 === userExercise.sets`, also calls `onUpdate({ completed: true })`
- Ensure callback handles the final set auto-completion logic

### SetTracker Component
- No changes needed

## Behavior Details

**Timer Completion:** When timer naturally reaches 0 (not paused), the component will:
- Trigger the callback
- Stay at 0 display
- Show "Reset" button as before

**Manual Pause:** Pausing the timer prevents auto-increment; user must resume

**Editing Sets:** User can change target sets anytime; if they increase the count mid-exercise, the timer will continue and auto-increment will follow the new target

## Success Criteria
- [ ] Timer auto-increments set when reaching 0
- [ ] Final set auto-completes the exercise
- [ ] Paused timers don't auto-increment
- [ ] Visual/haptic feedback works as before
- [ ] No breaking changes to existing functionality
