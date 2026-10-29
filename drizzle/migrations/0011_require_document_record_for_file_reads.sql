CREATE OR REPLACE FUNCTION public.can_read_company_file(_name text,_owner uuid) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=public AS $$ DECLARE ws uuid; BEGIN
 IF split_part(_name,'/',1)='notes' THEN
 IF split_part(_name,'/',2) !~ '^[0-9a-fA-F-]{36}$' THEN RETURN false; END IF; ws:=split_part(_name,'/',2)::uuid;
 RETURN public.is_workspace_member(auth.uid(),ws) AND EXISTS(SELECT 1 FROM public.note_attachments WHERE workspace_id=ws AND storage_path=_name);
 END IF;
 IF split_part(_name,'/',1) !~ '^[0-9a-fA-F-]{36}$' THEN RETURN false; END IF;ws:=split_part(_name,'/',1)::uuid;
 RETURN public.is_workspace_member(auth.uid(),ws) AND EXISTS(SELECT 1 FROM public.uploaded_documents WHERE workspace_id=ws AND file_path=_name);
 END; $$;