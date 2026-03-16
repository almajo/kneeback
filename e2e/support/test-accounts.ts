/**
 * Deterministic test account credentials for E2E tests.
 *
 * These accounts must already exist in the Supabase staging environment
 * (or local dev) with the matching surgery_date rows in the profiles table.
 *
 * To bootstrap: run scripts/seed-e2e-accounts.ts (see that file for details).
 */

export const TEST_EMAIL_DOMAIN = "e2e-kneeback.invalid";

/** A freshly onboarded user — has NOT seen the phase overview modal. */
export const NEW_USER = {
  email: `new-user@${TEST_EMAIL_DOMAIN}`,
  password: "Test1234!",
};

/**
 * Post-surgery user at day 100 (week 15).
 * Phase: advanced_strengthening (unlocks at day 84).
 * Gate 3 (strengthening → advanced_strengthening) should have some unmet criteria.
 */
export const POST_SURGERY_DAY_100 = {
  email: `day100@${TEST_EMAIL_DOMAIN}`,
  password: "Test1234!",
  /** Today − 100 days, formatted YYYY-MM-DD */
  surgeryDate: dateOffset(-100),
  expectedPhase: "Advanced Strengthening",
  expectedPhaseKey: "advanced_strengthening",
};

/**
 * Post-surgery user at day 1.
 * Phase: acute (just had surgery).
 */
export const POST_SURGERY_DAY_1 = {
  email: `day1@${TEST_EMAIL_DOMAIN}`,
  password: "Test1234!",
  surgeryDate: dateOffset(-1),
  expectedPhase: "Immediate Post-Op",
  expectedPhaseKey: "acute",
};

/**
 * Pre-surgery user — surgery is 14 days in the future.
 * Phase: prehab. All post-surgery phases locked.
 */
export const PRE_SURGERY_USER = {
  email: `presurgery@${TEST_EMAIL_DOMAIN}`,
  password: "Test1234!",
  surgeryDate: dateOffset(14),
  daysUntilSurgery: 14,
  expectedPhase: "Prehabilitation",
  expectedPhaseKey: "prehab",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return today ± offsetDays as YYYY-MM-DD */
export function dateOffset(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
}
