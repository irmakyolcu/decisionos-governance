---
name: Multi-tenant workspace system
description: Workspace isolation, 3 roles (admin/approver/viewer), invite system, onboarding flow
type: feature
---
## Multi-Tenant Architecture
- `workspaces` table: company/tenant entity
- `workspace_members`: user↔workspace with role enum (admin, approver, viewer)
- `workspace_invites`: token-based email invites, 7-day expiry
- `workspace_id` added to `profiles` and `meeting_recordings`

## Roles
- **Admin**: Full access, can invite/remove members, change roles
- **Approver**: Can approve decisions (read + approve)
- **Viewer**: Read-only access

## Isolation
- RLS via `get_workspace_role()` and `get_user_workspace_id()` SECURITY DEFINER functions
- All data queries filtered by workspace membership
- Cross-tenant access impossible at DB level

## Onboarding Flow
1. Signup → OnboardingPage (create workspace) → Dashboard
2. Invite flow: Admin creates invite → copy link → invitee accepts at /invite?token=xxx

## Key Files
- `src/contexts/WorkspaceContext.tsx` — workspace state provider
- `src/pages/OnboardingPage.tsx` — workspace creation
- `src/pages/InvitePage.tsx` — invite acceptance
- `src/pages/TeamPage.tsx` — member/invite management
