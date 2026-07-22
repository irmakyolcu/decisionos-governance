
CREATE TABLE public.note_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  note_id uuid NOT NULL REFERENCES public.company_notes(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX note_attachments_note_idx ON public.note_attachments(note_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.note_attachments TO authenticated;
GRANT ALL ON public.note_attachments TO service_role;

ALTER TABLE public.note_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members view note attachments" ON public.note_attachments
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "members insert note attachments" ON public.note_attachments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) AND uploaded_by = auth.uid());

CREATE POLICY "owner or admin delete note attachments" ON public.note_attachments
  FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid() OR public.is_workspace_admin(auth.uid(), workspace_id));

-- Storage policies for company-docs bucket, notes/ prefix, scoped by workspace membership
CREATE POLICY "members read note files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'company-docs'
    AND (storage.foldername(name))[1] = 'notes'
    AND public.is_workspace_member(auth.uid(), ((storage.foldername(name))[2])::uuid)
  );

CREATE POLICY "members upload note files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'company-docs'
    AND (storage.foldername(name))[1] = 'notes'
    AND public.is_workspace_member(auth.uid(), ((storage.foldername(name))[2])::uuid)
    AND owner = auth.uid()
  );

CREATE POLICY "owner or admin delete note files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'company-docs'
    AND (storage.foldername(name))[1] = 'notes'
    AND (owner = auth.uid() OR public.is_workspace_admin(auth.uid(), ((storage.foldername(name))[2])::uuid))
  );
