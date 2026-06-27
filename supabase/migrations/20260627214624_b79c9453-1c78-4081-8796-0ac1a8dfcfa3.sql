
-- ============ NOTIFICATIONS ============
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  severity text NOT NULL DEFAULT 'info',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Workspace writers insert notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Users delete own notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, read_at);

-- ============ DECISION ROLES ============
CREATE TYPE public.decision_role_kind AS ENUM ('approver','legal','compliance','observer','contributor','owner');

CREATE TABLE public.decision_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  decision_id uuid NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.decision_role_kind NOT NULL,
  assigned_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (decision_id, user_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.decision_roles TO authenticated;
GRANT ALL ON public.decision_roles TO service_role;
ALTER TABLE public.decision_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read decision roles"
  ON public.decision_roles FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Writers manage decision roles"
  ON public.decision_roles FOR ALL TO authenticated
  USING (public.is_workspace_writer(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_writer(auth.uid(), workspace_id));

-- ============ ANOMALIES ============
CREATE TABLE public.anomalies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  decision_id uuid REFERENCES public.decisions(id) ON DELETE CASCADE,
  action_id uuid REFERENCES public.action_proposals(id) ON DELETE CASCADE,
  detector text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  title text NOT NULL,
  description text,
  signal jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open',
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.anomalies TO authenticated;
GRANT ALL ON public.anomalies TO service_role;
ALTER TABLE public.anomalies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read anomalies"
  ON public.anomalies FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Writers manage anomalies"
  ON public.anomalies FOR ALL TO authenticated
  USING (public.is_workspace_writer(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_writer(auth.uid(), workspace_id));
CREATE TRIGGER trg_anomalies_updated
  BEFORE UPDATE ON public.anomalies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ COMPLIANCE REPORTS ============
CREATE TABLE public.compliance_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  framework text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  scope jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary text,
  findings jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  generated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.compliance_reports TO authenticated;
GRANT ALL ON public.compliance_reports TO service_role;
ALTER TABLE public.compliance_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read compliance reports"
  ON public.compliance_reports FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Writers manage compliance reports"
  ON public.compliance_reports FOR ALL TO authenticated
  USING (public.is_workspace_writer(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_writer(auth.uid(), workspace_id));
CREATE TRIGGER trg_compliance_reports_updated
  BEFORE UPDATE ON public.compliance_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ INTEGRATIONS ============
CREATE TABLE public.integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider text NOT NULL,
  display_name text NOT NULL,
  kind text NOT NULL DEFAULT 'connector',
  status text NOT NULL DEFAULT 'disconnected',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, provider)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integrations TO authenticated;
GRANT ALL ON public.integrations TO service_role;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read integrations"
  ON public.integrations FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Admins manage integrations"
  ON public.integrations FOR ALL TO authenticated
  USING (public.is_workspace_admin(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));
CREATE TRIGGER trg_integrations_updated
  BEFORE UPDATE ON public.integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
