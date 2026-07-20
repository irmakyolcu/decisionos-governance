import { useEffect, useState, useCallback } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';

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

export function useLessons() {
  const { workspace } = useWorkspace();
  const key = lessonsKey(workspace?.id);
  const [rows, setRows] = useState<Lesson[]>([]);

  const reload = useCallback(() => {
    const raw = localStorage.getItem(key);
    setRows(raw ? (JSON.parse(raw) as Lesson[]) : []);
  }, [key]);

  useEffect(() => { reload(); }, [reload]);

  const persist = useCallback((next: Lesson[]) => {
    setRows(next);
    localStorage.setItem(key, JSON.stringify(next));
    localStorage.setItem(`${key}:count`, String(next.length));
  }, [key]);

  const setLinks = useCallback((lessonId: string, decisionIds: string[]) => {
    const next = rows.map((r) => (r.id === lessonId ? { ...r, decisionIds } : r));
    persist(next);
  }, [rows, persist]);

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

// Simple keyword-overlap scoring (>=2 shared meaningful tokens counts as a match)
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
