ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS is_pt_day boolean NOT NULL DEFAULT false;
