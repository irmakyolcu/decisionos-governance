
CREATE TABLE public.decision_risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  decision_id UUID NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  risk_score NUMERIC NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  confidence NUMERIC CHECK (confidence >= 0 AND confidence <= 100),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low','medium','high','critical')),
  verdict TEXT,
  commentary TEXT NOT NULL,
  comparison_note TEXT,
  previous_score NUMERIC,
  score_delta NUMERIC,
  triggered_by UUID REFERENCES auth.users(id),
  trigger_reason TEXT,
  model TEXT,
  snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dra_decision ON public.decision_risk_assessments(decision_id, created_at DESC);
CREATE INDEX idx_dra_workspace ON public.decision_risk_assessments(workspace_id, created_at DESC);

GRANT SELECT, INSERT ON public.decision_risk_assessments TO authenticated;
GRANT ALL ON public.decision_risk_assessments TO service_role;

ALTER TABLE public.decision_risk_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read risk assessments"
  ON public.decision_risk_assessments FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members insert risk assessments"
  ON public.decision_risk_assessments FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) AND triggered_by = auth.uid());
