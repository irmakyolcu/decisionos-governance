DROP POLICY IF EXISTS "Authenticated users can create workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Admins can add members" ON public.workspace_members;
CREATE POLICY "Admins can add members" ON public.workspace_members FOR INSERT TO authenticated WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));

CREATE OR REPLACE FUNCTION public.guard_workspace_member_bootstrap()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.workspace_id::text, 0));
  IF public.is_workspace_admin(auth.uid(), NEW.workspace_id) THEN
    RETURN NEW;
  END IF;
  IF NEW.user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.workspace_invites i
    JOIN auth.users u ON u.id = auth.uid()
    WHERE i.workspace_id = NEW.workspace_id AND i.role = NEW.role
      AND lower(i.email) = lower(u.email) AND u.email_confirmed_at IS NOT NULL
      AND i.accepted_at IS NULL AND i.expires_at > now()
      AND public.is_workspace_admin(i.invited_by, i.workspace_id)
  ) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Workspace membership requires administrator approval' USING ERRCODE = '42501';
END;
$function$;

CREATE OR REPLACE FUNCTION public.accept_workspace_invite(_token text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  invitation public.workspace_invites%ROWTYPE;
  current_email text;
  confirmed_at timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  SELECT email, email_confirmed_at INTO current_email, confirmed_at FROM auth.users WHERE id = auth.uid();
  SELECT * INTO invitation FROM public.workspace_invites WHERE token = _token FOR UPDATE;
  IF NOT FOUND OR invitation.accepted_at IS NOT NULL OR invitation.expires_at <= now()
    OR confirmed_at IS NULL OR lower(invitation.email) IS DISTINCT FROM lower(current_email)
    OR NOT public.is_workspace_admin(invitation.invited_by, invitation.workspace_id) THEN
    RAISE EXCEPTION 'Invalid or unapproved invitation' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.workspace_members(workspace_id, user_id, role)
    VALUES (invitation.workspace_id, auth.uid(), invitation.role)
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
  UPDATE public.profiles SET workspace_id = invitation.workspace_id WHERE user_id = auth.uid();
  UPDATE public.workspace_invites SET accepted_at = now() WHERE id = invitation.id;
  RETURN invitation.workspace_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.accept_workspace_invite(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_workspace_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_workspace_invite(text) TO service_role;