import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { RECORD_TABLES, type RecordKind } from '@/lib/records';
export type CatalogRecord = { id: string; kind: RecordKind; title: string; content: string; parentId?: string };
export function useRecordCatalog() {
  const { workspace } = useWorkspace();
  const [records, setRecords] = useState<CatalogRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true; setRecords([]); setError(null);
    if (!workspace) { setLoading(false); return; }
    setLoading(true);
    Promise.all(Object.entries(RECORD_TABLES).map(async ([kind, table]) => {
      let query = supabase.from(table).select('*').eq('workspace_id', workspace.id);
      if (kind === 'lesson') query = query.eq('entity_type', 'lesson');
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).flatMap((row: any): CatalogRecord[] => {
        const record = { id: row.id, kind: kind as RecordKind, title: row.title ?? row.name ?? row.source ?? row.summary ?? row.id, content: [row.description, row.content, row.summary, row.problem_statement, row.rationale, row.expected_outcomes].filter(Boolean).join(' ') };
        return kind === 'process' ? [record, ...(Array.isArray(row.steps) ? row.steps : []).filter((s: any) => s.id).map((s: any) => ({ id: s.id, kind: 'step' as const, title: `${row.name} · ${s.title}`, content: '', parentId: row.id }))] : [record];
      });
    })).then(groups => { if (active) setRecords(groups.flat()); }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [workspace?.id]);
  return { records, loading, error };
}