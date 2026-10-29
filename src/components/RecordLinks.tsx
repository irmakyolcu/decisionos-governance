import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRecordCatalog } from '@/hooks/useRecordCatalog';
import { canWriteMemory, recordHref, type RecordKind } from '@/lib/records';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link2, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
export function RecordLinks({ kind, id }: { kind: RecordKind; id: string }) {
  const { t } = useLanguage(); const { workspace, role } = useWorkspace();
  const { records, error: catalogError } = useRecordCatalog();
  const [links, setLinks] = useState<any[]>([]); const [target, setTarget] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true; setLinks([]); setError(null); setTarget('');
    if (!workspace) return;
    supabase.from('record_links').select('*').eq('workspace_id', workspace.id).or(`and(source_kind.eq.${kind},source_id.eq.${id}),and(target_kind.eq.${kind},target_id.eq.${id})`).then(({ data, error }) => { if (active) { setLinks(data ?? []); setError(error?.message ?? null); } });
    return () => { active = false; };
  }, [workspace?.id, kind, id, revision]);
  async function add() {
    if (!workspace || !target) return; setBusy(true);
    const [target_kind, target_id] = target.split(':');
    const { error } = await supabase.from('record_links').insert({ workspace_id: workspace.id, source_kind: kind, source_id: id, target_kind, target_id });
    setBusy(false); if (error) return toast.error(error.message); setTarget(''); setRevision(v => v + 1);
  }
  async function remove(linkId: string) { setBusy(true); const { error } = await supabase.from('record_links').delete().eq('id', linkId); setBusy(false); if (error) toast.error(error.message); else setRevision(v => v + 1); }
  const linked = links.map(l => { const forward = l.source_kind === kind && l.source_id === id; return { link: l, record: records.find(r => r.kind === (forward ? l.target_kind : l.source_kind) && r.id === (forward ? l.target_id : l.source_id)) }; });
  return <section className="space-y-3 border-t border-border pt-3" aria-label={t('km.related')}>
    <h3 className="text-sm font-medium flex items-center gap-2"><Link2 className="h-4 w-4" />{t('km.related')}</h3>
    {(error || catalogError) && <p role="alert" className="text-sm text-destructive">{error || catalogError}</p>}
    <div className="flex flex-wrap gap-2">{linked.map(({ link, record }) => record && <div key={link.id} className="flex items-center gap-1 text-sm"><Link className="text-primary underline" to={record.kind === 'step' ? `/processes?record=${record.parentId}&step=${record.id}` : recordHref(record.kind, record.id)}>{record.title}</Link>{canWriteMemory(role) && <Button variant="ghost" size="icon" disabled={busy} aria-label={t('Remove link')} onClick={() => remove(link.id)}><X className="h-3 w-3" /></Button>}</div>)}{links.length === 0 && <p className="text-xs text-muted-foreground">{t('km.noLinks')}</p>}</div>
    {canWriteMemory(role) && <div className="flex gap-2"><Select value={target} onValueChange={setTarget}><SelectTrigger className="min-w-0 flex-1"><SelectValue placeholder={t('km.selectRecord')} /></SelectTrigger><SelectContent>{records.filter(r => !(r.kind === kind && r.id === id) && !linked.some(l => l.record?.kind === r.kind && l.record.id === r.id)).map(r => <SelectItem key={`${r.kind}:${r.id}`} value={`${r.kind}:${r.id}`}>{t(`km.${r.kind}`)} · {r.title}</SelectItem>)}</SelectContent></Select><Button variant="outline" onClick={add} disabled={!target || busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}{t('Add')}</Button></div>}
  </section>;
}