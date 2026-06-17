
-- 1) meeting_recordings INSERT: require workspace membership
DROP POLICY IF EXISTS "Authenticated users can insert recordings" ON public.meeting_recordings;
CREATE POLICY "Members can insert workspace recordings"
ON public.meeting_recordings
FOR INSERT
TO authenticated
WITH CHECK (
  (auth.uid())::text = uploaded_by
  AND public.is_workspace_member(auth.uid(), workspace_id)
);

-- 2) workspace_invites: prevent token column from being read via SELECT
REVOKE SELECT (token) ON public.workspace_invites FROM authenticated;
REVOKE SELECT (token) ON public.workspace_invites FROM anon;
