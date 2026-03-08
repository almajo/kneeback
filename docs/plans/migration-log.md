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

## 2026-03-08

### Edge Function: evening-nudge
Deployed via Supabase MCP on 2026-03-08. Function ID: 8fcb4875-d10c-4dcc-9c84-1954ba296bde.
Queries users with evening_nudge_enabled=true, checks for incomplete exercise logs today, sends Expo push notifications. JWT verification disabled (cron invocation).
