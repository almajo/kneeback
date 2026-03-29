-- Add columns required by the unified schema (schema.ts now mirrors Supabase).
-- Old sync-only columns (device_id, supabase_user_id, updated_at, etc.) are
-- harmless extras — SQLite keeps them, Drizzle simply won't query them.

ALTER TABLE `profile` ADD COLUMN `expo_push_token` text;--> statement-breakpoint
ALTER TABLE `user_exercises` ADD COLUMN `user_id` text;--> statement-breakpoint
ALTER TABLE `daily_logs` ADD COLUMN `user_id` text;--> statement-breakpoint
ALTER TABLE `milestones` ADD COLUMN `user_id` text;--> statement-breakpoint
ALTER TABLE `rom_measurements` ADD COLUMN `user_id` text;--> statement-breakpoint
ALTER TABLE `user_achievements` ADD COLUMN `user_id` text;--> statement-breakpoint
ALTER TABLE `user_gate_criteria` ADD COLUMN `user_id` text;--> statement-breakpoint
ALTER TABLE `notification_preferences` ADD COLUMN `user_id` text;
