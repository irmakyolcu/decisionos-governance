-- Enums
DO $$ BEGIN
  CREATE TYPE public.confidentiality_level AS ENUM ('public_internal','internal','confidential','highly_confidential');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.risk_severity AS ENUM ('low','medium','high','critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.risk_status AS ENUM ('new','investigating','action_required','resolved','dismissed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.skill_status AS ENUM ('draft','active','needs_review','deprecated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.source_kind AS ENUM ('gmail','outlook','slack','teams','drive','sharepoint','notion','hubspot','salesforce','jira','linear','github','zoom','manual_upload','meeting_transcript','pasted_text','url','internal_note');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.doc_process_status AS ENUM ('uploaded','processing','indexed','needs_review','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.can_view_confidential(_user_id uuid, _workspace_id uuid, _creator uuid, _level public.confidentiality_level)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_workspace_member(_user_id, _workspace_id)
    AND (_level IN ('public_internal','internal') OR _creator = _user_id OR public.is_workspace_admin(_user_id, _workspace_id));
$$;

CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  relationship_owner uuid REFERENCES auth.users(id),
  health_score integer DEFAULT 75,
  risk_level public.risk_severity DEFAULT 'low',
  industry text,
  revenue_at_risk numeric DEFAULT 0,
  contract_terms text,
  key_contacts jsonb DEFAULT '[]'::jsonb,
  promises jsonb DEFAULT '[]'::jsonb,
  sentiment_trend text,
  notes text,
  confidentiality public.confidentiality_level DEFAULT 'internal',
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clients_select" ON public.clients FOR SELECT USING (public.can_view_confidential(auth.uid(), workspace_id, created_by, confidentiality));
CREATE POLICY "clients_write" ON public.clients FOR INSERT WITH CHECK (public.is_workspace_writer(auth.uid(), workspace_id));
CREATE POLICY "clients_update" ON public.clients FOR UPDATE USING (public.is_workspace_writer(auth.uid(), workspace_id));
CREATE POLICY "clients_delete" ON public.clients FOR DELETE USING (public.is_workspace_admin(auth.uid(), workspace_id));
CREATE TRIGGER trg_clients_updated BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  name text NOT NULL,
  status text DEFAULT 'active',
  owner_id uuid REFERENCES auth.users(id),
  team jsonb DEFAULT '[]'::jsonb,
  objective text,
  milestones jsonb DEFAULT '[]'::jsonb,
  dependencies jsonb DEFAULT '[]'::jsonb,
  open_questions jsonb DEFAULT '[]'::jsonb,
  next_actions jsonb DEFAULT '[]'::jsonb,
  knowledge_gaps jsonb DEFAULT '[]'::jsonb,
  confidentiality public.confidentiality_level DEFAULT 'internal',
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects_select" ON public.projects FOR SELECT USING (public.can_view_confidential(auth.uid(), workspace_id, created_by, confidentiality));
CREATE POLICY "projects_write" ON public.projects FOR INSERT WITH CHECK (public.is_workspace_writer(auth.uid(), workspace_id));
CREATE POLICY "projects_update" ON public.projects FOR UPDATE USING (public.is_workspace_writer(auth.uid(), workspace_id));
CREATE POLICY "projects_delete" ON public.projects FOR DELETE USING (public.is_workspace_admin(auth.uid(), workspace_id));
CREATE TRIGGER trg_projects_updated BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.processes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  purpose text,
  department text,
  owner_id uuid REFERENCES auth.users(id),
  steps jsonb DEFAULT '[]'::jsonb,
  required_approvals jsonb DEFAULT '[]'::jsonb,
  systems_used jsonb DEFAULT '[]'::jsonb,
  inputs jsonb DEFAULT '[]'::jsonb,
  outputs jsonb DEFAULT '[]'::jsonb,
  exceptions text,
  related_policies jsonb DEFAULT '[]'::jsonb,
  last_verified_at timestamptz,
  verification_owner uuid REFERENCES auth.users(id),
  confidentiality public.confidentiality_level DEFAULT 'internal',
  flags jsonb DEFAULT '[]'::jsonb,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.processes TO authenticated;
GRANT ALL ON public.processes TO service_role;
ALTER TABLE public.processes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "processes_select" ON public.processes FOR SELECT USING (public.can_view_confidential(auth.uid(), workspace_id, created_by, confidentiality));
CREATE POLICY "processes_write" ON public.processes FOR INSERT WITH CHECK (public.is_workspace_writer(auth.uid(), workspace_id));
CREATE POLICY "processes_update" ON public.processes FOR UPDATE USING (public.is_workspace_writer(auth.uid(), workspace_id));
CREATE POLICY "processes_delete" ON public.processes FOR DELETE USING (public.is_workspace_admin(auth.uid(), workspace_id));
CREATE TRIGGER trg_processes_updated BEFORE UPDATE ON public.processes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.company_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  trigger text,
  required_inputs jsonb DEFAULT '[]'::jsonb,
  steps jsonb DEFAULT '[]'::jsonb,
  decision_rules jsonb DEFAULT '[]'::jsonb,
  required_approvals jsonb DEFAULT '[]'::jsonb,
  tools_needed jsonb DEFAULT '[]'::jsonb,
  permissions_required jsonb DEFAULT '[]'::jsonb,
  exceptions text,
  expected_output text,
  human_review_required boolean DEFAULT true,
  related_processes jsonb DEFAULT '[]'::jsonb,
  owner_id uuid REFERENCES auth.users(id),
  version integer DEFAULT 1,
  status public.skill_status DEFAULT 'draft',
  last_tested_at timestamptz,
  confidentiality public.confidentiality_level DEFAULT 'internal',
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_skills TO authenticated;
GRANT ALL ON public.company_skills TO service_role;
ALTER TABLE public.company_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "skills_select" ON public.company_skills FOR SELECT USING (public.can_view_confidential(auth.uid(), workspace_id, created_by, confidentiality));
CREATE POLICY "skills_write" ON public.company_skills FOR INSERT WITH CHECK (public.is_workspace_writer(auth.uid(), workspace_id));
CREATE POLICY "skills_update" ON public.company_skills FOR UPDATE USING (public.is_workspace_writer(auth.uid(), workspace_id));
CREATE POLICY "skills_delete" ON public.company_skills FOR DELETE USING (public.is_workspace_admin(auth.uid(), workspace_id));
CREATE TRIGGER trg_skills_updated BEFORE UPDATE ON public.company_skills FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  category text NOT NULL,
  severity public.risk_severity DEFAULT 'medium',
  status public.risk_status DEFAULT 'new',
  summary text NOT NULL,
  why_it_matters text,
  affected_entity_type text,
  affected_entity_id uuid,
  evidence jsonb DEFAULT '[]'::jsonb,
  owner_id uuid REFERENCES auth.users(id),
  recommended_action text,
  due_date date,
  sources jsonb DEFAULT '[]'::jsonb,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.risks TO authenticated;
GRANT ALL ON public.risks TO service_role;
ALTER TABLE public.risks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "risks_select" ON public.risks FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "risks_write" ON public.risks FOR INSERT WITH CHECK (public.is_workspace_writer(auth.uid(), workspace_id));
CREATE POLICY "risks_update" ON public.risks FOR UPDATE USING (public.is_workspace_writer(auth.uid(), workspace_id));
CREATE POLICY "risks_delete" ON public.risks FOR DELETE USING (public.is_workspace_admin(auth.uid(), workspace_id));
CREATE TRIGGER trg_risks_updated BEFORE UPDATE ON public.risks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.data_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  kind public.source_kind NOT NULL,
  label text NOT NULL,
  status text DEFAULT 'disconnected',
  last_sync_at timestamptz,
  indexed_count integer DEFAULT 0,
  access_scope text DEFAULT 'organization',
  sync_error text,
  owner_id uuid REFERENCES auth.users(id),
  config jsonb DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.data_sources TO authenticated;
GRANT ALL ON public.data_sources TO service_role;
ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ds_select" ON public.data_sources FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "ds_write" ON public.data_sources FOR INSERT WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));
CREATE POLICY "ds_update" ON public.data_sources FOR UPDATE USING (public.is_workspace_admin(auth.uid(), workspace_id));
CREATE POLICY "ds_delete" ON public.data_sources FOR DELETE USING (public.is_workspace_admin(auth.uid(), workspace_id));
CREATE TRIGGER trg_ds_updated BEFORE UPDATE ON public.data_sources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.uploaded_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  data_source_id uuid REFERENCES public.data_sources(id) ON DELETE SET NULL,
  title text NOT NULL,
  file_path text,
  content_text text,
  mime_type text,
  source_kind public.source_kind DEFAULT 'manual_upload',
  process_status public.doc_process_status DEFAULT 'uploaded',
  confidentiality public.confidentiality_level DEFAULT 'internal',
  access_scope text DEFAULT 'organization',
  related_client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  related_project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.uploaded_documents TO authenticated;
GRANT ALL ON public.uploaded_documents TO service_role;
ALTER TABLE public.uploaded_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "docs_select" ON public.uploaded_documents FOR SELECT USING (public.can_view_confidential(auth.uid(), workspace_id, created_by, confidentiality));
CREATE POLICY "docs_write" ON public.uploaded_documents FOR INSERT WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) AND created_by = auth.uid());
CREATE POLICY "docs_update" ON public.uploaded_documents FOR UPDATE USING (created_by = auth.uid() OR public.is_workspace_admin(auth.uid(), workspace_id));
CREATE POLICY "docs_delete" ON public.uploaded_documents FOR DELETE USING (created_by = auth.uid() OR public.is_workspace_admin(auth.uid(), workspace_id));
CREATE TRIGGER trg_docs_updated BEFORE UPDATE ON public.uploaded_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.knowledge_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  document_id uuid REFERENCES public.uploaded_documents(id) ON DELETE CASCADE,
  entity_type text,
  entity_id uuid,
  title text NOT NULL,
  content text NOT NULL,
  summary text,
  tags jsonb DEFAULT '[]'::jsonb,
  confidentiality public.confidentiality_level DEFAULT 'internal',
  source_url text,
  source_date timestamptz,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.knowledge_items TO authenticated;
GRANT ALL ON public.knowledge_items TO service_role;
ALTER TABLE public.knowledge_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ki_select" ON public.knowledge_items FOR SELECT USING (public.can_view_confidential(auth.uid(), workspace_id, created_by, confidentiality));
CREATE POLICY "ki_write" ON public.knowledge_items FOR INSERT WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "ki_update" ON public.knowledge_items FOR UPDATE USING (public.is_workspace_writer(auth.uid(), workspace_id));
CREATE POLICY "ki_delete" ON public.knowledge_items FOR DELETE USING (public.is_workspace_admin(auth.uid(), workspace_id));
CREATE INDEX idx_ki_workspace_content ON public.knowledge_items USING gin (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content,'')));

CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  title text DEFAULT 'New conversation',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conv_select" ON public.conversations FOR SELECT USING (user_id = auth.uid() AND public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "conv_write" ON public.conversations FOR INSERT WITH CHECK (user_id = auth.uid() AND public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "conv_update" ON public.conversations FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "conv_delete" ON public.conversations FOR DELETE USING (user_id = auth.uid());
CREATE TRIGGER trg_conv_updated BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.conversation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  confidence numeric,
  citations jsonb DEFAULT '[]'::jsonb,
  suggested_action text,
  created_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_messages TO authenticated;
GRANT ALL ON public.conversation_messages TO service_role;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cm_select" ON public.conversation_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid())
);
CREATE POLICY "cm_write" ON public.conversation_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid())
);

CREATE TABLE public.answer_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.conversation_messages(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  rating text NOT NULL,
  correction text,
  created_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.answer_feedback TO authenticated;
GRANT ALL ON public.answer_feedback TO service_role;
ALTER TABLE public.answer_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "af_select" ON public.answer_feedback FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "af_write" ON public.answer_feedback FOR INSERT WITH CHECK (user_id = auth.uid() AND public.is_workspace_member(auth.uid(), workspace_id));

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "al_select" ON public.audit_logs FOR SELECT USING (public.is_workspace_admin(auth.uid(), workspace_id));
CREATE POLICY "al_write" ON public.audit_logs FOR INSERT WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE OR REPLACE FUNCTION public.audit_logs_immutable() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'audit_logs is append-only'; END; $$;
CREATE TRIGGER trg_audit_immutable BEFORE UPDATE OR DELETE ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION public.audit_logs_immutable();