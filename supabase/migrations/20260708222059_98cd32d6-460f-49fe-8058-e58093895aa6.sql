
-- Decision edit history (audit trail for CRUD)
CREATE TABLE IF NOT EXISTS public.decision_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  decision_id uuid NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  changed_by uuid,
  change_type text NOT NULL,           -- 'create' | 'update' | 'delete' | 'status_change' | 'lock'
  field_name text,
  old_value jsonb,
  new_value jsonb,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.decision_history TO authenticated;
GRANT ALL ON public.decision_history TO service_role;

ALTER TABLE public.decision_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members view decision history"
  ON public.decision_history FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members insert decision history"
  ON public.decision_history FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE INDEX IF NOT EXISTS decision_history_decision_idx
  ON public.decision_history(decision_id, created_at DESC);

-- Trigger: automatically capture updates to a decision as history rows
CREATE OR REPLACE FUNCTION public.log_decision_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.title IS DISTINCT FROM OLD.title THEN
      INSERT INTO public.decision_history(workspace_id, decision_id, changed_by, change_type, field_name, old_value, new_value)
      VALUES (NEW.workspace_id, NEW.id, actor, 'update', 'title', to_jsonb(OLD.title), to_jsonb(NEW.title));
    END IF;
    IF NEW.description IS DISTINCT FROM OLD.description THEN
      INSERT INTO public.decision_history(workspace_id, decision_id, changed_by, change_type, field_name, old_value, new_value)
      VALUES (NEW.workspace_id, NEW.id, actor, 'update', 'description', to_jsonb(OLD.description), to_jsonb(NEW.description));
    END IF;
    IF NEW.problem_statement IS DISTINCT FROM OLD.problem_statement THEN
      INSERT INTO public.decision_history(workspace_id, decision_id, changed_by, change_type, field_name, old_value, new_value)
      VALUES (NEW.workspace_id, NEW.id, actor, 'update', 'problem_statement', to_jsonb(OLD.problem_statement), to_jsonb(NEW.problem_statement));
    END IF;
    IF NEW.budget IS DISTINCT FROM OLD.budget THEN
      INSERT INTO public.decision_history(workspace_id, decision_id, changed_by, change_type, field_name, old_value, new_value)
      VALUES (NEW.workspace_id, NEW.id, actor, 'update', 'budget', to_jsonb(OLD.budget), to_jsonb(NEW.budget));
    END IF;
    IF NEW.risk_level IS DISTINCT FROM OLD.risk_level THEN
      INSERT INTO public.decision_history(workspace_id, decision_id, changed_by, change_type, field_name, old_value, new_value)
      VALUES (NEW.workspace_id, NEW.id, actor, 'update', 'risk_level', to_jsonb(OLD.risk_level::text), to_jsonb(NEW.risk_level::text));
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.decision_history(workspace_id, decision_id, changed_by, change_type, field_name, old_value, new_value)
      VALUES (NEW.workspace_id, NEW.id, actor, 'status_change', 'status', to_jsonb(OLD.status::text), to_jsonb(NEW.status::text));
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.decision_history(workspace_id, decision_id, changed_by, change_type, note)
    VALUES (NEW.workspace_id, NEW.id, actor, 'create', 'Decision created');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_decision_changes ON public.decisions;
CREATE TRIGGER trg_log_decision_changes
  AFTER INSERT OR UPDATE ON public.decisions
  FOR EACH ROW EXECUTE FUNCTION public.log_decision_changes();

-- Lock enforcement: once Approved or Executed, only status may change (and only to Executed)
CREATE OR REPLACE FUNCTION public.enforce_decision_lock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IN ('Approved','Executed') THEN
    IF NEW.title IS DISTINCT FROM OLD.title
       OR NEW.description IS DISTINCT FROM OLD.description
       OR NEW.problem_statement IS DISTINCT FROM OLD.problem_statement
       OR NEW.budget IS DISTINCT FROM OLD.budget
       OR NEW.risk_level IS DISTINCT FROM OLD.risk_level
       OR NEW.options_considered IS DISTINCT FROM OLD.options_considered
    THEN
      RAISE EXCEPTION 'Decision is locked (status=%). Only status transitions to Executed are allowed.', OLD.status;
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status AND NOT (OLD.status = 'Approved' AND NEW.status = 'Executed') THEN
      RAISE EXCEPTION 'Locked decisions can only move Approved → Executed';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_decision_lock ON public.decisions;
CREATE TRIGGER trg_enforce_decision_lock
  BEFORE UPDATE ON public.decisions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_decision_lock();

-- Prevent deletion of locked decisions
CREATE OR REPLACE FUNCTION public.prevent_locked_decision_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IN ('Approved','Executed') THEN
    RAISE EXCEPTION 'Locked decisions cannot be deleted';
  END IF;
  RETURN OLD;
END; $$;

DROP TRIGGER IF EXISTS trg_prevent_locked_decision_delete ON public.decisions;
CREATE TRIGGER trg_prevent_locked_decision_delete
  BEFORE DELETE ON public.decisions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_locked_decision_delete();

-- Add UPDATE / DELETE policy on decisions if missing (workspace writers)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='decisions' AND policyname='Writers update decisions') THEN
    CREATE POLICY "Writers update decisions" ON public.decisions
      FOR UPDATE TO authenticated
      USING (public.is_workspace_writer(auth.uid(), workspace_id))
      WITH CHECK (public.is_workspace_writer(auth.uid(), workspace_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='decisions' AND policyname='Writers delete decisions') THEN
    CREATE POLICY "Writers delete decisions" ON public.decisions
      FOR DELETE TO authenticated
      USING (public.is_workspace_writer(auth.uid(), workspace_id));
  END IF;
END $$;

-- Ensure memory_entries has UPDATE/DELETE policies for creators and admins
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='memory_entries' AND policyname='Members update own memory') THEN
    CREATE POLICY "Members update own memory" ON public.memory_entries
      FOR UPDATE TO authenticated
      USING (public.is_workspace_member(auth.uid(), workspace_id) AND (created_by = auth.uid() OR public.is_workspace_admin(auth.uid(), workspace_id)))
      WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='memory_entries' AND policyname='Members delete own memory') THEN
    CREATE POLICY "Members delete own memory" ON public.memory_entries
      FOR DELETE TO authenticated
      USING (public.is_workspace_member(auth.uid(), workspace_id) AND (created_by = auth.uid() OR public.is_workspace_admin(auth.uid(), workspace_id)));
  END IF;
END $$;
