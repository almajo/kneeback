// e2e/03-share-win-community.spec.ts
import { test, expect } from "@playwright/test";
import { E2E_TEST_USER } from "./support/test-accounts";

const BASE_URL = "http://localhost:8081";

async function signIn(page: import("@playwright/test").Page) {
  await page.goto(`${BASE_URL}/(auth)/sign-in`);
  await page.waitForLoadState("networkidle");
  await page.locator('input[placeholder="Email"]').fill(E2E_TEST_USER.email);
  await page.locator('input[placeholder="Password"]').fill(E2E_TEST_USER.password);
  await page.getByText("Sign In").click();
  await page.waitForURL(/today|progress|tabs/, { timeout: 20_000 });
  // Dismiss the phase overview modal if it appears
  await page.getByText("Got it, let's go").click({ timeout: 4000 }).catch(() => {});
}

async function openWinSheet(page: import("@playwright/test").Page) {
  await page.getByRole("tab", { name: /progress/i }).click();
  await page.waitForLoadState("networkidle");
  await page.getByText("+ Add").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Add to Timeline")).toBeVisible({ timeout: 3000 });
  await dialog.getByText("Win").click();
  await expect(page.getByPlaceholder(/Put socks/i)).toBeVisible({ timeout: 3000 });
}

test.describe("Share win as community post", () => {
  test("ShareWinPrompt appears after saving a win and can be skipped", async ({ page }) => {
    await signIn(page);
    await openWinSheet(page);

    await page.getByPlaceholder(/Put socks/i).fill("E2E Test Win");
    await page.getByText("Save").click();

    // ShareWinPrompt should appear
    await expect(page.getByText(/celebrate your win/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("E2E Test Win").first()).toBeVisible();

    // Skip it
    await page.getByText("Skip").click();
    await expect(page.getByText(/celebrate your win/i)).not.toBeVisible({ timeout: 3000 });

    await page.screenshot({ path: "artifacts/share-win-skip.png" });
  });

  test("Sharing a win creates a community post with Win badge", async ({ page }) => {
    await signIn(page);
    await openWinSheet(page);

    const winTitle = `E2E Shared Win ${Date.now()}`;
    await page.getByPlaceholder(/Put socks/i).fill(winTitle);
    await page.getByText("Save").click();

    // Fill message and share
    await expect(page.getByText(/celebrate your win/i)).toBeVisible({ timeout: 5000 });
    await page.getByPlaceholder(/Add a message/i).fill("Feeling great!");
    await page.getByText("Share with Community").click();
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

    await page.getByText("+ Add").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Add to Timeline")).toBeVisible({ timeout: 3000 });
    await dialog.getByText("Milestone").click();
    await page.getByPlaceholder(/describe the milestone/i).fill("E2E Milestone");
    await page.getByText("Save").click();

    // Prompt should NOT appear
    await expect(page.getByText(/celebrate your win/i)).not.toBeVisible({ timeout: 3000 });

    await page.screenshot({ path: "artifacts/milestone-no-prompt.png" });
  });
});
