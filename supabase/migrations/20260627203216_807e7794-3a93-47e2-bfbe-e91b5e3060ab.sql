
-- Twin profile
CREATE TABLE IF NOT EXISTS public.twin_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
  twin_name TEXT NOT NULL DEFAULT 'CEO Digital Twin',
  risk_appetite TEXT DEFAULT 'balanced',
  communication_style TEXT DEFAULT 'direct',
  decision_style TEXT,
  red_lines TEXT,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.twin_profiles TO authenticated;
GRANT ALL ON public.twin_profiles TO service_role;
ALTER TABLE public.twin_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ws read twin_profiles" ON public.twin_profiles FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "ws write twin_profiles" ON public.twin_profiles FOR ALL TO authenticated USING (public.is_workspace_writer(auth.uid(), workspace_id)) WITH CHECK (public.is_workspace_writer(auth.uid(), workspace_id));

-- Twin preferences
CREATE TABLE IF NOT EXISTS public.twin_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  statement TEXT NOT NULL,
  weight INTEGER NOT NULL DEFAULT 5,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.twin_preferences TO authenticated;
GRANT ALL ON public.twin_preferences TO service_role;
ALTER TABLE public.twin_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ws read twin_pref" ON public.twin_preferences FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "ws write twin_pref" ON public.twin_preferences FOR ALL TO authenticated USING (public.is_workspace_writer(auth.uid(), workspace_id)) WITH CHECK (public.is_workspace_writer(auth.uid(), workspace_id));

-- Twin corrections (learning log + pending learning updates)
CREATE TABLE IF NOT EXISTS public.twin_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  decision_id UUID REFERENCES public.decisions(id) ON DELETE SET NULL,
  ai_recommendation TEXT,
  human_choice TEXT,
  reason TEXT,
  proposed_learning TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.twin_corrections TO authenticated;
GRANT ALL ON public.twin_corrections TO service_role;
ALTER TABLE public.twin_corrections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ws read twin_corr" ON public.twin_corrections FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "ws insert twin_corr" ON public.twin_corrections FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) AND created_by = auth.uid());
CREATE POLICY "ws admin update twin_corr" ON public.twin_corrections FOR UPDATE TO authenticated USING (public.is_workspace_admin(auth.uid(), workspace_id)) WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));

-- Decision memory entries
CREATE TABLE IF NOT EXISTS public.memory_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  decision_id UUID REFERENCES public.decisions(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  summary TEXT,
  context TEXT,
  outcome TEXT,
  tags TEXT[] DEFAULT '{}',
  sensitivity TEXT NOT NULL DEFAULT 'internal' CHECK (sensitivity IN ('public','internal','confidential','restricted')),
  embedding JSONB,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memory_entries TO authenticated;
GRANT ALL ON public.memory_entries TO service_role;
ALTER TABLE public.memory_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ws read memory" ON public.memory_entries FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "ws write memory" ON public.memory_entries FOR ALL TO authenticated USING (public.is_workspace_writer(auth.uid(), workspace_id)) WITH CHECK (public.is_workspace_writer(auth.uid(), workspace_id));

-- Post-decision reviews
CREATE TABLE IF NOT EXISTS public.decision_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  decision_id UUID NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  scheduled_for TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expected_outcome TEXT,
  actual_outcome TEXT,
  delta_summary TEXT,
  lessons TEXT[] DEFAULT '{}',
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  reviewer_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.decision_reviews TO authenticated;
GRANT ALL ON public.decision_reviews TO service_role;
ALTER TABLE public.decision_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ws read reviews" ON public.decision_reviews FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "ws write reviews" ON public.decision_reviews FOR ALL TO authenticated USING (public.is_workspace_writer(auth.uid(), workspace_id)) WITH CHECK (public.is_workspace_writer(auth.uid(), workspace_id));

-- Agent runs
CREATE TABLE IF NOT EXISTS public.agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  decision_id UUID REFERENCES public.decisions(id) ON DELETE SET NULL,
  model TEXT,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success','failed')),
  latency_ms INTEGER,
  tokens_input INTEGER,
  tokens_output INTEGER,
  was_overridden BOOLEAN DEFAULT false,
  was_helpful BOOLEAN,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_runs TO authenticated;
GRANT ALL ON public.agent_runs TO service_role;
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ws read agent_runs" ON public.agent_runs FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "ws write agent_runs" ON public.agent_runs FOR ALL TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id)) WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

-- updated_at triggers
DROP TRIGGER IF EXISTS t_twin_profiles_updated ON public.twin_profiles;
CREATE TRIGGER t_twin_profiles_updated BEFORE UPDATE ON public.twin_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS t_memory_entries_updated ON public.memory_entries;
CREATE TRIGGER t_memory_entries_updated BEFORE UPDATE ON public.memory_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS t_decision_reviews_updated ON public.decision_reviews;
CREATE TRIGGER t_decision_reviews_updated BEFORE UPDATE ON public.decision_reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
