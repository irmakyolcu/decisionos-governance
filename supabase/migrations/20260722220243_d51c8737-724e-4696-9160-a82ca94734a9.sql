
-- Company context snapshot at the time a decision was made
CREATE TABLE public.decision_context_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  decision_id uuid NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  company_state text NOT NULL,
  financial_health text,
  team_size integer,
  revenue numeric,
  runway_months integer,
  key_challenges text,
  market_conditions text,
  kpis jsonb DEFAULT '{}'::jsonb,
  recorded_by uuid,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.decision_context_snapshots TO authenticated;
GRANT ALL ON public.decision_context_snapshots TO service_role;
ALTER TABLE public.decision_context_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ctx_snap_select" ON public.decision_context_snapshots FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "ctx_snap_insert" ON public.decision_context_snapshots FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_writer(auth.uid(), workspace_id) AND recorded_by = auth.uid());
CREATE POLICY "ctx_snap_update" ON public.decision_context_snapshots FOR UPDATE TO authenticated
  USING (public.is_workspace_writer(auth.uid(), workspace_id));
CREATE POLICY "ctx_snap_delete" ON public.decision_context_snapshots FOR DELETE TO authenticated
  USING (public.is_workspace_admin(auth.uid(), workspace_id));

CREATE INDEX idx_ctx_snap_decision ON public.decision_context_snapshots(decision_id);

-- Outcomes recorded after a decision is executed
CREATE TABLE public.decision_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  decision_id uuid NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  outcome_status text NOT NULL CHECK (outcome_status IN ('success','partial','failure','ongoing','unknown')),
  summary text NOT NULL,
  impact_financial numeric,
  impact_qualitative text,
  metrics jsonb DEFAULT '{}'::jsonb,
  lessons_learned text,
  measured_at timestamptz NOT NULL DEFAULT now(),
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.decision_outcomes TO authenticated;
GRANT ALL ON public.decision_outcomes TO service_role;
ALTER TABLE public.decision_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "outcomes_select" ON public.decision_outcomes FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "outcomes_insert" ON public.decision_outcomes FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_writer(auth.uid(), workspace_id) AND recorded_by = auth.uid());
CREATE POLICY "outcomes_update" ON public.decision_outcomes FOR UPDATE TO authenticated
  USING (public.is_workspace_writer(auth.uid(), workspace_id));
CREATE POLICY "outcomes_delete" ON public.decision_outcomes FOR DELETE TO authenticated
  USING (public.is_workspace_admin(auth.uid(), workspace_id));

CREATE TRIGGER trg_outcomes_updated_at BEFORE UPDATE ON public.decision_outcomes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_outcomes_decision ON public.decision_outcomes(decision_id);
