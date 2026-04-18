# Project Memory

## Core
DecisionOS: corporate decision governance system.
Tech Stack: Supabase (via Lovable Cloud) for db, auth, storage.
Multi-tenant: workspace isolation with 3 roles (admin/approver/viewer).
Enterprise SaaS aesthetic (Salesforce/Oracle style), professional neutral palette.
Post-approval records are locked/immutable. Comments are append-only.

## Memories
- [Role Hierarchy](mem://auth/hierarchy) — Strict 5-level hierarchy and upwards-inclusive visibility rules
- [Budget Limits](mem://governance/budget-limits) — Authority limits per role and automatic escalation rules
- [Approval Rules](mem://governance/approval-rules) — Proposal evaluation, execution requirements, and record locking
- [Design Direction](mem://style/design-direction) — Enterprise SaaS aesthetic, card metrics, and authority color-coding
- [AI Evaluation](mem://features/ai-evaluation) — AI metrics, impact calculations, and authority limitations
- [Global Search](mem://features/global-search) — Search capabilities and strict role-based filtering
- [Analytics Dashboard](mem://features/analytics) — Outcome tracking categories and dashboard metrics
- [Meeting Records](mem://features/meetings) — Exec/Board sessions, agenda linking, and file uploads
- [RBAC Permissions](mem://features/permissions) — usePermissions hook, PermissionGate, action gating per workspace role
- [Multi-Tenant](mem://features/multi-tenant) — Workspace isolation, roles, invite system, onboarding flow
