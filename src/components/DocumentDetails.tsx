import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { canWriteMemory } from '@/lib/records';
import { RecordLinks } from '@/components/RecordLinks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
export function DocumentDetails({ doc, reload }: { doc: any; reload: () => void }) {
  const { t, locale } = useLanguage(); const { role } = useWorkspace();
  const [title,setTitle]=useState(doc.title);const [category,setCategory]=useState(doc.category??'');const [confidentiality,setConfidentiality]=useState(doc.confidentiality);
  const [consent,setConsent]=useState(false);const [busy,setBusy]=useState(false);
  async function save(){setBusy(true);const {error}=await supabase.from('uploaded_documents').update({title,category,confidentiality}).eq('id',doc.id);setBusy(false);if(error)toast.error(error.message);else reload();}
  async function extract(){setBusy(true);const {data,error}=await supabase.functions.invoke('ingest-document',{body:{document_id:doc.id,allow_external_ai:consent}});setBusy(false);if(error||data?.error)toast.error(error?.message||data.error);reload();}
  async function download(){const {data,error}=await supabase.storage.from('company-docs').download(doc.file_path);if(error||!data)return toast.error(error?.message??'Error');const url=URL.createObjectURL(data);const a=document.createElement('a');a.href=url;a.download=doc.metadata?.original_name??doc.title;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  async function remove(){if(!window.confirm(t("km.deleteDocument")))return;setBusy(true);const {error}=await supabase.from("uploaded_documents").delete().eq("id",doc.id).select("id");setBusy(false);if(error)toast.error(error.message);else reload();}
  return <details className="w-full space-y-3" id={`record-${doc.id}`}><summary className="cursor-pointer font-medium">{doc.title} · {t(doc.process_status)}</summary><div className="space-y-3 pt-3 text-sm">
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted-foreground"><div>{t('Date')}: {new Date(doc.created_at).toLocaleString(locale)}</div><div>{t('Owner')}: {doc.created_by}</div><div>{t('Source')}: {t(doc.source_kind)}</div><div>{t('Confidentiality')}: {t(doc.confidentiality)}</div><div>{t('Status')}: {t(doc.process_status)} · {doc.extraction_attempts}</div><div>{doc.mime_type} · {doc.metadata?.size_bytes??'—'} B</div></dl>
    {doc.extraction_error&&<p role="alert" className="text-destructive">{doc.extraction_error==='External AI extraction consent required'?t('km.externalConsent'):doc.extraction_error==='Unsupported content extraction; original preserved'?t('km.unsupported'):doc.extraction_error}</p>}
    {doc.file_path&&<Button variant="outline" onClick={download}><Download className="h-4 w-4 mr-2"/>{t('Download')}</Button>}
    {canWriteMemory(role)&&<><div><Label>{t('Title')}</Label><Input value={title} onChange={e=>setTitle(e.target.value)}/></div><div><Label>{t('km.category')}</Label><Input value={category} onChange={e=>setCategory(e.target.value)}/></div><Select value={confidentiality} onValueChange={setConfidentiality}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{['public_internal','internal','confidential','highly_confidential'].map(c=><SelectItem key={c} value={c}>{t(c)}</SelectItem>)}</SelectContent></Select><Button disabled={busy||!title.trim()} onClick={save}>{t('Save')}</Button><label className="flex items-start gap-2"><Checkbox checked={consent} onCheckedChange={v=>setConsent(v===true)}/>{t('km.externalConsent')}</label><Button variant="outline" disabled={busy||doc.process_status==='processing'} onClick={extract}><RefreshCw className="h-4 w-4 mr-2"/>{t('km.extract')}</Button></>}
    {role==='admin'&&<Button variant="destructive" disabled={busy} onClick={remove}>{t("Delete")}</Button>}
    <RecordLinks kind="document" id={doc.id}/>
  </div></details>;
}