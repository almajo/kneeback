import { createContext, useContext, useState, type ReactNode } from "react";
import type { GraftType, KneeSide, Exercise } from "./types";

export interface SelectedExercise {
  exerciseId: string;
  sets: number;
  reps: number;
  hold_seconds: number | null;
}

interface OnboardingData {
  name: string;
  username: string;
  surgeryDate: string;
  graftType: GraftType | null;
  kneeSide: KneeSide | null;
  selectedExercises: SelectedExercise[];
  reminderHour: number;
  reminderMinute: number;
  eveningNudge: boolean;
}

interface OnboardingContextType {
  data: OnboardingData;
  update: (partial: Partial<OnboardingData>) => void;
  toggleExercise: (exercise: Exercise) => void;
  isSelected: (id: string) => boolean;
  updateExerciseValues: (exerciseId: string, values: Partial<Omit<SelectedExercise, "exerciseId">>) => void;
}

const OnboardingContext = createContext<OnboardingContextType>(null!);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<OnboardingData>({
    name: "",
    username: "",
    surgeryDate: new Date().toISOString().split("T")[0],
    graftType: null,
    kneeSide: null,
    selectedExercises: [],
    reminderHour: 9,
    reminderMinute: 0,
    eveningNudge: true,
  });

  const update = (partial: Partial<OnboardingData>) =>
    setData((prev) => ({ ...prev, ...partial }));

  function toggleExercise(exercise: Exercise) {
    setData((prev) => {
      const exists = prev.selectedExercises.find((e) => e.exerciseId === exercise.id);
      if (exists) {
        return { ...prev, selectedExercises: prev.selectedExercises.filter((e) => e.exerciseId !== exercise.id) };
      }
      return {
        ...prev,
        selectedExercises: [
          ...prev.selectedExercises,
          {
            exerciseId: exercise.id,
            sets: exercise.default_sets,
            reps: exercise.default_reps,
            hold_seconds: exercise.default_hold_seconds,
          },
        ],
      };
    });
  }

  function isSelected(id: string) {
    return data.selectedExercises.some((e) => e.exerciseId === id);
  }

  function updateExerciseValues(exerciseId: string, values: Partial<Omit<SelectedExercise, "exerciseId">>) {
    setData((prev) => ({
      ...prev,
      selectedExercises: prev.selectedExercises.map((e) =>
        e.exerciseId === exerciseId ? { ...e, ...values } : e
      ),
    }));
  }

  return (
    <OnboardingContext.Provider value={{ data, update, toggleExercise, isSelected, updateExerciseValues }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export const useOnboarding = () => useContext(OnboardingContext);
