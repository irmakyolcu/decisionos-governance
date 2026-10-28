import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import type { Tables } from '@/integrations/supabase/types';

export function useNotifications() {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const userId = user?.id;
  const workspaceId = workspace?.id;
  const scope = `${userId ?? ''}:${workspaceId ?? ''}`;
  const activeScope = useRef(scope);
  activeScope.current = scope;
  const requestId = useRef(0);
  const [items, setItems] = useState<Tables<'notifications'>[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);

  const load = useCallback(async () => {
    if (!userId || !workspaceId) return;
    const request = ++requestId.current;
    setLoading(true);
    try {
      const [list, count] = await Promise.all([
        supabase.from('notifications').select('*').eq('user_id', userId).eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(50),
        supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('workspace_id', workspaceId).is('read_at', null),
      ]);
      if (activeScope.current !== scope || request !== requestId.current) return;
      if (list.error || count.error) { setError('notifications.loadError'); return; }
      setItems(list.data ?? []);
      setUnread(count.count ?? 0);
      setError(null);
    } catch {
      if (activeScope.current === scope && request === requestId.current) setError('notifications.loadError');
    } finally {
      if (activeScope.current === scope && request === requestId.current) setLoading(false);
    }
  }, [userId, workspaceId, scope]);

  useEffect(() => {
    setItems([]); setUnread(0); setError(null); setLoading(false);
    if (!userId || !workspaceId) return;
    void load();
    const channel = supabase.channel(`notifications-${userId}-${workspaceId}-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, () => { void load(); })
      .subscribe();
    const refreshOnFocus = () => { if (document.visibilityState === 'visible') void load(); };
    document.addEventListener('visibilitychange', refreshOnFocus);
    // Polling is a fallback when live updates temporarily disconnect.
    const timer = window.setInterval(refreshOnFocus, 30000);
    return () => {
      ++requestId.current;
      void supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', refreshOnFocus);
      window.clearInterval(timer);
    };
  }, [userId, workspaceId, load]);

  const markRead = useCallback(async (id?: string) => {
    if (!userId || !workspaceId) return;
    setMarking(true);
    try {
      const { error: rpcError } = await supabase.rpc('mark_notifications_read', {
        _workspace_id: workspaceId,
        ...(id ? { _notification_id: id } : {}),
      });
      if (activeScope.current !== scope) return;
      if (rpcError) { setError('notifications.readError'); return; }
      await load();
    } catch {
      if (activeScope.current === scope) setError('notifications.readError');
    } finally {
      if (activeScope.current === scope) setMarking(false);
    }
  }, [userId, workspaceId, scope, load]);

  return { items, unread, loading, error, marking, load, markRead };
}