import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import type { Decision, UserRole } from '@/types/decision';

interface ProfileLite {
  user_id: string;
  display_name: string | null;
  role: string;
  department: string | null;
  avatar_url: string | null;
}

interface EvaluatingState {
  startedAt: Date;
}

const toUserRole = (r: string): UserRole => {
  if (['Employee', 'Manager', 'Executive', 'CEO', 'Board'].includes(r)) return r as UserRole;
  return 'Employee';
};

const profileToUser = (p: ProfileLite | undefined, fallbackId: string) => ({
  id: fallbackId,
  name: p?.display_name ?? 'Unknown',
  email: '',
  role: toUserRole(p?.role ?? 'Employee'),
  department: p?.department ?? '',
  avatarUrl: p?.avatar_url ?? undefined,
});

export function useDecisions() {
  const { workspace } = useWorkspace();
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [evaluatingStates, setEvaluatingStates] = useState<Map<string, EvaluatingState>>(new Map());

  const fetchDecisions = useCallback(async () => {
    if (!workspace) {
      setDecisions([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data: rows } = await supabase
      .from('decisions')
      .select('*, decision_pros_cons(*), decision_comments(*), decision_approvals(*), ai_evaluations(*)')
      .eq('workspace_id', workspace.id)
      .order('created_at', { ascending: false });

    if (!rows) {
      setDecisions([]);
      setLoading(false);
      return;
    }

    // Collect all user_ids referenced
    const userIds = new Set<string>();
    rows.forEach((r: any) => {
      userIds.add(r.created_by);
      r.decision_pros_cons?.forEach((pc: any) => userIds.add(pc.added_by));
      r.decision_comments?.forEach((c: any) => userIds.add(c.author_id));
      r.decision_approvals?.forEach((a: any) => userIds.add(a.user_id));
    });

    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, role, department, avatar_url')
      .in('user_id', Array.from(userIds));

    const profMap = new Map<string, ProfileLite>();
    profiles?.forEach((p) => profMap.set(p.user_id, p as ProfileLite));

    const mapped: Decision[] = rows.map((r: any) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      problemStatement: r.problem_statement,
      optionsConsidered: Array.isArray(r.options_considered) ? r.options_considered : [],
      budget: Number(r.budget),
      riskLevel: r.risk_level,
      status: r.status,
      createdBy: profileToUser(profMap.get(r.created_by), r.created_by),
      createdAt: new Date(r.created_at),
      meetingId: r.meeting_id ?? undefined,
      outcomeStatus: r.outcome_status ?? undefined,
      successCriteria: r.success_criteria ?? undefined,
      pros: (r.decision_pros_cons ?? [])
        .filter((pc: any) => pc.type === 'pro')
        .map((pc: any) => ({
          id: pc.id,
          type: 'pro' as const,
          description: pc.description,
          addedBy: profileToUser(profMap.get(pc.added_by), pc.added_by),
          timestamp: new Date(pc.created_at),
        })),
      cons: (r.decision_pros_cons ?? [])
        .filter((pc: any) => pc.type === 'con')
        .map((pc: any) => ({
          id: pc.id,
          type: 'con' as const,
          description: pc.description,
          addedBy: profileToUser(profMap.get(pc.added_by), pc.added_by),
          timestamp: new Date(pc.created_at),
        })),
      comments: (r.decision_comments ?? []).map((c: any) => ({
        id: c.id,
        author: profileToUser(profMap.get(c.author_id), c.author_id),
        content: c.content,
        timestamp: new Date(c.created_at),
      })),
      approvers: (r.decision_approvals ?? []).map((a: any) =>
        profileToUser(profMap.get(a.user_id), a.user_id)
      ),
      approvalTimestamps: (r.decision_approvals ?? []).map((a: any) => ({
        userId: a.user_id,
        timestamp: new Date(a.approved_at),
      })),
      aiEvaluation: r.ai_evaluations?.[0]
        ? {
            id: r.ai_evaluations[0].id,
            decisionId: r.id,
            changePercentage: Number(r.ai_evaluations[0].change_percentage),
            budgetChange: Number(r.ai_evaluations[0].budget_change),
            timelineChange: Number(r.ai_evaluations[0].timeline_change),
            riskChange: Number(r.ai_evaluations[0].risk_change),
            expectedROI: Number(r.ai_evaluations[0].expected_roi),
            riskAdjustedROI: Number(r.ai_evaluations[0].risk_adjusted_roi),
            breakEvenMonths: r.ai_evaluations[0].break_even_months,
            expectedValue: Number(r.ai_evaluations[0].expected_value),
            summary: r.ai_evaluations[0].summary,
            impactBreakdown: r.ai_evaluations[0].impact_breakdown ?? [],
            evaluatedAt: new Date(r.ai_evaluations[0].evaluated_at),
          }
        : undefined,
    }));

    setDecisions(mapped);
    setLoading(false);
  }, [workspace]);

  useEffect(() => {
    fetchDecisions();
  }, [fetchDecisions]);

  const createDecision = async (input: {
    title: string;
    description: string;
    problemStatement?: string;
    budget: number;
    riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
    status?: 'Draft' | 'Pending' | 'Under Review';
  }) => {
    if (!workspace) throw new Error('No workspace');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: inserted, error } = await supabase
      .from('decisions')
      .insert({
        workspace_id: workspace.id,
        title: input.title,
        description: input.description,
        problem_statement: input.problemStatement ?? '',
        budget: input.budget,
        risk_level: input.riskLevel,
        status: input.status ?? 'Draft',
        created_by: user.id,
      })
      .select('id')
      .single();
    if (error) throw error;

    // Fire-and-forget AI evaluation (don't block UI on AI latency)
    if (inserted?.id) {
      setEvaluatingStates(prev => {
        const next = new Map(prev);
        next.set(inserted.id, { startedAt: new Date() });
        return next;
      });
      supabase.functions
        .invoke('evaluate-decision', { body: { decisionId: inserted.id } })
        .then(({ error: fnErr }) => {
          if (fnErr) console.error('AI evaluation failed:', fnErr);
          setEvaluatingStates(prev => {
            const next = new Map(prev);
            next.delete(inserted.id);
            return next;
          });
          fetchDecisions();
        });
    }

    await fetchDecisions();
  };

  const evaluateDecision = async (decisionId: string) => {
    setEvaluatingStates(prev => {
      const next = new Map(prev);
      next.set(decisionId, { startedAt: new Date() });
      return next;
    });
    const { error } = await supabase.functions.invoke('evaluate-decision', {
      body: { decisionId },
    });
    setEvaluatingStates(prev => {
      const next = new Map(prev);
      next.delete(decisionId);
      return next;
    });
    if (error) throw error;
    await fetchDecisions();
  };

  const addComment = async (decisionId: string, content: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { error } = await supabase.from('decision_comments').insert({
      decision_id: decisionId,
      author_id: user.id,
      content,
    });
    if (error) throw error;
    await fetchDecisions();
  };

  const addProCon = async (decisionId: string, type: 'pro' | 'con', description: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { error } = await supabase.from('decision_pros_cons').insert({
      decision_id: decisionId,
      type,
      description,
      added_by: user.id,
    });
    if (error) throw error;
    await fetchDecisions();
  };

  const approveDecision = async (decisionId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { error } = await supabase.from('decision_approvals').insert({
      decision_id: decisionId,
      user_id: user.id,
    });
    if (error) throw error;
    await supabase.from('decisions').update({ status: 'Approved' }).eq('id', decisionId);
    await fetchDecisions();
  };

  const updateStatus = async (decisionId: string, status: Decision['status']) => {
    const { error } = await supabase.from('decisions').update({ status }).eq('id', decisionId);
    if (error) throw error;
    await fetchDecisions();
  };

  return {
    decisions,
    loading,
    refetch: fetchDecisions,
    evaluatingStates,
    createDecision,
    addComment,
    addProCon,
    approveDecision,
    updateStatus,
    evaluateDecision,
  };
}
