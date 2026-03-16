/**
 * E2E: Phase Gate Card on the Progress Tab
 *
 * Covers:
 *  - PhaseGateCard is visible on the Progress tab
 *  - Progress bar and "X of Y criteria met" count display correctly
 *  - Tapping "View details →" opens the PhaseGateDetail bottom sheet
 *  - Bottom sheet shows the criteria list, source citation, disclaimer, and 24h tip
 *  - Closing the bottom sheet hides the sheet
 *  - Pre-surgery user sees PrehabilationCard instead of gate cards
 */

import { test, expect, Page } from "@playwright/test";
import { ProgressTab, SignInPage } from "./support/page-objects";

const BASE_URL = "http://localhost:8081";

async function signIn(page: Page, email: string, password: string) {
  const signIn = new SignInPage(page);
  await page.goto(`${BASE_URL}/(auth)/sign-in`);
  await page.waitForLoadState("networkidle");
  await signIn.emailInput.fill(email);
  await signIn.passwordInput.fill(password);
  await signIn.signInButton.click();
  await page.waitForURL(
    (url) =>
      !url.pathname.includes("sign-in") &&
      !url.pathname.includes("sign-up"),
    { timeout: 20_000 }
  );
}

// ---------------------------------------------------------------------------
// Tests: Post-surgery user
// ---------------------------------------------------------------------------

test.describe("Phase Gate Card — post-surgery user", () => {
  test.beforeEach(async ({ page }) => {
    const email = process.env.E2E_TEST_EMAIL ?? "e2e-test@kneeback.app";
    const password = process.env.E2E_TEST_PASSWORD ?? "KneeTest123!";
    await signIn(page, email, password);
  });

  test("Progress tab shows Phase Gate card with criteria count", async ({ page }) => {
    const progress = new ProgressTab(page);
    await progress.navigateTo();
    await progress.screenshot("phase-gate-card-01-progress-tab");

    // The "Phase Gate" label is the section header in GateCard
    await expect(progress.phaseGateCardLabel).toBeVisible();

    // Criteria met text in form "N of M criteria met"
    await expect(progress.criteriaMet).toBeVisible();
    await progress.screenshot("phase-gate-card-02-criteria-count");
  });

  test("View details link opens PhaseGateDetail bottom sheet", async ({ page }) => {
    const progress = new ProgressTab(page);
    await progress.navigateTo();

    // Tap "View details →"
    await progress.openViewDetails();
    await progress.screenshot("phase-gate-card-03-detail-sheet-open");

    // Disclaimer banner
    await expect(page.getByText(/Not medical advice/i)).toBeVisible();

    // Criteria section header
    await expect(page.getByText("Criteria").first()).toBeVisible();

    // Source citation should appear in the sheet header
    await expect(
      page.getByText(/Rambaud|Buckthorpe|Grindem/i).first()
    ).toBeVisible();
  });

  test("PhaseGateDetail shows 24h/48h soreness rule tip", async ({ page }) => {
    const progress = new ProgressTab(page);
    await progress.navigateTo();
    await progress.openViewDetails();

    await expect(page.getByText("24h / 48h Soreness Rule")).toBeVisible();
    await progress.screenshot("phase-gate-card-04-soreness-tip");
  });

  test("PhaseGateDetail shows progress summary bar", async ({ page }) => {
    const progress = new ProgressTab(page);
    await progress.navigateTo();
    await progress.openViewDetails();

    // The summary section has "N of M criteria met" and a percentage
    await expect(page.getByText(/\d+ of \d+ criteria met/).first()).toBeVisible();
    await expect(page.getByText(/%$/).first()).toBeVisible();

    await progress.screenshot("phase-gate-card-05-progress-summary");
  });

  test("Closing PhaseGateDetail hides the sheet", async ({ page }) => {
    const progress = new ProgressTab(page);
    await progress.navigateTo();
    await progress.openViewDetails();

    // Press Escape to close (web modal pattern)
    await page.keyboard.press("Escape");

    await expect(page.getByText(/Not medical advice/i)).not.toBeVisible({
      timeout: 5_000,
    });
    await progress.screenshot("phase-gate-card-06-detail-closed");
  });

  test("All actionable gate cards are shown (gates 3, 4, 5)", async ({ page }) => {
    const progress = new ProgressTab(page);
    await progress.navigateTo();

    // There are 3 actionable gates. Each has a "View details" link.
    const viewDetailsLinks = page.getByText(/View details/i);
    await expect(viewDetailsLinks).toHaveCount(3);

    await progress.screenshot("phase-gate-card-07-all-gate-cards");
  });

  test("Gate card source citations are visible", async ({ page }) => {
    const progress = new ProgressTab(page);
    await progress.navigateTo();

    // Source references in gate cards
    await expect(page.getByText(/Source:/i).first()).toBeVisible();
    await progress.screenshot("phase-gate-card-08-source-citations");
  });
});

// ---------------------------------------------------------------------------
// Tests: Pre-surgery user
// ---------------------------------------------------------------------------

test.describe("Phase Gate Card — pre-surgery user", () => {
  test.beforeEach(async ({ page }) => {
    const email =
      process.env.E2E_PRE_SURGERY_EMAIL ?? "e2e-presurgery@kneeback.app";
    const password = process.env.E2E_TEST_PASSWORD ?? "KneeTest123!";
    await signIn(page, email, password);
  });

  test("Pre-surgery user sees Prehabilitation card instead of gate cards", async ({ page }) => {
    const progress = new ProgressTab(page);
    await progress.navigateTo();
    await progress.screenshot("phase-gate-card-09-presurgery-prehab");

    // PrehabilationCard shows "Prepare for Surgery"
    await expect(
      page.getByText("Prepare for Surgery")
    ).toBeVisible();

    // Should NOT show any "View details" links (no gates for prehab)
    await expect(page.getByText(/View details/i)).not.toBeVisible();

    // Phase label "Prehabilitation Phase" badge should be visible
    await expect(page.getByText("Prehabilitation Phase")).toBeVisible();
  });

  test("Pre-surgery prehab card shows correct week range", async ({ page }) => {
    const progress = new ProgressTab(page);
    await progress.navigateTo();

    await expect(page.getByText("Pre-Surgery")).toBeVisible();
  });
});
