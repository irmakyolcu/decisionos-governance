-- 1. Meeting recordings storage: scope to workspace members
DROP POLICY IF EXISTS "Authenticated users can read meeting recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload meeting recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own meeting recordings" ON storage.objects;

CREATE POLICY "Workspace members can read meeting recordings"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'meeting-recordings'
  AND EXISTS (
    SELECT 1 FROM public.meetings m
    JOIN public.workspace_members wm ON wm.workspace_id = m.workspace_id
    WHERE m.id::text = (storage.foldername(name))[1]
      AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "Workspace members can upload meeting recordings"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'meeting-recordings'
  AND EXISTS (
    SELECT 1 FROM public.meetings m
    JOIN public.workspace_members wm ON wm.workspace_id = m.workspace_id
    WHERE m.id::text = (storage.foldername(name))[1]
      AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "Workspace admins or uploader can delete meeting recordings"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'meeting-recordings'
  AND EXISTS (
    SELECT 1 FROM public.meetings m
    JOIN public.workspace_members wm ON wm.workspace_id = m.workspace_id
    WHERE m.id::text = (storage.foldername(name))[1]
      AND wm.user_id = auth.uid()
      AND (wm.role = 'admin' OR owner_id = auth.uid()::text)
  )
);

-- 2. AI evaluations: allow workspace admins to delete (cleanup of orphaned rows)
CREATE POLICY "admins delete ai evaluations"
ON public.ai_evaluations FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.decisions d
    WHERE d.id = ai_evaluations.decision_id
      AND public.is_workspace_admin(auth.uid(), d.workspace_id)
  )
);

-- 3. Workspace invites: hide the secret token column from the Data API.
-- Admins can still SELECT all other invite fields; token is only retrievable
-- by the invitee through the get_invite_by_token SECURITY DEFINER RPC.
REVOKE SELECT (token) ON public.workspace_invites FROM authenticated;
REVOKE SELECT (token) ON public.workspace_invites FROM anon;