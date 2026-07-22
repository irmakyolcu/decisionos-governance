
CREATE TABLE public.decision_macro_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  decision_id UUID NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  sector TEXT,
  geographies TEXT[],
  macro_score INTEGER,
  macro_level TEXT,
  outlook TEXT,
  headline TEXT,
  commentary TEXT,
  risks JSONB DEFAULT '[]'::jsonb,
  opportunities JSONB DEFAULT '[]'::jsonb,
  indicators JSONB DEFAULT '{}'::jsonb,
  geopolitical_notes TEXT,
  sources JSONB DEFAULT '[]'::jsonb,
  model TEXT,
  triggered_by UUID,
  trigger_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.decision_macro_assessments TO authenticated;
GRANT ALL ON public.decision_macro_assessments TO service_role;

ALTER TABLE public.decision_macro_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members read macro assessments"
ON public.decision_macro_assessments FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.workspace_members wm
  WHERE wm.workspace_id = decision_macro_assessments.workspace_id
    AND wm.user_id = auth.uid()
));

CREATE POLICY "admins/approvers insert macro assessments"
ON public.decision_macro_assessments FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.workspace_members wm
  WHERE wm.workspace_id = decision_macro_assessments.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('admin','approver')
));

CREATE INDEX idx_macro_assess_decision ON public.decision_macro_assessments(decision_id, created_at DESC);
