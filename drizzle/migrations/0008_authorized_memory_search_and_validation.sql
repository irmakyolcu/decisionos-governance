UPDATE public.knowledge_items SET entity_type='lesson' WHERE tags @> '["lesson"]'::jsonb AND entity_type IS DISTINCT FROM 'lesson';
COMMENT ON COLUMN public.knowledge_items.entity_type IS 'Canonical lesson classification, shared by UI and API';
CREATE OR REPLACE FUNCTION public.search_memory(_workspace uuid,_term text) RETURNS TABLE(id uuid,title text,kind text,parent_id uuid) LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$
WITH term AS (SELECT '%'||replace(replace(replace(left(trim(_term),200),'\','\\'),'%','\%'),'_','\_')||'%' AS pattern WHERE length(trim(_term))>=2), results AS (
SELECT d.id,d.title,'decision'::text kind,NULL::uuid parent_id FROM public.decisions d,term t WHERE d.workspace_id=_workspace AND concat_ws(' ',d.title,d.description,d.problem_statement,d.rationale,d.expected_outcomes,d.options_considered::text) ILIKE t.pattern
UNION ALL SELECT k.id,k.title,CASE WHEN k.entity_type='lesson' THEN 'lesson' ELSE 'knowledge' END,NULL::uuid FROM public.knowledge_items k,term t WHERE k.workspace_id=_workspace AND concat_ws(' ',k.title,k.content,k.summary,k.lesson_data::text) ILIKE t.pattern
UNION ALL SELECT d.id,d.title,'document',NULL::uuid FROM public.uploaded_documents d,term t WHERE d.workspace_id=_workspace AND concat_ws(' ',d.title,d.content_text,d.category) ILIKE t.pattern
UNION ALL SELECT n.id,n.title,'note',NULL::uuid FROM public.company_notes n,term t WHERE n.workspace_id=_workspace AND concat_ws(' ',n.title,n.content,n.tags::text) ILIKE t.pattern
UNION ALL SELECT c.id,c.name,'client',NULL::uuid FROM public.clients c,term t WHERE c.workspace_id=_workspace AND concat_ws(' ',c.name,c.notes) ILIKE t.pattern
UNION ALL SELECT p.id,p.name,'project',NULL::uuid FROM public.projects p,term t WHERE p.workspace_id=_workspace AND concat_ws(' ',p.name,p.objective) ILIKE t.pattern
UNION ALL SELECT m.id,m.title,'meeting',NULL::uuid FROM public.meetings m,term t WHERE m.workspace_id=_workspace AND (to_jsonb(m)::text) ILIKE t.pattern
UNION ALL SELECT a.id,d.title,'decision',d.id FROM public.ai_evaluations a JOIN public.decisions d ON d.id=a.decision_id,term t WHERE d.workspace_id=_workspace AND a.summary ILIKE t.pattern
) SELECT * FROM results ORDER BY title LIMIT 50;
$$;
REVOKE ALL ON FUNCTION public.search_memory(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.search_memory(uuid,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.guard_document_relations() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 IF TG_TABLE_NAME='decision_evidence' AND NEW.document_id IS NOT NULL AND NOT public.visible_record(NEW.workspace_id,'document',NEW.document_id) THEN RAISE EXCEPTION 'Document must be visible in this workspace' USING ERRCODE='42501'; END IF;
 IF TG_TABLE_NAME='uploaded_documents' THEN
 IF NEW.related_client_id IS NOT NULL AND NOT public.visible_record(NEW.workspace_id,'client',NEW.related_client_id) THEN RAISE EXCEPTION 'Invalid client relationship'; END IF;
 IF NEW.related_project_id IS NOT NULL AND NOT public.visible_record(NEW.workspace_id,'project',NEW.related_project_id) THEN RAISE EXCEPTION 'Invalid project relationship'; END IF;
 IF TG_OP='UPDATE' AND (NEW.workspace_id IS DISTINCT FROM OLD.workspace_id OR NEW.created_by IS DISTINCT FROM OLD.created_by OR NEW.file_path IS DISTINCT FROM OLD.file_path) THEN RAISE EXCEPTION 'Document provenance is immutable'; END IF;
 END IF; RETURN NEW; END; $$;
CREATE TRIGGER guard_evidence_document BEFORE INSERT OR UPDATE ON public.decision_evidence FOR EACH ROW EXECUTE FUNCTION public.guard_document_relations();
CREATE TRIGGER guard_uploaded_document_relations BEFORE INSERT OR UPDATE ON public.uploaded_documents FOR EACH ROW EXECUTE FUNCTION public.guard_document_relations();
CREATE POLICY memory_writer_insert ON public.memory_entries AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(public.is_workspace_writer(auth.uid(),workspace_id));
CREATE POLICY memory_writer_update ON public.memory_entries AS RESTRICTIVE FOR UPDATE TO authenticated USING(public.is_workspace_writer(auth.uid(),workspace_id)) WITH CHECK(public.is_workspace_writer(auth.uid(),workspace_id));
CREATE POLICY memory_writer_delete ON public.memory_entries AS RESTRICTIVE FOR DELETE TO authenticated USING(public.is_workspace_writer(auth.uid(),workspace_id));