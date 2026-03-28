import { getDeviceId } from "./device-identity";
import type { LocalProfile } from "./db/repositories/profile-repo";

export interface CommunityIdentity {
  deviceId: string;
  animalName: string;
  phase: string;
}

export async function getCommunityIdentity(
  profile: LocalProfile | null
): Promise<CommunityIdentity> {
  const deviceId = await getDeviceId();
  const animalName = profile?.username ?? "Anonymous";

  let phase = "";
  if (profile?.surgery_date) {
    const surgeryMs = new Date(profile.surgery_date).getTime();
    const daysSince = Math.max(
      0,
      Math.floor((Date.now() - surgeryMs) / 86400000)
    );
    const week = Math.floor(daysSince / 7) + 1;
    phase = `Week ${week}`;
  }

  return { deviceId, animalName, phase };
}
