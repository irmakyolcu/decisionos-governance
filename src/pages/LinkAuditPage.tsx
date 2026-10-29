import { useTable } from '@/hooks/useGovernance';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRecordCatalog } from '@/hooks/useRecordCatalog';
import { recordHref } from '@/lib/records';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { downloadRows } from '@/lib/stepAudit';
export default function LinkAuditPage(){const {t,locale}=useLanguage();const {rows,loading,error}=useTable<any>('audit_events');const {records}=useRecordCatalog();const events=rows.filter(r=>r.event_type.startsWith('memory.link.'));return <div className="space-y-6"><h1 className="page-title">{t('Link Audit Trail')}</h1><Button variant="outline" disabled={!events.length} onClick={()=>downloadRows(events,'csv','record-link-audit')}>{t('Export CSV')}</Button>{loading&&<p>{t('Loading…')}</p>}{error&&<p role="alert">{error}</p>}<ul className="divide-y divide-border">{events.map(e=><li key={e.id} className="py-4 space-y-2"><p>{new Date(e.created_at).toLocaleString(locale)} · {e.event_type} · {e.actor_user_id}</p><div className="flex flex-wrap gap-3">{(['source','target'] as const).map(side=>{const kind=e.metadata?.[side+'_kind'];const id=e.metadata?.[side+'_id'];const record=records.find(r=>r.id===id&&r.kind===kind);return record&&<Link key={side} className="text-primary underline" to={recordHref(kind,id)}>{record.title}</Link>;})}</div></li>)}</ul></div>;}
