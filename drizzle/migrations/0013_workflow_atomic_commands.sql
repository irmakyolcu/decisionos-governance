CREATE OR REPLACE FUNCTION public.workflow_invalidate(_step uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 WITH RECURSIVE affected(id) AS(SELECT _step UNION SELECT d.step_id FROM public.workflow_dependencies d JOIN affected a ON d.prerequisite_id=a.id) UPDATE public.workflow_steps SET version=version+1,approval_requested=false,criteria_verified=false,status='pending',completed_at=NULL WHERE id IN(SELECT id FROM affected);
 UPDATE public.workflow_runs SET status='active',version=version+1 WHERE id IN(SELECT run_id FROM public.workflow_steps WHERE status<>'completed');
 END; $$;
REVOKE ALL ON FUNCTION public.workflow_invalidate(uuid) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.workflow_command(_operation text,_run uuid DEFAULT NULL,_step uuid DEFAULT NULL,_payload jsonb DEFAULT '{}',_request uuid DEFAULT gen_random_uuid()) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.workflow_runs%ROWTYPE;s public.workflow_steps%ROWTYPE;t public.workflow_tasks%ROWTYPE;p public.processes%ROWTYPE;j public.projects%ROWTYPE;item jsonb;result uuid;prev uuid;uid uuid;ids uuid[];deps uuid[];b text[];n integer;old_assignee uuid;rules jsonb;target uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 IF _operation='create_run' THEN
 SELECT * INTO j FROM public.projects WHERE id=(_payload->>'project_id')::uuid;
 SELECT * INTO p FROM public.processes WHERE id=(_payload->>'process_id')::uuid;
 IF j.id IS NULL OR p.id IS NULL OR j.workspace_id<>p.workspace_id OR NOT public.is_workspace_writer(auth.uid(),j.workspace_id) OR NOT public.visible_record(j.workspace_id,'project',j.id) OR NOT public.visible_record(j.workspace_id,'process',p.id) THEN RAISE EXCEPTION 'Workflow access required' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(j.id::text,0));
 IF EXISTS(SELECT 1 FROM public.workflow_events WHERE request_id=_request AND workspace_id=j.workspace_id) THEN SELECT run_id INTO result FROM public.workflow_events WHERE request_id=_request; RETURN jsonb_build_object('id',result); END IF;
 IF _payload->>'phase_id' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.project_phases WHERE id=(_payload->>'phase_id')::uuid AND project_id=j.id AND workspace_id=j.workspace_id) THEN RAISE EXCEPTION 'Invalid phase'; END IF;
 IF jsonb_array_length(coalesce(p.steps,'[]'))=0 THEN RAISE EXCEPTION 'Add at least one step'; END IF;
 INSERT INTO public.workflow_runs(workspace_id,project_id,phase_id,process_id,name,created_by) VALUES(j.workspace_id,j.id,(_payload->>'phase_id')::uuid,p.id,p.name,auth.uid()) RETURNING * INTO r;
 n:=0; FOR item IN SELECT value FROM jsonb_array_elements(p.steps) LOOP
 n:=n+1; PERFORM public.workflow_assert_members(r.workspace_id,ARRAY[p.owner_id]);
 INSERT INTO public.workflow_steps(workspace_id,run_id,definition_id,title,position,owner_id,department,entry_conditions,completion_criteria) VALUES(r.workspace_id,r.id,(item->>'id')::uuid,coalesce(item->>'title',''),n,p.owner_id,coalesce(p.department,''),CASE WHEN n=1 THEN coalesce(p.entry_conditions,'') ELSE '' END,CASE WHEN n=jsonb_array_length(p.steps) THEN coalesce(p.completion_criteria,'') ELSE '' END) RETURNING id INTO result;
 IF prev IS NOT NULL AND coalesce((_payload->>'sequential')::boolean,true) THEN INSERT INTO public.workflow_dependencies(workspace_id,run_id,step_id,prerequisite_id) VALUES(r.workspace_id,r.id,result,prev); END IF; prev:=result;
 END LOOP;
 ELSE
 SELECT * INTO r FROM public.workflow_runs WHERE id=_run;
 IF r.id IS NULL OR NOT public.workflow_can_read(r.id) OR NOT public.is_workspace_writer(auth.uid(),r.workspace_id) THEN RAISE EXCEPTION 'Writer access required' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(r.project_id::text,0)); SELECT * INTO r FROM public.workflow_runs WHERE id=_run FOR UPDATE;
 IF EXISTS(SELECT 1 FROM public.workflow_events WHERE request_id=_request AND run_id=r.id) THEN RETURN jsonb_build_object('id',r.id,'replayed',true); END IF;
 IF _step IS NOT NULL THEN SELECT * INTO s FROM public.workflow_steps WHERE id=_step AND run_id=r.id FOR UPDATE; IF s.id IS NULL THEN RAISE EXCEPTION 'Step not in this run'; END IF;
 IF _payload ? 'expected_version' AND (_payload->>'expected_version')::integer<>s.version THEN RAISE EXCEPTION 'wf.stale'; END IF; END IF;
 IF _operation='configure_run' THEN
 rules:=coalesce(_payload->'rules',r.notification_rules);
 IF jsonb_typeof(rules)<>'object' OR coalesce((rules->>'escalation_hours')::integer,24) NOT BETWEEN 1 AND 8760 THEN RAISE EXCEPTION 'Invalid notification rules'; END IF;
 UPDATE public.workflow_runs SET notification_rules=rules,version=version+1 WHERE id=r.id;
 ELSIF _operation='add_step' THEN
 SELECT * INTO p FROM public.processes WHERE id=r.process_id FOR UPDATE;
 IF length(trim(coalesce(_payload->>'title','')))=0 THEN RAISE EXCEPTION 'Title required'; END IF;
 target:=gen_random_uuid(); UPDATE public.processes SET steps=coalesce(steps,'[]')||jsonb_build_array(jsonb_build_object('id',target,'title',_payload->>'title')) WHERE id=p.id;
 INSERT INTO public.workflow_steps(workspace_id,run_id,definition_id,title,position) VALUES(r.workspace_id,r.id,target,_payload->>'title',(SELECT coalesce(max(position),0)+1 FROM public.workflow_steps WHERE run_id=r.id)) RETURNING id INTO result;
 UPDATE public.workflow_runs SET status='active' WHERE id=r.id;
 ELSIF _operation='reorder' THEN
 ids:=ARRAY(SELECT value::uuid FROM jsonb_array_elements_text(_payload->'ids'));
 IF cardinality(ids)<>(SELECT count(*) FROM public.workflow_steps WHERE run_id=r.id) OR cardinality(ids)<>(SELECT count(DISTINCT x) FROM unnest(ids) x) OR EXISTS(SELECT 1 FROM unnest(ids) x WHERE NOT EXISTS(SELECT 1 FROM public.workflow_steps WHERE id=x AND run_id=r.id)) THEN RAISE EXCEPTION 'Invalid step order'; END IF;
 UPDATE public.workflow_steps st SET position=a.ordinality FROM unnest(ids) WITH ORDINALITY a(id,ordinality) WHERE st.id=a.id;
 ELSIF _operation='edit_step' THEN
 IF s.id IS NULL THEN RAISE EXCEPTION 'Step required'; END IF;
 ids:=ARRAY(SELECT value::uuid FROM jsonb_array_elements_text(coalesce(_payload->'assigned_users','[]')));
 deps:=ARRAY(SELECT value::uuid FROM jsonb_array_elements_text(coalesce(_payload->'approver_ids','[]')));
 uid:=(_payload->>'owner_id')::uuid;
 PERFORM public.workflow_assert_members(r.workspace_id,ids||deps||ARRAY[uid,(_payload->>'quality_owner_id')::uuid]);
 IF length(trim(coalesce(_payload->>'title','')))=0 THEN RAISE EXCEPTION 'Title required'; END IF;
 PERFORM public.workflow_invalidate(s.id);
 UPDATE public.workflow_steps SET title=_payload->>'title',owner_id=uid,department=coalesce(_payload->>'department',''),assigned_users=ids,due_date=(_payload->>'due_date')::date,priority=coalesce(_payload->>'priority','medium'),entry_conditions=coalesce(_payload->>'entry_conditions',''),entry_verified=false,completion_criteria=coalesce(_payload->>'completion_criteria',''),required_approvals=coalesce((_payload->>'required_approvals')::integer,0),approver_ids=deps,approval_expires_at=(_payload->>'approval_expires_at')::timestamptz,quality_owner_id=(_payload->>'quality_owner_id')::uuid,corrective_title=coalesce(nullif(_payload->>'corrective_title',''),'Corrective action'),quality_blocks=coalesce((_payload->>'quality_blocks')::boolean,true) WHERE id=s.id;
 ELSIF _operation='dependencies' THEN
 deps:=ARRAY(SELECT value::uuid FROM jsonb_array_elements_text(coalesce(_payload->'ids','[]')));
 IF EXISTS(SELECT 1 FROM unnest(deps) x WHERE x=s.id OR NOT EXISTS(SELECT 1 FROM public.workflow_steps st JOIN public.workflow_runs wr ON wr.id=st.run_id WHERE st.id=x AND wr.project_id=r.project_id AND st.workspace_id=r.workspace_id AND public.workflow_can_read(wr.id))) THEN RAISE EXCEPTION 'Invalid dependency'; END IF;
 DELETE FROM public.workflow_dependencies WHERE step_id=s.id;
 INSERT INTO public.workflow_dependencies(workspace_id,run_id,step_id,prerequisite_id) SELECT r.workspace_id,r.id,s.id,x FROM unnest(deps) x ON CONFLICT DO NOTHING;
 IF EXISTS(WITH RECURSIVE chain(id) AS(SELECT prerequisite_id FROM public.workflow_dependencies WHERE step_id=s.id UNION SELECT d.prerequisite_id FROM public.workflow_dependencies d JOIN chain c ON d.step_id=c.id) SELECT 1 FROM chain WHERE id=s.id) THEN RAISE EXCEPTION 'wf.cycle'; END IF;
 PERFORM public.workflow_invalidate(s.id);
 ELSIF _operation IN('add_task','edit_task') THEN
 IF s.id IS NULL THEN RAISE EXCEPTION 'Step required'; END IF;
 uid:=(_payload->>'assignee_id')::uuid; IF uid IS NULL OR length(trim(coalesce(_payload->>'title','')))=0 THEN RAISE EXCEPTION 'Task title and responsible person required'; END IF; PERFORM public.workflow_assert_members(r.workspace_id,ARRAY[uid]);
 IF _operation='edit_task' THEN SELECT * INTO t FROM public.workflow_tasks WHERE id=(_payload->>'task_id')::uuid AND step_id=s.id FOR UPDATE; IF t.id IS NULL THEN RAISE EXCEPTION 'Invalid task'; END IF; old_assignee:=t.assignee_id;
 UPDATE public.workflow_tasks SET title=_payload->>'title',assignee_id=uid,due_date=(_payload->>'due_date')::date,priority=coalesce(_payload->>'priority','medium'),required=coalesce((_payload->>'required')::boolean,true),version=version+1 WHERE id=t.id RETURNING id INTO result;
 ELSE INSERT INTO public.workflow_tasks(workspace_id,run_id,step_id,title,assignee_id,due_date,priority,required) VALUES(r.workspace_id,r.id,s.id,_payload->>'title',uid,(_payload->>'due_date')::date,coalesce(_payload->>'priority','medium'),coalesce((_payload->>'required')::boolean,true)) RETURNING id INTO result; END IF;
 PERFORM public.workflow_invalidate(s.id);
 IF coalesce((r.notification_rules->>'assignment')::boolean,true) AND old_assignee IS DISTINCT FROM uid THEN PERFORM public.workflow_notify(r.id,uid,_request::text,'system.task_assigned',_payload->>'title'); END IF;
 ELSIF _operation='task_status' THEN
 SELECT * INTO t FROM public.workflow_tasks WHERE id=(_payload->>'task_id')::uuid AND step_id=s.id FOR UPDATE; IF t.id IS NULL THEN RAISE EXCEPTION 'Invalid task'; END IF;
 IF _payload->>'status'<>'pending' THEN b:=public.workflow_blockers(s.id,false); b:=array_remove(b,'wf.block.quality'); IF cardinality(b)>0 THEN RAISE EXCEPTION '%',array_to_string(b,','); END IF; END IF;
 IF t.status IS DISTINCT FROM _payload->>'status' THEN PERFORM public.workflow_invalidate(s.id); UPDATE public.workflow_tasks SET status=_payload->>'status',version=version+1 WHERE id=t.id; END IF;
 ELSIF _operation='verify_conditions' THEN
 IF s.id IS NULL THEN RAISE EXCEPTION 'Step required'; END IF;
 UPDATE public.workflow_steps SET entry_verified=coalesce((_payload->>'entry')::boolean,entry_verified),criteria_verified=coalesce((_payload->>'criteria')::boolean,criteria_verified) WHERE id=s.id;
 ELSIF _operation='request_approval' THEN
 IF s.required_approvals=0 THEN RAISE EXCEPTION 'No approval requirement'; END IF;
 IF s.approval_expires_at IS NOT NULL AND s.approval_expires_at<=now() THEN RAISE EXCEPTION 'Approval expired'; END IF;
 UPDATE public.workflow_steps SET approval_requested=true WHERE id=s.id;
 IF coalesce((r.notification_rules->>'approval')::boolean,true) THEN FOR uid IN SELECT user_id FROM public.workspace_members WHERE workspace_id=r.workspace_id AND role IN('admin','approver') AND (cardinality(s.approver_ids)=0 OR user_id=ANY(s.approver_ids)) LOOP PERFORM public.workflow_notify(r.id,uid,'approval:'||s.id||':'||s.version,'system.step_approval',s.title); END LOOP; END IF;
 ELSIF _operation='vote' THEN
 IF NOT s.approval_requested OR s.required_approvals=0 OR (s.approval_expires_at IS NOT NULL AND s.approval_expires_at<=now()) OR (cardinality(s.approver_ids)>0 AND NOT auth.uid()=ANY(s.approver_ids)) THEN RAISE EXCEPTION 'Not an eligible approver' USING ERRCODE='42501'; END IF;
 INSERT INTO public.workflow_approvals(workspace_id,run_id,step_id,step_version,approver_id,vote) VALUES(r.workspace_id,r.id,s.id,s.version,auth.uid(),_payload->>'vote') ON CONFLICT DO NOTHING;
 ELSIF _operation='quality_fail' THEN
 uid:=s.quality_owner_id; IF uid IS NULL THEN RAISE EXCEPTION 'Quality owner required'; END IF; PERFORM public.workflow_assert_members(r.workspace_id,ARRAY[uid]);
 IF s.quality_status<>'failed' THEN PERFORM public.workflow_invalidate(s.id); UPDATE public.workflow_steps SET quality_status='failed' WHERE id=s.id;
 INSERT INTO public.workflow_tasks(workspace_id,run_id,step_id,title,assignee_id,required,corrective,priority) VALUES(r.workspace_id,r.id,s.id,s.corrective_title,uid,true,true,'high') RETURNING id INTO result;
 PERFORM public.workflow_notify(r.id,uid,'quality:'||result,'system.quality_failed',s.title); END IF;
 ELSIF _operation='quality_verify' THEN
 IF s.quality_status<>'failed' OR EXISTS(SELECT 1 FROM public.workflow_tasks WHERE step_id=s.id AND corrective AND status<>'completed') THEN RAISE EXCEPTION 'wf.block.correction'; END IF;
 IF NOT public.is_workspace_admin(auth.uid(),r.workspace_id) AND auth.uid() IS DISTINCT FROM s.quality_owner_id THEN RAISE EXCEPTION 'Quality verification requires owner or administrator' USING ERRCODE='42501'; END IF;
 UPDATE public.workflow_steps SET quality_status='verified' WHERE id=s.id;
 ELSIF _operation='step_status' THEN
 IF _payload->>'status' NOT IN('pending','in_progress','completed') THEN RAISE EXCEPTION 'Invalid status'; END IF;
 IF _payload->>'status'='pending' THEN PERFORM public.workflow_invalidate(s.id);
 ELSE b:=public.workflow_blockers(s.id,_payload->>'status'='completed'); IF cardinality(b)>0 THEN RAISE EXCEPTION '%',array_to_string(b,','); END IF;
 UPDATE public.workflow_steps SET status=_payload->>'status',completed_at=CASE WHEN _payload->>'status'='completed' THEN now() ELSE NULL END WHERE id=s.id;
 IF s.status<>'completed' AND _payload->>'status'='completed' AND coalesce((r.notification_rules->>'handoff')::boolean,true) THEN
 FOR item IN SELECT to_jsonb(st) FROM public.workflow_steps st JOIN public.workflow_dependencies d ON d.step_id=st.id WHERE d.prerequisite_id=s.id AND st.status='pending' LOOP
 IF cardinality(public.workflow_blockers((item->>'id')::uuid,false))=0 THEN PERFORM public.workflow_notify((item->>'run_id')::uuid,(item->>'owner_id')::uuid,'handoff:'||(item->>'id')||':'||(item->>'version'),'system.step_handoff',item->>'title'); END IF; END LOOP; END IF; END IF;
 ELSE RAISE EXCEPTION 'Unknown workflow operation'; END IF;
 END IF;
 INSERT INTO public.workflow_events(workspace_id,run_id,step_id,actor_id,event_type,request_id,metadata) VALUES(r.workspace_id,r.id,s.id,auth.uid(),_operation,_request,jsonb_build_object('record_id',result,'version',s.version));
 INSERT INTO public.audit_events(workspace_id,event_type,actor_user_id,metadata,reason) VALUES(r.workspace_id,'workflow.'||_operation,auth.uid(),jsonb_build_object('run_id',r.id,'step_id',s.id,'request_id',_request),'Workflow transition');
 UPDATE public.workflow_runs wr SET status=CASE WHEN EXISTS(SELECT 1 FROM public.workflow_steps WHERE run_id=wr.id) AND NOT EXISTS(SELECT 1 FROM public.workflow_steps WHERE run_id=wr.id AND status<>'completed') THEN 'completed' ELSE 'active' END WHERE wr.project_id=r.project_id;
 RETURN jsonb_build_object('id',coalesce(result,r.id),'run_id',r.id);
END; $$;
REVOKE ALL ON FUNCTION public.workflow_command(text,uuid,uuid,jsonb,uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.workflow_command(text,uuid,uuid,jsonb,uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.workflow_project_config(_project uuid,_phases jsonb DEFAULT '[]',_participants uuid[] DEFAULT '{}') RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE j public.projects%ROWTYPE;item jsonb; BEGIN
 SELECT * INTO j FROM public.projects WHERE id=_project;
 IF j.id IS NULL OR NOT public.is_workspace_writer(auth.uid(),j.workspace_id) OR NOT public.visible_record(j.workspace_id,'project',j.id) THEN RAISE EXCEPTION 'Writer access required' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(j.id::text,0)); PERFORM public.workflow_assert_members(j.workspace_id,_participants);
 DELETE FROM public.project_participants WHERE project_id=j.id;
 INSERT INTO public.project_participants(workspace_id,project_id,user_id) SELECT j.workspace_id,j.id,x FROM unnest(_participants) x ON CONFLICT DO NOTHING;
 FOR item IN SELECT value FROM jsonb_array_elements(_phases) LOOP
 IF length(trim(coalesce(item->>'name','')))=0 THEN RAISE EXCEPTION 'Phase name required'; END IF;
 IF item->>'id' IS NULL THEN INSERT INTO public.project_phases(workspace_id,project_id,name,position) VALUES(j.workspace_id,j.id,item->>'name',coalesce((item->>'position')::integer,0));
 ELSE UPDATE public.project_phases SET name=item->>'name',position=coalesce((item->>'position')::integer,0) WHERE id=(item->>'id')::uuid AND project_id=j.id; IF NOT FOUND THEN RAISE EXCEPTION 'Invalid phase'; END IF; END IF;
 END LOOP; END; $$;
REVOKE ALL ON FUNCTION public.workflow_project_config(uuid,jsonb,uuid[]) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.workflow_project_config(uuid,jsonb,uuid[]) TO authenticated;
CREATE OR REPLACE FUNCTION public.workflow_validate_parent_metadata() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 PERFORM public.workflow_assert_members(NEW.workspace_id,ARRAY[NEW.owner_id]);
 IF TG_TABLE_NAME='projects' THEN IF NEW.end_date<NEW.start_date THEN RAISE EXCEPTION 'End date precedes start date'; END IF; END IF;
 RETURN NEW; END; $$;
CREATE TRIGGER workflow_project_metadata BEFORE INSERT OR UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.workflow_validate_parent_metadata();
CREATE TRIGGER workflow_process_metadata BEFORE INSERT OR UPDATE ON public.processes FOR EACH ROW EXECUTE FUNCTION public.workflow_validate_parent_metadata();
GRANT EXECUTE ON FUNCTION public.workflow_assert_members(uuid,uuid[]) TO authenticated;
CREATE OR REPLACE FUNCTION public.workflow_reminders() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE t record;uid uuid;n integer:=0; BEGIN
 FOR t IN SELECT tk.*,r.notification_rules,j.owner_id AS project_owner FROM public.workflow_tasks tk JOIN public.workflow_runs r ON r.id=tk.run_id JOIN public.projects j ON j.id=r.project_id WHERE tk.status<>'completed' AND tk.due_date<current_date AND r.status='active' LOOP
 IF coalesce((t.notification_rules->>'reminder')::boolean,true) THEN PERFORM public.workflow_notify(t.run_id,t.assignee_id,'reminder:'||t.id||':'||t.version||':'||current_date,'system.task_overdue',t.title); n:=n+1; END IF;
 IF coalesce((t.notification_rules->>'escalation')::boolean,true) AND now()>=t.due_date::timestamptz+make_interval(hours=>coalesce((t.notification_rules->>'escalation_hours')::integer,24)) THEN
 IF t.project_owner IS NOT NULL THEN PERFORM public.workflow_notify(t.run_id,t.project_owner,'escalation:'||t.id||':'||t.version,'system.task_escalated',t.title);
 ELSE FOR uid IN SELECT user_id FROM public.workspace_members WHERE workspace_id=t.workspace_id AND role='admin' LOOP PERFORM public.workflow_notify(t.run_id,uid,'escalation:'||t.id||':'||t.version,'system.task_escalated',t.title); END LOOP; END IF; END IF;
 END LOOP; RETURN n; END; $$;
REVOKE ALL ON FUNCTION public.workflow_reminders() FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.workflow_reminders() TO service_role;