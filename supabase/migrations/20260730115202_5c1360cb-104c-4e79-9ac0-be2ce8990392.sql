DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname='public'
      AND roles = '{public}'
      AND tablename IN ('agent_runs','knowledge_items','conversations','conversation_messages','answer_feedback','audit_logs','clients','company_skills','projects','processes','data_sources','uploaded_documents','risks')
  LOOP
    EXECUTE format('ALTER POLICY %I ON public.%I TO authenticated', r.policyname, r.tablename);
  END LOOP;
END $$;

REVOKE ALL ON public.agent_runs, public.knowledge_items, public.conversations, public.conversation_messages, public.answer_feedback, public.audit_logs, public.clients, public.company_skills, public.projects, public.processes, public.data_sources, public.uploaded_documents, public.risks FROM anon;