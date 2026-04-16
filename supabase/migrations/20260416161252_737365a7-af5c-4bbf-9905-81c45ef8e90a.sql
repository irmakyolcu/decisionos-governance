
-- Drop and recreate the workspaces SELECT policy to also allow creator
DROP POLICY IF EXISTS "Members can view their workspace" ON public.workspaces;

CREATE POLICY "Members can view their workspace" ON public.workspaces
FOR SELECT TO authenticated
USING (
  created_by = auth.uid()
  OR
  public.is_workspace_member(auth.uid(), id)
);
