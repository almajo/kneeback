# Share Win as Community Post — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After saving a "win", show a prompt that lets the user optionally share it as a community post with a personal message.

**Architecture:** A new `ShareWinPrompt` modal component lives in `components/community/`. After a win is saved, `progress.tsx` sets a `pendingShareWin` state that makes the prompt appear. Sharing calls a new standalone `submitCommunityPost` utility (not the full `useCommunity` hook) and clears the state on completion or skip.

**Tech Stack:** React Native, Expo, TypeScript, Supabase, Ionicons, Jest + ts-jest

**Spec:** `docs/superpowers/specs/2026-03-17-share-win-community-post-design.md`

---

## Chunk 1: Type system + badge

### Task 1: Add "win" to PostType

**Files:**
- Modify: `lib/types.ts:158`

- [ ] **Step 1: Update the PostType union**

In `lib/types.ts`, change line 158 from:
```ts
export type PostType = "question" | "milestone" | "life_hack";
```
to:
```ts
export type PostType = "question" | "milestone" | "life_hack" | "win";
```

- [ ] **Step 2: Verify TypeScript still compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add "lib/types.ts"
git commit -m "feat: add win post type to PostType union"
```

---

### Task 2: Add "win" entry to PostTypeBadge

**Files:**
- Modify: `components/community/PostTypeBadge.tsx:6-10`

The `POST_TYPE_CONFIG` object is keyed by `PostType`. Adding `"win"` to the union (Task 1) will cause a TypeScript error here until we add the entry.

- [ ] **Step 1: Add the win config entry**

In `components/community/PostTypeBadge.tsx`, update `POST_TYPE_CONFIG`:
```ts
const POST_TYPE_CONFIG: Record<PostType, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  question: { label: "Question", color: Colors.secondary, icon: "help-circle-outline" },
  milestone: { label: "Milestone", color: Colors.success, icon: "trophy-outline" },
  life_hack: { label: "Life Hack", color: Colors.primary, icon: "bulb-outline" },
  win: { label: "Win", color: Colors.success, icon: "star-outline" },
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add "components/community/PostTypeBadge.tsx"
git commit -m "feat: add win badge config to PostTypeBadge"
```

---

## Chunk 2: submitCommunityPost utility

### Task 3: Write the test first

**Files:**
- Create: `__tests__/community.test.ts`

The utility takes a `userId` and `CreatePostInput`, calls Supabase, and returns `{ error: string | null }`. We mock Supabase to control success/failure.

- [ ] **Step 1: Create the test file**

```ts
// __tests__/community.test.ts
import { submitCommunityPost } from "@/lib/community";

const mockInsert = jest.fn();

jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => ({
      insert: mockInsert,
    }),
  },
}));

describe("submitCommunityPost", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns { error: null } on success", async () => {
    mockInsert.mockResolvedValueOnce({ error: null });
    const result = await submitCommunityPost("user-1", {
      post_type: "win",
      title: "Walked without crutches!",
      body: "First time in 6 weeks",
    });
    expect(result).toEqual({ error: null });
  });

  it("returns { error: message } when Supabase insert fails", async () => {
    mockInsert.mockResolvedValueOnce({ error: { message: "Network error" } });
    const result = await submitCommunityPost("user-1", {
      post_type: "win",
      title: "Walked without crutches!",
      body: "First time in 6 weeks",
    });
    expect(result).toEqual({ error: "Network error" });
  });

  it("passes user_id and input to Supabase insert", async () => {
    mockInsert.mockResolvedValueOnce({ error: null });
    await submitCommunityPost("user-abc", {
      post_type: "win",
      title: "My win",
      body: "Details",
    });
    expect(mockInsert).toHaveBeenCalledWith({
      user_id: "user-abc",
      post_type: "win",
      title: "My win",
      body: "Details",
    });
  });
});
```

- [ ] **Step 2: Run the test — expect it to FAIL**

```bash
npx jest __tests__/community.test.ts --no-coverage
```
Expected: FAIL — "Cannot find module '@/lib/community'"

- [ ] **Step 3: Create the utility**

Create `lib/community.ts`:
```ts
import { supabase } from "./supabase";
import type { CreatePostInput } from "./types";

export async function submitCommunityPost(
  userId: string,
  input: CreatePostInput
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("community_posts")
    .insert({ user_id: userId, ...input });
  return { error: error?.message ?? null };
}
```

- [ ] **Step 4: Run the test — expect it to PASS**

```bash
npx jest __tests__/community.test.ts --no-coverage
```
Expected: PASS — 3 tests passing

- [ ] **Step 5: Commit**

```bash
git add "lib/community.ts" "__tests__/community.test.ts"
git commit -m "feat: add submitCommunityPost utility with tests"
```

---

## Chunk 3: ShareWinPrompt component

### Task 4: Build ShareWinPrompt

**Files:**
- Create: `components/community/ShareWinPrompt.tsx`

This is a bottom-sheet style Modal, matching the visual style of `CreatePostSheet` and `AddMilestoneSheet`. It shows the win title as read-only context, an optional message field, a primary Share button, and a Skip link.

- [ ] **Step 1: Create the component**

```tsx
// components/community/ShareWinPrompt.tsx
import { useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Colors } from "../../constants/colors";

interface Props {
  visible: boolean;
  winTitle: string;
  onShare: (message: string) => Promise<void>;
  onSkip: () => void;
}

export function ShareWinPrompt({ visible, winTitle, onShare, onSkip }: Props) {
  const [message, setMessage] = useState("");
  const [sharing, setSharing] = useState(false);

  function handleSkip() {
    setMessage("");
    onSkip();
  }

  async function handleShare() {
    setSharing(true);
    await onShare(message.trim());
    setMessage("");
    setSharing(false);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleSkip}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
          onPress={handleSkip}
        />
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: Colors.background,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 24,
            paddingTop: 16,
            paddingBottom: 40,
          }}
        >
          {/* Handle */}
          <View
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: Colors.border,
              alignSelf: "center",
              marginBottom: 20,
            }}
          />

          <Text style={{ fontSize: 20, fontWeight: "700", color: Colors.text, marginBottom: 4 }}>
            🎉 Celebrate your win!
          </Text>
          <Text style={{ fontSize: 14, color: Colors.textSecondary, marginBottom: 20 }}>
            Share this moment with the community.
          </Text>

          {/* Win title context */}
          <View
            style={{
              backgroundColor: Colors.success + "15",
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 10,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: Colors.success + "40",
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "600", color: Colors.success }}>
              ★ {winTitle}
            </Text>
          </View>

          {/* Message input */}
          <Text
            style={{
              fontSize: 11,
              fontWeight: "600",
              letterSpacing: 0.8,
              color: Colors.textMuted,
              marginBottom: 8,
            }}
          >
            ADD A MESSAGE (OPTIONAL)
          </Text>
          <TextInput
            style={{
              backgroundColor: Colors.surface,
              borderWidth: 1,
              borderColor: Colors.border,
              borderRadius: 16,
              paddingHorizontal: 16,
              paddingVertical: 12,
              fontSize: 15,
              color: Colors.text,
              minHeight: 88,
              textAlignVertical: "top",
              marginBottom: 20,
            }}
            placeholder="How does it feel? Add a message…"
            placeholderTextColor={Colors.textMuted}
            value={message}
            onChangeText={setMessage}
            multiline
          />

          {/* Share button */}
          <TouchableOpacity
            onPress={handleShare}
            disabled={sharing}
            style={{
              backgroundColor: Colors.success,
              borderRadius: 14,
              height: 52,
              alignItems: "center",
              justifyContent: "center",
              opacity: sharing ? 0.6 : 1,
              marginBottom: 12,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>
              {sharing ? "Sharing…" : "Share with Community"}
            </Text>
          </TouchableOpacity>

          {/* Skip link */}
          <TouchableOpacity onPress={handleSkip} style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 15, color: Colors.textSecondary }}>Skip</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add "components/community/ShareWinPrompt.tsx"
git commit -m "feat: add ShareWinPrompt component"
```

---

## Chunk 4: Wire up progress.tsx

### Task 5: Integrate ShareWinPrompt into the progress screen

**Files:**
- Modify: `app/(tabs)/progress.tsx`

This is the only integration step. We add `pendingShareWin` state, wrap `addMilestone` in a handler that sets it on win saves, render `ShareWinPrompt` alongside the existing modals, and call `submitCommunityPost` on share.

- [ ] **Step 1: Add the import for ShareWinPrompt and submitCommunityPost**

At the top of `app/(tabs)/progress.tsx`, add:
```ts
import { ShareWinPrompt } from "../../components/community/ShareWinPrompt";
import { submitCommunityPost } from "../../lib/community";
```

- [ ] **Step 2: Add pendingShareWin state**

Inside `ProgressScreen`, alongside existing `useState` calls, add:
```ts
const [pendingShareWin, setPendingShareWin] = useState<string | null>(null);
```

- [ ] **Step 3: Add handleSaveMilestone wrapper**

Add this function inside `ProgressScreen` (replaces direct `addMilestone` usage in the JSX):
```ts
async function handleSaveMilestone(payload: {
  title: string;
  category: "milestone" | "win";
  date: string;
  notes?: string;
  template_key?: string;
}) {
  await addMilestone(payload);
  if (payload.category === "win") {
    setPendingShareWin(payload.title);
  }
}
```

- [ ] **Step 4: Add handleShareWin function**

```ts
async function handleShareWin(message: string) {
  if (!session || !pendingShareWin) return;
  const { error } = await submitCommunityPost(session.user.id, {
    post_type: "win",
    title: pendingShareWin,
    body: message || pendingShareWin,
  });
  setPendingShareWin(null);
  if (error) {
    Alert.alert("Couldn't share", error);
  }
}
```

- [ ] **Step 5: Update ProgressCalendar prop + render ShareWinPrompt**

In the JSX, change the `ProgressCalendar` `onSaveMilestone` prop from `addMilestone` to `handleSaveMilestone`:
```tsx
<ProgressCalendar
  milestones={milestones}
  measurements={measurements}
  onSaveMilestone={handleSaveMilestone}   // <-- was: addMilestone
  onDeleteMilestone={deleteMilestone}
  userId={session.user.id}
  surgeryDate={surgeryDate}
/>
```

And render `ShareWinPrompt` alongside the existing modals (inside the `<>` fragment, before `<LogRomSheet>`):
```tsx
<ShareWinPrompt
  visible={!!pendingShareWin}
  winTitle={pendingShareWin ?? ""}
  onShare={handleShareWin}
  onSkip={() => setPendingShareWin(null)}
/>
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 7: Run all tests**

```bash
npx jest --no-coverage
```
Expected: all passing

- [ ] **Step 8: Commit**

```bash
git add "app/(tabs)/progress.tsx"
git commit -m "feat: wire ShareWinPrompt into progress screen after win save"
```

---

## Chunk 5: E2E verification

### Task 6: Playwright E2E test

**Files:**
- Create: `e2e/03-share-win-community.spec.ts`

The app runs on web via Expo (`http://localhost:8081`). Playwright tests sign in and interact with the UI. Follow the pattern from `e2e/01-phase-overview-modal.spec.ts`.

- [ ] **Step 1: Ensure the dev server is running**

```bash
npx expo start --web
```
Expected: app accessible at `http://localhost:8081`

- [ ] **Step 2: Create the E2E test file**

```ts
// e2e/03-share-win-community.spec.ts
import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:8081";

async function signIn(page: import("@playwright/test").Page) {
  await page.goto(`${BASE_URL}/(auth)/sign-in`);
  await page.waitForLoadState("networkidle");
  await page.getByPlaceholder(/email/i).fill(process.env.TEST_USER_EMAIL!);
  await page.getByPlaceholder(/password/i).fill(process.env.TEST_USER_PASSWORD!);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/tabs/);
}

test.describe("Share win as community post", () => {
  test("ShareWinPrompt appears after saving a win and can be skipped", async ({ page }) => {
    await signIn(page);

    // Navigate to Progress tab
    await page.getByRole("tab", { name: /progress/i }).click();
    await page.waitForLoadState("networkidle");

    // Open milestone sheet and select Win
    await page.getByText(/add to timeline/i).click().catch(() =>
      page.getByRole("button", { name: /add/i }).click()
    );
    await page.getByText("Win").click();
    await page.getByPlaceholder(/what happened/i).fill("E2E Test Win");
    await page.getByRole("button", { name: /save/i }).click();

    // ShareWinPrompt should appear
    await expect(page.getByText(/celebrate your win/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("E2E Test Win")).toBeVisible();

    // Skip it
    await page.getByText(/skip/i).click();
    await expect(page.getByText(/celebrate your win/i)).not.toBeVisible();

    await page.screenshot({ path: "artifacts/share-win-skip.png" });
  });

  test("Sharing a win creates a community post with Win badge", async ({ page }) => {
    await signIn(page);

    await page.getByRole("tab", { name: /progress/i }).click();
    await page.waitForLoadState("networkidle");

    // Add a win
    await page.getByText(/add to timeline/i).click().catch(() =>
      page.getByRole("button", { name: /add/i }).click()
    );
    await page.getByText("Win").click();
    const winTitle = `E2E Shared Win ${Date.now()}`;
    await page.getByPlaceholder(/what happened/i).fill(winTitle);
    await page.getByRole("button", { name: /save/i }).click();

    // Fill message and share
    await expect(page.getByText(/celebrate your win/i)).toBeVisible({ timeout: 5000 });
    await page.getByPlaceholder(/add a message/i).fill("Feeling great!");
    await page.getByRole("button", { name: /share with community/i }).click();
    await expect(page.getByText(/celebrate your win/i)).not.toBeVisible({ timeout: 5000 });

    // Navigate to community and verify post
    await page.getByRole("tab", { name: /community/i }).click();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(winTitle)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Win").first()).toBeVisible();

    await page.screenshot({ path: "artifacts/share-win-community-post.png" });
  });

  test("Saving a milestone does NOT trigger ShareWinPrompt", async ({ page }) => {
    await signIn(page);

    await page.getByRole("tab", { name: /progress/i }).click();
    await page.waitForLoadState("networkidle");

    await page.getByText(/add to timeline/i).click().catch(() =>
      page.getByRole("button", { name: /add/i }).click()
    );
    await page.getByText("Milestone").click();
    await page.getByPlaceholder(/describe the milestone/i).fill("E2E Milestone");
    await page.getByRole("button", { name: /save/i }).click();

    // Prompt should NOT appear
    await expect(page.getByText(/celebrate your win/i)).not.toBeVisible({ timeout: 3000 });

    await page.screenshot({ path: "artifacts/milestone-no-prompt.png" });
  });
});
```

- [ ] **Step 3: Run the E2E tests**

```bash
npx playwright test e2e/03-share-win-community.spec.ts --reporter=list
```
Expected: 3 tests pass. Screenshots saved to `artifacts/`.

- [ ] **Step 4: Commit**

```bash
git add "e2e/03-share-win-community.spec.ts"
git commit -m "test: add E2E tests for share-win community post flow"
```
