ALTER TABLE public.knowledge_items ADD COLUMN lesson_data jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.decisions ADD COLUMN decision_date date, ADD COLUMN owner_id uuid, ADD COLUMN rationale text NOT NULL DEFAULT '', ADD COLUMN expected_outcomes text NOT NULL DEFAULT '';
ALTER TABLE public.uploaded_documents ADD COLUMN extraction_error text, ADD COLUMN extraction_attempts integer NOT NULL DEFAULT 0, ADD COLUMN extraction_started_at timestamptz, ADD COLUMN extraction_finished_at timestamptz, ADD COLUMN category text NOT NULL DEFAULT '';
ALTER TABLE public.decision_evidence ADD COLUMN document_id uuid REFERENCES public.uploaded_documents(id);
CREATE TABLE public.record_links (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL REFERENCES public.workspaces(id), source_kind text NOT NULL, source_id uuid NOT NULL, target_kind text NOT NULL, target_id uuid NOT NULL, created_by uuid NOT NULL DEFAULT auth.uid(), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(workspace_id,source_kind,source_id,target_kind,target_id));
GRANT SELECT,INSERT,DELETE ON public.record_links TO authenticated;
GRANT ALL ON public.record_links TO service_role;
ALTER TABLE public.record_links ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.visible_record(_workspace uuid,_kind text,_id uuid) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=public AS $$
DECLARE tbl text; found_record boolean;
BEGIN
 IF NOT public.is_workspace_member(auth.uid(),_workspace) THEN RETURN false; END IF;
 tbl := CASE _kind WHEN 'decision' THEN 'decisions' WHEN 'lesson' THEN 'knowledge_items' WHEN 'document' THEN 'uploaded_documents' WHEN 'note' THEN 'company_notes' WHEN 'project' THEN 'projects' WHEN 'client' THEN 'clients' WHEN 'process' THEN 'processes' WHEN 'meeting' THEN 'meetings' WHEN 'evidence' THEN 'decision_evidence' WHEN 'risk' THEN 'risks' ELSE NULL END;
 IF _kind='step' THEN RETURN EXISTS(SELECT 1 FROM public.processes p CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(p.steps)='array' THEN p.steps ELSE '[]'::jsonb END) s WHERE p.workspace_id=_workspace AND s->>'id'=_id::text); END IF;
 IF tbl IS NULL THEN RETURN false; END IF;
 EXECUTE format('SELECT EXISTS(SELECT 1 FROM public.%I WHERE workspace_id=$1 AND id=$2 %s)',tbl,CASE WHEN _kind='lesson' THEN 'AND entity_type=''lesson''' ELSE '' END) INTO found_record USING _workspace,_id;
 RETURN found_record;
END; $$;
REVOKE ALL ON FUNCTION public.visible_record(uuid,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.visible_record(uuid,text,uuid) TO authenticated,service_role;
CREATE POLICY links_read ON public.record_links FOR SELECT TO authenticated USING(public.visible_record(workspace_id,source_kind,source_id) AND public.visible_record(workspace_id,target_kind,target_id));
CREATE POLICY links_insert ON public.record_links FOR INSERT TO authenticated WITH CHECK(created_by=auth.uid() AND public.is_workspace_writer(auth.uid(),workspace_id) AND public.visible_record(workspace_id,source_kind,source_id) AND public.visible_record(workspace_id,target_kind,target_id));
CREATE POLICY links_delete ON public.record_links FOR DELETE TO authenticated USING(public.is_workspace_writer(auth.uid(),workspace_id) AND public.visible_record(workspace_id,source_kind,source_id) AND public.visible_record(workspace_id,target_kind,target_id));
CREATE OR REPLACE FUNCTION public.guard_record_link() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 IF NEW.source_kind=NEW.target_kind AND NEW.source_id=NEW.target_id THEN RAISE EXCEPTION 'Cannot link a record to itself'; END IF;
 IF NOT public.visible_record(NEW.workspace_id,NEW.source_kind,NEW.source_id) OR NOT public.visible_record(NEW.workspace_id,NEW.target_kind,NEW.target_id) THEN RAISE EXCEPTION 'Records must be visible and belong to the same workspace' USING ERRCODE='42501'; END IF;
 RETURN NEW; END; $$;
CREATE TRIGGER guard_record_link BEFORE INSERT OR UPDATE ON public.record_links FOR EACH ROW EXECUTE FUNCTION public.guard_record_link();
CREATE OR REPLACE FUNCTION public.normalize_process_step_ids() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ DECLARE item jsonb; result jsonb:='[]'::jsonb; BEGIN
 IF jsonb_typeof(NEW.steps)='array' THEN
 FOR item IN SELECT value FROM jsonb_array_elements(NEW.steps) LOOP
 IF jsonb_typeof(item)='string' THEN item:=jsonb_build_object('title',item#>>'{}'); END IF;
 IF jsonb_typeof(item)<>'object' THEN RAISE EXCEPTION 'Invalid process step'; END IF;
 IF coalesce(item->>'id','') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN item:=item||jsonb_build_object('id',gen_random_uuid()); END IF;
 result:=result||jsonb_build_array(item);
 END LOOP;
 NEW.steps:=result;
 END IF; RETURN NEW; END; $$;
CREATE TRIGGER normalize_process_step_ids BEFORE INSERT OR UPDATE OF steps ON public.processes FOR EACH ROW EXECUTE FUNCTION public.normalize_process_step_ids();
UPDATE public.processes SET steps=steps WHERE jsonb_typeof(steps)='array';
CREATE OR REPLACE FUNCTION public.validate_memory_fields() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 IF TG_TABLE_NAME='knowledge_items' AND NEW.entity_type='lesson' THEN
 IF length(trim(NEW.title))=0 OR length(NEW.title)>255 OR jsonb_typeof(NEW.lesson_data)<>'object' THEN RAISE EXCEPTION 'Invalid lesson'; END IF;
 IF coalesce(NEW.lesson_data->>'impact','mixed') NOT IN ('positive','negative','mixed') THEN RAISE EXCEPTION 'Invalid lesson impact'; END IF;
 END IF;
 IF TG_TABLE_NAME='decisions' THEN
 IF NEW.owner_id IS NOT NULL AND NOT public.is_workspace_member(NEW.owner_id,NEW.workspace_id) THEN RAISE EXCEPTION 'Decision owner must belong to workspace'; END IF;
 IF TG_OP='UPDATE' AND OLD.status IN ('Approved','Executed') AND (NEW.rationale IS DISTINCT FROM OLD.rationale OR NEW.expected_outcomes IS DISTINCT FROM OLD.expected_outcomes OR NEW.owner_id IS DISTINCT FROM OLD.owner_id OR NEW.decision_date IS DISTINCT FROM OLD.decision_date) THEN RAISE EXCEPTION 'Decision is locked'; END IF;
 END IF; RETURN NEW; END; $$;
CREATE TRIGGER validate_lesson_fields BEFORE INSERT OR UPDATE ON public.knowledge_items FOR EACH ROW EXECUTE FUNCTION public.validate_memory_fields();
CREATE TRIGGER validate_decision_memory_fields BEFORE INSERT OR UPDATE ON public.decisions FOR EACH ROW EXECUTE FUNCTION public.validate_memory_fields();
CREATE OR REPLACE FUNCTION public.audit_memory_record() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE row_data jsonb; old_data jsonb; kind text; action text; meta jsonb; changed text[];
BEGIN
 row_data:=CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
 IF TG_OP='UPDATE' THEN old_data:=to_jsonb(OLD); SELECT array_agg(k) INTO changed FROM jsonb_object_keys(row_data) k WHERE k<>'updated_at' AND row_data->k IS DISTINCT FROM old_data->k; IF changed IS NULL THEN RETURN NEW; END IF; END IF;
 kind:=CASE TG_TABLE_NAME WHEN 'decisions' THEN 'decision' WHEN 'knowledge_items' THEN CASE WHEN row_data->>'entity_type'='lesson' THEN 'lesson' ELSE 'knowledge' END WHEN 'uploaded_documents' THEN 'document' WHEN 'company_notes' THEN 'note' WHEN 'processes' THEN 'process' WHEN 'record_links' THEN 'link' WHEN 'workspace_members' THEN 'membership' WHEN 'decision_evidence' THEN 'evidence' WHEN 'decision_outcomes' THEN 'outcome' WHEN 'note_attachments' THEN 'attachment' ELSE TG_TABLE_NAME END;
 action:=lower(TG_OP);
 meta:=jsonb_build_object('entity_kind',kind,'entity_id',row_data->>'id','changed_fields',changed);
 IF kind='link' THEN meta:=meta||jsonb_build_object('source_kind',row_data->>'source_kind','source_id',row_data->>'source_id','target_kind',row_data->>'target_kind','target_id',row_data->>'target_id'); END IF;
 IF row_data->>'document_id' IS NOT NULL THEN meta:=meta||jsonb_build_object('document_id',row_data->>'document_id'); END IF;
 IF kind='document' THEN meta:=meta||jsonb_build_object('document_id',row_data->>'id','processing_status',row_data->>'process_status'); END IF;
 IF kind='attachment' THEN meta:=meta||jsonb_build_object('note_id',row_data->>'note_id'); END IF;
 INSERT INTO public.audit_events(workspace_id,event_type,actor_user_id,decision_id,metadata,reason) VALUES((row_data->>'workspace_id')::uuid,'memory.'||kind||'.'||action,auth.uid(),CASE WHEN kind='decision' THEN (row_data->>'id')::uuid WHEN row_data->>'decision_id' IS NOT NULL THEN (row_data->>'decision_id')::uuid ELSE NULL END,meta,'Record '||action);
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END; $$;
CREATE TRIGGER audit_memory_decisions AFTER INSERT OR UPDATE ON public.decisions FOR EACH ROW EXECUTE FUNCTION public.audit_memory_record();
CREATE TRIGGER audit_memory_knowledge AFTER INSERT OR UPDATE OR DELETE ON public.knowledge_items FOR EACH ROW EXECUTE FUNCTION public.audit_memory_record();
CREATE TRIGGER audit_memory_documents AFTER INSERT OR UPDATE OR DELETE ON public.uploaded_documents FOR EACH ROW EXECUTE FUNCTION public.audit_memory_record();
CREATE TRIGGER audit_memory_notes AFTER INSERT OR UPDATE OR DELETE ON public.company_notes FOR EACH ROW EXECUTE FUNCTION public.audit_memory_record();
CREATE TRIGGER audit_memory_processes AFTER INSERT OR UPDATE ON public.processes FOR EACH ROW EXECUTE FUNCTION public.audit_memory_record();
CREATE TRIGGER audit_memory_links AFTER INSERT OR DELETE ON public.record_links FOR EACH ROW EXECUTE FUNCTION public.audit_memory_record();
CREATE TRIGGER audit_memory_members AFTER INSERT OR UPDATE OR DELETE ON public.workspace_members FOR EACH ROW EXECUTE FUNCTION public.audit_memory_record();
CREATE TRIGGER audit_memory_evidence AFTER INSERT OR UPDATE ON public.decision_evidence FOR EACH ROW EXECUTE FUNCTION public.audit_memory_record();
CREATE TRIGGER audit_memory_outcomes AFTER INSERT OR UPDATE ON public.decision_outcomes FOR EACH ROW EXECUTE FUNCTION public.audit_memory_record();
CREATE TRIGGER audit_memory_attachments AFTER INSERT OR UPDATE ON public.note_attachments FOR EACH ROW EXECUTE FUNCTION public.audit_memory_record();