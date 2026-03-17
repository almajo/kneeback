# Share Win as Community Post — Design Spec

**Date:** 2026-03-17
**Status:** Approved

---

## Overview

After a user saves a "win" in the progress timeline, a lightweight share prompt appears asking whether they want to celebrate with the community. The user can optionally add a message before sharing, or skip entirely.

This feature is scoped to **wins only** (not milestones). A new `"win"` post type is added to the community system.

---

## New Post Type

Add `"win"` to the `PostType` union in `lib/types.ts`:

```ts
export type PostType = "question" | "milestone" | "life_hack" | "win";
```

No changes to `CreatePostInput` or the database schema for posts (the `post_type` column already accepts any string via the enum or a text field).

---

## Components

### `ShareWinPrompt` (`components/community/ShareWinPrompt.tsx`)

A Modal displayed after a win is successfully saved.

**Props:**
```ts
interface Props {
  visible: boolean;
  winTitle: string;
  onShare: (message: string) => Promise<void>;
  onSkip: () => void;
}
```

**Layout:**
- Handle bar at top
- Celebratory header: "🎉 Celebrate your win!"
- Read-only win title (shown as context, not editable)
- Multiline `TextInput` — optional message ("How does it feel? Add a message…")
- Primary button: "Share with Community" (disabled while submitting)
- Secondary text link: "Skip"

**Behavior:**
- `onShare` is called with the message text (empty string is valid — body can be the win title if no message entered)
- Closes automatically after share or skip
- Shows a loading state on the share button while submitting

### `PostTypeBadge` update (`components/community/PostTypeBadge.tsx`)

Add a case for `"win"`: label `"Win"`, emoji `★`, color `Colors.success`.

---

## Flow

### Where the prompt is triggered

The `ProgressCalendar` component renders `AddMilestoneSheet` and handles the `onSaveMilestone` callback. After a successful save where `category === "win"`:

1. `ProgressCalendar` sets `pendingShareWin` state with the win title.
2. `ShareWinPrompt` renders with `visible={!!pendingShareWin}`.
3. On share: calls `createPost({ post_type: "win", title: winTitle, body: message || winTitle })`, then clears `pendingShareWin`.
4. On skip: clears `pendingShareWin`.

### Post creation

Reuses the existing `createPost` function in `lib/community.ts` (or wherever community mutations live). No new API surface needed.

---

## Error Handling

- If the community post fails to create, show an `Alert` with the error message. The win itself is already saved — sharing is best-effort.
- The prompt closes regardless of share success/failure to avoid blocking the user.

---

## What Is Not Changed

- Existing milestone save logic
- Existing post types (`question`, `milestone`, `life_hack`)
- Community feed ranking or display
- `AddMilestoneSheet` itself (the trigger is in the parent, not the sheet)
