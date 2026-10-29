import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Json } from '@/integrations/supabase/types';
export function useWorkflow(projectId?: string) {
  const { workspace } = useWorkspace(); const cache = useQueryClient();
  const scope = workspace?.id;
  const query = useQuery({ queryKey: ['workflow', scope, projectId], enabled: !!scope, queryFn: async () => {
    if (!scope) throw new Error('Workspace required');
    let runsQuery = supabase.from('workflow_runs').select('*').eq('workspace_id', scope).order('created_at', { ascending: false });
    if (projectId) runsQuery = runsQuery.eq('project_id', projectId);
    const runs = await runsQuery; if (runs.error) throw runs.error;
    const ids = (runs.data ?? []).map(r => r.id);
    const [steps, tasks, deps, approvals, events, phases, participants, deliveries] = await Promise.all([
      supabase.from('workflow_steps').select('*').eq('workspace_id', scope).in('run_id', ids).order('position'),
      supabase.from('workflow_tasks').select('*').eq('workspace_id', scope).in('run_id', ids),
      supabase.from('workflow_dependencies').select('*').eq('workspace_id', scope),
      supabase.from('workflow_approvals').select('*').eq('workspace_id', scope).in('run_id', ids),
      supabase.from('workflow_events').select('*').eq('workspace_id', scope).in('run_id', ids).order('created_at', { ascending: false }).limit(100),
      supabase.from('project_phases').select('*').eq('workspace_id', scope).order('position'),
      supabase.from('project_participants').select('*').eq('workspace_id', scope),
      supabase.from('workflow_deliveries').select('*, notifications(read_at)').eq('workspace_id', scope).in('run_id', ids).order('created_at', { ascending: false }).limit(100),
    ]);
    for (const result of [steps,tasks,deps,approvals,events,phases,participants,deliveries]) if (result.error) throw result.error;
    const blockers = Object.fromEntries(await Promise.all((steps.data ?? []).map(async s => {
      const response = await supabase.rpc('workflow_blockers', { _step: s.id, _completion: true }); if (response.error) throw response.error;
      return [s.id, response.data ?? []];
    })));
    return { runs: runs.data ?? [], steps: steps.data ?? [], tasks: tasks.data ?? [], dependencies: deps.data ?? [], approvals: approvals.data ?? [], events: events.data ?? [], phases: phases.data ?? [], participants: participants.data ?? [], deliveries: deliveries.data ?? [], blockers };
  }});
  const [busy, setBusy] = useState(false);
  const command = useCallback(async (operation: string, run: string | null, step: string | null, payload: Json = {}) => {
    setBusy(true); try {
      const response = await supabase.rpc('workflow_apply', { _operation: operation, _run: run ?? undefined, _step: step ?? undefined, _payload: payload, _request: crypto.randomUUID() });
      if (response.error) throw response.error;
      await cache.invalidateQueries({ queryKey: ['workflow', scope] }); return response.data;
    } finally { setBusy(false); }
  }, [cache,scope]);
  useEffect(() => { if (!scope) return; const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void cache.invalidateQueries({queryKey:['workflow',scope]}); },30000); return () => window.clearInterval(timer); }, [scope,cache]);
  return { ...query, command, busy };
}