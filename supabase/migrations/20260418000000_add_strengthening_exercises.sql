-- Add glute bridges, wall sits, and forward lunges to the progressive strengthening phase
INSERT INTO exercises (id, name, description, phase_start, phase_end, role, primary_exercise_id, muscle_groups, default_sets, default_reps, default_hold_seconds, category, sort_order, status)
VALUES
  (
    'e205d10c-dbc1-4b79-b2ce-a124be84d15d',
    'Glute Bridges',
    'Lie on your back with knees bent and feet flat on the floor hip-width apart. Press through your heels to lift your hips until your body forms a straight line from shoulders to knees. Squeeze your glutes at the top, hold briefly, then lower slowly.',
    'strengthening',
    NULL,
    'primary',
    NULL,
    ARRAY['Glute','Hamstring','Core']::exercise_muscle_group[],
    3,
    15,
    NULL,
    'strengthening',
    13,
    'approved'
  ),
  (
    'af956d79-2037-4008-9ee6-8f071892604b',
    'Wall Sits',
    'Stand with your back flat against a wall. Slide down until your knees are at 90° and thighs are parallel to the floor. Keep your knees directly above your ankles and do not let them drift inward. Hold the position.',
    'strengthening',
    NULL,
    'primary',
    NULL,
    ARRAY['Quad','Glute']::exercise_muscle_group[],
    3,
    1,
    30,
    'strengthening',
    14,
    'approved'
  ),
  (
    '9f30e809-ca03-4cb3-a69d-2075f11e7c20',
    'Forward Lunges',
    'Stand tall with feet hip-width apart. Step forward with one leg and lower your back knee toward the floor, keeping your front knee directly above your ankle. Push back to the starting position. Alternate legs each rep.',
    'strengthening',
    NULL,
    'primary',
    NULL,
    ARRAY['Quad','Glute','Hip']::exercise_muscle_group[],
    3,
    10,
    NULL,
    'strengthening',
    15,
    'approved'
  )
ON CONFLICT (id) DO NOTHING;
