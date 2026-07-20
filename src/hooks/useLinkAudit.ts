import { useCallback, useEffect, useState } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';

export type LinkAuditEntry = {
  id: string;
  at: string;               // ISO timestamp
  actorId: string | null;
  actorEmail: string | null;
  action: 'link' | 'unlink' | 'bulk_link' | 'bulk_unlink';
  lessonId: string;
  lessonTitle: string;
  decisionId: string;
  decisionTitle: string;
  source: 'manual' | 'suggestion' | 'auto_link_all';
};

export function auditKey(wsId?: string) {
  return wsId ? `mem:link-audit:${wsId}` : 'mem:link-audit';
}

export function useLinkAudit() {
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  const key = auditKey(workspace?.id);
  const [entries, setEntries] = useState<LinkAuditEntry[]>([]);

  const reload = useCallback(() => {
    const raw = localStorage.getItem(key);
    setEntries(raw ? (JSON.parse(raw) as LinkAuditEntry[]) : []);
  }, [key]);

  useEffect(() => {
    reload();
    const onStorage = (e: StorageEvent) => { if (e.key === key) reload(); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [reload, key]);

  const append = useCallback((rows: Omit<LinkAuditEntry, 'id' | 'at' | 'actorId' | 'actorEmail'>[]) => {
    if (rows.length === 0) return;
    const now = new Date().toISOString();
    const enriched: LinkAuditEntry[] = rows.map((r) => ({
      ...r,
      id: crypto.randomUUID(),
      at: now,
      actorId: user?.id ?? null,
      actorEmail: user?.email ?? null,
    }));
    const raw = localStorage.getItem(key);
    const current = raw ? (JSON.parse(raw) as LinkAuditEntry[]) : [];
    const next = [...enriched, ...current].slice(0, 2000); // cap
    localStorage.setItem(key, JSON.stringify(next));
    setEntries(next);
  }, [user, key]);

  const clear = useCallback(() => {
    localStorage.removeItem(key);
    setEntries([]);
  }, [key]);

  return { entries, append, reload, clear };
}

// Diff two link sets → list of {action, decisionId} changes
export function diffLinks(prev: string[] = [], next: string[] = []) {
  const p = new Set(prev), n = new Set(next);
  const added: string[] = [], removed: string[] = [];
  n.forEach((d) => { if (!p.has(d)) added.push(d); });
  p.forEach((d) => { if (!n.has(d)) removed.push(d); });
  return { added, removed };
}
