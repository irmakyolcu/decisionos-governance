---
name: Role-based permissions (RBAC)
description: PERMISSIONS map, usePermissions hook, PermissionGate/ReadOnlyNotice for action gating in UI
type: feature
---
## Permission System
Defined in `src/lib/permissions.ts` as a static `PERMISSIONS` map keyed by action → allowed workspace roles.

## Roles
- **Admin**: all permissions
- **Approver**: createProposal, approveDecision, rejectDecision, comment, uploadRecording (no invite/remove members, no delete recordings, no edit workspace)
- **Viewer**: read-only — no actions allowed

## API
- `usePermissions()` → `{ role, can(perm), isAdmin, isApprover, isViewer }`
- `<PermissionGate permission="x">...</PermissionGate>` — hides children if no permission
- `<ReadOnlyNotice message="..." />` — banner shown to viewers/approvers when an action is unavailable

## Where applied
- `ApprovalsPage`: approve/reject buttons gated on `approveDecision`
- `DecisionReviewPage`: approve/reject buttons + comment input gated
- `MeetingRecordings`: upload button (`uploadRecording`), delete button (`deleteRecording`)
- `TeamPage`: invite/remove/role-change already admin-only; banner added for non-admins
- `TopBar`: shows current role badge (Admin/Approver/Viewer) next to user name
