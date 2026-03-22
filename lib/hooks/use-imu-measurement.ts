import { useEffect, useRef, useState, useCallback } from "react";
import { Platform } from "react-native";
import { Accelerometer } from "expo-sensors";
import {
  computeFlexionAngle,
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
  calibrateThigh: () => Promise<"success" | "failed">;
  captureThigh: () => void;
  isCapturingThigh: boolean;
  thighAngle: number | null;
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

  const [isCapturingThigh, setIsCapturingThigh] = useState(false);
  const [thighAngle, setThighAngle] = useState<number | null>(null);

  const referenceVectorRef = useRef<{ x: number; y: number; z: number } | null>(null);
  const thighReferenceVectorRef = useRef<{ x: number; y: number; z: number } | null>(null);
  const subscriptionRef = useRef<{ remove: () => void } | null>(null);
  const stableCountRef = useRef(0);
  const pitchWindowRef = useRef<number[]>([]);
  // Authoritative peak tracked in a ref so the listener closure never reads stale state
  const peakAngleRef = useRef<number | null>(null);
  const captureNowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // On web, only expose the sensor on mobile browsers (touch-primary devices).
    // Desktop Chrome may report the accelerometer as available via the Generic
    // Sensor API even though there is no physical IMU.
    if (Platform.OS === "web") {
      const isTouchPrimary =
        typeof window !== "undefined" &&
        window.matchMedia("(pointer: coarse)").matches;
      if (!isTouchPrimary) {
        setIsAvailable(false);
        return;
      }
    }
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

  // Shared calibration implementation — collects CALIBRATION_SAMPLES stable
  // readings, averages them, stores the result via onSuccess, then resolves.
  // Handles iOS Safari permission, Chrome Permissions API, and timeout.
  const runCalibration = useCallback(
    (onSuccess: (vec: { x: number; y: number; z: number }) => void): Promise<"success" | "failed"> => {
      return new Promise((resolve) => {
        const CALIBRATION_TIMEOUT_MS = 6000;
        let resolved = false;
        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            removeSubscription();
            resolve("failed");
          }
        }, CALIBRATION_TIMEOUT_MS);

        function resolveOnce(result: "success" | "failed") {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            removeSubscription();
            resolve(result);
          }
        }

        function startListening() {
          let samplesCollected = 0;
          let sumX = 0;
          let sumY = 0;
          let sumZ = 0;

          Accelerometer.setUpdateInterval(UPDATE_INTERVAL_MS);

          subscriptionRef.current = Accelerometer.addListener(({ x, y, z }) => {
            if (!isValidSample(x, y, z)) {
              resolveOnce("failed");
              return;
            }
            sumX += x;
            sumY += y;
            sumZ += z;
            samplesCollected++;
            if (samplesCollected >= CALIBRATION_SAMPLES) {
              onSuccess({
                x: sumX / samplesCollected,
                y: sumY / samplesCollected,
                z: sumZ / samplesCollected,
              });
              resolveOnce("success");
            }
          });
        }

        async function requestPermissionAndListen() {
          // iOS Safari requires a user-gesture-initiated permission call via
          // the non-standard DeviceMotionEvent.requestPermission API.
          const hasSafariPermissionApi =
            typeof DeviceMotionEvent !== "undefined" &&
            // @ts-expect-error Safari-only API
            typeof DeviceMotionEvent.requestPermission === "function";

          if (hasSafariPermissionApi) {
            try {
              // @ts-expect-error Safari-only API
              const result = await (DeviceMotionEvent.requestPermission() as Promise<string>);
              if (result === "granted") {
                startListening();
              } else {
                resolveOnce("failed");
              }
            } catch {
              resolveOnce("failed");
            }
            return;
          }

          // Chrome on Android exposes accelerometer permission via the
          // Permissions API. Request it if available so that sensor events fire.
          if (
            typeof navigator !== "undefined" &&
            navigator.permissions &&
            typeof navigator.permissions.query === "function"
          ) {
            try {
              const status = await navigator.permissions.query({
                // @ts-expect-error "accelerometer" is a valid permission name per the
                // Generic Sensor API spec but not yet in TS lib types
                name: "accelerometer",
              });
              if (status.state === "denied") {
                resolveOnce("failed");
                return;
              }
              // "granted" or "prompt" — proceed; the browser will show its own
              // prompt if needed when the sensor data starts arriving.
            } catch {
              // Permissions API query failed — fall through and attempt to start.
            }
          }

          startListening();
        }

        removeSubscription();

        if (Platform.OS === "web") {
          requestPermissionAndListen().catch(() => resolveOnce("failed"));
        } else {
          startListening();
        }
      });
    },
    [removeSubscription]
  );

  const calibrate = useCallback(
    () => runCalibration((vec) => { referenceVectorRef.current = vec; }),
    [runCalibration]
  );

  const calibrateThigh = useCallback(
    () => runCalibration((vec) => { thighReferenceVectorRef.current = vec; }),
    [runCalibration]
  );

  // Captures the thigh angle at maximum bend by collecting a short stable sample,
  // then computing the angle relative to the thigh's calibration reference.
  const captureThigh = useCallback(() => {
    if (thighReferenceVectorRef.current === null) return;
    setIsCapturingThigh(true);

    const THIGH_CAPTURE_SAMPLES = 20;
    const THIGH_CAPTURE_TIMEOUT_MS = 6000;
    let samplesCollected = 0;
    let sumX = 0;
    let sumY = 0;
    let sumZ = 0;
    let done = false;

    const timeout = setTimeout(() => {
      if (!done) {
        done = true;
        removeSubscription();
        setIsCapturingThigh(false);
      }
    }, THIGH_CAPTURE_TIMEOUT_MS);

    removeSubscription();
    Accelerometer.setUpdateInterval(UPDATE_INTERVAL_MS);

    subscriptionRef.current = Accelerometer.addListener(({ x, y, z }) => {
      if (done) return;
      if (!isValidSample(x, y, z)) return;
      sumX += x;
      sumY += y;
      sumZ += z;
      samplesCollected++;
      if (samplesCollected >= THIGH_CAPTURE_SAMPLES) {
        done = true;
        clearTimeout(timeout);
        removeSubscription();
        const ref = thighReferenceVectorRef.current!;
        const avgX = sumX / samplesCollected;
        const avgY = sumY / samplesCollected;
        const avgZ = sumZ / samplesCollected;
        const angle = computeFlexionAngle(ref.x, ref.y, ref.z, avgX, avgY, avgZ);
        setThighAngle(angle);
        setIsCapturingThigh(false);
      }
    });
  }, [removeSubscription]);

  const startMeasurement = useCallback(() => {
    if (referenceVectorRef.current === null) return;

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

      const ref = referenceVectorRef.current!;
      const flexion = computeFlexionAngle(ref.x, ref.y, ref.z, x, y, z);

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
    referenceVectorRef.current = null;
    thighReferenceVectorRef.current = null;
    stableCountRef.current = 0;
    pitchWindowRef.current = [];
    peakAngleRef.current = null;
    setCurrentAngle(0);
    setPeakAngle(null);
    setStableProgress(0);
    setIsLocked(false);
    setShowCaptureNow(false);
    setIsCapturingThigh(false);
    setThighAngle(null);
    if (captureNowTimerRef.current) {
      clearTimeout(captureNowTimerRef.current);
      captureNowTimerRef.current = null;
    }
  }, [removeSubscription]);

  return {
    isAvailable,
    calibrate,
    calibrateThigh,
    captureThigh,
    isCapturingThigh,
    thighAngle,
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
