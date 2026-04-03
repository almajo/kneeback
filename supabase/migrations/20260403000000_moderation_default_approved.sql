-- Replace OpenAI server-side moderation with client-side keyword filtering.
-- Posts and comments now default to 'approved' so they appear immediately
-- after passing the client-side check. The 'flagged' value is still reserved
-- for future manual moderation use.
ALTER TABLE community_posts
  ALTER COLUMN moderation_status SET DEFAULT 'approved';

ALTER TABLE community_comments
  ALTER COLUMN moderation_status SET DEFAULT 'approved';
