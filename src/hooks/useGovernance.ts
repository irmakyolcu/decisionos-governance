import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';

const db = supabase as any;

export function useTable<T = any>(table: string, orderBy: string = 'created_at', ascending = false) {
  const { workspace } = useWorkspace();
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!workspace) return;
    setLoading(true);
    const { data, error } = await db.from(table).select('*').eq('workspace_id', workspace.id).order(orderBy, { ascending });
    if (!error) setRows(data || []);
    setLoading(false);
  }, [workspace, table, orderBy, ascending]);

  useEffect(() => { refetch(); }, [refetch]);
  return { rows, loading, refetch };
}

export async function logAudit(workspace_id: string, event_type: string, extra: Record<string, any> = {}) {
  await db.from('audit_events').insert({ workspace_id, event_type, ...extra });
}
