CREATE TABLE public.risk_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  key text NOT NULL,
  label text NOT NULL,
  weight numeric NOT NULL DEFAULT 1 CHECK (weight >= 0 AND weight <= 10),
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.risk_criteria TO authenticated;
GRANT ALL ON public.risk_criteria TO service_role;
ALTER TABLE public.risk_criteria ENABLE ROW LEVEL SECURITY;
CREATE POLICY rc_read ON public.risk_criteria FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY rc_admin_ins ON public.risk_criteria FOR INSERT TO authenticated WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));
CREATE POLICY rc_admin_upd ON public.risk_criteria FOR UPDATE TO authenticated USING (public.is_workspace_admin(auth.uid(), workspace_id)) WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));
CREATE POLICY rc_admin_del ON public.risk_criteria FOR DELETE TO authenticated USING (public.is_workspace_admin(auth.uid(), workspace_id));

CREATE TABLE public.external_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('macro','industry','geopolitical','other')),
  name text NOT NULL,
  provider text,
  url text,
  freshness_days integer NOT NULL DEFAULT 30 CHECK (freshness_days > 0),
  configured boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.external_sources TO authenticated;
GRANT ALL ON public.external_sources TO service_role;
ALTER TABLE public.external_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY es_read ON public.external_sources FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY es_ins ON public.external_sources FOR INSERT TO authenticated WITH CHECK (public.is_workspace_writer(auth.uid(), workspace_id) AND created_by = auth.uid());
CREATE POLICY es_upd ON public.external_sources FOR UPDATE TO authenticated USING (public.is_workspace_writer(auth.uid(), workspace_id)) WITH CHECK (public.is_workspace_writer(auth.uid(), workspace_id));
CREATE POLICY es_del ON public.external_sources FOR DELETE TO authenticated USING (public.is_workspace_admin(auth.uid(), workspace_id));

CREATE TABLE public.external_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES public.external_sources(id) ON DELETE CASCADE,
  title text NOT NULL,
  value text,
  summary text,
  reference_url text,
  published_at date NOT NULL,
  retrieved_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL DEFAULT auth.uid()
);
GRANT SELECT, INSERT, DELETE ON public.external_observations TO authenticated;
GRANT ALL ON public.external_observations TO service_role;
ALTER TABLE public.external_observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY eo_read ON public.external_observations FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY eo_ins ON public.external_observations FOR INSERT TO authenticated WITH CHECK (public.is_workspace_writer(auth.uid(), workspace_id) AND created_by = auth.uid()
  AND EXISTS (SELECT 1 FROM public.external_sources s WHERE s.id = source_id AND s.workspace_id = external_observations.workspace_id));
CREATE POLICY eo_del ON public.external_observations FOR DELETE TO authenticated USING (public.is_workspace_admin(auth.uid(), workspace_id));

CREATE TABLE public.decision_intelligence_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  decision_id uuid NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  model text,
  claims jsonb NOT NULL DEFAULT '[]',
  similar_decisions jsonb NOT NULL DEFAULT '[]',
  criteria_ratings jsonb NOT NULL DEFAULT '[]',
  risk_score numeric,
  risk_level text,
  probability numeric,
  probability_basis text,
  rationale text,
  mitigations jsonb NOT NULL DEFAULT '[]',
  sources jsonb NOT NULL DEFAULT '[]',
  external_status text NOT NULL DEFAULT 'not_configured',
  data_as_of timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.decision_intelligence_runs TO authenticated;
GRANT ALL ON public.decision_intelligence_runs TO service_role;
ALTER TABLE public.decision_intelligence_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY dir_read ON public.decision_intelligence_runs FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id) AND public.visible_record(workspace_id, 'decision', decision_id));
CREATE INDEX dir_decision_idx ON public.decision_intelligence_runs(decision_id, created_at DESC);