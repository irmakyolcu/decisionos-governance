import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import type { Meeting, UserRole } from '@/types/decision';

const toUserRole = (r: string): UserRole => {
  if (['Employee', 'Manager', 'Executive', 'CEO', 'Board'].includes(r)) return r as UserRole;
  return 'Employee';
};

export function useMeetings() {
  const { workspace } = useWorkspace();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMeetings = useCallback(async () => {
    if (!workspace) {
      setMeetings([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data: rows } = await supabase
      .from('meetings')
      .select('*, agenda_items(*), meeting_attendees(user_id)')
      .eq('workspace_id', workspace.id)
      .order('date', { ascending: false });

    if (!rows) {
      setMeetings([]);
      setLoading(false);
      return;
    }

    const userIds = new Set<string>();
    rows.forEach((m: any) => {
      if (m.chairperson_id) userIds.add(m.chairperson_id);
      m.meeting_attendees?.forEach((a: any) => userIds.add(a.user_id));
      m.agenda_items?.forEach((a: any) => a.presenter_id && userIds.add(a.presenter_id));
    });

    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, role, department')
      .in('user_id', Array.from(userIds));

    const profMap = new Map<string, any>();
    profiles?.forEach((p) => profMap.set(p.user_id, p));

    const toUser = (id: string) => {
      const p = profMap.get(id);
      return {
        id,
        name: p?.display_name ?? 'Unknown',
        email: '',
        role: toUserRole(p?.role ?? 'Employee'),
        department: p?.department ?? '',
      };
    };

    const mapped: Meeting[] = rows.map((m: any) => {
      const startMins = (m.start_time as string).split(':').reduce((a, b) => Number(a) * 60 + Number(b), 0);
      const endMins = (m.end_time as string).split(':').reduce((a, b) => Number(a) * 60 + Number(b), 0);
      return {
        id: m.id,
        title: m.title,
        date: new Date(m.date),
        startTime: m.start_time,
        endTime: m.end_time,
        duration: Math.max(0, endMins - startMins),
        location: m.location,
        chairperson: m.chairperson_id ? toUser(m.chairperson_id) : toUser(''),
        attendees: (m.meeting_attendees ?? []).map((a: any) => toUser(a.user_id)),
        agenda: (m.agenda_items ?? [])
          .sort((a: any, b: any) => a.sort_order - b.sort_order)
          .map((a: any) => ({
            id: a.id,
            title: a.title,
            duration: a.duration,
            presenter: a.presenter_id ? toUser(a.presenter_id) : undefined,
            description: a.description ?? undefined,
            linkedDecisionId: a.linked_decision_id ?? undefined,
          })),
        decisions: [], // populated by caller if needed
        isApproved: m.is_approved,
        approvedAt: m.approved_at ? new Date(m.approved_at) : undefined,
      };
    });

    setMeetings(mapped);
    setLoading(false);
  }, [workspace]);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  const createMeeting = async (input: {
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    location: string;
  }) => {
    if (!workspace) throw new Error('No workspace');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase.from('meetings').insert({
      workspace_id: workspace.id,
      title: input.title,
      date: input.date,
      start_time: input.startTime,
      end_time: input.endTime,
      location: input.location,
      chairperson_id: user.id,
    });
    if (error) throw error;
    await fetchMeetings();
  };

  return { meetings, loading, refetch: fetchMeetings, createMeeting };
}
