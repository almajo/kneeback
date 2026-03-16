import type { Exercise } from '../types';
import {
  filterExercisesBySurgeryStatus,
  displayPhaseFor,
  groupExercisesByDisplayPhase,
  getPrimaryExercises,
  getAlternatives,
  getOptionalExercises,
  getQuickSetupExercises,
} from '../exercise-utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeExercise(overrides: Partial<Exercise> & { id: string }): Exercise {
  return {
    name: 'Test Exercise',
    description: '',
    phase_start: 'prehab',
    phase_end: null,
    role: 'primary',
    primary_exercise_id: null,
    muscle_groups: [],
    default_sets: 3,
    default_reps: 10,
    default_hold_seconds: null,
    category: 'strengthening',
    submitted_by: null,
    status: 'approved',
    sort_order: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// filterExercisesBySurgeryStatus
// ---------------------------------------------------------------------------

describe('filterExercisesBySurgeryStatus', () => {
  const prehabOnly = makeExercise({ id: 'e1', phase_start: 'prehab', phase_end: 'prehab' });
  const prehabExtended = makeExercise({ id: 'e2', phase_start: 'prehab', phase_end: 'acute' });
  const prehabNullEnd = makeExercise({ id: 'e3', phase_start: 'prehab', phase_end: null });
  const acuteExercise = makeExercise({ id: 'e4', phase_start: 'acute', phase_end: null });

  describe('pre_surgery status', () => {
    it('returns only prehab exercises', () => {
      const result = filterExercisesBySurgeryStatus(
        [prehabOnly, prehabExtended, prehabNullEnd, acuteExercise],
        'pre_surgery'
      );
      expect(result.map(e => e.id)).toEqual(['e1', 'e2', 'e3']);
    });
  });

  describe('no_date status', () => {
    it('returns only prehab exercises', () => {
      const result = filterExercisesBySurgeryStatus(
        [prehabOnly, prehabExtended, prehabNullEnd, acuteExercise],
        'no_date'
      );
      expect(result.map(e => e.id)).toEqual(['e1', 'e2', 'e3']);
    });
  });

  describe('post_surgery status', () => {
    it('hides prehab exercises where phase_end equals prehab', () => {
      const result = filterExercisesBySurgeryStatus([prehabOnly], 'post_surgery');
      expect(result).toHaveLength(0);
    });

    it('includes prehab exercises where phase_end extends past prehab (e.g. acute)', () => {
      const result = filterExercisesBySurgeryStatus([prehabExtended], 'post_surgery');
      expect(result.map(e => e.id)).toEqual(['e2']);
    });

    it('includes prehab exercises where phase_end is null', () => {
      const result = filterExercisesBySurgeryStatus([prehabNullEnd], 'post_surgery');
      expect(result.map(e => e.id)).toEqual(['e3']);
    });

    it('includes non-prehab exercises regardless of phase_end', () => {
      const result = filterExercisesBySurgeryStatus([acuteExercise], 'post_surgery');
      expect(result.map(e => e.id)).toEqual(['e4']);
    });

    it('returns correct mixed set', () => {
      const result = filterExercisesBySurgeryStatus(
        [prehabOnly, prehabExtended, prehabNullEnd, acuteExercise],
        'post_surgery'
      );
      expect(result.map(e => e.id)).toEqual(['e2', 'e3', 'e4']);
    });
  });
});

// ---------------------------------------------------------------------------
// displayPhaseFor
// ---------------------------------------------------------------------------

describe('displayPhaseFor', () => {
  it('remaps prehab to acute for post_surgery', () => {
    const ex = makeExercise({ id: 'e1', phase_start: 'prehab' });
    expect(displayPhaseFor(ex, 'post_surgery')).toBe('acute');
  });

  it('keeps prehab for pre_surgery', () => {
    const ex = makeExercise({ id: 'e1', phase_start: 'prehab' });
    expect(displayPhaseFor(ex, 'pre_surgery')).toBe('prehab');
  });

  it('keeps prehab for no_date', () => {
    const ex = makeExercise({ id: 'e1', phase_start: 'prehab' });
    expect(displayPhaseFor(ex, 'no_date')).toBe('prehab');
  });

  it('returns acute unchanged for post_surgery', () => {
    const ex = makeExercise({ id: 'e1', phase_start: 'acute' });
    expect(displayPhaseFor(ex, 'post_surgery')).toBe('acute');
  });

  it('returns acute unchanged for pre_surgery (non-prehab exercise)', () => {
    const ex = makeExercise({ id: 'e1', phase_start: 'acute' });
    expect(displayPhaseFor(ex, 'pre_surgery')).toBe('acute');
  });
});

// ---------------------------------------------------------------------------
// groupExercisesByDisplayPhase
// ---------------------------------------------------------------------------

describe('groupExercisesByDisplayPhase', () => {
  it('groups exercises by their phase for pre_surgery', () => {
    const e1 = makeExercise({ id: 'e1', phase_start: 'prehab' });
    const e2 = makeExercise({ id: 'e2', phase_start: 'acute' });
    const map = groupExercisesByDisplayPhase([e1, e2], 'pre_surgery');
    expect(map.get('prehab')).toEqual([e1]);
    expect(map.get('acute')).toEqual([e2]);
  });

  it('remaps prehab exercises into the acute bucket for post_surgery', () => {
    const prehab = makeExercise({ id: 'e1', phase_start: 'prehab', phase_end: null });
    const acute = makeExercise({ id: 'e2', phase_start: 'acute' });
    const map = groupExercisesByDisplayPhase([prehab, acute], 'post_surgery');
    expect(map.has('prehab')).toBe(false);
    expect(map.get('acute')).toEqual([prehab, acute]);
  });

  it('preserves input order within each bucket', () => {
    const a = makeExercise({ id: 'a', phase_start: 'prehab', sort_order: 10 });
    const b = makeExercise({ id: 'b', phase_start: 'prehab', sort_order: 1 });
    const map = groupExercisesByDisplayPhase([a, b], 'pre_surgery');
    // Input order is preserved — NOT sorted by sort_order
    expect(map.get('prehab')!.map(e => e.id)).toEqual(['a', 'b']);
  });

  it('returns empty map for empty input', () => {
    const map = groupExercisesByDisplayPhase([], 'post_surgery');
    expect(map.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getPrimaryExercises
// ---------------------------------------------------------------------------

describe('getPrimaryExercises', () => {
  it('returns only exercises with role primary', () => {
    const primary = makeExercise({ id: 'p1', role: 'primary', sort_order: 1 });
    const optional = makeExercise({ id: 'o1', role: 'optional', sort_order: 0 });
    const alt = makeExercise({ id: 'a1', role: 'alternative', sort_order: 0 });
    const result = getPrimaryExercises([primary, optional, alt]);
    expect(result.map(e => e.id)).toEqual(['p1']);
  });

  it('sorts by sort_order ascending', () => {
    const p1 = makeExercise({ id: 'p1', role: 'primary', sort_order: 5 });
    const p2 = makeExercise({ id: 'p2', role: 'primary', sort_order: 2 });
    const p3 = makeExercise({ id: 'p3', role: 'primary', sort_order: 8 });
    const result = getPrimaryExercises([p1, p2, p3]);
    expect(result.map(e => e.id)).toEqual(['p2', 'p1', 'p3']);
  });

  it('returns empty array when no primaries exist', () => {
    const optional = makeExercise({ id: 'o1', role: 'optional', sort_order: 0 });
    expect(getPrimaryExercises([optional])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getAlternatives
// ---------------------------------------------------------------------------

describe('getAlternatives', () => {
  it('returns alternatives for the given primary exercise id', () => {
    const alt1 = makeExercise({
      id: 'a1',
      role: 'alternative',
      primary_exercise_id: 'p1',
      sort_order: 2,
    });
    const alt2 = makeExercise({
      id: 'a2',
      role: 'alternative',
      primary_exercise_id: 'p1',
      sort_order: 1,
    });
    const altOther = makeExercise({
      id: 'a3',
      role: 'alternative',
      primary_exercise_id: 'p2',
      sort_order: 0,
    });
    const result = getAlternatives([alt1, alt2, altOther], 'p1');
    expect(result.map(e => e.id)).toEqual(['a2', 'a1']);
  });

  it('returns empty array when no alternatives match', () => {
    const primary = makeExercise({ id: 'p1', role: 'primary', sort_order: 0 });
    expect(getAlternatives([primary], 'p1')).toEqual([]);
  });

  it('excludes alternatives with a different primary_exercise_id', () => {
    const alt = makeExercise({
      id: 'a1',
      role: 'alternative',
      primary_exercise_id: 'p2',
      sort_order: 0,
    });
    expect(getAlternatives([alt], 'p1')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getOptionalExercises
// ---------------------------------------------------------------------------

describe('getOptionalExercises', () => {
  it('returns only exercises with role optional', () => {
    const opt1 = makeExercise({ id: 'o1', role: 'optional', sort_order: 3 });
    const opt2 = makeExercise({ id: 'o2', role: 'optional', sort_order: 1 });
    const primary = makeExercise({ id: 'p1', role: 'primary', sort_order: 0 });
    const result = getOptionalExercises([opt1, opt2, primary]);
    expect(result.map(e => e.id)).toEqual(['o2', 'o1']);
  });

  it('sorts by sort_order ascending', () => {
    const o1 = makeExercise({ id: 'o1', role: 'optional', sort_order: 10 });
    const o2 = makeExercise({ id: 'o2', role: 'optional', sort_order: 5 });
    const result = getOptionalExercises([o1, o2]);
    expect(result.map(e => e.id)).toEqual(['o2', 'o1']);
  });

  it('returns empty array when no optionals exist', () => {
    const primary = makeExercise({ id: 'p1', role: 'primary', sort_order: 0 });
    expect(getOptionalExercises([primary])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getQuickSetupExercises
// ---------------------------------------------------------------------------

describe('getQuickSetupExercises', () => {
  it('returns primary exercises for the current phase (pre_surgery)', () => {
    const prehab1 = makeExercise({ id: 'p1', phase_start: 'prehab', role: 'primary', sort_order: 2 });
    const prehab2 = makeExercise({ id: 'p2', phase_start: 'prehab', role: 'primary', sort_order: 1 });
    const prehabOpt = makeExercise({ id: 'o1', phase_start: 'prehab', role: 'optional', sort_order: 0 });
    const acuteEx = makeExercise({ id: 'a1', phase_start: 'acute', role: 'primary', sort_order: 0 });

    const result = getQuickSetupExercises(
      [prehab1, prehab2, prehabOpt, acuteEx],
      'prehab',
      'pre_surgery'
    );
    // Only primaries for prehab, sorted
    expect(result.map(e => e.id)).toEqual(['p2', 'p1']);
  });

  it('returns primary exercises for the acute phase (post_surgery), including remapped prehab', () => {
    // prehab with null phase_end is visible post_surgery and remaps to acute
    const remappedPrehab = makeExercise({
      id: 'r1',
      phase_start: 'prehab',
      phase_end: null,
      role: 'primary',
      sort_order: 1,
    });
    const acutePrimary = makeExercise({
      id: 'a1',
      phase_start: 'acute',
      role: 'primary',
      sort_order: 0,
    });
    const acuteOptional = makeExercise({
      id: 'ao1',
      phase_start: 'acute',
      role: 'optional',
      sort_order: 0,
    });
    // prehab-only exercise should be filtered out post_surgery
    const prehabOnly = makeExercise({
      id: 'po1',
      phase_start: 'prehab',
      phase_end: 'prehab',
      role: 'primary',
      sort_order: 0,
    });

    const result = getQuickSetupExercises(
      [remappedPrehab, acutePrimary, acuteOptional, prehabOnly],
      'acute',
      'post_surgery'
    );
    // a1 (sort 0) before r1 (sort 1); optional and filtered-out prehab excluded
    expect(result.map(e => e.id)).toEqual(['a1', 'r1']);
  });

  it('returns empty array when no exercises match current phase', () => {
    const strengthening = makeExercise({
      id: 's1',
      phase_start: 'strengthening',
      role: 'primary',
      sort_order: 0,
    });
    const result = getQuickSetupExercises([strengthening], 'prehab', 'pre_surgery');
    expect(result).toEqual([]);
  });
});
