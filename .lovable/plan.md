# DecisionOS → Governed AI Decision & Execution Platform

This is a very large upgrade (28 sections, ~30 new tables, ~12 new top-level modules, multiple agents, policy engine, execution engine, audit ledger). It cannot be shipped in one turn responsibly. I'll deliver it in three phases as the brief itself instructs (Section 26). Phase 1 only in this round; Phase 2 and 3 after you review Phase 1.

The existing DecisionOS visuals, sidebar, Supabase schema, decisions/meetings/proposals/voice/CEO-twin features stay intact. New modules are added alongside, not on top.

---

## Core principle wired into the system
AI prepares. Humans approve. Approved decisions ≠ approved execution. Two separate approval tracks. No agent ever executes — only the deterministic Execution Engine does, and only after policy + approvals pass.

---

## Phase 1 — what I will build now

### New database tables (Supabase, multi-tenant via existing `workspace_id`, RLS + GRANTs)
- `decision_alternatives` — options per decision (cost, value, risk, confidence, reversibility)
- `decision_evidence` — source, reliability, supports/contradicts which option, verified flag
- `decision_assumptions` — assumption text, confidence, status
- `decision_unknowns` — missing-info items blocking the decision
- `decision_recommendations` — AI recommendation, rationale, confidence, invalidation conditions
- `decision_scenarios` — best/base/worst/do-nothing with editable assumptions
- `action_proposals` — the structured Action Proposal object from Section 11 (authority_level, risk, target_system, payload, content_hash, version, expires_at, approval_status, rollback_available)
- `action_approvals` — per-approver vote on a specific action_proposal version
- `execution_records` — what the Execution Engine actually did, with verification + rollback status
- `policies` + `policy_versions` — deterministic rules (JSON rule tree), owner, scope, priority, effect
- `policy_evaluations` — which policy fired against which action, result
- `audit_events` — append-only ledger (trigger blocks UPDATE/DELETE for non-service_role)

All tables: `workspace_id` + RLS using existing `is_workspace_member` / `is_workspace_writer` helpers, GRANTs to `authenticated` and `service_role`, `created_at`/`updated_at` with trigger.

### New navigation items (added to existing sidebar, existing items preserved)
Executive Dashboard (replaces Home content, route stays `/`), Decision Room (`/decisions/:id`), Approval Center (`/approvals-center`), Execution Center (`/execution`), Policies (`/policies`), Audit Ledger (`/audit`), Agent Performance (`/agent-performance`), Integrations (`/integrations`).

Existing pages (Decision Spaces, Proposals, Meetings, AI Evaluation, Analytics, Authority, Team, CEO Profile, Voice Assistant, etc.) stay in place under a "Legacy / Existing" group so nothing breaks.

### New pages (Phase 1)
1. `ExecutiveDashboardPage` — "Needs Your Attention" card, pending decision approvals, pending execution approvals, high-risk actions, blocked decisions, policy violations, cycle-time + success metrics, "Start a New Decision" CTA.
2. `DecisionRoomPage` — tabs: Summary, Evidence, Facts/Assumptions/Unknowns, Alternatives, AI Recommendation, Devil's Advocate, Scenarios, Decision Approval.
3. `ApprovalCenterPage` — tabs: Awaiting Me, High Risk, Decision Approvals, Execution Approvals, Conditional, Rejected, Expired, Completed. Approve / Approve-with-conditions / Edit / Reject / Delegate / Request-evidence / Escalate.
4. `ExecutionCenterPage` — action proposals with full lifecycle statuses, content-hash + version display, rollback button when available.
5. `PoliciesPage` — list + visual rule builder (IF/AND/THEN), effect selector, version history.
6. `AuditLedgerPage` — filterable immutable log with export to CSV.

### New components
`NeedsAttentionCard`, `ActionProposalCard`, `ApprovalRequestPanel`, `EvidenceList`, `FactsAssumptionsUnknowns`, `AlternativesTable`, `RecommendationPanel`, `DevilsAdvocatePanel`, `ScenarioMatrix`, `PolicyRuleBuilder`, `AuditEventRow`, `RiskBadge`, `AuthorityLevelBadge`, `ApprovalStatusBadge`, `ContentHashChip`.

### New edge functions
- `decision-analyze` — Decision Analyst + Research + Risk + Devil's Advocate + Decision Twin agents (Lovable AI Gateway, `google/gemini-3-flash-preview`). Produces alternatives, evidence stubs, recommendation, scenarios. Never executes.
- `policy-evaluate` — deterministic rule evaluator (pure TS, no LLM). Inputs an action_proposal, outputs allow / approval_required / multi-approval / block + which approvers are required.
- `execution-engine` — verifies action_id, approval state, content_hash match, expiry, required approvers, re-runs policy, simulates the target action, writes `execution_records` + `audit_events`. For Phase 1 all integrations are simulated.
- `action-hash` — utility to compute SHA-256 content hash of a proposal payload (used both server-side and on approval verification).

### Safety guarantees implemented in Phase 1
- DB trigger: approving a decision does NOT change any `action_proposals.approval_status`.
- DB trigger: any UPDATE to an `action_proposals` payload bumps `version`, recomputes `content_hash`, resets `approval_status` to `pending`, notifies prior approvers.
- DB trigger: `audit_events` rejects UPDATE/DELETE except from `service_role`.
- DB check: Level 3 actions require ≥2 distinct approvers in `action_approvals` before Execution Engine will run.
- Edge function: Execution Engine refuses if `now() > expires_at` or hash mismatch.

### Demo data (seeded into a new or existing workspace on request)
8 decisions, 3 awaiting approval, 6 pending action proposals (2 Level 3, 2 blocked), 15 audit events, 5 policies, 4 memory entries, 3 twin preferences, 2 completed reviews — exactly per Section 25.

---

## Phase 2 (next round, after you approve Phase 1)
Decision Twin page + preference/correction tables + learning-update approval flow, structured Decision Memory with sensitivity scopes, post-decision reviews with expected-vs-actual diff, Agent Performance dashboard, Integrations page (simulated connectors), multi-approver delegation/escalation workflows, in-app notifications table + bell.

## Phase 3 (later)
Real connectors (Gmail, Calendar, Slack, Teams, Drive, Salesforce, HubSpot, Jira, SAP, MCP), automated compliance reports, anomaly detection, industry policy templates.

---

## Technical notes (for reference)
- Stack stays React 18 + Vite + Tailwind + shadcn + Supabase via Lovable Cloud. No framework changes.
- All AI calls go through Lovable AI Gateway; no new secrets needed (`LOVABLE_API_KEY` already set).
- Policy Engine is pure TypeScript and stored as JSON rule trees — never an LLM prompt, per Section 27.
- Existing tables (`decisions`, `meetings`, `proposals`, `ai_evaluations`, `workspaces`, `workspace_members`, `profiles`) are extended via new related tables, not altered destructively. The single small alter: add `review_due_at`, `decision_type`, `strategic_importance` nullable columns to `decisions`.
- Roles from Section 19 map onto the existing `workspace_role` enum + a new `decision_role` table for decision-scoped roles (approver, legal, compliance, observer, etc.); the current Employee→Board hierarchy stays.
- Responsive, empty/loading/error states, semantic tokens only (no hardcoded colors), enterprise aesthetic preserved.

---

## What I need from you before I start
1. **Confirm phased delivery.** Phase 1 only this round (~15 files + ~12 tables + 4 edge functions). Reply "go phase 1" or tell me to descope further.
2. **Demo data:** seed into your current workspace, or create a fresh "Acme Corp" demo workspace? (Default: current workspace, additive.)
3. **Decision-scoped roles in Phase 1 or Phase 2?** Phase 1 will use the existing workspace roles for approvers unless you want the new `decision_role` table now.

Once you confirm, I'll start the Phase 1 migration immediately.