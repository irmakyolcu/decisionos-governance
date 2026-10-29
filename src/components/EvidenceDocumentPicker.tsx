import { useTable } from '@/hooks/useGovernance';
import { useLanguage } from '@/contexts/LanguageContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
export function EvidenceDocumentPicker({ value, onChange }: { value: string; onChange: (id: string)=>void }) {
  const {t}=useLanguage();const {rows,loading,error}=useTable<any>('uploaded_documents');
  return <div><Label>{t('km.document')}</Label><Select value={value||'none'} onValueChange={v=>onChange(v==='none'?'':v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">{t('None')}</SelectItem>{rows.map(d=><SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>)}</SelectContent></Select>{loading&&<p>{t('Loading…')}</p>}{error&&<p role="alert" className="text-destructive">{error}</p>}</div>;
}