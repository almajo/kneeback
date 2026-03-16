import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useOnboarding } from '../../lib/onboarding-context';
import { MuscleTag } from '../../components/MuscleTag';
import { Colors } from '../../constants/colors';
import { PHASE_DISPLAY_NAMES, getPhaseFromDays } from '../../lib/phase-gates';
import {
  filterExercisesBySurgeryStatus,
  getQuickSetupExercises,
} from '../../lib/exercise-utils';
import type { Exercise } from '../../lib/types';
import type { SurgeryStatus } from '../../lib/hooks/use-today';

export default function QuickSetup() {
  const router = useRouter();
  const { data, toggleExercise } = useOnboarding();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  const surgeryStatus: SurgeryStatus = (() => {
    if (!data.surgeryDate) return 'no_date';
    const diff = Math.floor((Date.now() - new Date(data.surgeryDate).getTime()) / 86400000);
    return diff >= 0 ? 'post_surgery' : 'pre_surgery';
  })();
  const daysSinceSurgery = data.surgeryDate
    ? Math.max(0, Math.floor((Date.now() - new Date(data.surgeryDate).getTime()) / 86400000))
    : 0;
  const currentPhase = getPhaseFromDays(daysSinceSurgery, surgeryStatus);
  const phaseInfo = PHASE_DISPLAY_NAMES[currentPhase];

  const stablePhase = currentPhase;
  const stableStatus = surgeryStatus;
  const alreadySelected = data.selectedExercises.length > 0;

  useEffect(() => {
    supabase
      .from('exercises').select('*').eq('status', 'approved').order('sort_order')
      .then(({ data: exs }) => {
        const all = (exs as Exercise[]) || [];
        setExercises(all);
        if (!alreadySelected) {
          const quickSet = getQuickSetupExercises(all, stablePhase, stableStatus);
          for (const ex of quickSet) toggleExercise(ex);
        }
        setLoading(false);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const quickExercises = getQuickSetupExercises(exercises, currentPhase, surgeryStatus);

  if (loading) {
    return <View className="flex-1 bg-background items-center justify-center"><ActivityIndicator color={Colors.primary} size="large" /></View>;
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 160 }}>
        <Text className="text-3xl font-bold text-primary mb-2">Your starter plan</Text>
        <Text className="text-base mb-6" style={{ color: '#6B6B6B' }}>
          Based on your current phase, we've pre-selected the recommended exercises. You can customise anytime.
        </Text>
        <View className="bg-surface border border-border rounded-2xl p-4 mb-6">
          <Text className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#888' }}>
            {phaseInfo.label} — {quickExercises.length} exercises selected
          </Text>
          {quickExercises.map(ex => (
            <View key={ex.id} className="flex-row items-center gap-2 mb-3">
              <Text style={{ color: Colors.success, fontSize: 14 }}>✓</Text>
              <Text className="font-medium flex-1" style={{ color: Colors.text }}>{ex.name}</Text>
              <View className="flex-row gap-1">
                {ex.muscle_groups.slice(0, 2).map(g => <MuscleTag key={g} group={g} />)}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
      <View className="absolute bottom-0 left-0 right-0 bg-background px-6 pb-8 pt-4 border-t border-border gap-3">
        <TouchableOpacity className="bg-primary rounded-2xl py-4 items-center" onPress={() => router.push('/(onboarding)/set-reminder')}>
          <Text className="text-white font-bold text-lg">Start with this plan</Text>
        </TouchableOpacity>
        <TouchableOpacity className="rounded-2xl py-4 items-center border border-border bg-surface" onPress={() => router.push('/(onboarding)/pick-exercises')}>
          <Text className="font-semibold text-base" style={{ color: Colors.textSecondary }}>Customise exercises</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
