-- Replace permissive delete policies (USING true) with server-side ownership check.
-- The x-device-id request header must match the device_id column on the row.
-- The Supabase JS client injects this header automatically via a custom fetch
-- wrapper in lib/supabase.ts. Missing or mismatched header blocks the delete.

DROP POLICY IF EXISTS "allow_delete_posts" ON community_posts;
DROP POLICY IF EXISTS "allow_delete_comments" ON community_comments;

CREATE POLICY "allow_delete_posts" ON community_posts
  FOR DELETE
  TO anon
  USING (device_id = (current_setting('request.headers', true)::json->>'x-device-id'));

CREATE POLICY "allow_delete_comments" ON community_comments
  FOR DELETE
  TO anon
  USING (device_id = (current_setting('request.headers', true)::json->>'x-device-id'));
