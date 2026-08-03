ALTER TABLE public.risks ADD COLUMN IF NOT EXISTS department text;
CREATE INDEX IF NOT EXISTS idx_risks_department ON public.risks (workspace_id, department);