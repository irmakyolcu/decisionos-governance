
-- 1. Remove public-role policies on meeting-recordings bucket
DROP POLICY IF EXISTS "Anyone can view meeting recordings" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload meeting recordings" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete meeting recordings" ON storage.objects;

-- 2. Replace broad invite SELECT policy with a security-definer lookup
DROP POLICY IF EXISTS "Anyone can view invite by token" ON public.workspace_invites;

CREATE OR REPLACE FUNCTION public.get_invite_by_token(_token text)
RETURNS TABLE (
  id uuid,
  workspace_id uuid,
  email text,
  role workspace_role,
  expires_at timestamptz,
  accepted_at timestamptz,
  workspace_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.id, i.workspace_id, i.email, i.role, i.expires_at, i.accepted_at, w.name AS workspace_name
  FROM public.workspace_invites i
  JOIN public.workspaces w ON w.id = i.workspace_id
  WHERE i.token = _token
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_invite_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invite_by_token(text) TO authenticated;

-- 3. Tighten profiles policy to remove NULL workspace exposure
DROP POLICY IF EXISTS "Profiles viewable by workspace members" ON public.profiles;
CREATE POLICY "Profiles viewable by workspace members"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR (workspace_id IS NOT NULL AND workspace_id IN (
    SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
  ))
);

-- 4. Add DELETE policy on decision_comments (author or workspace admin)
CREATE POLICY "authors or admins delete comments"
ON public.decision_comments
FOR DELETE
TO authenticated
USING (
  author_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.decisions d
    WHERE d.id = decision_comments.decision_id
      AND public.is_workspace_admin(auth.uid(), d.workspace_id)
  )
);

-- 5. Add DELETE policy on decision_approvals (approver or workspace admin)
CREATE POLICY "approver or admin delete approvals"
ON public.decision_approvals
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.decisions d
    WHERE d.id = decision_approvals.decision_id
      AND public.is_workspace_admin(auth.uid(), d.workspace_id)
  )
);

-- 6. Revoke direct EXECUTE on SECURITY DEFINER helper functions
-- (RLS policies continue to use them via the table owner.)
REVOKE EXECUTE ON FUNCTION public.is_workspace_member(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_workspace_admin(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_workspace_writer(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_workspace_role(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_workspace_id(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.seed_workspace_demo_data(uuid, uuid) FROM PUBLIC, anon, authenticated;
