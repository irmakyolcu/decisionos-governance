CREATE OR REPLACE FUNCTION public.can_read_company_file(_name text,_owner uuid) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=public AS $$
DECLARE ws uuid; BEGIN
 IF split_part(_name,'/',1)='notes' THEN
 IF split_part(_name,'/',2) !~ '^[0-9a-fA-F-]{36}$' THEN RETURN false; END IF;
 ws:=split_part(_name,'/',2)::uuid;
 RETURN public.is_workspace_member(auth.uid(),ws) AND EXISTS(SELECT 1 FROM public.note_attachments WHERE workspace_id=ws AND storage_path=_name);
 END IF;
 IF split_part(_name,'/',1) !~ '^[0-9a-fA-F-]{36}$' THEN RETURN false; END IF;
 ws:=split_part(_name,'/',1)::uuid;
 RETURN public.is_workspace_member(auth.uid(),ws) AND (EXISTS(SELECT 1 FROM public.uploaded_documents WHERE workspace_id=ws AND file_path=_name) OR (_owner=auth.uid() AND NOT EXISTS(SELECT 1 FROM public.uploaded_documents WHERE file_path=_name)));
END; $$;
REVOKE ALL ON FUNCTION public.can_read_company_file(text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_read_company_file(text,uuid) TO authenticated;
CREATE POLICY company_file_visibility ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated USING(bucket_id<>'company-docs' OR public.can_read_company_file(name,owner));
CREATE POLICY company_file_writer ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(bucket_id<>'company-docs' OR (owner=auth.uid() AND public.is_workspace_writer(auth.uid(),CASE WHEN split_part(name,'/',1)='notes' THEN split_part(name,'/',2)::uuid ELSE split_part(name,'/',1)::uuid END) AND lower(name) ~ '\.(pdf|doc|docx|xls|xlsx|csv|txt|md|json|xml|log|rtf|html|htm|png|jpg|jpeg|webp|gif|tiff|mp3|wav|m4a|ogg|ppt|pptx)$'));
CREATE POLICY company_file_delete_guard ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated USING(bucket_id<>'company-docs' OR (public.can_read_company_file(name,owner) AND public.is_workspace_writer(auth.uid(),CASE WHEN split_part(name,'/',1)='notes' THEN split_part(name,'/',2)::uuid ELSE split_part(name,'/',1)::uuid END)));
CREATE POLICY trusted_memory_events ON public.audit_events AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(event_type NOT LIKE 'memory.%' OR pg_trigger_depth()>0);
CREATE POLICY lesson_provenance_insert ON public.knowledge_items AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(created_by=auth.uid());