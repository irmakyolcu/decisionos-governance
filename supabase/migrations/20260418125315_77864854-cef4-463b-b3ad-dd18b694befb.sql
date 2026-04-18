
-- ============ ENUMS ============
CREATE TYPE public.decision_status AS ENUM ('Draft', 'Pending', 'Under Review', 'Approved', 'Rejected', 'Escalated', 'Executed');
CREATE TYPE public.risk_level AS ENUM ('Low', 'Medium', 'High', 'Critical');
CREATE TYPE public.outcome_status AS ENUM ('Success', 'Partial Success', 'Failure', 'Pending');
CREATE TYPE public.proposal_status AS ENUM ('Submitted', 'Under Review', 'Approved', 'Rejected');
CREATE TYPE public.procon_type AS ENUM ('pro', 'con');

-- ============ DECISIONS ============
CREATE TABLE public.decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  problem_statement text NOT NULL DEFAULT '',
  options_considered jsonb NOT NULL DEFAULT '[]'::jsonb,
  budget numeric NOT NULL DEFAULT 0,
  risk_level public.risk_level NOT NULL DEFAULT 'Medium',
  status public.decision_status NOT NULL DEFAULT 'Draft',
  created_by uuid NOT NULL,
  meeting_id uuid,
  outcome_status public.outcome_status,
  success_criteria jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_decisions_workspace ON public.decisions(workspace_id);
ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.decision_pros_cons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id uuid NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  type public.procon_type NOT NULL,
  description text NOT NULL,
  added_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pros_cons_decision ON public.decision_pros_cons(decision_id);
ALTER TABLE public.decision_pros_cons ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.decision_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id uuid NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_comments_decision ON public.decision_comments(decision_id);
ALTER TABLE public.decision_comments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.decision_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id uuid NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  approved_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(decision_id, user_id)
);
ALTER TABLE public.decision_approvals ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.ai_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id uuid NOT NULL UNIQUE REFERENCES public.decisions(id) ON DELETE CASCADE,
  change_percentage numeric NOT NULL DEFAULT 0,
  budget_change numeric NOT NULL DEFAULT 0,
  timeline_change numeric NOT NULL DEFAULT 0,
  risk_change numeric NOT NULL DEFAULT 0,
  expected_roi numeric NOT NULL DEFAULT 0,
  risk_adjusted_roi numeric NOT NULL DEFAULT 0,
  break_even_months integer NOT NULL DEFAULT 0,
  expected_value numeric NOT NULL DEFAULT 0,
  summary text NOT NULL DEFAULT '',
  impact_breakdown jsonb NOT NULL DEFAULT '[]'::jsonb,
  evaluated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_evaluations ENABLE ROW LEVEL SECURITY;

-- ============ MEETINGS ============
CREATE TABLE public.meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  date date NOT NULL,
  start_time text NOT NULL DEFAULT '09:00',
  end_time text NOT NULL DEFAULT '10:00',
  location text NOT NULL DEFAULT '',
  chairperson_id uuid,
  is_approved boolean NOT NULL DEFAULT false,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_meetings_workspace ON public.meetings(workspace_id);
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.meeting_attendees (
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  PRIMARY KEY (meeting_id, user_id)
);
ALTER TABLE public.meeting_attendees ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.agenda_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  title text NOT NULL,
  duration integer NOT NULL DEFAULT 30,
  presenter_id uuid,
  description text,
  linked_decision_id uuid REFERENCES public.decisions(id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_agenda_meeting ON public.agenda_items(meeting_id);
ALTER TABLE public.agenda_items ENABLE ROW LEVEL SECURITY;

-- FK from decisions.meeting_id -> meetings (added now that meetings exists)
ALTER TABLE public.decisions
  ADD CONSTRAINT decisions_meeting_id_fkey
  FOREIGN KEY (meeting_id) REFERENCES public.meetings(id) ON DELETE SET NULL;

-- ============ PROPOSALS ============
CREATE TABLE public.proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  submitted_by uuid NOT NULL,
  budget numeric NOT NULL DEFAULT 0,
  status public.proposal_status NOT NULL DEFAULT 'Submitted',
  department text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_proposals_workspace ON public.proposals(workspace_id);
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

-- ============ updated_at TRIGGERS ============
CREATE TRIGGER trg_decisions_updated BEFORE UPDATE ON public.decisions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_meetings_updated BEFORE UPDATE ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_proposals_updated BEFORE UPDATE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ HELPER: writer role check ============
CREATE OR REPLACE FUNCTION public.is_workspace_writer(_user_id uuid, _workspace_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = _user_id AND workspace_id = _workspace_id AND role IN ('admin','approver')
  );
$$;

-- Lock check: prevent updates to Approved decisions (immutable record rule)
CREATE OR REPLACE FUNCTION public.prevent_approved_decision_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'Approved' AND NEW.status = OLD.status THEN
    RAISE EXCEPTION 'Approved decisions are immutable';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_lock_approved_decisions
  BEFORE UPDATE ON public.decisions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_approved_decision_update();

-- ============ RLS POLICIES ============

-- decisions
CREATE POLICY "members read decisions" ON public.decisions FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "writers insert decisions" ON public.decisions FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_writer(auth.uid(), workspace_id) AND created_by = auth.uid());
CREATE POLICY "writers update decisions" ON public.decisions FOR UPDATE TO authenticated
  USING (public.is_workspace_writer(auth.uid(), workspace_id));
CREATE POLICY "admins delete decisions" ON public.decisions FOR DELETE TO authenticated
  USING (public.is_workspace_admin(auth.uid(), workspace_id));

-- decision_pros_cons
CREATE POLICY "members read pc" ON public.decision_pros_cons FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.decisions d WHERE d.id = decision_id AND public.is_workspace_member(auth.uid(), d.workspace_id)));
CREATE POLICY "members insert pc" ON public.decision_pros_cons FOR INSERT TO authenticated
  WITH CHECK (added_by = auth.uid() AND EXISTS (SELECT 1 FROM public.decisions d WHERE d.id = decision_id AND public.is_workspace_member(auth.uid(), d.workspace_id)));
CREATE POLICY "admins delete pc" ON public.decision_pros_cons FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.decisions d WHERE d.id = decision_id AND public.is_workspace_admin(auth.uid(), d.workspace_id)));

-- decision_comments (append-only: no UPDATE, no DELETE policy)
CREATE POLICY "members read comments" ON public.decision_comments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.decisions d WHERE d.id = decision_id AND public.is_workspace_member(auth.uid(), d.workspace_id)));
CREATE POLICY "members insert comments" ON public.decision_comments FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND EXISTS (SELECT 1 FROM public.decisions d WHERE d.id = decision_id AND public.is_workspace_member(auth.uid(), d.workspace_id)));

-- decision_approvals
CREATE POLICY "members read approvals" ON public.decision_approvals FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.decisions d WHERE d.id = decision_id AND public.is_workspace_member(auth.uid(), d.workspace_id)));
CREATE POLICY "writers insert approvals" ON public.decision_approvals FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.decisions d WHERE d.id = decision_id AND public.is_workspace_writer(auth.uid(), d.workspace_id)));

-- ai_evaluations
CREATE POLICY "members read ai" ON public.ai_evaluations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.decisions d WHERE d.id = decision_id AND public.is_workspace_member(auth.uid(), d.workspace_id)));
CREATE POLICY "writers write ai" ON public.ai_evaluations FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.decisions d WHERE d.id = decision_id AND public.is_workspace_writer(auth.uid(), d.workspace_id)));
CREATE POLICY "writers update ai" ON public.ai_evaluations FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.decisions d WHERE d.id = decision_id AND public.is_workspace_writer(auth.uid(), d.workspace_id)));

-- meetings
CREATE POLICY "members read meetings" ON public.meetings FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "writers insert meetings" ON public.meetings FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_writer(auth.uid(), workspace_id));
CREATE POLICY "writers update meetings" ON public.meetings FOR UPDATE TO authenticated
  USING (public.is_workspace_writer(auth.uid(), workspace_id));
CREATE POLICY "admins delete meetings" ON public.meetings FOR DELETE TO authenticated
  USING (public.is_workspace_admin(auth.uid(), workspace_id));

-- meeting_attendees
CREATE POLICY "members read attendees" ON public.meeting_attendees FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.meetings m WHERE m.id = meeting_id AND public.is_workspace_member(auth.uid(), m.workspace_id)));
CREATE POLICY "writers insert attendees" ON public.meeting_attendees FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.meetings m WHERE m.id = meeting_id AND public.is_workspace_writer(auth.uid(), m.workspace_id)));
CREATE POLICY "writers delete attendees" ON public.meeting_attendees FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.meetings m WHERE m.id = meeting_id AND public.is_workspace_writer(auth.uid(), m.workspace_id)));

-- agenda_items
CREATE POLICY "members read agenda" ON public.agenda_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.meetings m WHERE m.id = meeting_id AND public.is_workspace_member(auth.uid(), m.workspace_id)));
CREATE POLICY "writers insert agenda" ON public.agenda_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.meetings m WHERE m.id = meeting_id AND public.is_workspace_writer(auth.uid(), m.workspace_id)));
CREATE POLICY "writers update agenda" ON public.agenda_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.meetings m WHERE m.id = meeting_id AND public.is_workspace_writer(auth.uid(), m.workspace_id)));
CREATE POLICY "writers delete agenda" ON public.agenda_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.meetings m WHERE m.id = meeting_id AND public.is_workspace_writer(auth.uid(), m.workspace_id)));

-- proposals
CREATE POLICY "members read proposals" ON public.proposals FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "members insert proposals" ON public.proposals FOR INSERT TO authenticated
  WITH CHECK (submitted_by = auth.uid() AND public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "writers update proposals" ON public.proposals FOR UPDATE TO authenticated
  USING (public.is_workspace_writer(auth.uid(), workspace_id));
CREATE POLICY "admins delete proposals" ON public.proposals FOR DELETE TO authenticated
  USING (public.is_workspace_admin(auth.uid(), workspace_id));

-- ============ SEED FUNCTION & TRIGGER ============
CREATE OR REPLACE FUNCTION public.seed_workspace_demo_data(_workspace_id uuid, _creator uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  d1 uuid := gen_random_uuid();
  d2 uuid := gen_random_uuid();
  d3 uuid := gen_random_uuid();
  m1 uuid := gen_random_uuid();
  m2 uuid := gen_random_uuid();
BEGIN
  -- Decisions
  INSERT INTO public.decisions (id, workspace_id, title, description, problem_statement, options_considered, budget, risk_level, status, created_by, success_criteria) VALUES
  (d1, _workspace_id, 'Cloud Infrastructure Migration',
   'Migrate on-premise infrastructure to AWS cloud services for improved scalability and cost efficiency.',
   'Current on-premise infrastructure is reaching capacity limits and maintenance costs are increasing by 15% annually.',
   '["AWS Migration","Azure Migration","Hybrid Cloud Approach","Infrastructure Expansion"]'::jsonb,
   2500000, 'High', 'Under Review', _creator,
   '{"roiTarget":25,"timelineTarget":"6 months","riskTolerance":"Medium","complianceRequirements":["SOC 2","GDPR","ISO 27001"]}'::jsonb),
  (d2, _workspace_id, 'Strategic Partnership with TechCorp',
   'Enter into a strategic partnership agreement with TechCorp for joint product development.',
   'Need to accelerate time-to-market for new product lines while sharing R&D costs.',
   '["TechCorp Partnership","InnovateCo Partnership","Internal Development","Acquisition"]'::jsonb,
   8000000, 'Critical', 'Escalated', _creator,
   '{"roiTarget":40,"timelineTarget":"24 months","riskTolerance":"High","complianceRequirements":["Antitrust Review","Board Approval"]}'::jsonb),
  (d3, _workspace_id, 'Marketing Campaign Q2 2024',
   'Launch integrated marketing campaign for new product line across digital and traditional channels.',
   'New product line needs market visibility to achieve Q2 sales targets.',
   '["Full Campaign","Digital Only","Regional Rollout"]'::jsonb,
   180000, 'Low', 'Approved', _creator, NULL);

  -- Pros/Cons
  INSERT INTO public.decision_pros_cons (decision_id, type, description, added_by) VALUES
  (d1, 'pro', 'Reduces infrastructure costs by 30% over 3 years', _creator),
  (d1, 'pro', 'Enables auto-scaling for peak demand periods', _creator),
  (d1, 'con', 'Initial migration requires 6-month timeline', _creator),
  (d1, 'con', 'Staff retraining required for cloud operations', _creator),
  (d2, 'pro', 'Access to TechCorp''s AI research capabilities', _creator),
  (d2, 'con', 'Significant budget commitment exceeds CEO authority', _creator),
  (d3, 'pro', 'Expected 25% increase in brand awareness', _creator),
  (d3, 'con', 'Competitive market may dilute message impact', _creator);

  -- Comments
  INSERT INTO public.decision_comments (decision_id, author_id, content) VALUES
  (d1, _creator, 'We need to ensure compliance with data residency requirements.');

  -- AI evaluation for d1
  INSERT INTO public.ai_evaluations (decision_id, change_percentage, budget_change, timeline_change, risk_change, expected_roi, risk_adjusted_roi, break_even_months, expected_value, summary, impact_breakdown) VALUES
  (d1, 18, -12, 6, -9, 32, 24, 14, 1800000,
   'This decision shows strong potential for cost optimization with a calculated ROI of 32%. The 6% timeline extension is acceptable given the 12% budget reduction. Risk profile improves by 9 points due to comprehensive mitigation strategies. Recommend proceeding with enhanced monitoring.',
   '[{"component":"Budget","change":"-12%","impact":"Cost reduction"},{"component":"Timeline","change":"+6%","impact":"Moderate delay"},{"component":"Risk","change":"-9 points","impact":"Improvement"},{"component":"Resources","change":"+8%","impact":"Additional staffing"}]'::jsonb);

  -- Approvals for d3
  INSERT INTO public.decision_approvals (decision_id, user_id) VALUES (d3, _creator);

  -- Meetings
  INSERT INTO public.meetings (id, workspace_id, title, date, start_time, end_time, location, chairperson_id, is_approved, approved_at) VALUES
  (m1, _workspace_id, 'Q1 Board Strategy Review', '2024-01-20', '09:00', '12:00', 'Executive Boardroom A', _creator, false, NULL),
  (m2, _workspace_id, 'Executive Committee Meeting', '2024-01-15', '14:00', '16:00', 'Video Conference - Teams', _creator, true, '2024-01-15'::timestamptz);

  INSERT INTO public.meeting_attendees (meeting_id, user_id) VALUES (m1, _creator), (m2, _creator);

  INSERT INTO public.agenda_items (meeting_id, title, duration, presenter_id, linked_decision_id, sort_order) VALUES
  (m1, 'Q4 Financial Review', 30, _creator, NULL, 1),
  (m1, 'Strategic Partnership Proposals', 45, _creator, d2, 2),
  (m1, 'Infrastructure Investment Decision', 45, _creator, d1, 3),
  (m1, 'Risk Assessment Update', 30, NULL, NULL, 4),
  (m2, 'Cloud Migration Update', 30, _creator, d1, 1),
  (m2, 'Budget Reallocation', 30, _creator, NULL, 2);

  -- Link decision d1 to meeting m2
  UPDATE public.decisions SET meeting_id = m2 WHERE id = d1;
  UPDATE public.decisions SET meeting_id = m1 WHERE id = d2;

  -- Proposals
  INSERT INTO public.proposals (workspace_id, title, description, submitted_by, budget, status, department) VALUES
  (_workspace_id, 'Employee Training Program Expansion', 'Expand professional development programs to include cloud certification and leadership training.', _creator, 150000, 'Under Review', 'Engineering'),
  (_workspace_id, 'New CRM Implementation', 'Replace legacy CRM system with Salesforce for improved customer relationship management.', _creator, 320000, 'Submitted', 'Marketing'),
  (_workspace_id, 'Office Space Renovation', 'Renovate 3rd floor to create collaborative workspace and meeting areas.', _creator, 450000, 'Approved', 'Operations');
END;
$$;

-- Trigger: when a new workspace is created, seed it
CREATE OR REPLACE FUNCTION public.handle_new_workspace_seed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.seed_workspace_demo_data(NEW.id, NEW.created_by);
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_seed_new_workspace
  AFTER INSERT ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_workspace_seed();
