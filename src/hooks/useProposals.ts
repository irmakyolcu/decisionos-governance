import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import type { Proposal, UserRole } from '@/types/decision';

const toUserRole = (r: string): UserRole => {
  if (['Employee', 'Manager', 'Executive', 'CEO', 'Board'].includes(r)) return r as UserRole;
  return 'Employee';
};

export function useProposals() {
  const { workspace } = useWorkspace();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProposals = useCallback(async () => {
    if (!workspace) {
      setProposals([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data: rows } = await supabase
      .from('proposals')
      .select('*')
      .eq('workspace_id', workspace.id)
      .order('created_at', { ascending: false });

    if (!rows) {
      setProposals([]);
      setLoading(false);
      return;
    }

    const userIds = Array.from(new Set(rows.map((r) => r.submitted_by)));
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, role, department')
      .in('user_id', userIds);

    const profMap = new Map<string, any>();
    profiles?.forEach((p) => profMap.set(p.user_id, p));

    const mapped: Proposal[] = rows.map((r: any) => {
      const p = profMap.get(r.submitted_by);
      return {
        id: r.id,
        title: r.title,
        description: r.description,
        submittedBy: {
          id: r.submitted_by,
          name: p?.display_name ?? 'Unknown',
          email: '',
          role: toUserRole(p?.role ?? 'Employee'),
          department: p?.department ?? '',
        },
        submittedAt: new Date(r.created_at),
        budget: Number(r.budget),
        status: r.status,
        department: r.department,
      };
    });

    setProposals(mapped);
    setLoading(false);
  }, [workspace]);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  const createProposal = async (input: {
    title: string;
    description: string;
    budget: number;
    department: string;
  }) => {
    if (!workspace) throw new Error('No workspace');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase.from('proposals').insert({
      workspace_id: workspace.id,
      title: input.title,
      description: input.description,
      budget: input.budget,
      department: input.department,
      submitted_by: user.id,
    });
    if (error) throw error;
    await fetchProposals();
  };

  const updateStatus = async (id: string, status: Proposal['status']) => {
    const { error } = await supabase.from('proposals').update({ status }).eq('id', id);
    if (error) throw error;
    await fetchProposals();
  };

  return { proposals, loading, refetch: fetchProposals, createProposal, updateStatus };
}
