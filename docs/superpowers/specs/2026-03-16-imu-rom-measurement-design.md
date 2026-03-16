# IMU-Based Knee ROM Measurement

**Date:** 2026-03-16
**Status:** Approved

---

## Overview

Add an in-app knee Range of Motion (ROM) measurement feature using the phone's IMU (accelerometer). Users can measure flexion directly with their phone instead of entering numbers manually.

ROM is measured **relative to the patient's own full extension** — not against absolute horizontal. This matches standard goniometry practice, where a patient's personal neutral position is the reference, regardless of whether they achieve true 0°.

---

## User Flow

Entry point: the existing **LogRomSheet** (Progress tab) gets a "Use Phone Sensor" button. Tapping it opens a fullscreen guided wizard modal. On wizard completion, results are returned via a callback that pre-fills the sheet's flexion field. The user then confirms and saves via the existing sheet flow.

If `Accelerometer.isAvailableAsync()` returns false (desktop browser), the "Use Phone Sensor" button is hidden — manual entry remains available.

### 4-Step Wizard

1. **Position** — Illustrated instructions: lie flat on back, leg as straight as possible, phone resting face-up on the shin (landscape orientation). User taps "Ready" when in position.

2. **Calibrate on shin** — Phone is already in place on the shin. App collects accelerometer samples at 20 Hz, waits for stability (see definition below), then locks the current pitch as `reference = 0°`. This is the patient's personal full-extension baseline. Haptic (`notificationAsync(success)`) + checkmark confirms. If the phone is still moving or the magnitude deviates from 9.81 m/s² by more than 0.5 m/s², calibration is rejected and the user is prompted to hold still and retry.

3. **Measure Flexion** — User bends knee (heel slides toward glutes). Large live angle readout updates in real time, showing degrees from the calibrated reference. App auto-captures the peak angle when movement stops for 2 consecutive seconds. A "Capture now" button appears after 10 seconds as a manual fallback for users who can't hold still (spasms, pain). Haptic + green lock animation confirms. The recorded value is `flexionDegrees`.

4. **Review & Save** — Shows "Flexion 112°" with delta vs last measurement if available (e.g. "+8° since last time"). Two actions: **Save** calls `onComplete({ flexionDegrees })` and closes the wizard; **Retake** jumps back to Step 2 (re-calibrate on shin) to start over.

---

## Technical Architecture

### Sensor Math

The phone rests flat on the shin, face up, in landscape orientation. Pitch is measured in the sagittal plane:

```
pitch = atan2(ax, sqrt(ay² + az²))   // radians → degrees
```

Where `ax`, `ay`, `az` are accelerometer readings in m/s². `ax` runs along the phone's length (the shin axis).

**Calibration:** The pitch value at stable full extension is stored as `referenceAngle`.

**Flexion reported:** `flexionDegrees = Math.round(peakPitch − referenceAngle)`

**Extension in DB:** `extension_degrees` is saved as `0` (the reference), reflecting that the patient measured from their personal full extension. This preserves schema compatibility without implying the leg is anatomically at true 0°.

**Dynamic motion rejection:** Samples where `|accel_magnitude − 9.81| > 0.5` are discarded from stability and peak calculations.

### Stability Detection

- **Update interval:** `Accelerometer.setUpdateInterval(50)` → 20 Hz
- **Rolling window:** last 20 samples (1 second)
- **Stable:** standard deviation of pitch over the rolling window < 0.5°
- **Locked:** stable condition maintained for 2 consecutive seconds (40 samples)
- **Reset:** if stability breaks before lock, countdown resets silently and restarts

### New Hook: `useImuMeasurement()`

Wraps `expo-sensors` (`Accelerometer` only).

- **Availability check** — `Accelerometer.isAvailableAsync()` on mount; exposes `isAvailable: boolean`
- **iOS web permission** — checks `typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function'`; if true, calls `requestPermission()` from the calibration step's button tap handler
- **Calibration** — waits for stability on the shin, locks `referenceAngle`
- **Pitch computation** — real-time `atan2(ax, sqrt(ay² + az²))`
- **Peak tracking** — tracks maximum `pitch − referenceAngle` seen during flexion measurement
- **Stability detection** — rolling window as above
- **Cleanup** — subscription removed on `stopMeasurement()` and on unmount
- **Exposed API:**
  ```ts
  {
    isAvailable: boolean,
    calibrate: () => Promise<'success' | 'failed'>,
    startMeasurement: () => void,
    stopMeasurement: () => void,
    currentAngle: number,       // current pitch − referenceAngle, in degrees
    peakAngle: number | null,   // max currentAngle seen
    stableProgress: number,     // 0–1, proportion of 2s stability window filled
    isLocked: boolean,          // true when peak auto-captured
    reset: () => void,
  }
  ```

### State Machine: `RomMeasurementWizard`

```
position → calibrate → flexion → review
               ↑                    |
               └────── retake ──────┘  (re-calibrate + re-measure)
```

On `retake`: reset `flexionDegrees` and `referenceAngle`, go back to Step 2.

### New Components

| Component | Responsibility |
|-----------|---------------|
| `RomMeasurementWizard` | Fullscreen `Modal` (`animationType="slide"`); owns step state; accepts `onComplete`, `onDismiss`, and optional `lastMeasurement` prop. `onRequestClose` (Android back) maps to `onDismiss`. |
| `PositionStep` | Illustrated instructions (static image asset — phone on shin, lying flat), "Ready" CTA |
| `CalibrationStep` | Shin calibration UI; handles iOS web `requestPermission`; stability progress indicator; retry on failure |
| `MeasurementStep` | Live angle readout; circular progress ring for stability countdown (resets on movement); green lock animation; "Capture now" fallback after 10s |
| `MeasurementReview` | Summary with delta vs `lastMeasurement` if provided; Save / Retake actions |

### Entry Point: `LogRomSheet` changes

1. Call `useImuMeasurement()` inside the sheet to get `isAvailable`
2. Render "Use Phone Sensor" button only when `isAvailable === true`
3. Accept new optional prop: `lastMeasurement?: RomMeasurement` (passed from `progress.tsx` as `measurements[0] ?? null`)
4. Button opens `RomMeasurementWizard` with:
   - `onComplete: ({ flexionDegrees }) => { setFlexion(String(flexionDegrees)); setExtension('0'); }` — values are already rounded integers; `extension` is set to `'0'` per design
   - `lastMeasurement`: forwarded from prop
   - `onDismiss`: closes modal, no state changes
5. Wizard closes; sheet fields are pre-filled; user confirms via existing Save button

### Database

No schema changes required. `extension_degrees` is saved as `0`; `flexion_degrees` gets the measured value.

> Future: consider `source: 'manual' | 'imu'` column for audit purposes.

---

## Platform Behaviour

| Platform | Behaviour |
|----------|-----------|
| iOS native | Full support |
| Android native | Full support |
| iOS Safari / Chrome on iOS | Full support; `DeviceMotionEvent.requestPermission()` called on calibration tap, guarded by `typeof` check |
| Android mobile browser | Full support; no permission dialog needed |
| Desktop browser | `isAvailable === false`; button hidden |

---

## Error Handling

| Scenario | Behaviour |
|----------|-----------|
| Calibration: phone still moving | Retry prompt: "Hold the phone still on your shin" |
| Calibration: magnitude out of range | Retry prompt: "Keep your leg flat and hold still" |
| iOS permission denied | "Motion access required. Enable in Settings > Safari > Motion & Orientation Access" |
| Sensor lost mid-measurement | Alert with option to retry from current step |
| Angle > 155° or < -10° | Discard sample, do not update peak, show subtle warning |
| Wizard abandoned (back / swipe / Android back button) | Discard all partial values; `LogRomSheet` remains open, fields unchanged |

---

## Dependencies

- `expo-sensors` (new — verify SDK 54 compatible version, expected `~14.0.x`) — `Accelerometer` only
- `expo-haptics` (already installed) — `notificationAsync(success)` on calibration lock and flexion lock

---

## Testing

- **Unit:** `useImuMeasurement()` with mocked `Accelerometer` — calibration success/failure, pitch formula, stability detection, peak tracking, cleanup on unmount
- **Unit:** Pure angle math — `atan2` formula with known input vectors
- **Unit:** `RomMeasurementWizard` state machine — all transitions including retake
- **E2E (Playwright):** Mock `Accelerometer` on web; full wizard flow from LogRomSheet → calibrate → flex → save → Progress tab updated
- **Manual:** Physical iOS + Android validation against a physical goniometer
