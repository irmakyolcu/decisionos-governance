
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE public.gmail_sync_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  decision_id uuid NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  query text,
  max_results int NOT NULL DEFAULT 10,
  cadence_minutes int NOT NULL DEFAULT 60 CHECK (cadence_minutes >= 5),
  enabled boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  next_run_at timestamptz NOT NULL DEFAULT now(),
  last_status text,
  last_count int,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (decision_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gmail_sync_schedules TO authenticated;
GRANT ALL ON public.gmail_sync_schedules TO service_role;

ALTER TABLE public.gmail_sync_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members view gmail schedules"
ON public.gmail_sync_schedules FOR SELECT TO authenticated
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "writers insert gmail schedules"
ON public.gmail_sync_schedules FOR INSERT TO authenticated
WITH CHECK (public.is_workspace_writer(auth.uid(), workspace_id) AND created_by = auth.uid());

CREATE POLICY "writers update gmail schedules"
ON public.gmail_sync_schedules FOR UPDATE TO authenticated
USING (public.is_workspace_writer(auth.uid(), workspace_id));

CREATE POLICY "writers delete gmail schedules"
ON public.gmail_sync_schedules FOR DELETE TO authenticated
USING (public.is_workspace_writer(auth.uid(), workspace_id));

CREATE TRIGGER gmail_sync_schedules_updated_at
BEFORE UPDATE ON public.gmail_sync_schedules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX gmail_sync_schedules_due_idx
ON public.gmail_sync_schedules (next_run_at)
WHERE enabled = true;
