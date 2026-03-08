import { UserRole, Decision, Proposal } from '@/types/decision';

const ROLE_LEVELS: Record<UserRole, number> = {
  Employee: 0,
  Manager: 1,
  Executive: 2,
  CEO: 3,
  Board: 4,
};

/** Roles at or below the viewer's level */
export function getVisibleRoles(viewerRole: UserRole): UserRole[] {
  const level = ROLE_LEVELS[viewerRole];
  return (Object.entries(ROLE_LEVELS) as [UserRole, number][])
    .filter(([, l]) => l <= level)
    .map(([r]) => r);
}

/** Filter decisions the viewer can see (created by their level or below) */
export function filterDecisionsByRole(decisions: Decision[], viewerRole: UserRole): Decision[] {
  const visibleRoles = getVisibleRoles(viewerRole);
  return decisions.filter(d => visibleRoles.includes(d.createdBy.role));
}

/** Filter proposals the viewer can see */
export function filterProposalsByRole(proposals: Proposal[], viewerRole: UserRole): Proposal[] {
  const visibleRoles = getVisibleRoles(viewerRole);
  return proposals.filter(p => visibleRoles.includes(p.submittedBy.role));
}

export function getRoleLevel(role: UserRole): number {
  return ROLE_LEVELS[role];
}

export const ALL_ROLES: UserRole[] = ['Employee', 'Manager', 'Executive', 'CEO', 'Board'];
