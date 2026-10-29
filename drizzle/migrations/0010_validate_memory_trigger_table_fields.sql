CREATE OR REPLACE FUNCTION public.validate_memory_fields() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 IF TG_TABLE_NAME='knowledge_items' THEN
 IF NEW.entity_type='lesson' THEN
 IF length(trim(NEW.title))=0 OR length(NEW.title)>255 OR jsonb_typeof(NEW.lesson_data)<>'object' THEN RAISE EXCEPTION 'Invalid lesson'; END IF;
 IF coalesce(NEW.lesson_data->>'impact','mixed') NOT IN ('positive','negative','mixed') THEN RAISE EXCEPTION 'Invalid lesson impact'; END IF;
 END IF;
 ELSIF TG_TABLE_NAME='decisions' THEN
 IF NEW.owner_id IS NOT NULL AND NOT public.is_workspace_member(NEW.owner_id,NEW.workspace_id) THEN RAISE EXCEPTION 'Decision owner must belong to workspace'; END IF;
 IF TG_OP='UPDATE' THEN
 IF OLD.status IN ('Approved','Executed') AND (NEW.rationale IS DISTINCT FROM OLD.rationale OR NEW.expected_outcomes IS DISTINCT FROM OLD.expected_outcomes OR NEW.owner_id IS DISTINCT FROM OLD.owner_id OR NEW.decision_date IS DISTINCT FROM OLD.decision_date) THEN RAISE EXCEPTION 'Decision is locked'; END IF;
 END IF;
 END IF; RETURN NEW; END; $$;
CREATE OR REPLACE FUNCTION public.guard_document_relations() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 IF TG_TABLE_NAME='decision_evidence' THEN
 IF NEW.document_id IS NOT NULL AND NOT public.visible_record(NEW.workspace_id,'document',NEW.document_id) THEN RAISE EXCEPTION 'Document must be visible in this workspace' USING ERRCODE='42501'; END IF;
 ELSIF TG_TABLE_NAME='uploaded_documents' THEN
 IF NEW.related_client_id IS NOT NULL AND NOT public.visible_record(NEW.workspace_id,'client',NEW.related_client_id) THEN RAISE EXCEPTION 'Invalid client relationship'; END IF;
 IF NEW.related_project_id IS NOT NULL AND NOT public.visible_record(NEW.workspace_id,'project',NEW.related_project_id) THEN RAISE EXCEPTION 'Invalid project relationship'; END IF;
 IF TG_OP='UPDATE' THEN
 IF NEW.workspace_id IS DISTINCT FROM OLD.workspace_id OR NEW.created_by IS DISTINCT FROM OLD.created_by OR NEW.file_path IS DISTINCT FROM OLD.file_path THEN RAISE EXCEPTION 'Document provenance is immutable'; END IF;
 END IF;
 END IF; RETURN NEW; END; $$;