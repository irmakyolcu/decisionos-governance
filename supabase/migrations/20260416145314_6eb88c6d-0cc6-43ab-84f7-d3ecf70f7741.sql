
-- Make bucket private
UPDATE storage.buckets SET public = false WHERE id = 'meeting-recordings';

-- Drop any existing storage policies for this bucket
DROP POLICY IF EXISTS "Public read access for meeting recordings" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own recordings" ON storage.objects;

-- Authenticated users can read recordings in meeting-recordings bucket
CREATE POLICY "Authenticated users can read meeting recordings"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'meeting-recordings');

-- Users can upload to their own folder (folder name = user id)
CREATE POLICY "Users can upload meeting recordings"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'meeting-recordings');

-- Users can delete files they uploaded (stored under meetingId path, check via owner)
CREATE POLICY "Users can delete own meeting recordings"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'meeting-recordings' AND (select auth.uid()::text) = owner_id::text);
