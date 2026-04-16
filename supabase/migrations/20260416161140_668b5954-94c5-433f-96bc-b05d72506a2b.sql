
-- Drop all existing policies on workspace_members
DROP POLICY IF EXISTS "Admins can add members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins can remove members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins can update member roles" ON public.workspace_members;
DROP POLICY IF EXISTS "Members can view workspace members" ON public.workspace_members;

-- Create a SECURITY DEFINER helper to check membership without triggering RLS
CREATE OR REPLACE FUNCTION public.is_workspace_member(_user_id uuid, _workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = _user_id AND workspace_id = _workspace_id
  );
$$;

-- Create a SECURITY DEFINER helper to check admin role without triggering RLS
CREATE OR REPLACE FUNCTION public.is_workspace_admin(_user_id uuid, _workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = _user_id AND workspace_id = _workspace_id AND role = 'admin'
  );
$$;

-- SELECT: Members can view their workspace members
CREATE POLICY "Members can view workspace members" ON public.workspace_members
FOR SELECT TO authenticated
USING (public.is_workspace_member(auth.uid(), workspace_id));

-- INSERT: Workspace creator can add themselves, or admin can add others
CREATE POLICY "Admins can add members" ON public.workspace_members
FOR INSERT TO authenticated
WITH CHECK (
  -- Workspace creator adding themselves
  (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.created_by = auth.uid()
  ))
  OR
  -- Existing admin adding others
  public.is_workspace_admin(auth.uid(), workspace_id)
);

-- UPDATE: Only admins
CREATE POLICY "Admins can update member roles" ON public.workspace_members
FOR UPDATE TO authenticated
USING (public.is_workspace_admin(auth.uid(), workspace_id));

-- DELETE: Only admins
CREATE POLICY "Admins can remove members" ON public.workspace_members
FOR DELETE TO authenticated
USING (public.is_workspace_admin(auth.uid(), workspace_id));
