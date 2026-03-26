PRAGMA foreign_keys=OFF;--> statement-breakpoint

-- Remap exercise_logs to the canonical (most recently updated) user_exercises row
-- per exercise_id before deduplication, preserving FK integrity.
UPDATE exercise_logs
SET user_exercise_id = (
  SELECT winner.id
  FROM user_exercises AS winner
  WHERE winner.exercise_id = (
    SELECT ue.exercise_id FROM user_exercises AS ue WHERE ue.id = exercise_logs.user_exercise_id
  )
  ORDER BY winner.updated_at DESC, winner.rowid ASC
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM user_exercises ue WHERE ue.id = exercise_logs.user_exercise_id
);
--> statement-breakpoint

-- Delete duplicate user_exercises rows, keeping the most recently updated row
-- per exercise_id. For ties on updated_at, the earliest-inserted row (lower rowid) wins.
DELETE FROM user_exercises
WHERE rowid NOT IN (
  SELECT rowid FROM user_exercises AS o
  WHERE NOT EXISTS (
    SELECT 1 FROM user_exercises AS n
    WHERE n.exercise_id = o.exercise_id
      AND (n.updated_at > o.updated_at
           OR (n.updated_at = o.updated_at AND n.rowid < o.rowid))
  )
);
--> statement-breakpoint

CREATE TABLE `__new_user_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`exercise_id` text NOT NULL,
	`sets` integer DEFAULT 3 NOT NULL,
	`reps` integer DEFAULT 10 NOT NULL,
	`hold_seconds` integer,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint

INSERT INTO `__new_user_exercises`("id", "exercise_id", "sets", "reps", "hold_seconds", "sort_order", "created_at", "updated_at") SELECT "id", "exercise_id", "sets", "reps", "hold_seconds", "sort_order", "created_at", "updated_at" FROM `user_exercises`;
--> statement-breakpoint

DROP TABLE `user_exercises`;
--> statement-breakpoint

ALTER TABLE `__new_user_exercises` RENAME TO `user_exercises`;
--> statement-breakpoint

CREATE UNIQUE INDEX `user_exercises_exercise_id_idx` ON `user_exercises` (`exercise_id`);
--> statement-breakpoint

PRAGMA foreign_keys=ON;
