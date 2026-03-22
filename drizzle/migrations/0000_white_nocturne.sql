CREATE TABLE `content` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`trigger_condition` text,
	`phase` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`catalog_version` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT '(datetime(''now''))',
	`updated_at` text DEFAULT '(datetime(''now''))'
);
--> statement-breakpoint
CREATE TABLE `daily_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`is_rest_day` integer DEFAULT 0 NOT NULL,
	`notes` text,
	`created_at` text DEFAULT '(datetime(''now''))',
	`updated_at` text DEFAULT '(datetime(''now''))'
);
--> statement-breakpoint
CREATE UNIQUE INDEX `daily_logs_date_unique` ON `daily_logs` (`date`);
--> statement-breakpoint
CREATE TABLE `exercise_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`daily_log_id` text NOT NULL,
	`user_exercise_id` text NOT NULL,
	`completed` integer DEFAULT 0 NOT NULL,
	`actual_sets` integer DEFAULT 0 NOT NULL,
	`actual_reps` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT '(datetime(''now''))',
	`updated_at` text DEFAULT '(datetime(''now''))',
	FOREIGN KEY (`daily_log_id`) REFERENCES `daily_logs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_exercise_id`) REFERENCES `user_exercises`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `exercises` (
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
	`created_at` text DEFAULT '(datetime(''now''))',
	`updated_at` text DEFAULT '(datetime(''now''))'
);
--> statement-breakpoint
CREATE TABLE `milestones` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`category` text DEFAULT 'milestone' NOT NULL,
	`date` text NOT NULL,
	`notes` text,
	`template_key` text,
	`created_at` text DEFAULT '(datetime(''now''))',
	`updated_at` text DEFAULT '(datetime(''now''))'
);
--> statement-breakpoint
CREATE TABLE `notification_preferences` (
	`id` text PRIMARY KEY NOT NULL,
	`daily_reminder_time` text DEFAULT '08:00' NOT NULL,
	`evening_nudge_enabled` integer DEFAULT 0 NOT NULL,
	`evening_nudge_time` text DEFAULT '20:00' NOT NULL,
	`completion_congrats_enabled` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT '(datetime(''now''))',
	`updated_at` text DEFAULT '(datetime(''now''))'
);
--> statement-breakpoint
CREATE TABLE `profile` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`username` text,
	`surgery_date` text,
	`graft_type` text,
	`knee_side` text DEFAULT 'right' NOT NULL,
	`device_id` text,
	`supabase_user_id` text,
	`last_synced_at` text,
	`created_at` text DEFAULT '(datetime(''now''))',
	`updated_at` text DEFAULT '(datetime(''now''))'
);
--> statement-breakpoint
CREATE TABLE `rom_measurements` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`flexion_degrees` real,
	`extension_degrees` real,
	`quad_activation` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT '(datetime(''now''))',
	`updated_at` text DEFAULT '(datetime(''now''))'
);
--> statement-breakpoint
CREATE TABLE `user_achievements` (
	`id` text PRIMARY KEY NOT NULL,
	`content_id` text NOT NULL,
	`unlocked_at` text NOT NULL,
	`created_at` text DEFAULT '(datetime(''now''))',
	`updated_at` text DEFAULT '(datetime(''now''))',
	FOREIGN KEY (`content_id`) REFERENCES `content`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`exercise_id` text NOT NULL,
	`sets` integer DEFAULT 3 NOT NULL,
	`reps` integer DEFAULT 10 NOT NULL,
	`hold_seconds` integer,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT '(datetime(''now''))',
	`updated_at` text DEFAULT '(datetime(''now''))',
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user_gate_criteria` (
	`id` text PRIMARY KEY NOT NULL,
	`gate_key` text NOT NULL,
	`criterion_key` text NOT NULL,
	`confirmed_at` text NOT NULL,
	`created_at` text DEFAULT '(datetime(''now''))',
	`updated_at` text DEFAULT '(datetime(''now''))'
);
