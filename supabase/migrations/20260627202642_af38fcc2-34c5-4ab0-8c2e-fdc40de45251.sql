
-- Phase 1: Governed AI Decision & Execution Platform

-- Enums
DO $$ BEGIN
  CREATE TYPE public.authority_level AS ENUM ('observe','prepare','act','commit');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.action_status AS ENUM ('draft','awaiting_policy','awaiting_approval','partially_approved','approved','scheduled','executing','completed','failed','rolled_back','cancelled','expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.policy_effect AS ENUM ('allow','allow_with_logging','require_approval','require_multi_approval','warn','block','escalate');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extend decisions
ALTER TABLE public.decisions
  ADD COLUMN IF NOT EXISTS decision_type TEXT,
  ADD COLUMN IF NOT EXISTS strategic_importance TEXT,
  ADD COLUMN IF NOT EXISTS review_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ;

-- decision_alternatives
CREATE TABLE IF NOT EXISTS public.decision_alternatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  decision_id UUID NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  estimated_cost NUMERIC DEFAULT 0,
  expected_value NUMERIC DEFAULT 0,
  time_to_impact TEXT,
  complexity TEXT,
  risk_level TEXT,
  reversibility TEXT,
  confidence NUMERIC DEFAULT 0,
  is_recommended BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.decision_alternatives TO authenticated;
GRANT ALL ON public.decision_alternatives TO service_role;
ALTER TABLE public.decision_alternatives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ws members read alternatives" ON public.decision_alternatives FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "ws writers write alternatives" ON public.decision_alternatives FOR ALL TO authenticated USING (public.is_workspace_writer(auth.uid(), workspace_id)) WITH CHECK (public.is_workspace_writer(auth.uid(), workspace_id));

-- decision_evidence
CREATE TABLE IF NOT EXISTS public.decision_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  decision_id UUID NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  source_date DATE,
  owner TEXT,
  reliability TEXT DEFAULT 'medium',
  is_verified BOOLEAN DEFAULT false,
  supports TEXT,
  contradicts TEXT,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.decision_evidence TO authenticated;
GRANT ALL ON public.decision_evidence TO service_role;
ALTER TABLE public.decision_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ws read evidence" ON public.decision_evidence FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "ws write evidence" ON public.decision_evidence FOR ALL TO authenticated USING (public.is_workspace_writer(auth.uid(), workspace_id)) WITH CHECK (public.is_workspace_writer(auth.uid(), workspace_id));

-- decision_assumptions
CREATE TABLE IF NOT EXISTS public.decision_assumptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  decision_id UUID NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  confidence NUMERIC DEFAULT 0.5,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.decision_assumptions TO authenticated;
GRANT ALL ON public.decision_assumptions TO service_role;
ALTER TABLE public.decision_assumptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ws read assumptions" ON public.decision_assumptions FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "ws write assumptions" ON public.decision_assumptions FOR ALL TO authenticated USING (public.is_workspace_writer(auth.uid(), workspace_id)) WITH CHECK (public.is_workspace_writer(auth.uid(), workspace_id));

-- decision_unknowns
CREATE TABLE IF NOT EXISTS public.decision_unknowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  decision_id UUID NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  is_blocking BOOLEAN DEFAULT false,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.decision_unknowns TO authenticated;
GRANT ALL ON public.decision_unknowns TO service_role;
ALTER TABLE public.decision_unknowns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ws read unknowns" ON public.decision_unknowns FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "ws write unknowns" ON public.decision_unknowns FOR ALL TO authenticated USING (public.is_workspace_writer(auth.uid(), workspace_id)) WITH CHECK (public.is_workspace_writer(auth.uid(), workspace_id));

-- decision_recommendations
CREATE TABLE IF NOT EXISTS public.decision_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  decision_id UUID NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  recommended_alternative_id UUID REFERENCES public.decision_alternatives(id) ON DELETE SET NULL,
  rationale TEXT,
  confidence NUMERIC DEFAULT 0,
  invalidation_conditions TEXT,
  devils_advocate TEXT,
  model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.decision_recommendations TO authenticated;
GRANT ALL ON public.decision_recommendations TO service_role;
ALTER TABLE public.decision_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ws read recs" ON public.decision_recommendations FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "ws write recs" ON public.decision_recommendations FOR ALL TO authenticated USING (public.is_workspace_writer(auth.uid(), workspace_id)) WITH CHECK (public.is_workspace_writer(auth.uid(), workspace_id));

-- decision_scenarios
CREATE TABLE IF NOT EXISTS public.decision_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  decision_id UUID NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  scenario TEXT NOT NULL,
  assumptions JSONB DEFAULT '[]'::jsonb,
  financial_impact NUMERIC DEFAULT 0,
  probability NUMERIC DEFAULT 0,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.decision_scenarios TO authenticated;
GRANT ALL ON public.decision_scenarios TO service_role;
ALTER TABLE public.decision_scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ws read scenarios" ON public.decision_scenarios FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "ws write scenarios" ON public.decision_scenarios FOR ALL TO authenticated USING (public.is_workspace_writer(auth.uid(), workspace_id)) WITH CHECK (public.is_workspace_writer(auth.uid(), workspace_id));

-- action_proposals
CREATE TABLE IF NOT EXISTS public.action_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  decision_id UUID REFERENCES public.decisions(id) ON DELETE SET NULL,
  agent_id TEXT,
  title TEXT NOT NULL,
  action_type TEXT NOT NULL,
  authority_level public.authority_level NOT NULL DEFAULT 'act',
  risk_level TEXT NOT NULL DEFAULT 'medium',
  target_system TEXT,
  proposed_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  reason TEXT,
  supporting_evidence JSONB DEFAULT '[]'::jsonb,
  policy_result public.policy_effect,
  required_approver_count INTEGER NOT NULL DEFAULT 1,
  required_approver_roles TEXT[] DEFAULT '{}',
  approval_status public.action_status NOT NULL DEFAULT 'draft',
  version INTEGER NOT NULL DEFAULT 1,
  content_hash TEXT,
  expires_at TIMESTAMPTZ,
  rollback_available BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.action_proposals TO authenticated;
GRANT ALL ON public.action_proposals TO service_role;
ALTER TABLE public.action_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ws read actions" ON public.action_proposals FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "ws write actions" ON public.action_proposals FOR ALL TO authenticated USING (public.is_workspace_writer(auth.uid(), workspace_id)) WITH CHECK (public.is_workspace_writer(auth.uid(), workspace_id));

-- action_approvals
CREATE TABLE IF NOT EXISTS public.action_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  action_id UUID NOT NULL REFERENCES public.action_proposals(id) ON DELETE CASCADE,
  action_version INTEGER NOT NULL,
  approver_id UUID NOT NULL,
  vote TEXT NOT NULL CHECK (vote IN ('approve','approve_with_conditions','reject','delegate','escalate','request_evidence')),
  rationale TEXT,
  conditions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(action_id, action_version, approver_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.action_approvals TO authenticated;
GRANT ALL ON public.action_approvals TO service_role;
ALTER TABLE public.action_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ws read action_approvals" ON public.action_approvals FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "ws insert action_approvals" ON public.action_approvals FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) AND approver_id = auth.uid());

-- execution_records
CREATE TABLE IF NOT EXISTS public.execution_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  action_id UUID NOT NULL REFERENCES public.action_proposals(id) ON DELETE CASCADE,
  action_version INTEGER NOT NULL,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  executed_payload JSONB,
  target_system TEXT,
  result TEXT NOT NULL CHECK (result IN ('success','failed','rolled_back')),
  verification_status TEXT,
  error_details TEXT,
  rollback_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.execution_records TO authenticated;
GRANT ALL ON public.execution_records TO service_role;
ALTER TABLE public.execution_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ws read exec records" ON public.execution_records FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));

-- policies
CREATE TABLE IF NOT EXISTS public.policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  owner_id UUID,
  applicable_departments TEXT[] DEFAULT '{}',
  applicable_action_types TEXT[] DEFAULT '{}',
  priority INTEGER NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'active',
  effective_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  rule_tree JSONB NOT NULL DEFAULT '{}'::jsonb,
  effect public.policy_effect NOT NULL DEFAULT 'require_approval',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.policies TO authenticated;
GRANT ALL ON public.policies TO service_role;
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ws read policies" ON public.policies FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "ws admin write policies" ON public.policies FOR ALL TO authenticated USING (public.is_workspace_admin(auth.uid(), workspace_id)) WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));

-- policy_versions
CREATE TABLE IF NOT EXISTS public.policy_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  policy_id UUID NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  rule_tree JSONB NOT NULL,
  effect public.policy_effect NOT NULL,
  changed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.policy_versions TO authenticated;
GRANT ALL ON public.policy_versions TO service_role;
ALTER TABLE public.policy_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ws read policy_versions" ON public.policy_versions FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));

-- policy_evaluations
CREATE TABLE IF NOT EXISTS public.policy_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  action_id UUID NOT NULL REFERENCES public.action_proposals(id) ON DELETE CASCADE,
  policy_id UUID REFERENCES public.policies(id) ON DELETE SET NULL,
  policy_version INTEGER,
  result public.policy_effect NOT NULL,
  matched BOOLEAN NOT NULL DEFAULT false,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.policy_evaluations TO authenticated;
GRANT ALL ON public.policy_evaluations TO service_role;
ALTER TABLE public.policy_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ws read policy_evals" ON public.policy_evaluations FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));

-- audit_events (append-only)
CREATE TABLE IF NOT EXISTS public.audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  decision_id UUID,
  action_id UUID,
  actor_user_id UUID,
  agent_id TEXT,
  before_state JSONB,
  after_state JSONB,
  reason TEXT,
  model TEXT,
  policy_version INTEGER,
  trace_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_events TO authenticated;
GRANT ALL ON public.audit_events TO service_role;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ws read audit" ON public.audit_events FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "ws insert audit" ON public.audit_events FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

-- Block update/delete on audit_events (append-only)
CREATE OR REPLACE FUNCTION public.audit_events_immutable()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only';
END; $$;
DROP TRIGGER IF EXISTS audit_events_no_update ON public.audit_events;
CREATE TRIGGER audit_events_no_update BEFORE UPDATE OR DELETE ON public.audit_events
  FOR EACH ROW EXECUTE FUNCTION public.audit_events_immutable();

-- Updated_at triggers
DROP TRIGGER IF EXISTS t_action_proposals_updated ON public.action_proposals;
CREATE TRIGGER t_action_proposals_updated BEFORE UPDATE ON public.action_proposals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS t_decision_alternatives_updated ON public.decision_alternatives;
CREATE TRIGGER t_decision_alternatives_updated BEFORE UPDATE ON public.decision_alternatives
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS t_policies_updated ON public.policies;
CREATE TRIGGER t_policies_updated BEFORE UPDATE ON public.policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Invalidate approvals on payload change
CREATE OR REPLACE FUNCTION public.invalidate_action_on_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.proposed_payload IS DISTINCT FROM OLD.proposed_payload THEN
    NEW.version := OLD.version + 1;
    NEW.content_hash := encode(digest(NEW.proposed_payload::text, 'sha256'), 'hex');
    NEW.approval_status := 'awaiting_approval';
    INSERT INTO public.audit_events (workspace_id, event_type, action_id, decision_id, reason, before_state, after_state)
    VALUES (NEW.workspace_id, 'action.payload_changed_approvals_invalidated', NEW.id, NEW.decision_id,
            'Payload changed; prior approvals invalidated', OLD.proposed_payload, NEW.proposed_payload);
  END IF;
  RETURN NEW;
END; $$;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP TRIGGER IF EXISTS t_action_invalidate ON public.action_proposals;
CREATE TRIGGER t_action_invalidate BEFORE UPDATE ON public.action_proposals
  FOR EACH ROW EXECUTE FUNCTION public.invalidate_action_on_change();

-- Initial hash on insert
CREATE OR REPLACE FUNCTION public.set_action_hash_on_insert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.content_hash IS NULL THEN
    NEW.content_hash := encode(digest(NEW.proposed_payload::text, 'sha256'), 'hex');
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS t_action_hash_insert ON public.action_proposals;
CREATE TRIGGER t_action_hash_insert BEFORE INSERT ON public.action_proposals
  FOR EACH ROW EXECUTE FUNCTION public.set_action_hash_on_insert();
