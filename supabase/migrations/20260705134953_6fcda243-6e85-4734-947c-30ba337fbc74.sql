
-- 1. Fix mutable search_path on set_action_hash_on_insert
CREATE OR REPLACE FUNCTION public.set_action_hash_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF NEW.content_hash IS NULL THEN
    NEW.content_hash := encode(digest(NEW.proposed_payload::text, 'sha256'), 'hex');
  END IF;
  RETURN NEW;
END;
$function$;

-- 2. Restrict notifications INSERT: only allow inserting for self
DROP POLICY IF EXISTS "Workspace writers insert notifications" ON public.notifications;
CREATE POLICY "Users insert own notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND is_workspace_member(auth.uid(), workspace_id));

-- 3. Admin-only writes for execution_records
CREATE POLICY "Workspace admins manage execution_records"
ON public.execution_records
FOR ALL
TO authenticated
USING (is_workspace_admin(auth.uid(), workspace_id))
WITH CHECK (is_workspace_admin(auth.uid(), workspace_id));

-- 4. Admin-only writes for policy_evaluations
CREATE POLICY "Workspace admins manage policy_evaluations"
ON public.policy_evaluations
FOR ALL
TO authenticated
USING (is_workspace_admin(auth.uid(), workspace_id))
WITH CHECK (is_workspace_admin(auth.uid(), workspace_id));

-- 5. Admin-only writes for policy_versions
CREATE POLICY "Workspace admins manage policy_versions"
ON public.policy_versions
FOR ALL
TO authenticated
USING (is_workspace_admin(auth.uid(), workspace_id))
WITH CHECK (is_workspace_admin(auth.uid(), workspace_id));
