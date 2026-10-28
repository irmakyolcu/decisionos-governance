DO $block$
DECLARE t record; expression text; command text;
BEGIN
  FOR t IN SELECT c.table_name FROM information_schema.columns c JOIN information_schema.tables tb ON tb.table_schema = c.table_schema AND tb.table_name = c.table_name WHERE c.table_schema='public' AND c.column_name='workspace_id' AND tb.table_type='BASE TABLE' AND c.table_name <> 'profiles'
  LOOP
    expression := format('NOT EXISTS (SELECT 1 FROM public.workspace_members am WHERE am.user_id = auth.uid() AND am.workspace_id = %I.workspace_id AND am.role = ''auditor''::public.workspace_role)', t.table_name);
    FOREACH command IN ARRAY ARRAY['INSERT','UPDATE','DELETE'] LOOP
      EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR %s TO authenticated %s', 'auditor_read_only_' || lower(command), t.table_name, command, CASE WHEN command='INSERT' THEN 'WITH CHECK (' || expression || ')' WHEN command='UPDATE' THEN 'USING (' || expression || ') WITH CHECK (' || expression || ')' ELSE 'USING (' || expression || ')' END);
    END LOOP;
  END LOOP;
  FOR t IN SELECT c.table_name, c.column_name, CASE c.column_name WHEN 'decision_id' THEN 'decisions' WHEN 'meeting_id' THEN 'meetings' WHEN 'conversation_id' THEN 'conversations' END AS parent_table FROM information_schema.columns c JOIN information_schema.tables tb ON tb.table_schema=c.table_schema AND tb.table_name=c.table_name WHERE c.table_schema='public' AND tb.table_type='BASE TABLE' AND c.column_name IN ('decision_id','meeting_id','conversation_id') AND NOT EXISTS (SELECT 1 FROM information_schema.columns x WHERE x.table_schema=c.table_schema AND x.table_name=c.table_name AND x.column_name='workspace_id')
  LOOP
    expression := format('NOT EXISTS (SELECT 1 FROM public.%I ap JOIN public.workspace_members am ON am.workspace_id = ap.workspace_id WHERE ap.id = %I.%I AND am.user_id = auth.uid() AND am.role = ''auditor''::public.workspace_role)', t.parent_table,t.table_name,t.column_name);
    FOREACH command IN ARRAY ARRAY['INSERT','UPDATE','DELETE'] LOOP
      EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR %s TO authenticated %s', 'auditor_read_only_' || t.column_name || '_' || lower(command), t.table_name, command, CASE WHEN command='INSERT' THEN 'WITH CHECK (' || expression || ')' WHEN command='UPDATE' THEN 'USING (' || expression || ') WITH CHECK (' || expression || ')' ELSE 'USING (' || expression || ')' END);
    END LOOP;
  END LOOP;
END;
$block$;