import {
  computePitch,
  computeFlexion,
  computeStdDev,
  isValidSample,
} from "@/lib/imu-math";

describe("computePitch", () => {
  it("returns ~0 when phone is flat (x=0, z=-1)", () => {
    expect(computePitch(0, 0, -1)).toBeCloseTo(0, 1);
  });

  it("returns ~90 when phone is vertical (x=1, z=0)", () => {
    expect(computePitch(1, 0, 0)).toBeCloseTo(90, 1);
  });

  it("returns ~45 at a 45-degree tilt", () => {
    const v = 1 / Math.sqrt(2);
    expect(computePitch(v, 0, -v)).toBeCloseTo(45, 1);
  });

  it("is negative when tilted the other way", () => {
    const v = 1 / Math.sqrt(2);
    expect(computePitch(-v, 0, -v)).toBeCloseTo(-45, 1);
  });
});

describe("computeFlexion", () => {
  it("returns 0 when at reference angle", () => {
    expect(computeFlexion(5.2, 5.2)).toBe(0);
  });

  it("returns positive rounded delta for a bent knee", () => {
    expect(computeFlexion(112.7, 5.2)).toBe(108);
  });

  it("rounds halves up", () => {
    expect(computeFlexion(100.5, 0)).toBe(101);
    expect(computeFlexion(100.4, 0)).toBe(100);
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
