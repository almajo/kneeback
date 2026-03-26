-- Drop redundant allow_delete_* policies in favour of the pre-existing
-- delete_own_* policies which include an explicit device_id IS NOT NULL guard.
-- Both sets enforce the same x-device-id header ownership check; keeping one
-- set is cleaner and avoids confusion.

DROP POLICY IF EXISTS "allow_delete_posts" ON community_posts;
DROP POLICY IF EXISTS "allow_delete_comments" ON community_comments;
