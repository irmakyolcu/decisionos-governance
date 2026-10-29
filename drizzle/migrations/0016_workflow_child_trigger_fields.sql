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
 IF TG_TABLE_NAME='workflow_dependencies' THEN
 IF NOT EXISTS(SELECT 1 FROM public.workflow_steps ps JOIN public.workflow_runs pr ON pr.id=ps.run_id WHERE ps.id=NEW.prerequisite_id AND pr.project_id=r.project_id AND ps.workspace_id=r.workspace_id) THEN RAISE EXCEPTION 'Invalid prerequisite'; END IF;
 END IF;
 END IF; RETURN NEW; END; $$;