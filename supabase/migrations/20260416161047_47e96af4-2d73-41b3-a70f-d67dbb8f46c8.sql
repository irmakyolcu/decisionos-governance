
-- Drop the recursive INSERT policy
DROP POLICY IF EXISTS "Admins can add members" ON public.workspace_members;

-- Create a new INSERT policy that allows:
-- 1. The workspace creator to add themselves as the first member
-- 2. Existing admins to add other members
CREATE POLICY "Admins can add members" ON public.workspace_members
FOR INSERT TO authenticated
WITH CHECK (
  -- Allow workspace creator to add themselves
  (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.created_by = auth.uid()
  ))
  OR
  -- Allow existing admins to add others
  (public.get_workspace_role(auth.uid(), workspace_id) = 'admin'::workspace_role)
);
