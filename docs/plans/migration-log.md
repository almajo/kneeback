# Migration Log

## 2026-03-07

### Schema Migration: create_tables
Applied via Supabase MCP. Created tables: profiles, exercises, user_exercises, daily_logs, exercise_logs, rom_measurements, content, user_achievements, notification_preferences. Added indexes.

### Schema Migration: enable_rls
Applied via Supabase MCP. Enabled RLS on all tables. Added row-level security policies.

### Seed Data
Inserted via Supabase MCP execute_sql:
- 15 exercises (early phase)
- 18 achievements
- 20 daily messages
- 15 crutch hacks
