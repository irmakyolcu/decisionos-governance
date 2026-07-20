import { useEffect, useState, useCallback } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { memoryDecisions } from '@/data/ceoTwin';
import { diffLinks, type LinkAuditEntry } from './useLinkAudit';

export type Lesson = {
  id: string;
  title: string;
  context: string;
  what_worked: string;
  what_failed: string;
  recommendation: string;
  category: string;
  impact: 'positive' | 'negative' | 'mixed';
  source: string;
  created_at: string;
  decisionIds?: string[];
};

export function lessonsKey(wsId?: string) {
  return wsId ? `mem:lessons:${wsId}` : 'mem:lessons';
}
function auditKeyFor(wsId?: string) {
  return wsId ? `mem:link-audit:${wsId}` : 'mem:link-audit';
}

export type LinkChangeSource = 'manual' | 'suggestion' | 'auto_link_all';

export function useLessons() {
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  const key = lessonsKey(workspace?.id);
  const aKey = auditKeyFor(workspace?.id);
  const [rows, setRows] = useState<Lesson[]>([]);

  const reload = useCallback(() => {
    const raw = localStorage.getItem(key);
    setRows(raw ? (JSON.parse(raw) as Lesson[]) : []);
  }, [key]);

  useEffect(() => { reload(); }, [reload]);

  const writeAudit = useCallback((rowsToAdd: Omit<LinkAuditEntry, 'id' | 'at' | 'actorId' | 'actorEmail'>[]) => {
    if (rowsToAdd.length === 0) return;
    const now = new Date().toISOString();
    const enriched: LinkAuditEntry[] = rowsToAdd.map((r) => ({
      ...r,
      id: crypto.randomUUID(),
      at: now,
      actorId: user?.id ?? null,
      actorEmail: user?.email ?? null,
    }));
    const raw = localStorage.getItem(aKey);
    const current = raw ? (JSON.parse(raw) as LinkAuditEntry[]) : [];
    localStorage.setItem(aKey, JSON.stringify([...enriched, ...current].slice(0, 2000)));
    // trigger storage event listeners in same tab
    window.dispatchEvent(new StorageEvent('storage', { key: aKey }));
  }, [aKey, user]);

  const persist = useCallback((next: Lesson[]) => {
    setRows(next);
    localStorage.setItem(key, JSON.stringify(next));
    localStorage.setItem(`${key}:count`, String(next.length));
  }, [key]);

  const decisionTitle = useCallback((id: string) => memoryDecisions.find((d) => d.id === id)?.title ?? id, []);

  const setLinks = useCallback((lessonId: string, decisionIds: string[], source: LinkChangeSource = 'manual') => {
    const lesson = rows.find((r) => r.id === lessonId);
    if (!lesson) return;
    const { added, removed } = diffLinks(lesson.decisionIds ?? [], decisionIds);
    const next = rows.map((r) => (r.id === lessonId ? { ...r, decisionIds } : r));
    persist(next);
    const audit: Omit<LinkAuditEntry, 'id' | 'at' | 'actorId' | 'actorEmail'>[] = [
      ...added.map((did) => ({
        action: 'link' as const, source, lessonId, lessonTitle: lesson.title,
        decisionId: did, decisionTitle: decisionTitle(did),
      })),
      ...removed.map((did) => ({
        action: 'unlink' as const, source: 'manual' as const, lessonId, lessonTitle: lesson.title,
        decisionId: did, decisionTitle: decisionTitle(did),
      })),
    ];
    writeAudit(audit);
  }, [rows, persist, writeAudit, decisionTitle]);

  const toggleLink = useCallback((lessonId: string, decisionId: string) => {
    const lesson = rows.find((r) => r.id === lessonId);
    if (!lesson) return;
    const current = new Set(lesson.decisionIds ?? []);
    if (current.has(decisionId)) current.delete(decisionId);
    else current.add(decisionId);
    setLinks(lessonId, [...current]);
  }, [rows, setLinks]);

  return { rows, persist, reload, setLinks, toggleLink };
}

// Simple keyword-overlap scoring
const STOP = new Set(['the','a','an','and','or','of','to','in','for','on','with','is','are','was','were','be','by','it','this','that','from','at','as','we','our','you','not','no','yes','but','if','so','then','than','over','under','into','out','about','after','before','when','while','more','less','can','will','would','should','could','may','might','use','used','using','via','per','&']);

export function tokenize(s: string): string[] {
  return (s || '').toLowerCase().replace(/[^a-z0-9çğıöşü\s-]/gi, ' ').split(/\s+/)
    .filter((t) => t.length > 2 && !STOP.has(t));
}

export function scoreMatch(lessonText: string, decisionText: string): number {
  const a = new Set(tokenize(lessonText));
  const b = new Set(tokenize(decisionText));
  let overlap = 0;
  a.forEach((t) => { if (b.has(t)) overlap += 1; });
  return overlap;
}
