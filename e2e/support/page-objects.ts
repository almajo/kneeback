/**
 * Page Object Model helpers for Kneeback E2E tests.
 *
 * Each class wraps a logical UI surface and exposes semantic actions / assertions
 * so individual test files stay focused on behaviour, not selector details.
 */

import { Page, Locator, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Base
// ---------------------------------------------------------------------------

export class BasePage {
  constructor(protected page: Page) {}

  async screenshot(name: string) {
    await this.page.screenshot({
      path: `artifacts/${name}.png`,
      fullPage: true,
    });
  }

  async waitForNetworkIdle() {
    await this.page.waitForLoadState("networkidle");
  }
}

// ---------------------------------------------------------------------------
// Auth pages
// ---------------------------------------------------------------------------

export class SignInPage extends BasePage {
  get emailInput(): Locator {
    return this.page.locator('input[placeholder="Email"]').first();
  }

  get passwordInput(): Locator {
    return this.page.locator('input[placeholder="Password"]').first();
  }

  get signInButton(): Locator {
    return this.page.getByRole("button", { name: "Sign In" });
  }

  get errorMessage(): Locator {
    return this.page.locator("text=/invalid|error|incorrect/i");
  }

  async signIn(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
    // Wait for navigation away from sign-in page
    await this.page.waitForURL((url) => !url.pathname.includes("sign-in"), {
      timeout: 20_000,
    });
  }
}

export class SignUpPage extends BasePage {
  get emailInput(): Locator {
    return this.page.locator('input[placeholder="Email"]').first();
  }

  get passwordInput(): Locator {
    return this.page.locator('input[placeholder*="Password"]').first();
  }

  get createAccountButton(): Locator {
    return this.page.getByRole("button", { name: "Create Account" });
  }

  get signInLink(): Locator {
    return this.page.getByText("Sign In");
  }

  get privacyPolicyLink(): Locator {
    return this.page.getByText("Privacy Policy").first();
  }

  async fillAndSubmit(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.createAccountButton.click();
  }
}

// ---------------------------------------------------------------------------
// Onboarding pages
// ---------------------------------------------------------------------------

export class SurgeryDetailsPage extends BasePage {
  get nameInput(): Locator {
    return this.page.locator('input[placeholder="First name"]');
  }

  get usernameInput(): Locator {
    return this.page.locator('input[placeholder="Your username"]');
  }

  get surgeryDateInput(): Locator {
    return this.page.locator('input[type="date"]');
  }

  get dateNotSetCheckbox(): Locator {
    return this.page.getByText("I don't have a surgery date yet");
  }

  get patellarButton(): Locator {
    return this.page.getByRole("button", { name: "Patellar" });
  }

  get hamstringButton(): Locator {
    return this.page.getByRole("button", { name: "Hamstring" });
  }

  get leftKneeButton(): Locator {
    return this.page.getByRole("button", { name: "Left" });
  }

  get rightKneeButton(): Locator {
    return this.page.getByRole("button", { name: "Right" });
  }

  get nextButton(): Locator {
    return this.page.getByRole("button", { name: /Next/i });
  }

  async fillSurgeryDetailsPostSurgery(opts: {
    name: string;
    username: string;
    surgeryDate: string; // YYYY-MM-DD
    graft?: string;
    knee?: string;
  }) {
    await this.nameInput.fill(opts.name);
    await this.usernameInput.fill(opts.username);
    await this.surgeryDateInput.fill(opts.surgeryDate);

    const graft = opts.graft ?? "Patellar";
    await this.page.getByRole("button", { name: graft }).click();

    const knee = opts.knee ?? "Right";
    await this.page.getByRole("button", { name: knee }).click();

    await this.nextButton.click();
  }

  async fillSurgeryDetailsPreSurgery(opts: {
    name: string;
    username: string;
    futureSurgeryDate: string; // YYYY-MM-DD
  }) {
    await this.nameInput.fill(opts.name);
    await this.usernameInput.fill(opts.username);
    await this.surgeryDateInput.fill(opts.futureSurgeryDate);
    await this.patellarButton.click();
    await this.rightKneeButton.click();
    await this.nextButton.click();
  }

  async fillWithNoDate(opts: { name: string; username: string }) {
    await this.nameInput.fill(opts.name);
    await this.usernameInput.fill(opts.username);
    await this.dateNotSetCheckbox.click();
    await this.patellarButton.click();
    await this.rightKneeButton.click();
    await this.nextButton.click();
  }
}

// ---------------------------------------------------------------------------
// Phase Overview Modal
// ---------------------------------------------------------------------------

export class PhaseOverviewModal extends BasePage {
  get modal(): Locator {
    return this.page.getByText("Your Recovery is Built on Research");
  }

  get dismissButton(): Locator {
    return this.page.getByRole("button", { name: /Got it/i });
  }

  get allPhaseLabels(): Locator {
    return this.page.locator("text=Immediate Post-Op");
  }

  async isVisible(): Promise<boolean> {
    return this.modal.isVisible();
  }

  async waitForVisible() {
    await expect(this.modal).toBeVisible({ timeout: 10_000 });
  }

  async dismiss() {
    await this.dismissButton.click();
    await expect(this.modal).not.toBeVisible({ timeout: 5_000 });
  }

  async assertResearchCitations() {
    await expect(this.page.getByText("Grindem et al., 2016")).toBeVisible();
    await expect(this.page.getByText("Kyritsis et al., 2016")).toBeVisible();
  }

  async assertAllSixPhases() {
    const expectedPhases = [
      "Prehabilitation",
      "Immediate Post-Op",
      "Early Rehabilitation",
      "Progressive Strengthening",
      "Advanced Strengthening",
      "Return to Sport",
    ];
    for (const phase of expectedPhases) {
      await expect(this.page.getByText(phase).first()).toBeVisible();
    }
  }

  async assertStatCards() {
    await expect(this.page.getByText("51%")).toBeVisible();
    await expect(this.page.getByText("4×")).toBeVisible();
  }
}

// ---------------------------------------------------------------------------
// Today tab
// ---------------------------------------------------------------------------

export class TodayTab extends BasePage {
  get tab(): Locator {
    return this.page.getByRole("tab", { name: /today|home/i });
  }

  get dayHeader(): Locator {
    return this.page.getByText(/Day \d+/);
  }

  get preSurgeryCountdown(): Locator {
    return this.page.getByText(/days until surgery/i);
  }

  get preSurgeryBadge(): Locator {
    return this.page.getByText("Pre-Surgery");
  }

  get phaseBadge(): Locator {
    // Phase badge appears inside the day header row
    return this.page.locator("text=/Prehabilitation|Immediate Post-Op|Early Rehabilitation|Progressive Strengthening|Advanced Strengthening|Return to Sport/").first();
  }

  get editExercisesButton(): Locator {
    return this.page.getByRole("button", { name: /Edit Exercises/i });
  }

  async navigateTo() {
    // Click the Today tab in the bottom navigation
    const todayTab = this.page
      .locator('[role="tab"]')
      .filter({ hasText: /today/i });
    if (await todayTab.isVisible()) {
      await todayTab.click();
    }
    // Otherwise we're already on today (default route)
  }

  async assertPhaseLabel(expectedPhase: string) {
    await expect(this.page.getByText(expectedPhase).first()).toBeVisible();
  }

  async assertPreSurgeryDisplay(daysUntil: number) {
    await expect(
      this.page.getByText(
        daysUntil === 1 ? "day until surgery" : "days until surgery"
      )
    ).toBeVisible();
  }
}

// ---------------------------------------------------------------------------
// Progress tab
// ---------------------------------------------------------------------------

export class ProgressTab extends BasePage {
  async navigateTo() {
    const tab = this.page
      .locator('[role="tab"]')
      .filter({ hasText: /progress/i });
    if (await tab.isVisible()) {
      await tab.click();
    } else {
      await this.page.goto("http://localhost:8081/(tabs)/progress");
    }
    await this.page.waitForLoadState("networkidle");
  }

  // --- Phase Gate Card ---

  get phaseGateCardLabel(): Locator {
    return this.page.getByText("Phase Gate").first();
  }

  get prehabilationCard(): Locator {
    return this.page.getByText("Prepare for Surgery");
  }

  get viewDetailsLink(): Locator {
    return this.page.getByText(/View details/i).first();
  }

  get criteriaMet(): Locator {
    // "X of Y criteria met" text
    return this.page.getByText(/\d+ of \d+ criteria met/);
  }

  get completeBadge(): Locator {
    return this.page.getByText("Complete").first();
  }

  // --- Phase Gate Detail sheet ---

  get gateDetailSheet(): Locator {
    return this.page.getByText(/Not medical advice/i);
  }

  get closeDetailButton(): Locator {
    return this.page
      .locator('[aria-label="close"], button')
      .filter({ hasText: /close/i })
      .or(this.page.locator('[name="close"]'))
      .first();
  }

  get criteriaList(): Locator {
    return this.page.getByText("Criteria").first();
  }

  get soreness24hTip(): Locator {
    return this.page.getByText("24h / 48h Soreness Rule");
  }

  async openViewDetails() {
    await this.viewDetailsLink.click();
    await expect(this.gateDetailSheet).toBeVisible({ timeout: 8_000 });
  }

  async assertCriteriaCount(met: number, total: number) {
    await expect(
      this.page.getByText(`${met} of ${total} criteria met`)
    ).toBeVisible();
  }

  async assertGateCriteriaVisible() {
    await expect(this.criteriaList).toBeVisible();
  }

  async closeDetail() {
    // The close button is an Ionicons "close" icon; look for the X button in the modal header
    const closeBtn = this.page
      .locator("button, [role=button]")
      .filter({ has: this.page.locator('[name="close"], [aria-label="close"]') })
      .first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    } else {
      // Fallback: press Escape
      await this.page.keyboard.press("Escape");
    }
    await expect(this.gateDetailSheet).not.toBeVisible({ timeout: 5_000 });
  }
}

// ---------------------------------------------------------------------------
// Exercise Picker
// ---------------------------------------------------------------------------

export class ExercisePickerPage extends BasePage {
  async navigateTo() {
    await this.page.goto("http://localhost:8081/exercise-picker");
    await this.page.waitForLoadState("networkidle");
  }

  get searchInput(): Locator {
    return this.page.locator('input[placeholder*="Search"]');
  }

  get backButton(): Locator {
    return this.page.locator('[aria-label="back"], button').filter({ hasText: /back/i }).first();
  }

  // Gate warning modal elements
  get gateWarningModal(): Locator {
    return this.page.getByText("Research Advisory");
  }

  get notYetButton(): Locator {
    return this.page.getByRole("button", { name: "Not yet" });
  }

  get addAnywayButton(): Locator {
    return this.page.getByRole("button", { name: /I understand, add anyway/i });
  }

  get unmetCriteriaSection(): Locator {
    return this.page.getByText("Criteria not yet confirmed:");
  }

  // Phase section headers
  phaseSection(label: string): Locator {
    return this.page.getByText(label).first();
  }

  get advancedStrengtheningSection(): Locator {
    return this.page.getByText("Advanced Strengthening").first();
  }

  get returnToSportSection(): Locator {
    return this.page.getByText("Return to Sport").first();
  }

  async assertGateWarningVisible() {
    await expect(this.gateWarningModal).toBeVisible({ timeout: 8_000 });
  }

  async dismissWithNotYet() {
    await this.notYetButton.click();
    await expect(this.gateWarningModal).not.toBeVisible({ timeout: 5_000 });
  }

  async addDespiteWarning() {
    await this.addAnywayButton.click();
    await expect(this.gateWarningModal).not.toBeVisible({ timeout: 5_000 });
  }
}
