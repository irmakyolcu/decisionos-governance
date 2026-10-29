
-- Integration hub: configs, run logs, inbound events, outbound outbox, webhooks, Slack allowlist, review inbox, automation
CREATE TABLE public.integration_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('inbound_api','outbound_webhooks','slack','api_source','other')),
  name text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  allowed_data_types text[] NOT NULL DEFAULT '{}',
  sync_rules jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'not_configured' CHECK (status IN ('not_configured','connected','error','disabled')),
  last_sync_at timestamptz,
  last_error text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, kind, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integration_configs TO authenticated;
GRANT ALL ON public.integration_configs TO service_role;
ALTER TABLE public.integration_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY ic_read ON public.integration_configs FOR SELECT TO authenticated
  USING (public.get_workspace_role(auth.uid(), workspace_id) IN ('admin','auditor'));
CREATE POLICY ic_admin_insert ON public.integration_configs FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id) AND created_by = auth.uid());
CREATE POLICY ic_admin_update ON public.integration_configs FOR UPDATE TO authenticated
  USING (public.is_workspace_admin(auth.uid(), workspace_id)) WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));
CREATE POLICY ic_admin_delete ON public.integration_configs FOR DELETE TO authenticated
  USING (public.is_workspace_admin(auth.uid(), workspace_id));
CREATE TRIGGER ic_updated BEFORE UPDATE ON public.integration_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.integration_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  integration_id uuid REFERENCES public.integration_configs(id) ON DELETE SET NULL,
  kind text NOT NULL,
  status text NOT NULL CHECK (status IN ('success','failed','skipped','not_configured')),
  detail jsonb NOT NULL DEFAULT '{}',
  error text,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.integration_runs TO authenticated;
GRANT ALL ON public.integration_runs TO service_role;
ALTER TABLE public.integration_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY ir_read ON public.integration_runs FOR SELECT TO authenticated
  USING (public.get_workspace_role(auth.uid(), workspace_id) IN ('admin','auditor'));

CREATE TABLE public.inbound_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  source text NOT NULL,
  external_id text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received','processed','stored','failed')),
  error text,
  record_kind text,
  record_id uuid,
  api_key_id uuid,
  received_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, source, external_id)
);
GRANT SELECT ON public.inbound_events TO authenticated;
GRANT ALL ON public.inbound_events TO service_role;
ALTER TABLE public.inbound_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY ie_read ON public.inbound_events FOR SELECT TO authenticated
  USING (public.get_workspace_role(auth.uid(), workspace_id) IN ('admin','auditor'));

CREATE TABLE public.webhook_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  url text NOT NULL CHECK (url ~ '^https://[^/\s]+'),
  events text[] NOT NULL DEFAULT '{}',
  enabled boolean NOT NULL DEFAULT true,
  secret text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- secret column is never readable by app users
GRANT SELECT (id, workspace_id, name, url, events, enabled, created_by, created_at) ON public.webhook_endpoints TO authenticated;
GRANT UPDATE (name, url, events, enabled) ON public.webhook_endpoints TO authenticated;
GRANT DELETE ON public.webhook_endpoints TO authenticated;
GRANT ALL ON public.webhook_endpoints TO service_role;
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY we_read ON public.webhook_endpoints FOR SELECT TO authenticated
  USING (public.get_workspace_role(auth.uid(), workspace_id) IN ('admin','auditor'));
CREATE POLICY we_update ON public.webhook_endpoints FOR UPDATE TO authenticated
  USING (public.is_workspace_admin(auth.uid(), workspace_id)) WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));
CREATE POLICY we_delete ON public.webhook_endpoints FOR DELETE TO authenticated
  USING (public.is_workspace_admin(auth.uid(), workspace_id));

CREATE TABLE public.outbound_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_key text NOT NULL,
  entity_kind text NOT NULL,
  entity_id uuid NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, event_key)
);
GRANT SELECT ON public.outbound_events TO authenticated;
GRANT ALL ON public.outbound_events TO service_role;
ALTER TABLE public.outbound_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY oe_read ON public.outbound_events FOR SELECT TO authenticated
  USING (public.get_workspace_role(auth.uid(), workspace_id) IN ('admin','auditor'));

CREATE TABLE public.webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  endpoint_id uuid NOT NULL REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.outbound_events(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','delivering','delivered','failed')),
  attempts integer NOT NULL DEFAULT 0,
  next_retry_at timestamptz NOT NULL DEFAULT now(),
  last_status_code integer,
  last_error text,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (endpoint_id, event_id)
);
GRANT SELECT ON public.webhook_deliveries TO authenticated;
GRANT ALL ON public.webhook_deliveries TO service_role;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY wd_read ON public.webhook_deliveries FOR SELECT TO authenticated
  USING (public.get_workspace_role(auth.uid(), workspace_id) IN ('admin','auditor'));

CREATE TABLE public.slack_channel_allowlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  channel_id text NOT NULL,
  channel_name text NOT NULL DEFAULT '',
  is_private boolean NOT NULL DEFAULT false,
  private_authorized boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, channel_id),
  CHECK (NOT is_private OR private_authorized)
);
GRANT SELECT, INSERT, DELETE ON public.slack_channel_allowlist TO authenticated;
GRANT ALL ON public.slack_channel_allowlist TO service_role;
ALTER TABLE public.slack_channel_allowlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY sca_read ON public.slack_channel_allowlist FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY sca_insert ON public.slack_channel_allowlist FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id) AND created_by = auth.uid());
CREATE POLICY sca_delete ON public.slack_channel_allowlist FOR DELETE TO authenticated
  USING (public.is_workspace_admin(auth.uid(), workspace_id));

CREATE TABLE public.extraction_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  source text NOT NULL,
  source_ref text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('decision','action')),
  title text NOT NULL,
  owner_hint text,
  due_hint text,
  quote text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_record_kind text,
  created_record_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, source_ref, kind, title)
);
GRANT SELECT ON public.extraction_suggestions TO authenticated;
GRANT ALL ON public.extraction_suggestions TO service_role;
ALTER TABLE public.extraction_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY es_read ON public.extraction_suggestions FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE TABLE public.automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  event_type text NOT NULL,
  conditions jsonb NOT NULL DEFAULT '{}',
  actions jsonb NOT NULL DEFAULT '[]',
  enabled boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(conditions) = 'object' AND jsonb_typeof(actions) = 'array')
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_rules TO authenticated;
GRANT ALL ON public.automation_rules TO service_role;
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY ar_read ON public.automation_rules FOR SELECT TO authenticated
  USING (public.get_workspace_role(auth.uid(), workspace_id) IN ('admin','auditor'));
CREATE POLICY ar_insert ON public.automation_rules FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id) AND created_by = auth.uid());
CREATE POLICY ar_update ON public.automation_rules FOR UPDATE TO authenticated
  USING (public.is_workspace_admin(auth.uid(), workspace_id)) WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));
CREATE POLICY ar_delete ON public.automation_rules FOR DELETE TO authenticated
  USING (public.is_workspace_admin(auth.uid(), workspace_id));

CREATE TABLE public.automation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  rule_id uuid NOT NULL REFERENCES public.automation_rules(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.outbound_events(id) ON DELETE CASCADE,
  status text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rule_id, event_id)
);
GRANT SELECT ON public.automation_runs TO authenticated;
GRANT ALL ON public.automation_runs TO service_role;
ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY arun_read ON public.automation_runs FOR SELECT TO authenticated
  USING (public.get_workspace_role(auth.uid(), workspace_id) IN ('admin','auditor'));

-- Admin RPCs ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_webhook_endpoint(_workspace uuid, _name text, _url text, _events text[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE _secret text; _id uuid;
BEGIN
  IF NOT public.is_workspace_admin(auth.uid(), _workspace) THEN RAISE EXCEPTION 'admin required' USING ERRCODE='42501'; END IF;
  IF _url !~ '^https://[^/\s]+' THEN RAISE EXCEPTION 'https url required' USING ERRCODE='22023'; END IF;
  IF _events IS NULL OR array_length(_events,1) IS NULL THEN RAISE EXCEPTION 'choose at least one event' USING ERRCODE='22023'; END IF;
  _secret := 'whsec_' || encode(extensions.gen_random_bytes(32), 'base64');
  INSERT INTO public.webhook_endpoints(workspace_id, name, url, events, secret, created_by)
    VALUES (_workspace, left(_name,120), _url, _events, _secret, auth.uid()) RETURNING id INTO _id;
  INSERT INTO public.audit_events(workspace_id, event_type, actor_user_id, metadata)
    VALUES (_workspace, 'integration.webhook_created', auth.uid(), jsonb_build_object('endpoint_id', _id, 'events', _events));
  RETURN jsonb_build_object('id', _id, 'secret', _secret);
END $$;
REVOKE ALL ON FUNCTION public.create_webhook_endpoint(uuid,text,text,text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_webhook_endpoint(uuid,text,text,text[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.retry_webhook_delivery(_delivery uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _ws uuid;
BEGIN
  SELECT workspace_id INTO _ws FROM public.webhook_deliveries WHERE id = _delivery;
  IF _ws IS NULL OR NOT public.is_workspace_admin(auth.uid(), _ws) THEN RAISE EXCEPTION 'admin required' USING ERRCODE='42501'; END IF;
  UPDATE public.webhook_deliveries SET status='pending', next_retry_at=now(), attempts=0 WHERE id=_delivery AND status='failed';
  INSERT INTO public.audit_events(workspace_id, event_type, actor_user_id, metadata)
    VALUES (_ws, 'integration.webhook_retry', auth.uid(), jsonb_build_object('delivery_id', _delivery));
END $$;
REVOKE ALL ON FUNCTION public.retry_webhook_delivery(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.retry_webhook_delivery(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_extraction_suggestion(_id uuid, _accept boolean, _owner uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.extraction_suggestions; _rid uuid; _rk text;
BEGIN
  SELECT * INTO s FROM public.extraction_suggestions WHERE id=_id FOR UPDATE;
  IF s.id IS NULL OR NOT public.is_workspace_writer(auth.uid(), s.workspace_id) THEN RAISE EXCEPTION 'writer required' USING ERRCODE='42501'; END IF;
  IF s.status <> 'pending' THEN RAISE EXCEPTION 'already reviewed' USING ERRCODE='22023'; END IF;
  IF _owner IS NOT NULL AND NOT public.is_workspace_member(_owner, s.workspace_id) THEN RAISE EXCEPTION 'owner must be a member' USING ERRCODE='22023'; END IF;
  IF _accept THEN
    IF s.kind = 'decision' THEN
      INSERT INTO public.decisions(workspace_id, title, description, created_by, owner_id, status)
        VALUES (s.workspace_id, left(s.title,200), coalesce(s.quote,'') || E'\n\nKaynak: ' || s.source_ref, auth.uid(), _owner, 'Draft') RETURNING id INTO _rid;
      _rk := 'decision';
    ELSE
      INSERT INTO public.company_notes(workspace_id, created_by, title, content, category, tags)
        VALUES (s.workspace_id, auth.uid(), left(s.title,200),
          concat_ws(E'\n', s.quote, 'Sorumlu: ' || s.owner_hint, 'Termin: ' || s.due_hint, 'Kaynak: ' || s.source_ref), 'Action', ARRAY['slack','action']) RETURNING id INTO _rid;
      _rk := 'note';
      IF _owner IS NOT NULL THEN
        INSERT INTO public.notifications(workspace_id, user_id, kind, title, body, link, metadata)
          VALUES (s.workspace_id, _owner, 'integration_action', left(s.title,200), s.due_hint, '/company-notes', jsonb_build_object('suggestion_id', s.id));
      END IF;
    END IF;
  END IF;
  UPDATE public.extraction_suggestions SET status = CASE WHEN _accept THEN 'accepted' ELSE 'rejected' END,
    reviewed_by=auth.uid(), reviewed_at=now(), created_record_kind=_rk, created_record_id=_rid WHERE id=_id;
  INSERT INTO public.audit_events(workspace_id, event_type, actor_user_id, metadata)
    VALUES (s.workspace_id, 'integration.suggestion_' || CASE WHEN _accept THEN 'accepted' ELSE 'rejected' END, auth.uid(),
      jsonb_build_object('suggestion_id', s.id, 'record_kind', _rk, 'record_id', _rid));
  RETURN jsonb_build_object('record_kind', _rk, 'record_id', _rid);
END $$;
REVOKE ALL ON FUNCTION public.review_extraction_suggestion(uuid,boolean,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_extraction_suggestion(uuid,boolean,uuid) TO authenticated;

-- Rule condition matcher: every key in conditions must equal payload value (text compare)
CREATE OR REPLACE FUNCTION public.automation_matches(_conditions jsonb, _payload jsonb)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM jsonb_each(_conditions) c
    WHERE (_payload -> c.key) IS NULL
       OR CASE WHEN jsonb_typeof(c.value) = 'array'
               THEN NOT (c.value @> jsonb_build_array(_payload -> c.key))
               ELSE (_payload ->> c.key) IS DISTINCT FROM (c.value #>> '{}') END)
$$;

-- Fan-out: webhook deliveries + automation rules
CREATE OR REPLACE FUNCTION public.outbound_event_fanout()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.automation_rules; a jsonb; st public.workflow_steps; _target uuid; _done jsonb; _uid uuid;
BEGIN
  INSERT INTO public.webhook_deliveries(workspace_id, endpoint_id, event_id)
    SELECT NEW.workspace_id, e.id, NEW.id FROM public.webhook_endpoints e
    WHERE e.workspace_id = NEW.workspace_id AND e.enabled AND NEW.event_type = ANY(e.events)
    ON CONFLICT DO NOTHING;

  IF pg_trigger_depth() > 4 THEN RETURN NEW; END IF; -- loop guard

  FOR r IN SELECT * FROM public.automation_rules
           WHERE workspace_id = NEW.workspace_id AND enabled AND event_type = NEW.event_type
  LOOP
    IF NOT public.automation_matches(r.conditions, NEW.payload) THEN CONTINUE; END IF;
    BEGIN
      INSERT INTO public.automation_runs(workspace_id, rule_id, event_id, status) VALUES (NEW.workspace_id, r.id, NEW.id, 'running');
    EXCEPTION WHEN unique_violation THEN CONTINUE; END;
    _done := '[]'::jsonb;
    st := NULL;
    IF NEW.entity_kind = 'workflow_step' THEN SELECT * INTO st FROM public.workflow_steps WHERE id = NEW.entity_id; END IF;
    BEGIN
      FOR a IN SELECT * FROM jsonb_array_elements(r.actions) LOOP
        _target := CASE a->>'target'
          WHEN 'quality_owner' THEN coalesce(st.quality_owner_id, st.owner_id)
          WHEN 'step_owner' THEN st.owner_id
          WHEN 'user' THEN nullif(a->>'user_id','')::uuid
          ELSE NULL END;
        IF _target IS NOT NULL AND NOT public.is_workspace_member(_target, NEW.workspace_id) THEN _target := NULL; END IF;
        IF a->>'type' = 'notify' AND _target IS NOT NULL THEN
          INSERT INTO public.notifications(workspace_id, user_id, kind, title, body, metadata, severity)
            VALUES (NEW.workspace_id, _target, 'automation', coalesce(a->>'message', r.name), NEW.event_type,
                    jsonb_build_object('rule_id', r.id, 'event_id', NEW.id), 'info');
          _done := _done || jsonb_build_object('type','notify','user',_target);
        ELSIF a->>'type' = 'escalate' THEN
          FOR _uid IN SELECT user_id FROM public.workspace_members WHERE workspace_id = NEW.workspace_id AND role = 'admin' LOOP
            INSERT INTO public.notifications(workspace_id, user_id, kind, title, body, metadata, severity)
              VALUES (NEW.workspace_id, _uid, 'automation_escalation', coalesce(a->>'message', r.name), NEW.event_type,
                      jsonb_build_object('rule_id', r.id, 'event_id', NEW.id), 'warning');
          END LOOP;
          _done := _done || jsonb_build_object('type','escalate');
        ELSIF a->>'type' = 'create_task' AND st.id IS NOT NULL AND _target IS NOT NULL THEN
          INSERT INTO public.workflow_tasks(workspace_id, run_id, step_id, title, assignee_id, required, priority)
            VALUES (NEW.workspace_id, st.run_id, st.id, left(coalesce(a->>'title', r.name),200), _target, true, 'high');
          _done := _done || jsonb_build_object('type','create_task','assignee',_target);
        ELSIF a->>'type' = 'block_next_step' AND st.id IS NOT NULL THEN
          UPDATE public.workflow_steps SET quality_blocks = true WHERE id = st.id;
          _done := _done || jsonb_build_object('type','block_next_step');
        ELSE
          _done := _done || jsonb_build_object('type', a->>'type', 'skipped', 'target or step unavailable');
        END IF;
      END LOOP;
      UPDATE public.automation_runs SET status='success', detail=jsonb_build_object('actions',_done) WHERE rule_id=r.id AND event_id=NEW.id;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.automation_runs SET status='failed', detail=jsonb_build_object('error',SQLERRM) WHERE rule_id=r.id AND event_id=NEW.id;
    END;
  END LOOP;
  RETURN NEW;
END $$;
CREATE TRIGGER outbound_event_fanout AFTER INSERT ON public.outbound_events FOR EACH ROW EXECUTE FUNCTION public.outbound_event_fanout();

CREATE OR REPLACE FUNCTION public.emit_outbound_event(_ws uuid, _type text, _key text, _kind text, _id uuid, _payload jsonb)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.outbound_events(workspace_id, event_type, event_key, entity_kind, entity_id, payload)
  VALUES (_ws, _type, _key, _kind, _id, _payload) ON CONFLICT (workspace_id, event_key) DO NOTHING;
$$;
REVOKE ALL ON FUNCTION public.emit_outbound_event(uuid,text,text,text,uuid,jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.capture_outbound_events()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_TABLE_NAME = 'decisions' THEN
    IF NEW.status = 'Approved' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
      PERFORM public.emit_outbound_event(NEW.workspace_id, 'decision.approved', 'decision.approved:'||NEW.id, 'decision', NEW.id,
        jsonb_build_object('id',NEW.id,'title',NEW.title,'risk_level',NEW.risk_level,'owner_id',NEW.owner_id));
    END IF;
  ELSIF TG_TABLE_NAME = 'workflow_tasks' THEN
    IF TG_OP = 'INSERT' OR OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
      PERFORM public.emit_outbound_event(NEW.workspace_id, 'task.assigned', 'task.assigned:'||NEW.id||':'||NEW.assignee_id||':'||NEW.version, 'workflow_task', NEW.id,
        jsonb_build_object('id',NEW.id,'title',NEW.title,'assignee_id',NEW.assignee_id,'run_id',NEW.run_id,'step_id',NEW.step_id,'priority',NEW.priority,'corrective',NEW.corrective));
    END IF;
  ELSIF TG_TABLE_NAME = 'workflow_steps' AND TG_OP = 'UPDATE' THEN
    IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
      PERFORM public.emit_outbound_event(NEW.workspace_id, 'step.completed', 'step.completed:'||NEW.id||':'||NEW.version, 'workflow_step', NEW.id,
        jsonb_build_object('id',NEW.id,'title',NEW.title,'run_id',NEW.run_id,'department',NEW.department));
    END IF;
    IF NEW.quality_status = 'failed' AND OLD.quality_status IS DISTINCT FROM 'failed' THEN
      PERFORM public.emit_outbound_event(NEW.workspace_id, 'step.quality_failed', 'step.quality_failed:'||NEW.id||':'||NEW.version, 'workflow_step', NEW.id,
        jsonb_build_object('id',NEW.id,'title',NEW.title,'run_id',NEW.run_id,'department',NEW.department));
    END IF;
    IF NEW.approval_requested AND NOT OLD.approval_requested THEN
      PERFORM public.emit_outbound_event(NEW.workspace_id, 'approval.required', 'approval.required:'||NEW.id||':'||NEW.version, 'workflow_step', NEW.id,
        jsonb_build_object('id',NEW.id,'title',NEW.title,'run_id',NEW.run_id,'approver_ids',NEW.approver_ids));
    END IF;
  ELSIF TG_TABLE_NAME = 'risks' THEN
    IF NEW.severity IN ('high','critical') AND (TG_OP = 'INSERT' OR OLD.severity IS DISTINCT FROM NEW.severity) THEN
      PERFORM public.emit_outbound_event(NEW.workspace_id, 'risk.threshold_exceeded', 'risk:'||NEW.id||':'||NEW.severity, 'risk', NEW.id,
        jsonb_build_object('id',NEW.id,'severity',NEW.severity,'category',NEW.category,'summary',NEW.summary));
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER capture_outbound_decisions AFTER INSERT OR UPDATE ON public.decisions FOR EACH ROW EXECUTE FUNCTION public.capture_outbound_events();
CREATE TRIGGER capture_outbound_tasks AFTER INSERT OR UPDATE ON public.workflow_tasks FOR EACH ROW EXECUTE FUNCTION public.capture_outbound_events();
CREATE TRIGGER capture_outbound_steps AFTER UPDATE ON public.workflow_steps FOR EACH ROW EXECUTE FUNCTION public.capture_outbound_events();
CREATE TRIGGER capture_outbound_risks AFTER INSERT OR UPDATE ON public.risks FOR EACH ROW EXECUTE FUNCTION public.capture_outbound_events();

-- Audit admin config changes (identifiers only)
CREATE OR REPLACE FUNCTION public.audit_integration_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _row jsonb := to_jsonb(coalesce(NEW, OLD));
BEGIN
  INSERT INTO public.audit_events(workspace_id, event_type, actor_user_id, metadata)
  VALUES ((_row->>'workspace_id')::uuid, 'integration.'||TG_TABLE_NAME||'.'||lower(TG_OP), auth.uid(),
          jsonb_build_object('entity_id', _row->>'id'));
  RETURN coalesce(NEW, OLD);
END $$;
CREATE TRIGGER audit_ic AFTER INSERT OR UPDATE OR DELETE ON public.integration_configs FOR EACH ROW EXECUTE FUNCTION public.audit_integration_change();
CREATE TRIGGER audit_ar AFTER INSERT OR UPDATE OR DELETE ON public.automation_rules FOR EACH ROW EXECUTE FUNCTION public.audit_integration_change();
CREATE TRIGGER audit_sca AFTER INSERT OR DELETE ON public.slack_channel_allowlist FOR EACH ROW EXECUTE FUNCTION public.audit_integration_change();
CREATE TRIGGER audit_we AFTER UPDATE OR DELETE ON public.webhook_endpoints FOR EACH ROW EXECUTE FUNCTION public.audit_integration_change();
