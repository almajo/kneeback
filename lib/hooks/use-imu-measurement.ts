import { useEffect, useRef, useState, useCallback } from "react";
import { Platform } from "react-native";
import { Accelerometer } from "expo-sensors";
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
  const subscriptionRef = useRef<{ remove: () => void } | null>(null);
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
