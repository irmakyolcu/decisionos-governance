-- 1. ai_evaluations: guarantee no orphan rows (decision_id required, cascade already set)
ALTER TABLE public.ai_evaluations ALTER COLUMN decision_id SET NOT NULL;

-- 2. meeting_recordings: uploaded_by must be a real auth user id (uuid + FK), not arbitrary text
DELETE FROM public.meeting_recordings
 WHERE uploaded_by IS NULL
    OR uploaded_by !~ '^[0-9a-fA-F-]{36}$'
    OR NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id::text = meeting_recordings.uploaded_by);

DROP POLICY IF EXISTS "Members can insert workspace recordings" ON public.meeting_recordings;
DROP POLICY IF EXISTS "Users can update their own recordings" ON public.meeting_recordings;
DROP POLICY IF EXISTS "Users can delete their own recordings" ON public.meeting_recordings;

ALTER TABLE public.meeting_recordings
  ALTER COLUMN uploaded_by TYPE uuid USING uploaded_by::uuid;
ALTER TABLE public.meeting_recordings
  ALTER COLUMN uploaded_by SET NOT NULL;
ALTER TABLE public.meeting_recordings
  ADD CONSTRAINT meeting_recordings_uploaded_by_fkey
  FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.meeting_recordings
  ALTER COLUMN workspace_id SET NOT NULL;

CREATE POLICY "Members can insert workspace recordings"
  ON public.meeting_recordings FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid() AND public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Users can update their own recordings"
  ON public.meeting_recordings FOR UPDATE TO authenticated
  USING (uploaded_by = auth.uid() AND public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (uploaded_by = auth.uid() AND public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Users can delete their own recordings"
  ON public.meeting_recordings FOR DELETE TO authenticated
  USING ((uploaded_by = auth.uid() OR public.is_workspace_admin(auth.uid(), workspace_id))
         AND public.is_workspace_member(auth.uid(), workspace_id));

-- 3. workspace_members: make the admin self-bootstrap race-safe
CREATE UNIQUE INDEX IF NOT EXISTS workspace_members_single_bootstrap_admin
  ON public.workspace_members (workspace_id)
  WHERE role = 'admin';

CREATE OR REPLACE FUNCTION public.guard_workspace_member_bootstrap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  existing int;
BEGIN
  -- Serialize concurrent inserts for the same workspace so the
  -- "no members exist yet" bootstrap check cannot be raced.
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.workspace_id::text, 0));

  IF public.is_workspace_admin(auth.uid(), NEW.workspace_id) THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO existing
  FROM public.workspace_members m
  WHERE m.workspace_id = NEW.workspace_id;

  IF existing > 0 THEN
    RAISE EXCEPTION 'Only workspace admins can add members';
  END IF;

  IF NEW.user_id <> auth.uid()
     OR NEW.role <> 'admin'::workspace_role
     OR NOT EXISTS (SELECT 1 FROM public.workspaces w
                     WHERE w.id = NEW.workspace_id AND w.created_by = auth.uid()) THEN
    RAISE EXCEPTION 'Invalid workspace bootstrap';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_workspace_member_bootstrap ON public.workspace_members;
CREATE TRIGGER trg_guard_workspace_member_bootstrap
  BEFORE INSERT ON public.workspace_members
  FOR EACH ROW EXECUTE FUNCTION public.guard_workspace_member_bootstrap();