CREATE POLICY "company_docs_select" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'company-docs' AND (storage.foldername(name))[1] IN (
    SELECT workspace_id::text FROM public.workspace_members WHERE user_id = auth.uid()
  )
);
CREATE POLICY "company_docs_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'company-docs' AND (storage.foldername(name))[1] IN (
    SELECT workspace_id::text FROM public.workspace_members WHERE user_id = auth.uid()
  )
);
CREATE POLICY "company_docs_delete" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'company-docs' AND owner = auth.uid()
);