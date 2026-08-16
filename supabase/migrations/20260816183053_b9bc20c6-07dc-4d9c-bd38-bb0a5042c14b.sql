-- 1. knowledge_items: confidentiality-aware update
DROP POLICY IF EXISTS ki_update ON public.knowledge_items;
CREATE POLICY ki_update ON public.knowledge_items
FOR UPDATE TO authenticated
USING (
  public.is_workspace_writer(auth.uid(), workspace_id)
  AND public.can_view_confidential(auth.uid(), workspace_id, created_by, confidentiality)
)
WITH CHECK (
  public.is_workspace_writer(auth.uid(), workspace_id)
  AND public.can_view_confidential(auth.uid(), workspace_id, created_by, confidentiality)
);

-- 2. uploaded_documents: restrict confidential levels + lock workspace/creator on update
DROP POLICY IF EXISTS docs_write ON public.uploaded_documents;
CREATE POLICY docs_write ON public.uploaded_documents
FOR INSERT TO authenticated
WITH CHECK (
  public.is_workspace_member(auth.uid(), workspace_id)
  AND created_by = auth.uid()
  AND (
    confidentiality IN ('public_internal','internal')
    OR public.is_workspace_writer(auth.uid(), workspace_id)
  )
);

DROP POLICY IF EXISTS docs_update ON public.uploaded_documents;
CREATE POLICY docs_update ON public.uploaded_documents
FOR UPDATE TO authenticated
USING (
  (created_by = auth.uid() OR public.is_workspace_admin(auth.uid(), workspace_id))
  AND public.can_view_confidential(auth.uid(), workspace_id, created_by, confidentiality)
)
WITH CHECK (
  public.is_workspace_member(auth.uid(), workspace_id)
  AND (created_by = auth.uid() OR public.is_workspace_admin(auth.uid(), workspace_id))
  AND (
    confidentiality IN ('public_internal','internal')
    OR public.is_workspace_writer(auth.uid(), workspace_id)
  )
);

-- 3. workspace_members: bootstrap only when workspace has no members yet
DROP POLICY IF EXISTS "Admins can add members" ON public.workspace_members;
CREATE POLICY "Admins can add members" ON public.workspace_members
FOR INSERT TO authenticated
WITH CHECK (
  public.is_workspace_admin(auth.uid(), workspace_id)
  OR (
    user_id = auth.uid()
    AND role = 'admin'::workspace_role
    AND EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_members.workspace_id AND w.created_by = auth.uid()
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.workspace_members m
      WHERE m.workspace_id = workspace_members.workspace_id
    )
  )
);