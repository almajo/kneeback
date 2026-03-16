# IMU-Based Knee ROM Measurement

**Date:** 2026-03-16
**Status:** Approved

---

## Overview

Add an in-app knee Range of Motion (ROM) measurement feature using the phone's IMU (accelerometer). Users can measure flexion and extension directly with their phone instead of entering numbers manually.

---

## User Flow

Entry point: the existing **LogRomSheet** (Progress tab) gets a "Use Phone Sensor" button. Tapping it opens a fullscreen guided wizard modal. On wizard completion, results are returned via a callback that pre-fills the sheet's flexion/extension fields. The user then confirms and saves via the existing sheet flow.

If `Accelerometer.isAvailableAsync()` returns false (desktop browser), the "Use Phone Sensor" button is hidden entirely — manual entry remains available.

### 5-Step Wizard

1. **Calibrate** — User places phone flat on a hard surface (floor/table). App collects accelerometer samples at 20 Hz for 2 seconds (40 samples). The average magnitude of all samples is computed for quality validation only (used to reject if phone moved — see Error Handling). Haptic (`notificationAsync(success)`) + checkmark confirms. If the magnitude of any sample deviates from 9.81 m/s² by more than 0.5 m/s² during the 2s window (phone was picked up or moved), the calibration is rejected and the user is prompted to retry. Note: calibration does not produce a reference vector used in pitch math — it only validates the phone was held still.

2. **Position** — Illustrated instructions: lie flat on back, leg fully extended, phone resting face-up on the shin (landscape orientation). User taps "Ready" when in position. No angle is recorded here — this step is instructional only.

3. **Measure Extension** — App starts measuring immediately. Leg is flat, so the angle should be close to 0°. Auto-captures the current pitch when stable for 2 consecutive seconds (see stability definition below). Haptic (`notificationAsync(success)`) + green lock animation confirms. The recorded value is `extensionDegrees`. If the leg cannot be held still for 2 seconds, a "Capture now" button appears after 10 seconds as a manual fallback.

4. **Measure Flexion** — User bends knee (heel slides toward glutes). Large live angle readout updates in real time. App auto-captures the peak pitch when movement stops for 2 consecutive seconds. The reported value is `peakPitch − extensionBaseline`. Haptic + green lock confirms. The recorded value is `flexionDegrees`. Same "Capture now" fallback appears after 10 seconds.

5. **Review & Save** — Shows "Flexion 112° · Extension 3°" with delta vs last measurement if available (e.g. "+8° flexion"). Two actions: **Save** calls `onComplete({ flexionDegrees, extensionDegrees })` and closes the wizard; **Retake** shows options "Retake Flexion" (jumps to Step 4, keeping the existing `extensionDegrees`) or "Retake Extension" (jumps to Step 3, keeping the existing `flexionDegrees`). Calibration is not re-run on retake.

---

## Technical Architecture

### Sensor Math

The phone is placed flat on the shin, face up, in landscape orientation. We measure the **pitch** of the phone in the sagittal plane (forward/backward tilt).

```
pitch = atan2(ax, sqrt(ay² + az²))   // in radians, convert to degrees
```

Where `ax`, `ay`, `az` are the accelerometer readings in m/s².

- `ax` is the axis running along the phone's length (the shin axis)
- `pitch` is the angle of tilt away from horizontal
- When the leg is flat, pitch ≈ 0°; when fully bent, pitch approaches the knee's flexion angle

**Extension baseline:** The pitch captured in Step 3 (`extensionBaseline`). This accounts for the fact that a "straight" leg may not be perfectly horizontal.

**Flexion angle reported:** `flexionDegrees = peakPitch − extensionBaseline`

**Extension angle reported:** `extensionDegrees = extensionBaseline` (how far from true horizontal the leg rests at full extension — clinically relevant for hyperextension tracking)

**Dynamic motion rejection:** Any sample where `|accel_magnitude − 9.81| > 0.5` (i.e. the phone is being shaken or moved aggressively) is discarded from stability and peak calculations.

### Stability Detection

- **Update interval:** `Accelerometer.setUpdateInterval(50)` → 20 Hz
- **Rolling window:** last 20 samples (1 second)
- **Stable:** standard deviation of pitch over the rolling window < 0.5°
- **Locked:** stable condition maintained for 2 consecutive seconds (40 samples)
- **Reset:** if stability is broken before lock (movement detected), countdown resets silently and restarts

### New Hook: `useImuMeasurement()`

Wraps `expo-sensors` (`Accelerometer` only). Responsibilities:

- **Availability check** — `Accelerometer.isAvailableAsync()` on mount; exposes `isAvailable: boolean`
- **iOS web permission** — before starting, checks `typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function'`; if true, calls `requestPermission()` from the calibration step's button tap handler
- **Calibration** — collects 40 samples at 20 Hz, validates that all sample magnitudes are within 0.5 m/s² of 9.81 (no `referenceVector` stored — calibration only validates phone was still)
- **Pitch computation** — real-time `atan2(ax, sqrt(ay² + az²))` from accelerometer stream
- **Peak tracking** — for flexion: tracks maximum pitch seen (`peakAngle`); for extension: `peakAngle` is not used — `currentAngle` at lock time is recorded as `extensionBaseline`
- **Stability detection** — rolling window variance as described above
- **Exposed API:**
  ```ts
  {
    isAvailable: boolean,
    calibrate: () => Promise<'success' | 'failed'>,
    startMeasurement: (mode: 'flexion' | 'extension') => void,
    stopMeasurement: () => void,
    currentAngle: number,       // current pitch in degrees
    peakAngle: number | null,   // max (flexion) or min (extension) seen
    stableProgress: number,     // 0–1, proportion of 2s stability window filled
    isLocked: boolean,          // true when peak auto-captured
    reset: () => void,
  }
  ```

### State Machine: `RomMeasurementWizard`

```
calibrate → position → extension → flexion → review
                            ↑           ↑
                       retake-ext   retake-flex  (from review, skip calibrate & position)
```

On `retake-ext`: reset `extensionDegrees`, go to Step 3.
On `retake-flex`: reset `flexionDegrees`, go to Step 4.
On both retakes: `isLocked` is reset, existing other value is preserved.

### New Components

| Component | Responsibility |
|-----------|---------------|
| `RomMeasurementWizard` | Fullscreen modal; owns wizard step state; accepts `onComplete` callback and optional `lastMeasurement` prop |
| `CalibrationStep` | Flat surface calibration UI; handles iOS web permission request; shows retry on failure |
| `PositionStep` | Illustrated positioning instructions (static image asset), "Ready" CTA |
| `MeasurementStep` | Reusable for both extension and flexion; accepts `mode: 'flexion' \| 'extension'`; shows live angle readout, circular progress ring for stability countdown (resets on movement), green lock animation on capture |
| `MeasurementReview` | Summary with deltas (if `lastMeasurement` provided), Save / Retake actions |

### Entry Point: `LogRomSheet` changes

1. Add `isAvailable` check via `useImuMeasurement()` inside the sheet
2. Add "Use Phone Sensor" button — only rendered when `isAvailable === true`
3. `LogRomSheet` receives a new optional prop `lastMeasurement?: RomMeasurement` from `progress.tsx` (which already has `measurements[0]` available in its state via the existing data fetch)
4. Button opens `RomMeasurementWizard` as a `Modal` (`transparent={false}`, `animationType="slide"`) with:
   - `onComplete: ({ flexionDegrees, extensionDegrees }) => { setFlexion(String(Math.round(flexionDegrees))); setExtension(String(Math.round(extensionDegrees))); }` — values are rounded to integers before setting sheet state, matching the existing `parseInt` save path
   - `lastMeasurement`: passed through from the prop
   - `onDismiss`: closes modal, no state changes
5. Wizard closes on complete; sheet fields are pre-filled; user confirms save via existing sheet Save button
6. Android hardware back button: `Modal`'s `onRequestClose` maps to `onDismiss` (same as swipe dismiss)

### Database

No schema changes required. `rom_measurements` already has `flexion_degrees` and `extension_degrees`.

> Note for future: consider adding a `source` enum (`'manual' | 'imu'`) column for audit purposes.

---

## Platform Behaviour

| Platform | Behaviour |
|----------|-----------|
| iOS native | Full support |
| Android native | Full support |
| iOS Safari / Chrome on iOS | Full support; `DeviceMotionEvent.requestPermission()` called on calibration tap (WebKit-only API, guarded by `typeof` check) |
| Android mobile browser | Full support; no permission dialog needed |
| Desktop browser | `isAvailable === false`; "Use Phone Sensor" button hidden |

---

## Error Handling

| Scenario | Behaviour |
|----------|-----------|
| Calibration sample invalid (phone moved) | Reject + retry prompt: "Keep the phone still on a flat surface" |
| iOS permission denied | Show message: "Motion access is required. Enable it in Settings > Safari > Motion & Orientation Access" |
| Sensor lost mid-measurement | Alert: "Sensor connection lost" with option to retry from current step |
| Angle out of physiological range (>175° or <-10°) | Discard sample, do not update peak, show subtle warning indicator |
| Wizard abandoned (back / swipe dismiss) | Discard all partial values; `LogRomSheet` remains open, fields unchanged |

---

## Dependencies

- `expo-sensors` (new install, verify compatibility with SDK 54) — `Accelerometer` only
- `expo-haptics` (already installed) — `notificationAsync(success)` on calibration and lock

---

## Testing

- **Unit:** `useImuMeasurement()` with mocked `Accelerometer` subscription — test calibration success/failure, pitch calculation correctness, stability detection, peak tracking for both modes
- **Unit:** Angle math functions (pure) — test `atan2` pitch formula with known vectors
- **Unit:** `RomMeasurementWizard` state machine — test all step transitions including retake paths
- **E2E (Playwright):** Mock `Accelerometer` on web; test full wizard flow from LogRomSheet → calibrate → extension → flexion → save → Progress tab shows updated ROM values
- **Manual:** Physical device testing on iOS and Android for accuracy validation against a physical goniometer
