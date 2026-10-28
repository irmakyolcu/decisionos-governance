ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS notifications_user_workspace_created_idx ON public.notifications(user_id, workspace_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.mark_notifications_read(_workspace_id uuid, _notification_id uuid DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE affected integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_workspace_member(auth.uid(), _workspace_id) THEN
    RAISE EXCEPTION 'Workspace access required' USING ERRCODE='42501';
  END IF;
  UPDATE public.notifications SET read_at = now()
    WHERE workspace_id = _workspace_id AND user_id = auth.uid() AND read_at IS NULL
      AND (_notification_id IS NULL OR id = _notification_id);
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$function$;
REVOKE ALL ON FUNCTION public.mark_notifications_read(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_notifications_read(uuid,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.notify_workspace_system_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE current_row jsonb := to_jsonb(NEW); old_row jsonb; event_kind text; event_link text; event_severity text := 'info'; row_title text; admins_only boolean := false;
BEGIN
  IF TG_OP='UPDATE' THEN old_row := to_jsonb(OLD); END IF;
  CASE TG_TABLE_NAME
    WHEN 'decisions' THEN
      IF TG_OP='INSERT' THEN event_kind := 'system.decision_created';
      ELSIF current_row->>'status' IS DISTINCT FROM old_row->>'status' THEN event_kind := 'system.decision_status';
      ELSE RETURN NEW; END IF;
      event_link := '/decisions/' || NEW.id;
      row_title := current_row->>'title';
      IF current_row->>'status' IN ('Pending','Under Review','Escalated') THEN event_severity := 'warning';
      ELSIF current_row->>'status' IN ('Approved','Executed') THEN event_severity := 'success'; END IF;
    WHEN 'risks' THEN
      IF TG_OP='INSERT' THEN event_kind := 'system.risk_created';
      ELSIF current_row->>'status' IS DISTINCT FROM old_row->>'status' OR current_row->>'severity' IS DISTINCT FROM old_row->>'severity' THEN event_kind := 'system.risk_updated';
      ELSE RETURN NEW; END IF;
      row_title := current_row->>'summary'; event_link := '/risks';
      event_severity := CASE current_row->>'severity' WHEN 'critical' THEN 'critical' WHEN 'high' THEN 'warning' ELSE 'info' END;
    WHEN 'meetings' THEN
      IF TG_OP='INSERT' THEN event_kind := 'system.meeting_created';
      ELSIF current_row->>'is_approved' IS DISTINCT FROM old_row->>'is_approved' AND NEW.is_approved THEN event_kind := 'system.meeting_approved'; event_severity := 'success';
      ELSE RETURN NEW; END IF;
      row_title := current_row->>'title'; event_link := '/meetings';
    WHEN 'uploaded_documents' THEN
      IF TG_OP <> 'UPDATE' OR current_row->>'process_status' IS NOT DISTINCT FROM old_row->>'process_status' THEN RETURN NEW; END IF;
      IF current_row->>'process_status'='indexed' THEN event_kind := 'system.document_ready'; event_severity := 'success';
      ELSIF current_row->>'process_status'='failed' THEN event_kind := 'system.document_failed'; event_severity := 'critical';
      ELSIF current_row->>'process_status'='needs_review' THEN event_kind := 'system.document_review'; event_severity := 'warning';
      ELSE RETURN NEW; END IF;
      row_title := current_row->>'title'; event_link := '/brain';
    WHEN 'action_proposals' THEN
      IF TG_OP='UPDATE' AND current_row->>'approval_status' IS NOT DISTINCT FROM old_row->>'approval_status' THEN RETURN NEW; END IF;
      IF current_row->>'approval_status' IN ('awaiting_approval','partially_approved') THEN event_kind := 'system.action_approval'; event_severity := 'warning';
      ELSIF current_row->>'approval_status'='failed' THEN event_kind := 'system.action_failed'; event_severity := 'critical';
      ELSIF current_row->>'approval_status'='completed' THEN event_kind := 'system.action_completed'; event_severity := 'success';
      ELSE RETURN NEW; END IF;
      row_title := current_row->>'title'; event_link := '/approvals-center'; admins_only := true;
    ELSE RETURN NEW;
  END CASE;
  INSERT INTO public.notifications(workspace_id,user_id,kind,title,body,link,severity,metadata)
  SELECT NEW.workspace_id, m.user_id, event_kind, event_kind, row_title, event_link, event_severity,
    jsonb_build_object('entity_id',NEW.id,'status',coalesce(current_row->>'status',current_row->>'approval_status',current_row->>'process_status'))
  FROM public.workspace_members m
  WHERE m.workspace_id=NEW.workspace_id AND (NOT admins_only OR m.role='admin')
    AND (TG_TABLE_NAME <> 'uploaded_documents' OR public.can_view_confidential(m.user_id, NEW.workspace_id, (current_row->>'created_by')::uuid, (current_row->>'confidentiality')::public.confidentiality_level));
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.notify_workspace_system_event() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER notify_decision_system_event AFTER INSERT OR UPDATE ON public.decisions FOR EACH ROW EXECUTE FUNCTION public.notify_workspace_system_event();
CREATE TRIGGER notify_risk_system_event AFTER INSERT OR UPDATE ON public.risks FOR EACH ROW EXECUTE FUNCTION public.notify_workspace_system_event();
CREATE TRIGGER notify_meeting_system_event AFTER INSERT OR UPDATE ON public.meetings FOR EACH ROW EXECUTE FUNCTION public.notify_workspace_system_event();
CREATE TRIGGER notify_document_system_event AFTER UPDATE ON public.uploaded_documents FOR EACH ROW EXECUTE FUNCTION public.notify_workspace_system_event();
CREATE TRIGGER notify_action_system_event AFTER INSERT OR UPDATE ON public.action_proposals FOR EACH ROW EXECUTE FUNCTION public.notify_workspace_system_event();
DO $block$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END; $block$;