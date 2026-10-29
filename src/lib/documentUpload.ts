import { supabase } from '@/integrations/supabase/client';
import { validateDocument, validateSignature } from '../../supabase/functions/_shared/documentRules';
export async function uploadDocument(workspaceId: string, userId: string, file: File, title: string, confidentiality: string, projectId?: string, pastedContent = '') {
  const extension = validateDocument(file.name, file.size);
  validateSignature(extension, new Uint8Array(await file.slice(0,4096).arrayBuffer()));
  const path = `${workspaceId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
  const { error: storageError } = await supabase.storage.from('company-docs').upload(path, file);
  if (storageError) throw storageError;
  const { data, error } = await supabase.from('uploaded_documents').insert({ workspace_id: workspaceId, created_by: userId, title, file_path: path, mime_type: file.type || 'application/octet-stream', confidentiality: confidentiality as any, related_project_id: projectId || null, content_text: pastedContent, process_status: 'uploaded', metadata: { original_name: file.name, size_bytes: file.size } }).select().single();
  if (error) { await supabase.storage.from('company-docs').remove([path]); throw error; }
  const { data: result, error: ingestError } = await supabase.functions.invoke('ingest-document', { body: { document_id: data.id } });
  return { doc: data, extractionError: ingestError?.message || result?.error || null };
}