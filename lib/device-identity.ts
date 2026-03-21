import AsyncStorage from "@react-native-async-storage/async-storage";
import { generateId } from "./utils/uuid";

const DEVICE_ID_KEY = "device_id";
const DEVICE_ANIMAL_NAME_KEY = "device_animal_name";

const ADJECTIVES = [
  "Brave",
  "Swift",
  "Bold",
  "Calm",
  "Wise",
  "Keen",
  "Warm",
  "Bright",
  "Gentle",
  "Steady",
  "Noble",
  "Quick",
  "Loyal",
  "Proud",
  "Hardy",
];

const ANIMALS = [
  "Penguin",
  "Otter",
  "Eagle",
  "Falcon",
  "Heron",
  "Badger",
  "Lynx",
  "Moose",
  "Panda",
  "Raven",
  "Seal",
  "Tiger",
  "Wolf",
  "Crane",
  "Bison",
];

function generateUUID(): string {
  return generateId();
}

function generateAnimalName(): string {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `${adjective} ${animal}`;
}

export async function getDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) {
    return existing;
  }

  const newId = generateUUID();
  await AsyncStorage.setItem(DEVICE_ID_KEY, newId);
  return newId;
}

export async function getDeviceAnimalName(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_ANIMAL_NAME_KEY);
  if (existing) {
    return existing;
  }

  const newName = generateAnimalName();
  await AsyncStorage.setItem(DEVICE_ANIMAL_NAME_KEY, newName);
  return newName;
}
