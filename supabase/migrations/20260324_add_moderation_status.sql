-- Add moderation_status to community tables
-- Values: 'pending' (default, visible while awaiting moderation),
--         'approved' (clean content),
--         'flagged' (hidden from all queries via RLS)

ALTER TABLE community_posts
  ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (moderation_status IN ('pending', 'approved', 'flagged'));

ALTER TABLE community_comments
  ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (moderation_status IN ('pending', 'approved', 'flagged'));

-- RLS: hide flagged content from all select queries
-- These policies stack on top of any existing SELECT policies.
-- If a row-level SELECT policy already exists, add AND moderation_status != 'flagged'
-- to it instead of creating a conflicting one.
CREATE POLICY "hide_flagged_posts" ON community_posts
  AS RESTRICTIVE
  FOR SELECT
  USING (moderation_status != 'flagged');

CREATE POLICY "hide_flagged_comments" ON community_comments
  AS RESTRICTIVE
  FOR SELECT
  USING (moderation_status != 'flagged');
