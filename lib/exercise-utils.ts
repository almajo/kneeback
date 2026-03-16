import type { Exercise, ExercisePhase } from './types';
import type { SurgeryStatus } from './hooks/use-today';
import { PHASES_ORDERED } from './phase-gates';

const PHASE_ORDER: ExercisePhase[] = PHASES_ORDERED.map(p => p.key);

function phaseIndex(phase: ExercisePhase): number {
  return PHASE_ORDER.indexOf(phase);
}

/**
 * Returns the display phase key for an exercise given the current surgery status.
 * Post-op: exercises with phase_start='prehab' are remapped to 'acute'.
 */
export function displayPhaseFor(
  exercise: Exercise,
  surgeryStatus: SurgeryStatus
): ExercisePhase {
  if (surgeryStatus === 'post_surgery' && exercise.phase_start === 'prehab') {
    return 'acute';
  }
  return exercise.phase_start;
}

/**
 * Filter exercises to those visible for the given surgery status.
 * Pre-surgery / no_date: only prehab exercises.
 * Post-surgery: all non-prehab + prehab exercises that extend past prehab.
 */
export function filterExercisesBySurgeryStatus(
  exercises: Exercise[],
  surgeryStatus: SurgeryStatus
): Exercise[] {
  if (surgeryStatus === 'pre_surgery' || surgeryStatus === 'no_date') {
    return exercises.filter(e => e.phase_start === 'prehab');
  }
  return exercises.filter(e => {
    if (e.phase_start !== 'prehab') return true;
    const endIdx = e.phase_end ? phaseIndex(e.phase_end) : Infinity;
    return endIdx > phaseIndex('prehab');
  });
}

/**
 * Group exercises by their display phase (after surgery status remapping).
 */
export function groupExercisesByDisplayPhase(
  exercises: Exercise[],
  surgeryStatus: SurgeryStatus
): Map<ExercisePhase, Exercise[]> {
  const map = new Map<ExercisePhase, Exercise[]>();
  for (const ex of exercises) {
    const phase = displayPhaseFor(ex, surgeryStatus);
    if (!map.has(phase)) map.set(phase, []);
    map.get(phase)!.push(ex);
  }
  return map;
}

/**
 * Returns primary exercises sorted by sort_order.
 */
export function getPrimaryExercises(exercises: Exercise[]): Exercise[] {
  return exercises.filter(e => e.role === 'primary').sort((a, b) => a.sort_order - b.sort_order);
}

/**
 * Returns alternatives for a given primary exercise.
 */
export function getAlternatives(exercises: Exercise[], primaryId: string): Exercise[] {
  return exercises
    .filter(e => e.role === 'alternative' && e.primary_exercise_id === primaryId)
    .sort((a, b) => a.sort_order - b.sort_order);
}

/**
 * Returns optional exercises sorted by sort_order.
 */
export function getOptionalExercises(exercises: Exercise[]): Exercise[] {
  return exercises.filter(e => e.role === 'optional').sort((a, b) => a.sort_order - b.sort_order);
}

/**
 * Returns primary exercises for the user's current phase (for quick setup onboarding).
 */
export function getQuickSetupExercises(
  exercises: Exercise[],
  currentPhase: ExercisePhase,
  surgeryStatus: SurgeryStatus
): Exercise[] {
  const visible = filterExercisesBySurgeryStatus(exercises, surgeryStatus);
  const grouped = groupExercisesByDisplayPhase(visible, surgeryStatus);
  const phaseExercises = grouped.get(currentPhase) ?? [];
  return getPrimaryExercises(phaseExercises);
}
