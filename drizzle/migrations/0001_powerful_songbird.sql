PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_content` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`trigger_condition` text,
	`phase` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`catalog_version` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
INSERT INTO `__new_content`("id", "type", "title", "body", "trigger_condition", "phase", "sort_order", "catalog_version", "created_at", "updated_at") SELECT "id", "type", "title", "body", "trigger_condition", "phase", "sort_order", "catalog_version", "created_at", "updated_at" FROM `content`;--> statement-breakpoint
DROP TABLE `content`;--> statement-breakpoint
ALTER TABLE `__new_content` RENAME TO `content`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_daily_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`is_rest_day` integer DEFAULT 0 NOT NULL,
	`notes` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
INSERT INTO `__new_daily_logs`("id", "date", "is_rest_day", "notes", "created_at", "updated_at") SELECT "id", "date", "is_rest_day", "notes", "created_at", "updated_at" FROM `daily_logs`;--> statement-breakpoint
DROP TABLE `daily_logs`;--> statement-breakpoint
ALTER TABLE `__new_daily_logs` RENAME TO `daily_logs`;--> statement-breakpoint
CREATE UNIQUE INDEX `daily_logs_date_unique` ON `daily_logs` (`date`);--> statement-breakpoint
CREATE TABLE `__new_exercise_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`daily_log_id` text NOT NULL,
	`user_exercise_id` text NOT NULL,
	`completed` integer DEFAULT 0 NOT NULL,
	`actual_sets` integer DEFAULT 0 NOT NULL,
	`actual_reps` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`daily_log_id`) REFERENCES `daily_logs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_exercise_id`) REFERENCES `user_exercises`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_exercise_logs`("id", "daily_log_id", "user_exercise_id", "completed", "actual_sets", "actual_reps", "created_at", "updated_at") SELECT "id", "daily_log_id", "user_exercise_id", "completed", "actual_sets", "actual_reps", "created_at", "updated_at" FROM `exercise_logs`;--> statement-breakpoint
DROP TABLE `exercise_logs`;--> statement-breakpoint
ALTER TABLE `__new_exercise_logs` RENAME TO `exercise_logs`;--> statement-breakpoint
CREATE UNIQUE INDEX `exercise_logs_daily_log_user_exercise_idx` ON `exercise_logs` (`daily_log_id`,`user_exercise_id`);--> statement-breakpoint
CREATE TABLE `__new_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`phase_start` text NOT NULL,
	`phase_end` text,
	`role` text DEFAULT 'primary' NOT NULL,
	`primary_exercise_id` text,
	`muscle_groups` text DEFAULT '[]' NOT NULL,
	`default_sets` integer DEFAULT 3 NOT NULL,
	`default_reps` integer DEFAULT 10 NOT NULL,
	`default_hold_seconds` integer,
	`category` text DEFAULT 'strengthening' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`catalog_version` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
INSERT INTO `__new_exercises`("id", "name", "description", "phase_start", "phase_end", "role", "primary_exercise_id", "muscle_groups", "default_sets", "default_reps", "default_hold_seconds", "category", "sort_order", "catalog_version", "created_at", "updated_at") SELECT "id", "name", "description", "phase_start", "phase_end", "role", "primary_exercise_id", "muscle_groups", "default_sets", "default_reps", "default_hold_seconds", "category", "sort_order", "catalog_version", "created_at", "updated_at" FROM `exercises`;--> statement-breakpoint
DROP TABLE `exercises`;--> statement-breakpoint
ALTER TABLE `__new_exercises` RENAME TO `exercises`;--> statement-breakpoint
CREATE TABLE `__new_milestones` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`category` text DEFAULT 'milestone' NOT NULL,
	`date` text NOT NULL,
	`notes` text,
	`template_key` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
INSERT INTO `__new_milestones`("id", "title", "category", "date", "notes", "template_key", "created_at", "updated_at") SELECT "id", "title", "category", "date", "notes", "template_key", "created_at", "updated_at" FROM `milestones`;--> statement-breakpoint
DROP TABLE `milestones`;--> statement-breakpoint
ALTER TABLE `__new_milestones` RENAME TO `milestones`;--> statement-breakpoint
CREATE TABLE `__new_notification_preferences` (
	`id` text PRIMARY KEY NOT NULL,
	`daily_reminder_time` text DEFAULT '08:00' NOT NULL,
	`evening_nudge_enabled` integer DEFAULT 0 NOT NULL,
	`evening_nudge_time` text DEFAULT '20:00' NOT NULL,
	`completion_congrats_enabled` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
INSERT INTO `__new_notification_preferences`("id", "daily_reminder_time", "evening_nudge_enabled", "evening_nudge_time", "completion_congrats_enabled", "created_at", "updated_at") SELECT "id", "daily_reminder_time", "evening_nudge_enabled", "evening_nudge_time", "completion_congrats_enabled", "created_at", "updated_at" FROM `notification_preferences`;--> statement-breakpoint
DROP TABLE `notification_preferences`;--> statement-breakpoint
ALTER TABLE `__new_notification_preferences` RENAME TO `notification_preferences`;--> statement-breakpoint
CREATE TABLE `__new_profile` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`username` text,
	`surgery_date` text,
	`graft_type` text,
	`knee_side` text DEFAULT 'right' NOT NULL,
	`device_id` text,
	`supabase_user_id` text,
	`last_synced_at` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
INSERT INTO `__new_profile`("id", "name", "username", "surgery_date", "graft_type", "knee_side", "device_id", "supabase_user_id", "last_synced_at", "created_at", "updated_at") SELECT "id", "name", "username", "surgery_date", "graft_type", "knee_side", "device_id", "supabase_user_id", "last_synced_at", "created_at", "updated_at" FROM `profile`;--> statement-breakpoint
DROP TABLE `profile`;--> statement-breakpoint
ALTER TABLE `__new_profile` RENAME TO `profile`;--> statement-breakpoint
CREATE TABLE `__new_rom_measurements` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`flexion_degrees` real,
	`extension_degrees` real,
	`quad_activation` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
INSERT INTO `__new_rom_measurements`("id", "date", "flexion_degrees", "extension_degrees", "quad_activation", "created_at", "updated_at") SELECT "id", "date", "flexion_degrees", "extension_degrees", "quad_activation", "created_at", "updated_at" FROM `rom_measurements`;--> statement-breakpoint
DROP TABLE `rom_measurements`;--> statement-breakpoint
ALTER TABLE `__new_rom_measurements` RENAME TO `rom_measurements`;--> statement-breakpoint
CREATE TABLE `__new_user_achievements` (
	`id` text PRIMARY KEY NOT NULL,
	`content_id` text NOT NULL,
	`unlocked_at` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`content_id`) REFERENCES `content`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_user_achievements`("id", "content_id", "unlocked_at", "created_at", "updated_at") SELECT "id", "content_id", "unlocked_at", "created_at", "updated_at" FROM `user_achievements`;--> statement-breakpoint
DROP TABLE `user_achievements`;--> statement-breakpoint
ALTER TABLE `__new_user_achievements` RENAME TO `user_achievements`;--> statement-breakpoint
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
INSERT INTO `__new_user_exercises`("id", "exercise_id", "sets", "reps", "hold_seconds", "sort_order", "created_at", "updated_at") SELECT "id", "exercise_id", "sets", "reps", "hold_seconds", "sort_order", "created_at", "updated_at" FROM `user_exercises`;--> statement-breakpoint
DROP TABLE `user_exercises`;--> statement-breakpoint
ALTER TABLE `__new_user_exercises` RENAME TO `user_exercises`;--> statement-breakpoint
CREATE TABLE `__new_user_gate_criteria` (
	`id` text PRIMARY KEY NOT NULL,
	`gate_key` text NOT NULL,
	`criterion_key` text NOT NULL,
	`confirmed_at` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
INSERT INTO `__new_user_gate_criteria`("id", "gate_key", "criterion_key", "confirmed_at", "created_at", "updated_at") SELECT "id", "gate_key", "criterion_key", "confirmed_at", "created_at", "updated_at" FROM `user_gate_criteria`;--> statement-breakpoint
DROP TABLE `user_gate_criteria`;--> statement-breakpoint
ALTER TABLE `__new_user_gate_criteria` RENAME TO `user_gate_criteria`;--> statement-breakpoint
CREATE UNIQUE INDEX `user_gate_criteria_gate_criterion_idx` ON `user_gate_criteria` (`gate_key`,`criterion_key`);