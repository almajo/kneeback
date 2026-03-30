-- Remap exercise_logs FK references to the canonical user_exercise row
-- (lowest sort_order, then earliest id) before deduplication.
UPDATE exercise_logs
SET user_exercise_id = (
  SELECT winner.id
  FROM user_exercises AS winner
  WHERE winner.user_id = (
    SELECT ue.user_id FROM user_exercises ue WHERE ue.id = exercise_logs.user_exercise_id
  )
  AND winner.exercise_id = (
    SELECT ue.exercise_id FROM user_exercises ue WHERE ue.id = exercise_logs.user_exercise_id
  )
  ORDER BY winner.sort_order ASC, winner.id ASC
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM user_exercises ue WHERE ue.id = exercise_logs.user_exercise_id
);

-- Delete duplicate rows, keeping the one with the lowest sort_order (ties broken by id).
DELETE FROM user_exercises
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, exercise_id) id
  FROM user_exercises
  ORDER BY user_id, exercise_id, sort_order ASC, id ASC
);

-- Add unique constraint to prevent future duplicates.
ALTER TABLE user_exercises
  ADD CONSTRAINT user_exercises_user_id_exercise_id_key UNIQUE (user_id, exercise_id);
