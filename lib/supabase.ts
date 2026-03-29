import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import { type Database } from "./database.types";
import { largeSecureStore } from "./secure-storage";
import { getDeviceId } from "./device-identity";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

const fetchWithDeviceId = async (
  url: RequestInfo | URL,
  options: RequestInit = {}
): Promise<Response> => {
  const deviceId = await getDeviceId();
  const existingHeaders =
    options.headers instanceof Headers
      ? Object.fromEntries(options.headers.entries())
      : (options.headers ?? {});
  return fetch(url, {
    ...options,
    headers: {
      ...existingHeaders,
      "x-device-id": deviceId,
    },
  });
};

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    storage: largeSecureStore,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    fetch: fetchWithDeviceId,
  },
});
