import { View, Text } from 'react-native';
import type { ExerciseMuscleGroup } from '../lib/types';

const MUSCLE_COLORS: Record<ExerciseMuscleGroup, { bg: string; text: string }> = {
  Quad:        { bg: '#3B82F620', text: '#3B82F6' },
  Hamstring:   { bg: '#7C3AED20', text: '#7C3AED' },
  Hip:         { bg: '#F59E0B20', text: '#F59E0B' },
  Calf:        { bg: '#16A34A20', text: '#16A34A' },
  'Knee ROM':  { bg: '#0D948820', text: '#0D9488' },
  Core:        { bg: '#FF6B3520', text: '#FF6B35' },
  Glute:       { bg: '#E11D4820', text: '#E11D48' },
};

interface Props {
  group: ExerciseMuscleGroup;
}

export function MuscleTag({ group }: Props) {
  const colors = MUSCLE_COLORS[group];
  return (
    <View style={{ backgroundColor: colors.bg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
      <Text style={{ color: colors.text, fontSize: 10, fontWeight: '500' }}>{group}</Text>
    </View>
  );
}
