import { useWorkspace } from '@/contexts/WorkspaceContext';

export type WorkspaceRole = 'admin' | 'approver' | 'viewer';

/** Permission rules per workspace role */
export const PERMISSIONS = {
  // Decisions / proposals
  createProposal: ['admin', 'approver'] as WorkspaceRole[],
  createDecision: ['admin'] as WorkspaceRole[],
  approveDecision: ['admin', 'approver'] as WorkspaceRole[],
  rejectDecision: ['admin', 'approver'] as WorkspaceRole[],
  comment: ['admin', 'approver'] as WorkspaceRole[],

  // Meetings / recordings
  uploadRecording: ['admin', 'approver'] as WorkspaceRole[],
  deleteRecording: ['admin'] as WorkspaceRole[],

  // Team management
  inviteMember: ['admin'] as WorkspaceRole[],
  removeMember: ['admin'] as WorkspaceRole[],
  changeMemberRole: ['admin'] as WorkspaceRole[],

  // Workspace settings
  editWorkspace: ['admin'] as WorkspaceRole[],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(role: WorkspaceRole | null, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly WorkspaceRole[]).includes(role);
}

/** Hook: returns helper to check permissions against current workspace role */
export function usePermissions() {
  const { role } = useWorkspace();
  return {
    role: role as WorkspaceRole | null,
    can: (permission: Permission) => hasPermission(role as WorkspaceRole | null, permission),
    isAdmin: role === 'admin',
    isApprover: role === 'approver',
    isViewer: role === 'viewer',
  };
}

export const ROLE_LABELS: Record<WorkspaceRole, string> = {
  admin: 'Admin',
  approver: 'Approver',
  viewer: 'Viewer',
};
