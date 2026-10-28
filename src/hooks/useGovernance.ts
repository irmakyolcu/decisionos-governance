import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';

const db = supabase as any;

export function useTable<T = any>(table: string, orderBy: string = 'created_at', ascending = false) {
  const { workspace } = useWorkspace();
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);

  const refetch = useCallback(async () => {
    const version = ++request.current;
    setRows([]); setError(null);
    if (!workspace) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await db.from(table).select('*').eq('workspace_id', workspace.id).order(orderBy, { ascending });
    if (request.current !== version) return;
    setRows(error ? [] : data || []);
    setError(error?.message ?? null);
    setLoading(false);
  }, [workspace, table, orderBy, ascending]);

  useEffect(() => { refetch(); return () => { request.current++; }; }, [refetch]);
  return { rows, loading, error, refetch };
}

export async function logAudit(workspace_id: string, event_type: string, extra: Record<string, any> = {}) {
  await db.from('audit_events').insert({ workspace_id, event_type, ...extra });
}
