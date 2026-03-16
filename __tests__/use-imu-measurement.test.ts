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
