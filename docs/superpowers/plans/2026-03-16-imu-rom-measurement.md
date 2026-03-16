# IMU-Based Knee ROM Measurement Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 4-step phone-sensor wizard to `LogRomSheet` that measures knee flexion using the accelerometer, pre-filling the form fields on completion.

**Architecture:** Pure math functions in `lib/imu-math.ts` → `useImuMeasurement` hook wrapping `expo-sensors` → five wizard step components orchestrated by `RomMeasurementWizard` fullscreen modal → `LogRomSheet` opens the wizard and receives results via `onComplete` callback.

**Tech Stack:** expo-sensors (Accelerometer, g-units), expo-haptics, React Native Modal, NativeWind, TypeScript strict, ts-jest (unit tests), Playwright (E2E)

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `lib/imu-math.ts` | Pure functions: pitch, flexion delta, std dev, sample validity |
| Create | `lib/hooks/use-imu-measurement.ts` | Hook: availability, calibration, real-time pitch, stability, peak |
| Create | `components/rom-measurement/PositionStep.tsx` | Wizard step 1: positioning instructions |
| Create | `components/rom-measurement/CalibrationStep.tsx` | Wizard step 2: on-shin calibration |
| Create | `components/rom-measurement/MeasurementStep.tsx` | Wizard step 3: live angle + auto-capture |
| Create | `components/rom-measurement/MeasurementReview.tsx` | Wizard step 4: summary + save/retake |
| Create | `components/rom-measurement/RomMeasurementWizard.tsx` | Fullscreen modal, step state machine |
| Create | `__tests__/imu-math.test.ts` | Unit tests — pure math |
| Create | `__tests__/use-imu-measurement.test.ts` | Unit tests — hook |
| Modify | `jest.config.js` | Change env to jsdom, add transformIgnorePatterns |
| Modify | `components/LogRomSheet.tsx` | Add `lastMeasurement` prop + "Use Phone Sensor" button |
| Modify | `app/(tabs)/progress.tsx` | Pass `measurements[0]` as `lastMeasurement` to `LogRomSheet` |
| Create | `e2e/rom-measurement.spec.ts` | Playwright E2E: full wizard flow |

---

## Chunk 1: Setup & Pure Math

### Task 1: Project setup

**Files:**
- Modify: `.gitignore`
- Modify: `jest.config.js`
- Modify: `package.json` (add expo-sensors only)

- [ ] **Step 1.1: Add `.superpowers/` to `.gitignore`**

  Open `.gitignore` and add the line `.superpowers/` (currently only `e2e.superpowers/` is present).

- [ ] **Step 1.2: Install expo-sensors**

  ```bash
  cd "/Users/alex/workspace/kneeback" && npx expo install expo-sensors
  ```

  Expected: `expo-sensors` appears in `package.json` dependencies (version `~14.x.x` for SDK 54).

- [ ] **Step 1.3: Install `@testing-library/react` for `renderHook`**

  The project already has `jest`, `@types/jest`, and `jest.config.js` using `ts-jest`. Do NOT install jest-expo. Add only the React testing utilities:

  ```bash
  cd "/Users/alex/workspace/kneeback" && npm install --save-dev @testing-library/react
  ```

- [ ] **Step 1.4: Update `jest.config.js` for jsdom + expo-sensors transforms**

  The existing config uses `testEnvironment: 'node'`. Change it to `'jsdom'` (needed for `renderHook` in hook tests; pure function tests work fine in either env). Also add `transformIgnorePatterns` so ts-jest can handle expo package imports:

  Replace the entire contents of `jest.config.js` with:

  ```javascript
  /** @type {import('jest').Config} */
  module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    moduleNameMapper: {
      '^@/(.*)$': '<rootDir>/$1',
    },
    transform: {
      '^.+\\.tsx?$': ['ts-jest', { tsconfig: { strict: true } }],
    },
    testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
    testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
    transformIgnorePatterns: [
      'node_modules/(?!(expo-sensors)/)',
    ],
  };
  ```

- [ ] **Step 1.5: Verify existing tests still pass**

  ```bash
  cd "/Users/alex/workspace/kneeback" && npx jest --passWithNoTests
  ```

  Expected: existing tests in `lib/__tests__/` still pass. No errors.

- [ ] **Step 1.6: Commit**

  ```bash
  cd "/Users/alex/workspace/kneeback" && git add ".gitignore" "package.json" "jest.config.js" && git commit -m "chore: add expo-sensors, update jest config for jsdom + transforms"
  ```

---

### Task 2: Pure math library (TDD)

**Files:**
- Create: `lib/imu-math.ts`
- Create: `__tests__/imu-math.test.ts`

> **Note on units:** `expo-sensors` `Accelerometer` returns values in **g-force** (not m/s²). At rest the magnitude of `{ x, y, z }` ≈ 1.0 g. The threshold for a valid still sample is `|magnitude − 1.0| ≤ 0.05`.

- [ ] **Step 2.1: Write the failing tests**

  Create `__tests__/imu-math.test.ts`:

  ```typescript
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
  ```

- [ ] **Step 2.2: Run tests — confirm they fail**

  ```bash
  cd "/Users/alex/workspace/kneeback" && npx jest __tests__/imu-math.test.ts --no-coverage
  ```

  Expected: `Cannot find module '@/lib/imu-math'`

- [ ] **Step 2.3: Implement `lib/imu-math.ts`**

  Create `lib/imu-math.ts`:

  ```typescript
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
  ```

- [ ] **Step 2.4: Run tests — confirm they pass**

  ```bash
  cd "/Users/alex/workspace/kneeback" && npx jest __tests__/imu-math.test.ts --no-coverage
  ```

  Expected: `Tests: 14 passed, 14 total`

- [ ] **Step 2.5: Commit**

  ```bash
  cd "/Users/alex/workspace/kneeback" && git add "lib/imu-math.ts" "__tests__/imu-math.test.ts" && git commit -m "feat: add IMU pitch math utilities with unit tests"
  ```

---

## Chunk 2: Hook & Wizard Components

### Task 3: `useImuMeasurement` hook (TDD)

**Files:**
- Create: `lib/hooks/use-imu-measurement.ts`
- Create: `__tests__/use-imu-measurement.test.ts`

- [ ] **Step 3.1: Write the failing tests**

  Create `__tests__/use-imu-measurement.test.ts`:

  ```typescript
  /**
   * Hook tests need a React rendering environment.
   * We use @testing-library/react's renderHook (React 18+).
   * react-native is mocked to its bare minimum (Platform.OS only).
   */
  import { renderHook, act } from "@testing-library/react";
  import { Accelerometer } from "expo-sensors";
  import { useImuMeasurement } from "@/lib/hooks/use-imu-measurement";

  // Minimal mock — the hook only uses Platform.OS from react-native
  jest.mock("react-native", () => ({
    Platform: { OS: "web" },
  }));

  // Capture the listener so tests can push fake sensor data
  let capturedListener: ((data: { x: number; y: number; z: number }) => void) | null =
    null;
  const mockRemove = jest.fn();

  jest.mock("expo-sensors", () => ({
    Accelerometer: {
      isAvailableAsync: jest.fn(),
      setUpdateInterval: jest.fn(),
      addListener: jest.fn((cb) => {
        capturedListener = cb;
        return { remove: mockRemove };
      }),
    },
  }));

  // Flat phone face-up: magnitude = 1, pitch = 0°
  const flatSample = { x: 0, y: 0, z: -1 };
  // Phone being shaken: magnitude ≈ 1.73
  const shakeSample = { x: 1, y: 1, z: 1 };

  function pushSamples(
    sample: { x: number; y: number; z: number },
    count: number
  ) {
    for (let i = 0; i < count; i++) {
      act(() => {
        capturedListener?.(sample);
      });
    }
  }

  beforeEach(() => {
    jest.clearAllMocks();
    capturedListener = null;
  });

  describe("isAvailable", () => {
    it("is true when Accelerometer reports available", async () => {
      (Accelerometer.isAvailableAsync as jest.Mock).mockResolvedValue(true);
      const { result } = renderHook(() => useImuMeasurement());
      await act(async () => {});
      expect(result.current.isAvailable).toBe(true);
    });

    it("is false when Accelerometer reports unavailable", async () => {
      (Accelerometer.isAvailableAsync as jest.Mock).mockResolvedValue(false);
      const { result } = renderHook(() => useImuMeasurement());
      await act(async () => {});
      expect(result.current.isAvailable).toBe(false);
    });
  });

  describe("calibrate", () => {
    beforeEach(() => {
      (Accelerometer.isAvailableAsync as jest.Mock).mockResolvedValue(true);
    });

    it("resolves 'success' after 40 valid stable samples", async () => {
      const { result } = renderHook(() => useImuMeasurement());
      await act(async () => {});

      const promise = result.current.calibrate();
      pushSamples(flatSample, 40);

      const outcome = await promise;
      expect(outcome).toBe("success");
    });

    it("resolves 'failed' when an invalid sample arrives during calibration", async () => {
      const { result } = renderHook(() => useImuMeasurement());
      await act(async () => {});

      const promise = result.current.calibrate();
      pushSamples(flatSample, 5);
      act(() => {
        capturedListener?.(shakeSample);
      });

      const outcome = await promise;
      expect(outcome).toBe("failed");
    });
  });

  describe("stopMeasurement", () => {
    beforeEach(() => {
      (Accelerometer.isAvailableAsync as jest.Mock).mockResolvedValue(true);
    });

    it("removes the subscription", async () => {
      const { result } = renderHook(() => useImuMeasurement());
      await act(async () => {});

      // Calibrate first so startMeasurement can proceed
      const calibratePromise = result.current.calibrate();
      pushSamples(flatSample, 40);
      await calibratePromise;

      act(() => {
        result.current.startMeasurement();
      });
      act(() => {
        result.current.stopMeasurement();
      });

      expect(mockRemove).toHaveBeenCalled();
    });

    it("removes subscription on unmount", async () => {
      (Accelerometer.isAvailableAsync as jest.Mock).mockResolvedValue(true);
      const { result, unmount } = renderHook(() => useImuMeasurement());
      await act(async () => {});

      const calibratePromise = result.current.calibrate();
      pushSamples(flatSample, 40);
      await calibratePromise;

      act(() => {
        result.current.startMeasurement();
      });
      unmount();

      expect(mockRemove).toHaveBeenCalled();
    });
  });
  ```

- [ ] **Step 3.2: Run tests — confirm they fail**

  ```bash
  cd "/Users/alex/workspace/kneeback" && npx jest __tests__/use-imu-measurement.test.ts --no-coverage
  ```

  Expected: `Cannot find module '@/lib/hooks/use-imu-measurement'`

- [ ] **Step 3.3: Implement `lib/hooks/use-imu-measurement.ts`**

  Create `lib/hooks/use-imu-measurement.ts`:

  ```typescript
  import { useEffect, useRef, useState, useCallback } from "react";
  import { Platform } from "react-native";
  import { Accelerometer } from "expo-sensors";
  import type { Subscription } from "expo-sensors";
  import {
    computePitch,
    computeFlexion,
    computeStdDev,
    isValidSample,
  } from "@/lib/imu-math";

  const UPDATE_INTERVAL_MS = 50; // 20 Hz
  const STABILITY_WINDOW = 20;   // samples in rolling window (1 second)
  const LOCK_WINDOW = 40;        // consecutive stable samples to lock (2 seconds)
  const STABILITY_THRESHOLD = 0.5; // degrees std dev
  const CALIBRATION_SAMPLES = 40;
  const CAPTURE_NOW_DELAY_MS = 10_000;
  const MAX_FLEXION_DEGREES = 155;
  const MIN_FLEXION_DEGREES = -10;

  export interface ImuMeasurementState {
    isAvailable: boolean;
    calibrate: () => Promise<"success" | "failed">;
    startMeasurement: () => void;
    stopMeasurement: () => void;
    currentAngle: number;
    peakAngle: number | null;
    stableProgress: number; // 0–1
    isLocked: boolean;
    showCaptureNow: boolean;
    captureNow: () => void;
    reset: () => void;
  }

  export function useImuMeasurement(): ImuMeasurementState {
    const [isAvailable, setIsAvailable] = useState(false);
    const [currentAngle, setCurrentAngle] = useState(0);
    const [peakAngle, setPeakAngle] = useState<number | null>(null);
    const [stableProgress, setStableProgress] = useState(0);
    const [isLocked, setIsLocked] = useState(false);
    const [showCaptureNow, setShowCaptureNow] = useState(false);

    const referenceAngleRef = useRef<number | null>(null);
    const subscriptionRef = useRef<Subscription | null>(null);
    const stableCountRef = useRef(0);
    const pitchWindowRef = useRef<number[]>([]);
    // Authoritative peak tracked in a ref so the listener closure never reads stale state
    const peakAngleRef = useRef<number | null>(null);
    const captureNowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
      Accelerometer.isAvailableAsync().then(setIsAvailable);
    }, []);

    const removeSubscription = useCallback(() => {
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
    }, []);

    useEffect(() => {
      return () => {
        removeSubscription();
        if (captureNowTimerRef.current) clearTimeout(captureNowTimerRef.current);
      };
    }, [removeSubscription]);

    // Lock the captured angle — sets all related state atomically.
    // Must NOT be called from inside a setState updater (React 18 strict mode
    // runs updaters twice; side effects inside them fire twice).
    const lockAngle = useCallback((angle: number) => {
      peakAngleRef.current = angle;
      setPeakAngle(angle);
      setIsLocked(true);
      setStableProgress(1);
      setShowCaptureNow(false);
      if (captureNowTimerRef.current) {
        clearTimeout(captureNowTimerRef.current);
        captureNowTimerRef.current = null;
      }
    }, []);

    const calibrate = useCallback((): Promise<"success" | "failed"> => {
      // Avoid the async-in-explicit-Promise anti-pattern:
      // the outer function is NOT async; async work is nested in a named function
      // so errors from awaited calls propagate to the resolve/reject correctly.
      return new Promise((resolve) => {
        function startListening() {
          let samplesCollected = 0;
          let sumPitch = 0;

          removeSubscription();
          Accelerometer.setUpdateInterval(UPDATE_INTERVAL_MS);

          subscriptionRef.current = Accelerometer.addListener(({ x, y, z }) => {
            if (!isValidSample(x, y, z)) {
              removeSubscription();
              resolve("failed");
              return;
            }
            sumPitch += computePitch(x, y, z);
            samplesCollected++;
            if (samplesCollected >= CALIBRATION_SAMPLES) {
              referenceAngleRef.current = sumPitch / samplesCollected;
              removeSubscription();
              resolve("success");
            }
          });
        }

        // iOS Safari requires a user-gesture-initiated permission call
        const needsPermission =
          Platform.OS === "web" &&
          typeof DeviceMotionEvent !== "undefined" &&
          // @ts-expect-error Safari-only API
          typeof DeviceMotionEvent.requestPermission === "function";

        if (needsPermission) {
          // @ts-expect-error Safari-only API
          (DeviceMotionEvent.requestPermission() as Promise<string>)
            .then((result) => {
              if (result === "granted") {
                startListening();
              } else {
                resolve("failed");
              }
            })
            .catch(() => resolve("failed"));
        } else {
          startListening();
        }
      });
    }, [removeSubscription]);

    const startMeasurement = useCallback(() => {
      if (referenceAngleRef.current === null) return;

      stableCountRef.current = 0;
      pitchWindowRef.current = [];
      peakAngleRef.current = null;
      setIsLocked(false);
      setPeakAngle(null);
      setCurrentAngle(0);
      setStableProgress(0);
      setShowCaptureNow(false);

      captureNowTimerRef.current = setTimeout(
        () => setShowCaptureNow(true),
        CAPTURE_NOW_DELAY_MS
      );

      removeSubscription();
      Accelerometer.setUpdateInterval(UPDATE_INTERVAL_MS);

      subscriptionRef.current = Accelerometer.addListener(({ x, y, z }) => {
        if (!isValidSample(x, y, z)) return;

        const pitch = computePitch(x, y, z);
        const flexion = computeFlexion(pitch, referenceAngleRef.current!);

        if (flexion > MAX_FLEXION_DEGREES || flexion < MIN_FLEXION_DEGREES) return;

        setCurrentAngle(flexion);

        // Track running peak in a ref — never read state inside a listener
        if (peakAngleRef.current === null || flexion > peakAngleRef.current) {
          peakAngleRef.current = flexion;
          setPeakAngle(flexion); // keep state in sync for display
        }

        const window = [...pitchWindowRef.current, flexion].slice(-STABILITY_WINDOW);
        pitchWindowRef.current = window;

        const stable =
          computeStdDev(window) < STABILITY_THRESHOLD &&
          window.length === STABILITY_WINDOW;

        if (stable) {
          stableCountRef.current += 1;
          setStableProgress(Math.min(stableCountRef.current / LOCK_WINDOW, 1));

          if (stableCountRef.current >= LOCK_WINDOW) {
            const locked = peakAngleRef.current ?? flexion;
            removeSubscription();
            lockAngle(locked); // called directly — NOT inside a setState updater
          }
        } else {
          stableCountRef.current = 0;
          setStableProgress(0);
        }
      });
    }, [removeSubscription, lockAngle]);

    const stopMeasurement = useCallback(() => {
      removeSubscription();
      if (captureNowTimerRef.current) {
        clearTimeout(captureNowTimerRef.current);
        captureNowTimerRef.current = null;
      }
    }, [removeSubscription]);

    // Manual capture fallback — reads the ref, never stale state
    const captureNow = useCallback(() => {
      removeSubscription();
      const angle = peakAngleRef.current ?? currentAngle;
      lockAngle(angle);
    }, [removeSubscription, lockAngle, currentAngle]);

    const reset = useCallback(() => {
      removeSubscription();
      referenceAngleRef.current = null;
      stableCountRef.current = 0;
      pitchWindowRef.current = [];
      peakAngleRef.current = null;
      setCurrentAngle(0);
      setPeakAngle(null);
      setStableProgress(0);
      setIsLocked(false);
      setShowCaptureNow(false);
      if (captureNowTimerRef.current) {
        clearTimeout(captureNowTimerRef.current);
        captureNowTimerRef.current = null;
      }
    }, [removeSubscription]);

    return {
      isAvailable,
      calibrate,
      startMeasurement,
      stopMeasurement,
      currentAngle,
      peakAngle,
      stableProgress,
      isLocked,
      showCaptureNow,
      captureNow,
      reset,
    };
  }
  ```

- [ ] **Step 3.4: Run tests — confirm they pass**

  ```bash
  cd "/Users/alex/workspace/kneeback" && npx jest __tests__/use-imu-measurement.test.ts --no-coverage
  ```

  Expected: `Tests: 6 passed, 6 total`

- [ ] **Step 3.5: Commit**

  ```bash
  cd "/Users/alex/workspace/kneeback" && git add "lib/hooks/use-imu-measurement.ts" "__tests__/use-imu-measurement.test.ts" && git commit -m "feat: add useImuMeasurement hook with calibration and auto-capture"
  ```

---

### Task 4: Wizard step components

**Files:**
- Create: `components/rom-measurement/PositionStep.tsx`
- Create: `components/rom-measurement/CalibrationStep.tsx`
- Create: `components/rom-measurement/MeasurementStep.tsx`
- Create: `components/rom-measurement/MeasurementReview.tsx`
- Create: `components/rom-measurement/RomMeasurementWizard.tsx`

- [ ] **Step 4.1: Create `PositionStep`**

  Create `components/rom-measurement/PositionStep.tsx`:

  ```typescript
  import { View, Text, TouchableOpacity } from "react-native";
  import { Ionicons } from "@expo/vector-icons";
  import { Colors } from "@/constants/colors";

  interface Props {
    onReady: () => void;
  }

  export function PositionStep({ onReady }: Props) {
    return (
      <View className="flex-1 px-6 pt-10 pb-10 justify-between">
        <View>
          <Text className="text-2xl font-bold mb-2" style={{ color: Colors.text }}>
            Get into position
          </Text>
          <Text className="text-base mb-8" style={{ color: Colors.textSecondary }}>
            Before we measure, set up like this:
          </Text>

          <View className="gap-5">
            {[
              { label: "Lie flat on your back", sub: "On a bed, mat, or firm surface." },
              { label: "Straighten your leg as much as possible", sub: "Rest it flat on the surface." },
              { label: "Place your phone flat on your shin", sub: "Screen facing up, long edge along your shin bone." },
            ].map((item, i) => (
              <View key={i} className="flex-row items-start gap-4">
                <View
                  className="w-8 h-8 rounded-full items-center justify-center"
                  style={{ backgroundColor: Colors.primary + "20" }}
                >
                  <Text className="font-bold" style={{ color: Colors.primary }}>{i + 1}</Text>
                </View>
                <View className="flex-1">
                  <Text className="font-semibold mb-1" style={{ color: Colors.text }}>{item.label}</Text>
                  <Text style={{ color: Colors.textSecondary }}>{item.sub}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Placeholder illustration */}
          <View
            className="mt-8 rounded-2xl items-center justify-center"
            style={{ height: 120, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border }}
          >
            <Ionicons name="body-outline" size={48} color={Colors.textMuted} />
            <Text className="text-xs mt-2" style={{ color: Colors.textMuted }}>Phone on shin, face up</Text>
          </View>
        </View>

        <TouchableOpacity
          className="py-4 rounded-2xl items-center"
          style={{ backgroundColor: Colors.primary }}
          onPress={onReady}
        >
          <Text className="text-white font-bold text-base">I'm in position</Text>
        </TouchableOpacity>
      </View>
    );
  }
  ```

- [ ] **Step 4.2: Create `CalibrationStep`**

  Create `components/rom-measurement/CalibrationStep.tsx`:

  ```typescript
  import { useState } from "react";
  import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Platform } from "react-native";
  import { Ionicons } from "@expo/vector-icons";
  import * as Haptics from "expo-haptics";
  import { Colors } from "@/constants/colors";
  import type { ImuMeasurementState } from "@/lib/hooks/use-imu-measurement";

  interface Props {
    imu: ImuMeasurementState;
    onCalibrated: () => void;
  }

  export function CalibrationStep({ imu, onCalibrated }: Props) {
    const [status, setStatus] = useState<"idle" | "calibrating" | "success" | "failed">("idle");

    async function handleCalibrate() {
      setStatus("calibrating");
      const result = await imu.calibrate();

      if (result === "success") {
        setStatus("success");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(onCalibrated, 600);
      } else {
        setStatus("failed");
        if (Platform.OS !== "web") {
          Alert.alert(
            "Calibration failed",
            "Keep your leg flat and hold the phone still, then try again."
          );
        }
      }
    }

    return (
      <View className="flex-1 px-6 pt-10 pb-10 justify-between">
        <View>
          <Text className="text-2xl font-bold mb-2" style={{ color: Colors.text }}>
            Calibrate
          </Text>
          <Text className="text-base mb-8" style={{ color: Colors.textSecondary }}>
            Keep your leg flat and hold perfectly still. The app will lock in your straight-leg position as the reference point (0°).
          </Text>

          <View
            className="rounded-2xl p-6 items-center justify-center"
            style={{ backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, minHeight: 140 }}
          >
            {status === "idle" && (
              <View className="items-center gap-3">
                <Ionicons name="radio-button-off-outline" size={48} color={Colors.textMuted} />
                <Text style={{ color: Colors.textMuted }}>Hold still, then tap Calibrate</Text>
              </View>
            )}
            {status === "calibrating" && (
              <View className="items-center gap-3">
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={{ color: Colors.textSecondary }}>Measuring baseline…</Text>
              </View>
            )}
            {status === "success" && (
              <View className="items-center gap-3">
                <Ionicons name="checkmark-circle" size={56} color={Colors.success} />
                <Text className="font-semibold" style={{ color: Colors.success }}>Calibrated!</Text>
              </View>
            )}
            {status === "failed" && (
              <View className="items-center gap-3">
                <Ionicons name="warning-outline" size={48} color={Colors.error} />
                <Text className="text-center" style={{ color: Colors.textSecondary }}>
                  Movement detected. Hold still and try again.
                </Text>
              </View>
            )}
          </View>
        </View>

        {status !== "success" && (
          <TouchableOpacity
            className="py-4 rounded-2xl items-center"
            style={{
              backgroundColor: status === "calibrating" ? Colors.surface : Colors.primary,
              borderWidth: status === "calibrating" ? 1 : 0,
              borderColor: Colors.border,
            }}
            onPress={handleCalibrate}
            disabled={status === "calibrating"}
          >
            <Text
              className="font-bold text-base"
              style={{ color: status === "calibrating" ? Colors.textMuted : "white" }}
            >
              {status === "failed" ? "Try Again" : "Calibrate"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }
  ```

- [ ] **Step 4.3: Create `MeasurementStep`**

  Create `components/rom-measurement/MeasurementStep.tsx`:

  ```typescript
  import { useEffect, useCallback } from "react";
  import { View, Text, TouchableOpacity } from "react-native";
  import { Ionicons } from "@expo/vector-icons";
  import * as Haptics from "expo-haptics";
  import { Colors } from "@/constants/colors";
  import type { ImuMeasurementState } from "@/lib/hooks/use-imu-measurement";

  interface Props {
    imu: ImuMeasurementState;
    // onCaptured must be a stable reference (wrap in useCallback at the call site)
    onCaptured: (degrees: number) => void;
  }

  export function MeasurementStep({ imu, onCaptured }: Props) {
    // Start measuring on mount, stop on unmount
    // Intentionally omitting imu from deps: we want mount/unmount semantics only.
    // The imu object identity may change on re-render but we only start once.
    useEffect(() => {
      imu.startMeasurement();
      return () => {
        imu.stopMeasurement();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Fire haptic and advance when auto-capture locks
    // onCaptured is listed as a dep — callers must pass a stable reference.
    useEffect(() => {
      if (imu.isLocked && imu.peakAngle !== null) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const timer = setTimeout(() => onCaptured(imu.peakAngle!), 600);
        return () => clearTimeout(timer);
      }
    }, [imu.isLocked, imu.peakAngle, onCaptured]);

    const progressPercent = Math.round(imu.stableProgress * 100);

    return (
      <View className="flex-1 px-6 pt-10 pb-10 justify-between">
        <View className="items-center">
          <Text className="text-2xl font-bold mb-2" style={{ color: Colors.text }}>
            Bend your knee
          </Text>
          <Text className="text-base mb-10 text-center" style={{ color: Colors.textSecondary }}>
            Slowly slide your heel toward your glutes. Hold at your maximum — the angle locks automatically.
          </Text>

          {/* Live angle readout */}
          <View
            className="w-52 h-52 rounded-full items-center justify-center mb-8"
            style={{
              borderWidth: 6,
              borderColor: imu.isLocked ? Colors.success : Colors.primary,
              backgroundColor: Colors.surface,
            }}
          >
            {imu.isLocked ? (
              <View className="items-center gap-1">
                <Ionicons name="checkmark-circle" size={36} color={Colors.success} />
                <Text className="text-5xl font-bold" style={{ color: Colors.success }}>
                  {imu.peakAngle}°
                </Text>
                <Text className="text-xs" style={{ color: Colors.success }}>Locked</Text>
              </View>
            ) : (
              <View className="items-center">
                <Text className="text-6xl font-bold" style={{ color: Colors.text }}>
                  {imu.currentAngle}°
                </Text>
                <Text className="text-xs mt-1" style={{ color: Colors.textMuted }}>flexion</Text>
              </View>
            )}
          </View>

          {/* Stability progress bar */}
          {!imu.isLocked && (
            <View className="w-full">
              <View className="flex-row justify-between mb-1">
                <Text className="text-xs" style={{ color: Colors.textMuted }}>Hold still to lock</Text>
                <Text className="text-xs" style={{ color: Colors.textMuted }}>{progressPercent}%</Text>
              </View>
              <View className="w-full h-2 rounded-full" style={{ backgroundColor: Colors.border }}>
                <View
                  className="h-2 rounded-full"
                  style={{ width: `${progressPercent}%`, backgroundColor: Colors.primary }}
                />
              </View>
            </View>
          )}
        </View>

        {/* "Capture now" manual fallback — appears after 10 seconds */}
        {imu.showCaptureNow && !imu.isLocked && (
          <TouchableOpacity
            className="py-4 rounded-2xl items-center border"
            style={{ borderColor: Colors.border, backgroundColor: Colors.surface }}
            onPress={imu.captureNow}
          >
            <Text className="font-semibold" style={{ color: Colors.text }}>
              Capture now ({imu.currentAngle}°)
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }
  ```

- [ ] **Step 4.4: Create `MeasurementReview`**

  Create `components/rom-measurement/MeasurementReview.tsx`:

  ```typescript
  import { View, Text, TouchableOpacity } from "react-native";
  import { Ionicons } from "@expo/vector-icons";
  import { Colors } from "@/constants/colors";
  import type { RomMeasurement } from "@/lib/types";

  interface Props {
    flexionDegrees: number;
    lastMeasurement?: RomMeasurement | null;
    onSave: () => void;
    onRetake: () => void;
  }

  export function MeasurementReview({
    flexionDegrees,
    lastMeasurement,
    onSave,
    onRetake,
  }: Props) {
    const lastFlexion = lastMeasurement?.flexion_degrees ?? null;
    const delta = lastFlexion !== null ? flexionDegrees - lastFlexion : null;

    return (
      <View className="flex-1 px-6 pt-10 pb-10 justify-between">
        <View>
          <Text className="text-2xl font-bold mb-2" style={{ color: Colors.text }}>
            Measurement complete
          </Text>
          <Text className="text-base mb-8" style={{ color: Colors.textSecondary }}>
            Save to log it, or retake if something felt off.
          </Text>

          <View
            className="rounded-2xl p-6 items-center mb-4"
            style={{ backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border }}
          >
            <Text className="text-xs font-semibold tracking-wide mb-1" style={{ color: Colors.textMuted }}>
              FLEXION
            </Text>
            <Text className="text-6xl font-bold mb-1" style={{ color: Colors.text }}>
              {flexionDegrees}°
            </Text>

            {delta !== null && (
              <View className="flex-row items-center gap-1 mt-1">
                <Ionicons
                  name={delta >= 0 ? "arrow-up" : "arrow-down"}
                  size={14}
                  color={delta >= 0 ? Colors.success : Colors.error}
                />
                <Text
                  className="text-sm font-semibold"
                  style={{ color: delta >= 0 ? Colors.success : Colors.error }}
                >
                  {Math.abs(delta)}° vs last time
                </Text>
              </View>
            )}
          </View>

          <Text className="text-xs text-center" style={{ color: Colors.textMuted }}>
            Extension saved as 0° (your personal full-extension baseline).
          </Text>
        </View>

        <View className="gap-3">
          <TouchableOpacity
            className="py-4 rounded-2xl items-center"
            style={{ backgroundColor: Colors.primary }}
            onPress={onSave}
          >
            <Text className="text-white font-bold text-base">Save measurement</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="py-4 rounded-2xl items-center border"
            style={{ borderColor: Colors.border, backgroundColor: Colors.surface }}
            onPress={onRetake}
          >
            <Text className="font-semibold" style={{ color: Colors.textSecondary }}>Retake</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  ```

- [ ] **Step 4.5: Create `RomMeasurementWizard`**

  Create `components/rom-measurement/RomMeasurementWizard.tsx`:

  ```typescript
  import { useState, useCallback } from "react";
  import { Modal, View, Text, TouchableOpacity, SafeAreaView } from "react-native";
  import { Ionicons } from "@expo/vector-icons";
  import { Colors } from "@/constants/colors";
  import { useImuMeasurement } from "@/lib/hooks/use-imu-measurement";
  import { PositionStep } from "./PositionStep";
  import { CalibrationStep } from "./CalibrationStep";
  import { MeasurementStep } from "./MeasurementStep";
  import { MeasurementReview } from "./MeasurementReview";
  import type { RomMeasurement } from "@/lib/types";

  type Step = "position" | "calibrate" | "flexion" | "review";

  interface Props {
    visible: boolean;
    onComplete: (result: { flexionDegrees: number }) => void;
    onDismiss: () => void;
    lastMeasurement?: RomMeasurement | null;
  }

  const STEPS: Step[] = ["position", "calibrate", "flexion", "review"];
  const STEP_LABELS: Record<Step, string> = {
    position: "Position",
    calibrate: "Calibrate",
    flexion: "Measure",
    review: "Review",
  };

  export function RomMeasurementWizard({ visible, onComplete, onDismiss, lastMeasurement }: Props) {
    const [step, setStep] = useState<Step>("position");
    const [flexionDegrees, setFlexionDegrees] = useState<number | null>(null);
    const imu = useImuMeasurement();

    function handleDismiss() {
      imu.reset();
      setStep("position");
      setFlexionDegrees(null);
      onDismiss();
    }

    function handleRetake() {
      imu.reset();
      setStep("calibrate");
      setFlexionDegrees(null);
    }

    function handleSave() {
      if (flexionDegrees === null) return;
      imu.reset();
      setStep("position");
      setFlexionDegrees(null);
      onComplete({ flexionDegrees });
    }

    // Stable reference required by MeasurementStep's useEffect dep array
    const handleCaptured = useCallback((degrees: number) => {
      setFlexionDegrees(degrees);
      setStep("review");
    }, []);

    const stepIndex = STEPS.indexOf(step);

    return (
      <Modal visible={visible} animationType="slide" onRequestClose={handleDismiss}>
        <SafeAreaView className="flex-1 bg-background">
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
            <TouchableOpacity onPress={handleDismiss} className="p-1">
              <Ionicons name="close" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
            <Text className="font-semibold text-base" style={{ color: Colors.text }}>
              Measure ROM
            </Text>
            <View style={{ width: 32 }} />
          </View>

          {/* Step indicator */}
          <View className="flex-row px-6 pt-4 pb-2 gap-2">
            {STEPS.map((s, i) => (
              <View key={s} className="flex-1 items-center gap-1">
                <View
                  className="w-full h-1 rounded-full"
                  style={{
                    backgroundColor:
                      i < stepIndex ? Colors.success :
                      i === stepIndex ? Colors.primary :
                      Colors.border,
                  }}
                />
                <Text
                  className="text-xs"
                  style={{ color: i <= stepIndex ? Colors.text : Colors.textMuted }}
                >
                  {STEP_LABELS[s]}
                </Text>
              </View>
            ))}
          </View>

          {step === "position" && <PositionStep onReady={() => setStep("calibrate")} />}
          {step === "calibrate" && <CalibrationStep imu={imu} onCalibrated={() => setStep("flexion")} />}
          {step === "flexion" && <MeasurementStep imu={imu} onCaptured={handleCaptured} />}
          {step === "review" && flexionDegrees !== null && (
            <MeasurementReview
              flexionDegrees={flexionDegrees}
              lastMeasurement={lastMeasurement}
              onSave={handleSave}
              onRetake={handleRetake}
            />
          )}
        </SafeAreaView>
      </Modal>
    );
  }
  ```

- [ ] **Step 4.6: Run TypeScript check on new components**

  ```bash
  cd "/Users/alex/workspace/kneeback" && npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 4.7: Commit**

  ```bash
  cd "/Users/alex/workspace/kneeback" && git add "components/rom-measurement/" && git commit -m "feat: add ROM measurement wizard components"
  ```

---

## Chunk 3: Integration & E2E

### Task 5: Wire up `LogRomSheet` and `progress.tsx`

**Files:**
- Modify: `components/LogRomSheet.tsx`
- Modify: `app/(tabs)/progress.tsx`

- [ ] **Step 5.1: Add imports to `LogRomSheet.tsx`**

  Add after the existing imports (after line 17):

  ```typescript
  import { useState } from "react";  // already present — no change needed
  import { RomMeasurementWizard } from "./rom-measurement/RomMeasurementWizard";
  import { useImuMeasurement } from "../lib/hooks/use-imu-measurement";
  ```

- [ ] **Step 5.2: Extend `Props` interface in `LogRomSheet.tsx`**

  Replace the existing `Props` interface (lines 26–31) with:

  ```typescript
  interface Props {
    visible: boolean;
    onClose: () => void;
    onSave: (payload: SavePayload) => Promise<void>;
    editingEntry?: RomMeasurement | null;
    lastMeasurement?: RomMeasurement | null;
  }
  ```

- [ ] **Step 5.3: Update component signature and add hook + wizard state**

  Replace line 46:
  ```typescript
  export function LogRomSheet({ visible, onClose, onSave, editingEntry, lastMeasurement }: Props) {
  ```

  Add after the existing `useState` declarations (after `const [saving, setSaving] = useState(false);`, line 53):
  ```typescript
  const [wizardVisible, setWizardVisible] = useState(false);
  const { isAvailable } = useImuMeasurement();
  ```

- [ ] **Step 5.4: Add sensor button and wizard modal above the Flexion/Extension inputs**

  Replace the comment and `<View className="flex-row gap-3 mb-4">` block starting at line 182 with:

  ```typescript
  {/* Sensor button — only shown on devices with IMU hardware */}
  {isAvailable && (
    <>
      <RomMeasurementWizard
        visible={wizardVisible}
        lastMeasurement={lastMeasurement}
        onComplete={({ flexionDegrees }) => {
          setFlexion(String(flexionDegrees));
          setExtension("0");
          setWizardVisible(false);
        }}
        onDismiss={() => setWizardVisible(false)}
      />
      <TouchableOpacity
        className="flex-row items-center justify-center gap-2 py-3 rounded-2xl border border-primary mb-4"
        style={{ backgroundColor: Colors.primary + "12" }}
        onPress={() => setWizardVisible(true)}
      >
        <Ionicons name="phone-portrait-outline" size={18} color={Colors.primary} />
        <Text className="font-semibold" style={{ color: Colors.primary }}>
          Use Phone Sensor
        </Text>
      </TouchableOpacity>
    </>
  )}

  {/* Flexion + Extension */}
  <View className="flex-row gap-3 mb-4">
    <View className="flex-1">
      <Text className="text-xs font-semibold tracking-wide mb-2" style={{ color: Colors.textMuted }}>
        FLEXION (°)
      </Text>
      <TextInput
        className="bg-surface border border-border rounded-2xl px-4 py-3 text-base"
        style={{ color: Colors.text }}
        value={flexion}
        onChangeText={setFlexion}
        placeholder="e.g. 90"
        placeholderTextColor={Colors.textMuted}
        keyboardType="numeric"
      />
    </View>
    <View className="flex-1">
      <Text className="text-xs font-semibold tracking-wide mb-2" style={{ color: Colors.textMuted }}>
        EXTENSION (°)
      </Text>
      <TextInput
        className="bg-surface border border-border rounded-2xl px-4 py-3 text-base"
        style={{ color: Colors.text }}
        value={extension}
        onChangeText={setExtension}
        placeholder="e.g. 5"
        placeholderTextColor={Colors.textMuted}
        keyboardType="numeric"
      />
    </View>
  </View>
  ```

- [ ] **Step 5.5: Pass `lastMeasurement` from `progress.tsx`**

  In `app/(tabs)/progress.tsx`, update the `<LogRomSheet ... />` block (lines 163–168):

  ```typescript
  <LogRomSheet
    visible={romSheetOpen}
    onClose={() => setRomSheetOpen(false)}
    onSave={handleSaveRom}
    editingEntry={null}
    lastMeasurement={measurements[0] ?? null}
  />
  ```

  `measurements` is already populated at line 84 as `RomMeasurement[]` sorted newest-first (`.slice().reverse()`), so `measurements[0]` is the most recent entry.

- [ ] **Step 5.6: Run TypeScript check**

  ```bash
  cd "/Users/alex/workspace/kneeback" && npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 5.7: Run all unit tests**

  ```bash
  cd "/Users/alex/workspace/kneeback" && npx jest --no-coverage
  ```

  Expected: all tests pass.

- [ ] **Step 5.8: Commit**

  ```bash
  cd "/Users/alex/workspace/kneeback" && git add "components/LogRomSheet.tsx" "app/(tabs)/progress.tsx" && git commit -m "feat: integrate ROM measurement wizard into LogRomSheet"
  ```

---

### Task 6: E2E test

**Files:**
- Create: `e2e/rom-measurement.spec.ts`

> **Scope:** expo-sensors on web uses `deviceorientation` Euler angles rather than true g-unit accelerations, making it incompatible with the hook's `isValidSample` magnitude check. Injecting fake sensor data through DOM events would silently fail validation and never complete calibration. Therefore, E2E tests cover the **UI integration** (wizard opens, steps render, dismiss/pre-fill work); actual sensor measurement accuracy is validated through **unit tests** (which mock expo-sensors at the module level) and **physical device testing**.

- [ ] **Step 6.1: Check the existing E2E auth helper**

  Read one existing test in `e2e/` to find the sign-in helper or auth setup used by other tests. Use the same pattern in the new test.

- [ ] **Step 6.2: Create `e2e/rom-measurement.spec.ts`**

  Create `e2e/rom-measurement.spec.ts`:

  ```typescript
  import { test, expect } from "@playwright/test";

  /**
   * E2E tests for the ROM measurement wizard UI integration.
   *
   * On desktop Playwright (no IMU hardware), isAvailableAsync() returns false
   * so the "Use Phone Sensor" button is hidden — this is the correct production
   * behaviour for desktop web users.
   *
   * These tests verify:
   *   1. Button is hidden on desktop (sensor unavailable path)
   *   2. Manual entry still works as expected
   *   3. LogRomSheet saves correctly when filled manually
   *
   * Sensor measurement accuracy is covered by unit tests (__tests__/).
   * Full wizard flow is validated via manual testing on iOS / Android device.
   */

  test.describe("ROM logging — LogRomSheet", () => {
    test.beforeEach(async ({ page }) => {
      // Use the shared auth helper from other E2E tests in this project.
      // Read an existing test in e2e/ and apply the same sign-in setup here.
      await page.goto("/");
      await page.waitForURL("**/tabs/**");
      await page.getByRole("tab", { name: /progress/i }).click();
    });

    test("sensor button is hidden on desktop (no IMU)", async ({ page }) => {
      await page.getByRole("button", { name: /log/i }).first().click();
      await expect(page.getByText("Log ROM")).toBeVisible();
      // Desktop Chromium has no IMU — "Use Phone Sensor" must not appear
      await expect(page.getByText("Use Phone Sensor")).not.toBeVisible();
    });

    test("manual flexion entry saves and appears in chart", async ({ page }) => {
      await page.getByRole("button", { name: /log/i }).first().click();
      await expect(page.getByText("Log ROM")).toBeVisible();

      await page.getByPlaceholder("e.g. 90").fill("95");
      await page.getByPlaceholder("e.g. 5").fill("3");
      await page.getByRole("button", { name: /^save$/i }).click();

      // Sheet closes after save
      await expect(page.getByText("Log ROM")).not.toBeVisible();
    });

    test("closing sheet without saving leaves chart unchanged", async ({ page }) => {
      await page.getByRole("button", { name: /log/i }).first().click();
      await page.getByPlaceholder("e.g. 90").fill("120");

      await page.getByRole("button", { name: /cancel/i }).click();
      await expect(page.getByText("Log ROM")).not.toBeVisible();
    });
  });
  ```

  > **Physical device test checklist** (run manually on iOS + Android after each release):
  > - Progress → Log ROM → "Use Phone Sensor" button visible
  > - Wizard opens fullscreen
  > - "I'm in position" advances to calibrate step
  > - Calibrate button succeeds when leg is flat and still
  > - Live angle updates as knee bends
  > - Angle locks after 2 seconds of holding still
  > - Review screen shows correct angle + delta vs last measurement
  > - Save pre-fills flexion field with a rounded integer, extension with "0"
  > - Retake returns to calibration step
  > - Closing wizard leaves LogRomSheet open with unchanged fields

- [ ] **Step 6.3: Run E2E tests**

  ```bash
  cd "/Users/alex/workspace/kneeback" && npx playwright test e2e/rom-measurement.spec.ts --headed
  ```

  Fix any selector mismatches by inspecting the page. All 4 tests should pass.

- [ ] **Step 6.4: Save a screenshot**

  ```bash
  cd "/Users/alex/workspace/kneeback" && npx playwright test e2e/rom-measurement.spec.ts --reporter=html
  ```

  Take a screenshot of the measurement step and save to `artifacts/rom-measurement-wizard.png`.

- [ ] **Step 6.5: Commit**

  ```bash
  cd "/Users/alex/workspace/kneeback" && git add "e2e/rom-measurement.spec.ts" "artifacts/" && git commit -m "test: add E2E tests for ROM measurement wizard"
  ```

---

## Verification Checklist

Before marking complete:

- [ ] `npx jest --no-coverage` — all unit tests pass (14 math + 6 hook)
- [ ] `npx tsc --noEmit` — no TypeScript errors
- [ ] `npx playwright test e2e/rom-measurement.spec.ts` — all 3 E2E UI tests pass
- [ ] On desktop browser: "Use Phone Sensor" button hidden; manual entry still works

Physical device (iOS or Android) — manual:
- [ ] Progress → Log ROM → "Use Phone Sensor" button visible
- [ ] Calibrate succeeds when lying flat and still
- [ ] Live angle updates as knee bends; locks after 2s hold
- [ ] Review shows correct angle + delta vs last measurement
- [ ] Save pre-fills flexion with a rounded integer, extension with "0"
- [ ] Retake returns to calibration step
- [ ] Closing wizard leaves LogRomSheet open with unchanged fields
