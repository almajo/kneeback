/**
 * E2E: Phase Overview Modal
 *
 * Covers:
 *  - Modal appears once after onboarding (AsyncStorage flag not yet set)
 *  - Modal contains all 6 phases in the correct order
 *  - Research citations (Grindem 2016, Kyritsis 2016) are visible
 *  - Dismissing the modal sets the AsyncStorage flag
 *  - On subsequent navigation the modal does NOT reappear
 */

import { test, expect, Page } from "@playwright/test";
import { SignInPage, PhaseOverviewModal, TodayTab } from "./support/page-objects";

const BASE_URL = "http://localhost:8081";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Clear the phase-overview-seen flag so the modal will show for this browser session. */
async function clearPhaseOverviewFlag(page: Page) {
  await page.evaluate(() => {
    window.localStorage.removeItem("has_seen_phase_overview");
    // AsyncStorage on web delegates to localStorage
    try {
      window.localStorage.removeItem("@AsyncStorage:has_seen_phase_overview");
    } catch {
      /* ignore */
    }
  });
}

/** Sign in with test credentials for a user that already exists in staging. */
async function signInAsTestUser(page: Page) {
  const signIn = new SignInPage(page);
  await page.goto(`${BASE_URL}/(auth)/sign-in`);
  await page.waitForLoadState("networkidle");

  // Use env vars so credentials are never hardcoded in CI
  const email = process.env.E2E_TEST_EMAIL ?? "e2e-test@kneeback.app";
  const password = process.env.E2E_TEST_PASSWORD ?? "KneeTest123!";

  await signIn.emailInput.fill(email);
  await signIn.passwordInput.fill(password);
  await signIn.signInButton.click();

  // Wait until we are on the Today tab (or the intro)
  await page.waitForURL(
    (url) =>
      url.pathname.includes("today") ||
      url.pathname.includes("intro") ||
      url.pathname === "/" ||
      url.pathname.includes("tabs"),
    { timeout: 20_000 }
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Phase Overview Modal", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState("domcontentloaded");
  });

  test("modal appears on first load (flag cleared) and shows all 6 phases", async ({ page }) => {
    await signInAsTestUser(page);
    await clearPhaseOverviewFlag(page);

    // Reload to trigger the effect that reads the flag
    await page.reload();
    await page.waitForLoadState("networkidle");

    const modal = new PhaseOverviewModal(page);

    await modal.waitForVisible();
    await modal.screenshot("phase-gate-01-modal-visible");

    // Header copy
    await expect(
      page.getByText("Your Recovery is Built on Research")
    ).toBeVisible();

    // All 6 phases present in the timeline
    await modal.assertAllSixPhases();
    await modal.screenshot("phase-gate-02-all-phases");
  });

  test("modal shows research pull-quote stat cards", async ({ page }) => {
    await signInAsTestUser(page);
    await clearPhaseOverviewFlag(page);
    await page.reload();
    await page.waitForLoadState("networkidle");

    const modal = new PhaseOverviewModal(page);
    await modal.waitForVisible();

    // Stat numbers
    await expect(page.getByText("51%")).toBeVisible();
    await expect(page.getByText("4×")).toBeVisible();

    // Research citation sources
    await expect(page.getByText("Grindem et al., 2016")).toBeVisible();
    await expect(page.getByText("Kyritsis et al., 2016")).toBeVisible();

    await modal.screenshot("phase-gate-03-research-citations");
  });

  test("modal shows Gate criteria pills on phases 3-5", async ({ page }) => {
    await signInAsTestUser(page);
    await clearPhaseOverviewFlag(page);
    await page.reload();
    await page.waitForLoadState("networkidle");

    const modal = new PhaseOverviewModal(page);
    await modal.waitForVisible();

    // "Gate criteria" pill should appear for strengthening, advanced_strengthening, return_to_sport
    const gatePills = page.getByText("Gate criteria");
    await expect(gatePills.first()).toBeVisible();
    // There should be at least 3 gate-criteria pills (one per gated phase)
    await expect(gatePills).toHaveCount(3);

    await modal.screenshot("phase-gate-04-gate-pills");
  });

  test("dismissing modal stores flag and modal does not reappear", async ({ page }) => {
    await signInAsTestUser(page);
    await clearPhaseOverviewFlag(page);
    await page.reload();
    await page.waitForLoadState("networkidle");

    const modal = new PhaseOverviewModal(page);
    await modal.waitForVisible();

    // Dismiss
    await modal.dismiss();
    await modal.screenshot("phase-gate-05-modal-dismissed");

    // Verify the flag is now set in localStorage / AsyncStorage
    const flag = await page.evaluate(() => {
      return (
        window.localStorage.getItem("has_seen_phase_overview") ??
        window.localStorage.getItem("@AsyncStorage:has_seen_phase_overview")
      );
    });
    expect(flag).toBe("true");

    // Reload — modal should NOT reappear
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2_000); // allow the useEffect to run

    await expect(page.getByText("Your Recovery is Built on Research")).not.toBeVisible();
    await modal.screenshot("phase-gate-06-modal-not-shown-again");
  });

  test("modal footer note warns about medical guidance", async ({ page }) => {
    await signInAsTestUser(page);
    await clearPhaseOverviewFlag(page);
    await page.reload();
    await page.waitForLoadState("networkidle");

    const modal = new PhaseOverviewModal(page);
    await modal.waitForVisible();

    // Scroll to bottom to reveal footer note
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(
      page.getByText(/Always follow your surgeon.*physiotherapist.*guidance/i)
    ).toBeVisible({ timeout: 5_000 });
  });

  test("phase timeline shows correct week ranges", async ({ page }) => {
    await signInAsTestUser(page);
    await clearPhaseOverviewFlag(page);
    await page.reload();
    await page.waitForLoadState("networkidle");

    const modal = new PhaseOverviewModal(page);
    await modal.waitForVisible();

    const expectedWeekRanges = [
      "Pre-Surgery",
      "Weeks 0–2",
      "Weeks 2–6",
      "Weeks 6–12",
      "Months 3–6",
      "Months 6–9+",
    ];

    for (const range of expectedWeekRanges) {
      await expect(page.getByText(range).first()).toBeVisible();
    }
  });
});
