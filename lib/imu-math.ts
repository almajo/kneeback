/**
 * Returns the pitch angle of the phone in degrees.
 * The phone lies flat on the shin with its long axis (x) along the shin bone.
 * Values are in g-force units as returned by expo-sensors Accelerometer.
 *
 * Returns 0 when flat, positive when the shin-end tilts upward (knee bending).
 */
export function computePitch(x: number, y: number, z: number): number {
  return (Math.atan2(x, Math.sqrt(y * y + z * z)) * 180) / Math.PI;
}

/**
 * Returns the flexion angle in whole degrees relative to the calibrated
 * reference (the patient's own full-extension baseline).
 */
export function computeFlexion(
  currentPitch: number,
  referenceAngle: number
): number {
  return Math.round(currentPitch - referenceAngle);
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
