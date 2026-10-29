CREATE OR REPLACE FUNCTION public.workflow_apply(_operation text,_run uuid DEFAULT NULL,_step uuid DEFAULT NULL,_payload jsonb DEFAULT '{}',_request uuid DEFAULT gen_random_uuid()) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE r public.workflow_runs%ROWTYPE;s public.workflow_steps%ROWTYPE;result jsonb;b text[];task public.workflow_tasks%ROWTYPE; BEGIN
 IF _operation='create_run' THEN RETURN public.workflow_command(_operation,_run,_step,_payload,_request); END IF;
 SELECT * INTO r FROM public.workflow_runs WHERE id=_run;
 IF r.id IS NULL OR NOT public.workflow_can_read(r.id) OR NOT public.is_workspace_writer(auth.uid(),r.workspace_id) THEN RAISE EXCEPTION 'Writer access required' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(r.project_id::text,0));
 IF EXISTS(SELECT 1 FROM public.workflow_events WHERE request_id=_request AND run_id=r.id) THEN RETURN jsonb_build_object('id',r.id,'replayed',true); END IF;
 IF _operation NOT IN('configure_run','add_step','reorder') THEN SELECT * INTO s FROM public.workflow_steps WHERE id=_step AND run_id=r.id FOR UPDATE; IF s.id IS NULL THEN RAISE EXCEPTION 'Step required in this run'; END IF; END IF;
 IF _operation='verify_conditions' AND (coalesce((_payload->>'entry')::boolean,true)=false OR coalesce((_payload->>'criteria')::boolean,true)=false) THEN PERFORM public.workflow_invalidate(s.id); END IF;
 IF _operation='task_status' AND _payload->>'status'<>'pending' THEN SELECT * INTO task FROM public.workflow_tasks WHERE id=(_payload->>'task_id')::uuid AND step_id=s.id;
 IF NOT coalesce(task.corrective,false) THEN b:=public.workflow_blockers(s.id,false); IF cardinality(b)>0 THEN RAISE EXCEPTION '%',array_to_string(b,','); END IF; END IF; END IF;
 result:=public.workflow_command(_operation,_run,_step,_payload,_request);
 IF _operation='edit_step' AND _payload ? 'dependencies' THEN PERFORM public.workflow_command('dependencies',_run,_step,jsonb_build_object('ids',_payload->'dependencies'),gen_random_uuid()); END IF;
 RETURN result; END; $$;
REVOKE ALL ON FUNCTION public.workflow_apply(text,uuid,uuid,jsonb,uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.workflow_apply(text,uuid,uuid,jsonb,uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.workflow_command(text,uuid,uuid,jsonb,uuid) FROM authenticated;
CREATE OR REPLACE FUNCTION public.workflow_child_integrity() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ DECLARE r public.workflow_runs%ROWTYPE;s public.workflow_steps%ROWTYPE; BEGIN
 SELECT * INTO r FROM public.workflow_runs WHERE id=NEW.run_id;
 IF r.id IS NULL OR r.workspace_id<>NEW.workspace_id THEN RAISE EXCEPTION 'Invalid workflow parent'; END IF;
 IF TG_TABLE_NAME='workflow_steps' THEN
 IF NOT EXISTS(SELECT 1 FROM public.process_step_refs WHERE id=NEW.definition_id AND process_id=r.process_id AND workspace_id=r.workspace_id) THEN RAISE EXCEPTION 'Invalid step definition'; END IF;
 PERFORM public.workflow_assert_members(r.workspace_id,NEW.assigned_users||NEW.approver_ids||ARRAY[NEW.owner_id,NEW.quality_owner_id]);
 ELSE
 SELECT * INTO s FROM public.workflow_steps WHERE id=NEW.step_id;
 IF s.id IS NULL OR s.run_id<>r.id OR s.workspace_id<>r.workspace_id THEN RAISE EXCEPTION 'Invalid parent step'; END IF;
 IF TG_TABLE_NAME='workflow_tasks' THEN PERFORM public.workflow_assert_members(r.workspace_id,ARRAY[NEW.assignee_id]); END IF;
 IF TG_TABLE_NAME='workflow_dependencies' AND NOT EXISTS(SELECT 1 FROM public.workflow_steps ps JOIN public.workflow_runs pr ON pr.id=ps.run_id WHERE ps.id=NEW.prerequisite_id AND pr.project_id=r.project_id AND ps.workspace_id=r.workspace_id) THEN RAISE EXCEPTION 'Invalid prerequisite'; END IF;
 END IF; RETURN NEW; END; $$;
CREATE TRIGGER workflow_steps_integrity BEFORE INSERT OR UPDATE ON public.workflow_steps FOR EACH ROW EXECUTE FUNCTION public.workflow_child_integrity();
CREATE TRIGGER workflow_tasks_integrity BEFORE INSERT OR UPDATE ON public.workflow_tasks FOR EACH ROW EXECUTE FUNCTION public.workflow_child_integrity();
CREATE TRIGGER workflow_dependencies_integrity BEFORE INSERT OR UPDATE ON public.workflow_dependencies FOR EACH ROW EXECUTE FUNCTION public.workflow_child_integrity();
CREATE TRIGGER workflow_votes_integrity BEFORE INSERT OR UPDATE ON public.workflow_approvals FOR EACH ROW EXECUTE FUNCTION public.workflow_child_integrity();
CREATE TRIGGER workflow_votes_immutable BEFORE UPDATE OR DELETE ON public.workflow_approvals FOR EACH ROW EXECUTE FUNCTION public.audit_events_immutable();