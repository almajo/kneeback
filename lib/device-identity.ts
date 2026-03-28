import AsyncStorage from "@react-native-async-storage/async-storage";
import { generateId } from "./utils/uuid";

const DEVICE_ID_KEY = "device_id";

let _cachedDeviceId: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (_cachedDeviceId) return _cachedDeviceId;

  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) {
    _cachedDeviceId = existing;
    return existing;
  }

  const newId = generateId();
  await AsyncStorage.setItem(DEVICE_ID_KEY, newId);
  _cachedDeviceId = newId;
  return newId;
}
