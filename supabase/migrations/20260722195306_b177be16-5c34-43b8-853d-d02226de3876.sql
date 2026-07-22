CREATE TABLE public.report_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  name text NOT NULL,
  scope text NOT NULL DEFAULT 'all',
  format text NOT NULL DEFAULT 'markdown',
  recipient_email text NOT NULL,
  cadence text NOT NULL DEFAULT 'weekly',
  active boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_schedules TO authenticated;
GRANT ALL ON public.report_schedules TO service_role;
ALTER TABLE public.report_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read schedules" ON public.report_schedules FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "writers manage schedules" ON public.report_schedules FOR ALL TO authenticated
  USING (public.is_workspace_writer(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_writer(auth.uid(), workspace_id));
CREATE TRIGGER trg_report_schedules_updated BEFORE UPDATE ON public.report_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();