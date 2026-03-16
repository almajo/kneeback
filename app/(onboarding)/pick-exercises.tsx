import { useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useOnboarding } from '../../lib/onboarding-context';
import { ExerciseStepper } from '../../components/ExerciseStepper';
import { MuscleTag } from '../../components/MuscleTag';
import { Colors } from '../../constants/colors';
import { PHASE_COLORS, PHASE_DISPLAY_NAMES, PHASES_ORDERED, getPhaseFromDays } from '../../lib/phase-gates';
import {
  filterExercisesBySurgeryStatus,
  groupExercisesByDisplayPhase,
  getPrimaryExercises,
  getAlternatives,
  getOptionalExercises,
} from '../../lib/exercise-utils';
import type { Exercise, ExercisePhase } from '../../lib/types';
import type { SurgeryStatus } from '../../lib/hooks/use-today';

export default function PickExercises() {
  const router = useRouter();
  const { data, toggleExercise, isSelected, updateExerciseValues } = useOnboarding();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expandedAlternatives, setExpandedAlternatives] = useState<Set<string>>(new Set());
  const [expandedOptionals, setExpandedOptionals] = useState<Set<string>>(new Set());

  const surgeryStatus: SurgeryStatus = (() => {
    if (!data.surgeryDate) return 'no_date';
    const diff = Math.floor((Date.now() - new Date(data.surgeryDate).getTime()) / 86400000);
    return diff >= 0 ? 'post_surgery' : 'pre_surgery';
  })();
  const daysSinceSurgery = data.surgeryDate
    ? Math.max(0, Math.floor((Date.now() - new Date(data.surgeryDate).getTime()) / 86400000))
    : 0;
  const currentPhase = getPhaseFromDays(daysSinceSurgery, surgeryStatus);

  useEffect(() => {
    supabase.from('exercises').select('*').eq('status', 'approved').order('sort_order')
      .then(({ data: exs, error: err }) => {
        if (err) setError('Could not load exercises. Check your connection.');
        else setExercises((exs as Exercise[]) || []);
        setLoading(false);
      });
  }, []);

  const searchLower = search.toLowerCase();
  const matchesSearch = (ex: Exercise) => !search || ex.name.toLowerCase().includes(searchLower);
  const visible = filterExercisesBySurgeryStatus(exercises, surgeryStatus);
  const grouped = groupExercisesByDisplayPhase(visible, surgeryStatus);
  const postOpPhases: ExercisePhase[] = ['acute','early_active','strengthening','advanced_strengthening','return_to_sport'];
  const activePhases: ExercisePhase[] = surgeryStatus === 'post_surgery' ? postOpPhases : ['prehab'];

  if (error) return <View className="flex-1 bg-background items-center justify-center px-6"><Text className="text-base text-center" style={{ color: '#6B6B6B' }}>{error}</Text></View>;
  if (loading) return <View className="flex-1 bg-background items-center justify-center"><ActivityIndicator color={Colors.primary} size="large" /></View>;

  return (
    <View className="flex-1 bg-background">
      <View className="px-6 pt-14 pb-2">
        <Text className="text-3xl font-bold text-primary mb-1">Your exercises</Text>
        <Text className="text-base mb-3" style={{ color: '#6B6B6B' }}>Select exercises your physio has prescribed. Future phases unlock as you progress.</Text>
        <TextInput className="bg-surface border border-border rounded-2xl px-4 py-3 text-base"
          placeholder="Search exercises..." value={search} onChangeText={setSearch} placeholderTextColor={Colors.textMuted} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}>
        {activePhases.map(phaseKey => {
          const phaseExercises = grouped.get(phaseKey) ?? [];
          if (phaseExercises.length === 0) return null;
          const phaseEntry = PHASES_ORDERED.find(p => p.key === phaseKey)!;
          const displayInfo = PHASE_DISPLAY_NAMES[phaseKey];
          const phaseColor = PHASE_COLORS[phaseKey];
          const isLocked = phaseKey !== 'prehab' && daysSinceSurgery < phaseEntry.unlockDay;
          const isCurrent = phaseKey === currentPhase;
          const unlockWeek = Math.ceil(phaseEntry.unlockDay / 7);
          const strengthening = phaseExercises.filter(e => e.category === 'strengthening' || e.category === 'activation');
          const mobility = phaseExercises.filter(e => e.category === 'rom');
          const optionals = getOptionalExercises(phaseExercises);
          const optionalsExpanded = expandedOptionals.has(phaseKey);

          return (
            <View key={phaseKey} style={{ opacity: isLocked ? 0.5 : 1, marginBottom: 8 }}>
              <View className="flex-row items-center justify-between py-3 mt-2">
                <View>
                  <View className="flex-row items-center gap-2">
                    <Text className="font-bold text-base" style={{ color: isLocked ? '#A0A0A0' : phaseColor }}>{displayInfo.label}</Text>
                    {isCurrent && (
                      <View style={{ backgroundColor: phaseColor + '22', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text style={{ color: phaseColor, fontSize: 10, fontWeight: '600' }}>Current</Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-xs" style={{ color: '#A0A0A0' }}>{displayInfo.weekRange}</Text>
                </View>
                {isLocked && (
                  <View className="bg-surface border border-border rounded-full px-3 py-1">
                    <Text className="text-xs" style={{ color: '#A0A0A0' }}>🔒 Unlocks week {unlockWeek}</Text>
                  </View>
                )}
              </View>

              {[{ label: 'Strengthening', exs: strengthening }, { label: 'Mobility', exs: mobility }].map(({ label, exs }) =>
                exs.length > 0 ? (
                  <View key={label} className="mb-3">
                    <Text className="text-xs font-semibold uppercase tracking-wider mb-2 px-1" style={{ color: '#666' }}>{label}</Text>
                    {getPrimaryExercises(exs).filter(matchesSearch).map(primary => {
                      const alts = getAlternatives(phaseExercises, primary.id).filter(matchesSearch);
                      const altExpanded = expandedAlternatives.has(primary.id);
                      const selected = isSelected(primary.id);
                      const selEx = data.selectedExercises.find(e => e.exerciseId === primary.id);
                      return (
                        <View key={primary.id}>
                          <OnboardingRow exercise={primary} locked={isLocked} selected={selected} selEx={selEx}
                            onToggle={() => !isLocked && toggleExercise(primary)}
                            onStepperChange={(f, v) => updateExerciseValues(primary.id, { [f]: v })}
                            alternativesCount={alts.length} altExpanded={altExpanded}
                            onToggleAlternatives={() => setExpandedAlternatives(prev => { const n = new Set(prev); if (altExpanded) n.delete(primary.id); else n.add(primary.id); return n; })} />
                          {altExpanded && alts.map(alt => {
                            const altSel = isSelected(alt.id);
                            const altSelEx = data.selectedExercises.find(e => e.exerciseId === alt.id);
                            return (
                              <View key={alt.id} style={{ marginLeft: 16 }}>
                                <OnboardingRow exercise={alt} locked={isLocked} selected={altSel} selEx={altSelEx}
                                  onToggle={() => !isLocked && toggleExercise(alt)}
                                  onStepperChange={(f, v) => updateExerciseValues(alt.id, { [f]: v })} />
                              </View>
                            );
                          })}
                        </View>
                      );
                    })}
                  </View>
                ) : null
              )}

              {optionals.length > 0 && (
                <View className="mb-2">
                  <TouchableOpacity
                    className="flex-row items-center justify-between px-3 py-2 rounded-xl bg-surface border border-border"
                    onPress={() => setExpandedOptionals(prev => { const n = new Set(prev); if (optionalsExpanded) n.delete(phaseKey); else n.add(phaseKey); return n; })}
                    disabled={isLocked}
                  >
                    <Text className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#666' }}>Optional exercises</Text>
                    <Text style={{ color: '#666', fontSize: 11 }}>{optionals.length} exercises {optionalsExpanded ? '▾' : '▸'}</Text>
                  </TouchableOpacity>
                  {optionalsExpanded && optionals.filter(matchesSearch).map(ex => {
                    const selected = isSelected(ex.id);
                    const selEx = data.selectedExercises.find(e => e.exerciseId === ex.id);
                    return <OnboardingRow key={ex.id} exercise={ex} locked={isLocked} selected={selected} selEx={selEx}
                      onToggle={() => !isLocked && toggleExercise(ex)}
                      onStepperChange={(f, v) => updateExerciseValues(ex.id, { [f]: v })} />;
                  })}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 bg-background px-6 pb-8 pt-4 border-t border-border">
        <TouchableOpacity className="bg-primary rounded-2xl py-4 items-center" onPress={() => router.push('/(onboarding)/set-reminder')}>
          <Text className="text-white font-bold text-lg">Next → ({data.selectedExercises.length} selected)</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

interface OnboardingRowProps {
  exercise: Exercise;
  locked: boolean;
  selected: boolean;
  selEx: { sets: number; reps: number; hold_seconds: number | null } | undefined;
  onToggle: () => void;
  onStepperChange: (field: 'sets' | 'reps' | 'hold_seconds', value: number) => void;
  alternativesCount?: number;
  altExpanded?: boolean;
  onToggleAlternatives?: () => void;
}

function OnboardingRow({ exercise, locked, selected, selEx, onToggle, onStepperChange, alternativesCount = 0, altExpanded = false, onToggleAlternatives }: OnboardingRowProps) {
  const sets = selEx?.sets ?? exercise.default_sets;
  const reps = selEx?.reps ?? exercise.default_reps;
  const holdSeconds = selEx?.hold_seconds ?? exercise.default_hold_seconds;
  const previewLabel = `${sets} sets × ${holdSeconds ? `${holdSeconds}s hold` : `${reps} reps`}`;

  return (
    <TouchableOpacity
      className={`mb-2 rounded-2xl border ${locked ? 'bg-surface border-border opacity-40' : selected ? 'bg-primary/10 border-primary' : 'bg-surface border-border'}`}
      onPress={onToggle} disabled={locked} activeOpacity={0.8}
    >
      <View className="flex-row items-start p-4">
        <Ionicons name={selected && !locked ? 'checkmark-circle' : 'ellipse-outline'} size={24}
          color={selected && !locked ? Colors.primary : Colors.textMuted} style={{ marginRight: 12, marginTop: 2 }} />
        <View className="flex-1">
          <View className="flex-row flex-wrap items-center gap-1 mb-1">
            <Text className="font-semibold text-base" style={{ color: locked ? '#A0A0A0' : Colors.text }}>{exercise.name}</Text>
            {exercise.muscle_groups.map(g => <MuscleTag key={g} group={g} />)}
          </View>
          <Text className="text-sm" style={{ color: '#6B6B6B' }} numberOfLines={selected ? undefined : 2}>{exercise.description}</Text>
          <View className="flex-row items-center gap-2 mt-1">
            <Text className="text-xs" style={{ color: selected ? Colors.primary : '#A0A0A0' }}>{previewLabel}</Text>
            {alternativesCount > 0 && (
              <TouchableOpacity onPress={e => { e.stopPropagation?.(); onToggleAlternatives?.(); }}
                className="bg-surface border border-border rounded-full px-2 py-0.5">
                <Text className="text-xs" style={{ color: '#888' }}>{alternativesCount} alternative{alternativesCount > 1 ? 's' : ''} {altExpanded ? '▾' : '▸'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
      {selected && !locked && selEx && (
        <View className="px-4 pb-4 border-t border-primary/20 pt-3">
          <ExerciseStepper label="Sets" value={sets} min={1} max={10} onChange={v => onStepperChange('sets', v)} />
          {holdSeconds !== null ? (
            <ExerciseStepper label="Hold" value={holdSeconds} min={0} max={120} variableStep unit="s" onChange={v => onStepperChange('hold_seconds', v)} />
          ) : (
            <ExerciseStepper label="Reps" value={reps} min={1} max={50} onChange={v => onStepperChange('reps', v)} />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}
