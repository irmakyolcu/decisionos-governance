-- data_sources: credentials in config readable only by admins
DROP POLICY IF EXISTS "ds_select" ON public.data_sources;
CREATE POLICY "ds_select" ON public.data_sources
  FOR SELECT TO authenticated
  USING (public.is_workspace_admin(auth.uid(), workspace_id));

-- audit_logs: bind actor_id to the authenticated user
DROP POLICY IF EXISTS "al_write" ON public.audit_logs;
CREATE POLICY "al_write" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) AND actor_id = auth.uid());

-- company_notes: only author or writer/admin may update
DROP POLICY IF EXISTS "members can update company notes" ON public.company_notes;
CREATE POLICY "authors or writers can update company notes" ON public.company_notes
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_workspace_writer(auth.uid(), workspace_id))
  WITH CHECK (created_by = auth.uid() OR public.is_workspace_writer(auth.uid(), workspace_id));

-- knowledge_items: insert requires writer role
DROP POLICY IF EXISTS "ki_write" ON public.knowledge_items;
CREATE POLICY "ki_write" ON public.knowledge_items
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_writer(auth.uid(), workspace_id));

-- workspace_members: bootstrap self-insert forced to admin role
DROP POLICY IF EXISTS "Admins can add members" ON public.workspace_members;
CREATE POLICY "Admins can add members" ON public.workspace_members
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      user_id = auth.uid()
      AND role = 'admin'::workspace_role
      AND EXISTS (
        SELECT 1 FROM public.workspaces w
        WHERE w.id = workspace_members.workspace_id AND w.created_by = auth.uid()
      )
    )
    OR public.is_workspace_admin(auth.uid(), workspace_id)
  );