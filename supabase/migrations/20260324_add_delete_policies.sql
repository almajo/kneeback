-- Allow anonymous users to delete their own community posts and comments.
-- Ownership is enforced server-side: the x-device-id request header must match
-- the device_id column on the row. The Supabase JS client injects this header
-- automatically via a custom fetch wrapper in lib/supabase.ts.
-- If the header is absent or mismatched, RLS blocks the delete silently.

CREATE POLICY "allow_delete_posts" ON community_posts
  FOR DELETE
  TO anon
  USING (device_id = (current_setting('request.headers', true)::json->>'x-device-id'));

CREATE POLICY "allow_delete_comments" ON community_comments
  FOR DELETE
  TO anon
  USING (device_id = (current_setting('request.headers', true)::json->>'x-device-id'));
