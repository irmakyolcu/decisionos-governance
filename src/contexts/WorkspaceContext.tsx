import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Workspace {
  id: string;
  name: string;
  created_by: string;
}

interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: 'admin' | 'approver' | 'viewer';
  joined_at: string;
}

interface WorkspaceContextType {
  workspace: Workspace | null;
  membership: WorkspaceMember | null;
  role: 'admin' | 'approver' | 'viewer' | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  workspace: null,
  membership: null,
  role: null,
  loading: true,
  refetch: async () => {},
});

export const useWorkspace = () => useContext(WorkspaceContext);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [membership, setMembership] = useState<WorkspaceMember | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchWorkspace = async () => {
    if (!user) {
      setWorkspace(null);
      setMembership(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Get user's workspace membership
    const { data: memberData, error: memberError } = await supabase
      .from('workspace_members')
      .select('*')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (memberError || !memberData) {
      setWorkspace(null);
      setMembership(null);
      setLoading(false);
      return;
    }

    setMembership(memberData as WorkspaceMember);

    // Get workspace details
    const { data: wsData } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', memberData.workspace_id)
      .single();

    if (wsData) {
      setWorkspace(wsData as Workspace);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchWorkspace();
  }, [user]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspace,
        membership,
        role: membership?.role ?? null,
        loading,
        refetch: fetchWorkspace,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
