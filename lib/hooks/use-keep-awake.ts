import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";

const KEEP_AWAKE_TAG = "today-workout";

/**
 * Keeps the screen on while the component is mounted.
 * - Native (iOS/Android): uses expo-keep-awake
 * - Web: uses the Wake Lock API
 */
export function useKeepAwake() {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (Platform.OS === "web") {
      // Web Wake Lock API
      async function acquireLock() {
        try {
          if ("wakeLock" in navigator) {
            wakeLockRef.current = await navigator.wakeLock.request("screen");
          }
        } catch {
          // Wake Lock may be denied if the page is not visible — ignore
        }
      }

      // Re-acquire after visibility change (required by spec)
      function onVisibilityChange() {
        if (document.visibilityState === "visible") {
          acquireLock();
        }
      }

      acquireLock();
      document.addEventListener("visibilitychange", onVisibilityChange);

      return () => {
        document.removeEventListener("visibilitychange", onVisibilityChange);
        wakeLockRef.current?.release();
        wakeLockRef.current = null;
      };
    } else {
      // Native: iOS / Android
      activateKeepAwakeAsync(KEEP_AWAKE_TAG);
      return () => {
        deactivateKeepAwake(KEEP_AWAKE_TAG);
      };
    }
  }, []);
}
