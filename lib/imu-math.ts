/**
 * Returns the angle in degrees between the current gravity vector and the
 * calibration gravity vector captured at full extension.
 *
 * Using the dot-product removes all axis assumptions — the result is correct
 * regardless of which physical axis runs along the shin or how the phone is
 * rotated in the user's hand.  A flat phone at the calibrated position returns
 * 0°; a 90° knee bend returns ~90°.
 *
 * Values are in g-force units as returned by expo-sensors Accelerometer.
 */
export function computeFlexionAngle(
  calibX: number,
  calibY: number,
  calibZ: number,
  currX: number,
  currY: number,
  currZ: number
): number {
  const dot = calibX * currX + calibY * currY + calibZ * currZ;
  const magCalib = Math.sqrt(calibX ** 2 + calibY ** 2 + calibZ ** 2);
  const magCurr = Math.sqrt(currX ** 2 + currY ** 2 + currZ ** 2);
  if (magCalib < 0.01 || magCurr < 0.01) return 0;
  const cosAngle = Math.max(-1, Math.min(1, dot / (magCalib * magCurr)));
  return Math.round((Math.acos(cosAngle) * 180) / Math.PI);
}

/**
 * Returns the true knee flexion angle by adding the shin and thigh angles.
 *
 * Both angles are measured from their respective calibration positions (full
 * extension, lying flat). When the knee bends, the shin and thigh rotate in
 * OPPOSITE absolute directions relative to gravity:
 *   - shin rises (or falls) away from horizontal  → +shinAngle
 *   - thigh moves the opposite way (brace coupling) → +thighAngle
 *
 * Adding them gives the total relative angle between the two segments.
 * When the thigh stays flat (thighAngle = 0), the result equals shinAngle alone.
 */
export function computeKneeFlexion(shinAngle: number, thighAngle: number): number {
  return shinAngle + thighAngle;
}

/**
 * Returns the population standard deviation of an array of numbers.
 * Returns 0 for empty arrays.
 */
export function computeStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Returns true if the sample is from a stationary phone.
 * A still phone has magnitude ≈ 1.0 g. Samples deviating by more
 * than 0.05 g indicate the phone is being moved.
 */
export function isValidSample(x: number, y: number, z: number): boolean {
  const magnitude = Math.sqrt(x * x + y * y + z * z);
  return Math.abs(magnitude - 1.0) <= 0.05;
}
