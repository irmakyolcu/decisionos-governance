
DROP POLICY IF EXISTS "ws insert audit" ON public.audit_events;
CREATE POLICY "ws insert audit" ON public.audit_events
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_workspace_member(auth.uid(), workspace_id)
    AND actor_user_id = auth.uid()
  );
