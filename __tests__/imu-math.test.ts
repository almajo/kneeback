import {
  computeFlexionAngle,
  computeKneeFlexion,
  computeStdDev,
  isValidSample,
} from "@/lib/imu-math";

describe("computeFlexionAngle", () => {
  it("returns 0 when current vector equals calibration vector", () => {
    expect(computeFlexionAngle(0, 0, -1, 0, 0, -1)).toBe(0);
  });

  it("returns ~90 when phone tilts 90° from flat calibration", () => {
    // Calibrated flat (z = -1), now vertical along Y axis
    expect(computeFlexionAngle(0, 0, -1, 0, -1, 0)).toBeCloseTo(90, 0);
  });

  it("returns ~90 when phone tilts 90° from flat calibration via X axis", () => {
    // Axis-independent: also works when X is the shin axis
    expect(computeFlexionAngle(0, 0, -1, -1, 0, 0)).toBeCloseTo(90, 0);
  });

  it("returns ~45 when tilted 45° from calibration", () => {
    const v = 1 / Math.sqrt(2);
    // Calibrated flat, now tilted 45° in the Y-Z plane
    expect(computeFlexionAngle(0, 0, -1, 0, -v, -v)).toBeCloseTo(45, 0);
  });

  it("returns 0 when vectors are zero-magnitude (guard clause)", () => {
    expect(computeFlexionAngle(0, 0, 0, 0, 0, -1)).toBe(0);
    expect(computeFlexionAngle(0, 0, -1, 0, 0, 0)).toBe(0);
  });

  it("returns ~120 for a large flexion", () => {
    // 120° tilt: cos(120°) = -0.5
    // Calibrated flat (0,0,-1), rotate 120° in Y-Z plane
    const angle = (120 * Math.PI) / 180;
    const currY = Math.sin(angle);
    const currZ = -Math.cos(angle);
    expect(computeFlexionAngle(0, 0, -1, 0, currY, currZ)).toBeCloseTo(120, 0);
  });
});

describe("computeKneeFlexion", () => {
  it("returns shin angle unchanged when thigh is flat (0°)", () => {
    expect(computeKneeFlexion(90, 0)).toBe(90);
  });

  it("subtracts thigh elevation from shin angle", () => {
    // Shin moved 90°, thigh moved 30° — knee actually bent 60°
    expect(computeKneeFlexion(90, 30)).toBe(60);
  });

  it("clamps to 0 when thigh moved more than shin", () => {
    // Thigh compensated more than the shin tilted — impossible anatomically, clamp to 0
    expect(computeKneeFlexion(40, 50)).toBe(0);
  });

  it("returns 0 for both angles 0", () => {
    expect(computeKneeFlexion(0, 0)).toBe(0);
  });
});

describe("computeStdDev", () => {
  it("returns 0 for an empty array", () => {
    expect(computeStdDev([])).toBe(0);
  });

  it("returns 0 for identical values", () => {
    expect(computeStdDev([5, 5, 5, 5])).toBe(0);
  });

  it("computes correctly for known values", () => {
    // population std dev of [2,4,4,4,5,5,7,9] = 2
    expect(computeStdDev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2, 1);
  });
});

describe("isValidSample", () => {
  it("returns true for a clean gravity reading (flat phone)", () => {
    expect(isValidSample(0, 0, -1)).toBe(true);
  });

  it("returns true when magnitude is within 0.05 of 1.0", () => {
    expect(isValidSample(0, 0, -1.04)).toBe(true);
  });

  it("returns false when magnitude is too large (phone shaking)", () => {
    expect(isValidSample(1, 1, 1)).toBe(false); // magnitude = sqrt(3) ≈ 1.73
  });

  it("returns false when magnitude is too small", () => {
    expect(isValidSample(0, 0, -0.5)).toBe(false);
  });
});
