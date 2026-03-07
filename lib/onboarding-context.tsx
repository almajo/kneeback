import { createContext, useContext, useState, type ReactNode } from "react";
import type { GraftType, KneeSide } from "./types";

interface OnboardingData {
  username: string;
  surgeryDate: string;
  graftType: GraftType | null;
  kneeSide: KneeSide | null;
  selectedExerciseIds: string[];
  reminderHour: number;
  reminderMinute: number;
  eveningNudge: boolean;
}

interface OnboardingContextType {
  data: OnboardingData;
  update: (partial: Partial<OnboardingData>) => void;
}

const OnboardingContext = createContext<OnboardingContextType>(null!);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<OnboardingData>({
    username: "",
    surgeryDate: new Date().toISOString().split("T")[0],
    graftType: null,
    kneeSide: null,
    selectedExerciseIds: [],
    reminderHour: 9,
    reminderMinute: 0,
    eveningNudge: true,
  });

  const update = (partial: Partial<OnboardingData>) =>
    setData((prev) => ({ ...prev, ...partial }));

  return (
    <OnboardingContext.Provider value={{ data, update }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export const useOnboarding = () => useContext(OnboardingContext);
